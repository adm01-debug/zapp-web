import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fetchWithRetry } from '../_shared/fetchWithRetry.ts';
import { checkIdempotency, completeIdempotency, failIdempotency, generateIdempotencyKey } from '../_shared/idempotency.ts';
import { enqueueToDeadLetter } from '../_shared/deadLetterQueue.ts';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { verifyJWT } from '../_shared/jwtVerifier.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { unauthorized, serverError } from '../_shared/errorResponse.ts';

interface AlertRequest {
  contactId: string;
  contactName: string;
  sentimentScore: number;
  previousScore?: number;
  analysisId: string;
  agentEmail?: string;
  threshold?: number; // User's custom threshold (default 30)
  consecutiveRequired?: number; // User's custom consecutive count (default 2)
}

const logger = createStructuredLogger('sentiment-alert');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'sentiment-alert', getCorsHeaders(req));
  }

  // Verify authentication
  const { user, error: authError } = await verifyJWT(req);
  if (authError || !user) {
    return unauthorized(authError || "Authentication required", getCorsHeaders(req));
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  let idempotencyKey: string | null = null;

  try {
    const {
      contactId,
      contactName,
      sentimentScore,
      previousScore,
      analysisId,
      agentEmail,
      threshold = 30,
      consecutiveRequired = 2
    }: AlertRequest = await req.json();

    logger.info('Sentiment alert triggered', { contactId, contactName, sentimentScore, previousScore, threshold, consecutiveRequired });

    // Generate idempotency key from contact_id + alert type (analysis ID)
    idempotencyKey = await generateIdempotencyKey(contactId, 'sentiment_alert', analysisId);

    const { isDuplicate, cachedResponse } = await checkIdempotency(supabase, idempotencyKey, 'sentiment-alert');
    if (isDuplicate && cachedResponse) {
      logger.info('Duplicate sentiment alert detected, returning cached response');
      return new Response(JSON.stringify(cachedResponse.body), {
        status: cachedResponse.status,
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      });
    }

    // Check for consecutive low sentiment (below user's threshold)
    const { data: recentAnalyses, error: fetchError } = await supabase
      .from('conversation_analyses')
      .select('id, sentiment_score, created_at')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(consecutiveRequired + 1);

    if (fetchError) {
      logger.error('Error fetching analyses', { error: fetchError.message });
      throw fetchError;
    }

    // Count consecutive low sentiment analyses using user's threshold
    let consecutiveLow = 0;
    for (const analysis of recentAnalyses || []) {
      if ((analysis.sentiment_score ?? 50) < threshold) {
        consecutiveLow++;
      } else {
        break;
      }
    }

    logger.info('Consecutive low sentiment analyses', { consecutiveLow, consecutiveRequired });

    // Only alert if consecutive count meets user's requirement
    if (consecutiveLow < consecutiveRequired) {
      return new Response(
        JSON.stringify({ 
          alerted: false, 
          reason: `Not enough consecutive low sentiment analyses (${consecutiveLow}/${consecutiveRequired})`,
          consecutiveLow 
        }),
        { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
      );
    }

    // Get contact details for the alert
    const { data: contact } = await supabase
      .from('contacts')
      .select('name, phone, assigned_to')
      .eq('id', contactId)
      .single();

    // Get assigned agent's profile for email notification
    let agentProfile = null;
    if (contact?.assigned_to) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, name, email, user_id')
        .eq('id', contact.assigned_to)
        .single();
      agentProfile = profile;
    }

    // Create an in-app notification record (we'll use audit_logs for this)
    const alertDetails = {
      type: 'sentiment_alert',
      contact_id: contactId,
      contact_name: contact?.name || contactName,
      contact_phone: contact?.phone,
      sentiment_score: sentimentScore,
      previous_score: previousScore,
      consecutive_low: consecutiveLow,
      analysis_id: analysisId,
      agent_id: contact?.assigned_to,
      agent_name: agentProfile?.name,
      message: `⚠️ Alerta de Sentimento: Cliente "${contact?.name || contactName}" apresenta sentimento negativo (${sentimentScore}%) em ${consecutiveLow} análises consecutivas.`,
      created_at: new Date().toISOString(),
    };

    // Log the alert
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'sentiment_alert',
        entity_type: 'contact',
        entity_id: contactId,
        user_id: agentProfile?.user_id || null,
        details: alertDetails,
      });

    if (logError) {
      logger.error('Failed to log alert', { error: logError.message });
    }

    // If Resend is configured, send email alert
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;

    if (RESEND_API_KEY && agentProfile?.email) {
      try {
        const emailResponse = await fetchWithRetry('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
          maxRetries: 3,
          circuitBreakerService: 'resend',
          body: JSON.stringify({
            from: 'Alertas <onboarding@resend.dev>',
            to: [agentProfile.email],
            subject: `⚠️ Alerta: Sentimento negativo - ${contact?.name || contactName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">⚠️ Alerta de Sentimento Negativo</h2>
                
                <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0; font-size: 16px;">
                    O cliente <strong>${contact?.name || contactName}</strong> apresenta sentimento negativo 
                    em <strong>${consecutiveLow} análises consecutivas</strong>.
                  </p>
                </div>
                
                <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Cliente:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${contact?.name || contactName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Telefone:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${contact?.phone || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Score Atual:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #dc2626; font-weight: bold;">${sentimentScore}%</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;"><strong>Análises Negativas:</strong></td>
                    <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${consecutiveLow} consecutivas</td>
                  </tr>
                </table>
                
                <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin-top: 16px;">
                  <p style="margin: 0 0 8px 0; font-weight: bold;">Ação Recomendada:</p>
                  <p style="margin: 0; color: #4b5563;">
                    Entre em contato com o cliente o mais rápido possível para entender e resolver suas preocupações.
                  </p>
                </div>
                
                <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
                  Este é um alerta automático do sistema de análise de conversas.
                </p>
              </div>
            `,
          }),
        });

        emailSent = emailResponse.ok;
        logger.info('Email alert sent', { emailSent });
      } catch (emailError) {
        logger.error('Failed to send email alert', { error: String(emailError) });
      }
    }

    const responseBody = {
      alerted: true,
      consecutiveLow,
      emailSent,
      agentNotified: agentProfile?.name || null,
      alertDetails,
    };

    if (idempotencyKey) {
      await completeIdempotency(supabase, idempotencyKey, 200, responseBody);
    }

    return new Response(
      JSON.stringify(responseBody),
      { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error processing sentiment alert', { error: error instanceof Error ? error.message : 'Unknown error' });
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack || '' : '';

    // Mark idempotency as failed
    if (idempotencyKey) {
      await failIdempotency(supabase, idempotencyKey);
    }

    // Enqueue to DLQ for retry
    try {
      await enqueueToDeadLetter(supabase, {
        sourceFunction: 'sentiment-alert',
        eventType: 'sentiment_alert',
        payload: { error: errorMsg },
        errorMessage: errorMsg,
        errorStack: errorStack,
      });
    } catch (dlqError) {
      logger.error('Failed to enqueue to DLQ', { error: String(dlqError) });
    }

    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
