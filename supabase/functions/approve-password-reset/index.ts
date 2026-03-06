import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ApproveResetRequest {
  requestId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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

    console.log(`Processing ${action} for request ${requestId}`);

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

      console.log("Password reset request rejected");

      return new Response(
        JSON.stringify({ success: true, message: "Solicitação rejeitada" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve: Generate password reset link
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: resetRequest.email,
      options: {
        redirectTo: `${req.headers.get("origin") || supabaseUrl}/reset-password`,
      },
    });

    if (resetError) {
      console.error("Error generating reset link:", resetError);
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

    console.log("Password reset approved, link generated");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Solicitação aprovada",
        resetLink: resetData.properties?.action_link 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Solicitação aprovada e email enviado",
        resetLink: resetData.properties?.action_link 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in approve-password-reset:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
