import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeviceCheckRequest {
  device_fingerprint: string;
  browser: string;
  os: string;
  device_name: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("detect-new-device: Request received");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("detect-new-device: No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user token to get user info
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("detect-new-device: User not found", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("detect-new-device: User authenticated:", user.id);

    // Parse request body
    const { device_fingerprint, browser, os, device_name }: DeviceCheckRequest = await req.json();
    
    // Get client IP
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";

    console.log("detect-new-device: Checking device:", { device_fingerprint, browser, os, clientIp });

    // Use service role client for database operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if device exists
    const { data: existingDevice, error: deviceError } = await supabaseAdmin
      .from("user_devices")
      .select("*")
      .eq("user_id", user.id)
      .eq("device_fingerprint", device_fingerprint)
      .maybeSingle();

    if (deviceError) {
      console.error("detect-new-device: Error checking device:", deviceError);
      throw deviceError;
    }

    let isNewDevice = false;
    let deviceId: string;

    if (!existingDevice) {
      isNewDevice = true;
      console.log("detect-new-device: NEW DEVICE DETECTED!");

      // Insert new device
      const { data: newDevice, error: insertError } = await supabaseAdmin
        .from("user_devices")
        .insert({
          user_id: user.id,
          device_fingerprint,
          device_name,
          browser,
          os,
          ip_address: clientIp,
          is_trusted: false,
        })
        .select()
        .single();

      if (insertError) {
        console.error("detect-new-device: Error inserting device:", insertError);
        throw insertError;
      }

      deviceId = newDevice.id;

      // Send email notification
      const userEmail = user.email;
      if (userEmail) {
        console.log("detect-new-device: Sending email notification to:", userEmail);

        try {
          const emailResponse = await resend.emails.send({
            from: "Segurança <security@resend.dev>",
            to: [userEmail],
            subject: "🔐 Novo dispositivo detectado na sua conta",
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">🔐 Alerta de Segurança</h1>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;">
                  <p style="font-size: 16px; margin-top: 0;">Olá,</p>
                  <p style="font-size: 16px;">Detectamos um <strong>novo login</strong> na sua conta a partir de um dispositivo desconhecido.</p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                    <h3 style="margin-top: 0; color: #667eea;">Detalhes do Dispositivo:</h3>
                    <table style="width: 100%; font-size: 14px;">
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Dispositivo:</strong></td>
                        <td style="padding: 8px 0;">${device_name}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Navegador:</strong></td>
                        <td style="padding: 8px 0;">${browser}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Sistema:</strong></td>
                        <td style="padding: 8px 0;">${os}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>IP:</strong></td>
                        <td style="padding: 8px 0;">${clientIp}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #666;"><strong>Data/Hora:</strong></td>
                        <td style="padding: 8px 0;">${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}</td>
                      </tr>
                    </table>
                  </div>
                  
                  <p style="font-size: 14px; color: #666;">Se foi você, pode ignorar este email. Caso contrário, recomendamos que você altere sua senha imediatamente.</p>
                  
                  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #856404;">
                      <strong>⚠️ Não reconhece este acesso?</strong><br>
                      Altere sua senha imediatamente e habilite a autenticação em duas etapas (2FA).
                    </p>
                  </div>
                </div>
                <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
                  Este é um email automático de segurança. Por favor, não responda.
                </p>
              </body>
              </html>
            `,
          });

          console.log("detect-new-device: Email sent successfully:", emailResponse);
        } catch (emailError) {
          console.error("detect-new-device: Error sending email:", emailError);
          // Don't fail the request if email fails
        }
      }

      // Create security alert
      await supabaseAdmin.from("security_alerts").insert({
        user_id: user.id,
        alert_type: "new_device",
        severity: "medium",
        title: "Novo dispositivo detectado",
        description: `Login realizado a partir de ${browser} em ${os} (IP: ${clientIp})`,
        ip_address: clientIp,
        metadata: { device_fingerprint, browser, os, device_name },
      });

    } else {
      deviceId = existingDevice.id;
      console.log("detect-new-device: Known device, updating last_seen");

      // Update last seen
      await supabaseAdmin
        .from("user_devices")
        .update({ 
          last_seen_at: new Date().toISOString(),
          ip_address: clientIp 
        })
        .eq("id", deviceId);
    }

    // Create or update session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("user_sessions")
      .insert({
        user_id: user.id,
        device_id: deviceId,
        ip_address: clientIp,
        user_agent: req.headers.get("user-agent") || "unknown",
        is_active: true,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      })
      .select()
      .single();

    if (sessionError) {
      console.error("detect-new-device: Error creating session:", sessionError);
    }

    return new Response(
      JSON.stringify({ 
        is_new_device: isNewDevice,
        device_id: deviceId,
        session_id: session?.id,
        message: isNewDevice ? "New device detected and email sent" : "Known device updated"
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error: any) {
    console.error("detect-new-device: Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
