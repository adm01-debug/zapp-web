import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.87.1";
import { getCorsHeaders, handleCors, errorResponse, jsonResponse } from "../_shared/validation.ts";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");
const GOOGLE_REDIRECT_URI = Deno.env.get("GOOGLE_REDIRECT_URI");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

async function getAuthUrl(): Promise<string> {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: GOOGLE_REDIRECT_URI!,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

async function exchangeCode(code: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return response.json();
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  return response.json();
}

async function getGmailProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error("Failed to get Gmail profile");
  return response.json();
}

async function revokeToken(token: string): Promise<void> {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
      return errorResponse("Google OAuth credentials not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.", 500, req);
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return errorResponse("Missing authorization header", 401, req);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "get-auth-url": {
        const url = await getAuthUrl();
        return new Response(JSON.stringify({ url }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "exchange-code": {
        const { code } = body;
        if (!code) throw new Error("Missing authorization code");

        const tokens = await exchangeCode(code);
        const gmailProfile = await getGmailProfile(tokens.access_token);

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Upsert gmail account
        const { data: account, error: upsertError } = await supabase
          .from("gmail_accounts")
          .upsert({
            profile_id: profile.id,
            email_address: gmailProfile.emailAddress,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || "",
            token_expires_at: expiresAt,
            scopes: tokens.scope.split(" "),
            is_active: true,
            sync_status: "pending",
          }, {
            onConflict: "profile_id,email_address",
          })
          .select()
          .single();

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify({
          success: true,
          account: {
            id: account.id,
            email_address: account.email_address,
            is_active: account.is_active,
          },
        }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "refresh-token": {
        const { account_id } = body;
        if (!account_id) throw new Error("Missing account_id");

        const { data: account } = await supabase
          .from("gmail_accounts")
          .select("*")
          .eq("id", account_id)
          .eq("profile_id", profile.id)
          .single();

        if (!account) throw new Error("Gmail account not found");

        const tokens = await refreshAccessToken(account.refresh_token);
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        await supabase
          .from("gmail_accounts")
          .update({
            access_token: tokens.access_token,
            token_expires_at: expiresAt,
            ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          })
          .eq("id", account_id);

        return new Response(JSON.stringify({
          success: true,
          access_token: tokens.access_token,
          expires_at: expiresAt,
        }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "disconnect": {
        const { account_id } = body;
        if (!account_id) throw new Error("Missing account_id");

        const { data: account } = await supabase
          .from("gmail_accounts")
          .select("access_token, refresh_token")
          .eq("id", account_id)
          .eq("profile_id", profile.id)
          .single();

        if (account) {
          await revokeToken(account.access_token).catch(() => {});
          await supabase
            .from("gmail_accounts")
            .update({ is_active: false, access_token: "", refresh_token: "" })
            .eq("id", account_id);
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      case "list-accounts": {
        const { data: accounts } = await supabase
          .from("gmail_accounts")
          .select("id, email_address, is_active, sync_status, last_sync_at, created_at")
          .eq("profile_id", profile.id)
          .eq("is_active", true);

        return new Response(JSON.stringify({ accounts: accounts || [] }), {
          headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Gmail OAuth error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
