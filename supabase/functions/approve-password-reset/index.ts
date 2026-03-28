import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCorsPreflight } from '../_shared/corsHandler.ts';
import { isHealthCheck, handleHealthCheck } from '../_shared/healthCheck.ts';
import { createStructuredLogger } from '../_shared/structuredLogger.ts';
import { checkRateLimit, getClientIP, rateLimitResponse } from '../_shared/rateLimiter.ts';

const logger = createStructuredLogger('approve-password-reset');

interface ApproveResetRequest {
  requestId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflight(req);
  }

  if (isHealthCheck(req)) {
    return handleHealthCheck(req, 'approve-password-reset', getCorsHeaders(req));
  }

  const corsHeaders = getCorsHeaders(req);

  // Rate limit: 5 requests per minute per IP
  const ip = getClientIP(req);
  const rl = checkRateLimit(`approve-password-reset:${ip}`, { maxRequests: 5, windowSeconds: 60 });
  if (!rl.allowed) {
    logger.warn('Rate limit exceeded', { ip });
    return rateLimitResponse(rl, corsHeaders);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }

    // Create client with user's token to verify permissions
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Check if user is admin
    const { data: isAdmin } = await supabaseUser.rpc("is_admin_or_supervisor", { _user_id: user.id });
    if (!isAdmin) {
      throw new Error("Only admins can approve password resets");
    }

    // Create admin client for operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { requestId, action, rejectionReason }: ApproveResetRequest = await req.json();

    logger.info(`Processing ${action} for request`, { requestId });

    // Get the reset request
    const { data: resetRequest, error: fetchError } = await supabaseAdmin
      .from("password_reset_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (fetchError || !resetRequest) {
      throw new Error("Reset request not found");
    }

    if (resetRequest.status !== "pending") {
      throw new Error("Request already processed");
    }

    if (action === "reject") {
      // Reject the request
      const { error: updateError } = await supabaseAdmin
        .from("password_reset_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: rejectionReason || "Solicitação rejeitada pelo administrador",
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      logger.info("Password reset request rejected", { requestId });

      return new Response(
        JSON.stringify({ success: true, message: "Solicitação rejeitada" }),
        { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Approve: Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: resetRequest.email,
      options: {
        redirectTo: `${(() => {
          const requestOrigin = req.headers.get("origin") || '';
          const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim());
          return allowedOrigins.includes(requestOrigin) ? requestOrigin : supabaseUrl;
        })()}/reset-password`,
      },
    });

    if (resetError) {
      logger.error("Error generating reset link", { error: resetError.message });
      throw new Error("Failed to generate reset link");
    }

    // Update request status
    const { error: updateError } = await supabaseAdmin
      .from("password_reset_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        reset_token: resetData.properties?.hashed_token,
        token_expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
        updated_at: new Date().toISOString(),
      })
      .eq("id", requestId);

    if (updateError) throw updateError;

    logger.info("Password reset approved, link generated", { requestId });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Solicitação aprovada",
        resetLink: resetData.properties?.action_link 
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Solicitação aprovada e email enviado",
        resetLink: resetData.properties?.action_link 
      }),
      { headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    logger.error("Error in approve-password-reset", { error: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
