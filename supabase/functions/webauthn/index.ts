import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '').split(',').map(s => s.trim()).filter(Boolean);

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : (ALLOWED_ORIGINS[0] || '');
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Max-Age': '3600',
  };
}

// Base64URL encoding/decoding utilities
function base64URLEncode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64URLDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Generate a random challenge
function generateChallenge(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array.buffer);
}

// Get RP ID from origin
function getRpId(origin: string): string {
  try {
    const url = new URL(origin);
    return url.hostname;
  } catch {
    return 'localhost';
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Service role client for DB operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    const origin = req.headers.get('origin') || 'https://localhost';
    const rpId = getRpId(origin);
    const rpName = 'WhatsApp Platform';

    // Verify caller identity for actions that require authentication
    const authHeader = req.headers.get('Authorization');
    let authenticatedUserId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
      if (!claimsError && claimsData?.claims) {
        authenticatedUserId = claimsData.claims.sub as string;
      }
    }

    console.log(`WebAuthn action: ${action}, origin: ${origin}, rpId: ${rpId}`);

    switch (action) {
      case 'registration-options': {
        const { userId, userEmail, userName } = params;
        
        if (!userId || !userEmail) {
          return new Response(
            JSON.stringify({ error: 'userId and userEmail are required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // SECURITY: Verify the caller IS the user they claim to be
        if (!authenticatedUserId || authenticatedUserId !== userId) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized: you can only register passkeys for your own account' }),
            { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Get existing credentials to exclude
        const { data: existingCredentials } = await supabaseAdmin
          .from('passkey_credentials')
          .select('credential_id')
          .eq('user_id', userId);

        const excludeCredentials = (existingCredentials || []).map(cred => ({
          id: cred.credential_id,
          type: 'public-key',
          transports: ['internal', 'hybrid', 'usb', 'ble', 'nfc'],
        }));

        // Generate and store challenge
        const challenge = generateChallenge();
        
        await supabaseAdmin.from('webauthn_challenges').insert({
          user_id: userId,
          challenge,
          type: 'registration',
        });

        // Clean up expired challenges
        await supabaseAdmin.rpc('cleanup_expired_challenges');

        const options = {
          challenge,
          rp: {
            name: rpName,
            id: rpId,
          },
          user: {
            id: base64URLEncode(new TextEncoder().encode(userId).buffer),
            name: userEmail,
            displayName: userName || userEmail,
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' },   // ES256
            { alg: -257, type: 'public-key' }, // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform' as const,
            userVerification: 'preferred' as const,
            residentKey: 'preferred' as const,
            requireResidentKey: false,
          },
          timeout: 60000,
          attestation: 'none' as const,
          excludeCredentials,
        };

        console.log('Registration options generated successfully');

        return new Response(
          JSON.stringify({ options }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      case 'verify-registration': {
        const { userId, credential, friendlyName } = params;

        if (!userId || !credential) {
          return new Response(
            JSON.stringify({ error: 'userId and credential are required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // SECURITY: Verify the caller IS the user they claim to be
        if (!authenticatedUserId || authenticatedUserId !== userId) {
          return new Response(
            JSON.stringify({ error: 'Unauthorized: you can only verify passkeys for your own account' }),
            { status: 403, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Get stored challenge
        const { data: challengeData, error: challengeError } = await supabaseAdmin
          .from('webauthn_challenges')
          .select('challenge')
          .eq('user_id', userId)
          .eq('type', 'registration')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (challengeError || !challengeData) {
          console.error('Challenge not found:', challengeError);
          return new Response(
            JSON.stringify({ error: 'Challenge not found or expired' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Verify the credential
        const { id, rawId, response: credResponse, type, authenticatorAttachment } = credential;

        if (type !== 'public-key') {
          return new Response(
            JSON.stringify({ error: 'Invalid credential type' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Extract public key from attestation object
        const attestationObject = credResponse.attestationObject;
        const clientDataJSON = credResponse.clientDataJSON;

        // Decode and verify clientDataJSON
        const clientData = JSON.parse(new TextDecoder().decode(base64URLDecode(clientDataJSON)));
        
        if (clientData.type !== 'webauthn.create') {
          return new Response(
            JSON.stringify({ error: 'Invalid client data type' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        if (clientData.challenge !== challengeData.challenge) {
          return new Response(
            JSON.stringify({ error: 'Challenge mismatch' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Store the credential
        const { error: insertError } = await supabaseAdmin
          .from('passkey_credentials')
          .insert({
            user_id: userId,
            credential_id: id,
            public_key: attestationObject,
            counter: 0,
            device_type: authenticatorAttachment || 'platform',
            backed_up: credResponse.publicKeyAlgorithm === -7,
            transports: credResponse.transports || ['internal'],
            friendly_name: friendlyName || 'Passkey',
          });

        if (insertError) {
          console.error('Failed to store credential:', insertError);
          return new Response(
            JSON.stringify({ error: 'Failed to store credential' }),
            { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Delete used challenge
        await supabaseAdmin
          .from('webauthn_challenges')
          .delete()
          .eq('user_id', userId)
          .eq('type', 'registration');

        console.log('Registration verified successfully');

        return new Response(
          JSON.stringify({ success: true, credentialId: id }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      case 'authentication-options': {
        // Authentication options don't require prior auth (user is logging in)
        const { userEmail } = params;

        // Generate challenge
        const challenge = generateChallenge();

        // If email provided, get user's credentials
        let allowCredentials: any[] = [];
        let userId: string | null = null;

        if (userEmail) {
          // Find user by email
          const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
          const user = userData?.users?.find(u => u.email === userEmail);
          
          if (user) {
            userId = user.id;
            
            const { data: credentials } = await supabaseAdmin
              .from('passkey_credentials')
              .select('credential_id, transports')
              .eq('user_id', user.id);

            allowCredentials = (credentials || []).map(cred => ({
              id: cred.credential_id,
              type: 'public-key',
              transports: cred.transports || ['internal', 'hybrid'],
            }));
          }
        }

        // Store challenge
        await supabaseAdmin.from('webauthn_challenges').insert({
          user_id: userId,
          challenge,
          type: 'authentication',
        });

        const options = {
          challenge,
          rpId,
          timeout: 60000,
          userVerification: 'preferred' as const,
          allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        };

        console.log('Authentication options generated');

        return new Response(
          JSON.stringify({ options }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      case 'verify-authentication': {
        const { credential } = params;

        if (!credential) {
          return new Response(
            JSON.stringify({ error: 'credential is required' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        const { id, response: credResponse } = credential;

        // Find the stored credential
        const { data: storedCred, error: credError } = await supabaseAdmin
          .from('passkey_credentials')
          .select('*')
          .eq('credential_id', id)
          .single();

        if (credError || !storedCred) {
          console.error('Credential not found:', credError);
          return new Response(
            JSON.stringify({ error: 'Credential not found' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Get the most recent challenge for this user
        const { data: challengeData } = await supabaseAdmin
          .from('webauthn_challenges')
          .select('challenge')
          .eq('user_id', storedCred.user_id)
          .eq('type', 'authentication')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (!challengeData) {
          return new Response(
            JSON.stringify({ error: 'Challenge not found or expired' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Verify clientDataJSON
        const clientData = JSON.parse(new TextDecoder().decode(base64URLDecode(credResponse.clientDataJSON)));
        
        if (clientData.type !== 'webauthn.get') {
          return new Response(
            JSON.stringify({ error: 'Invalid client data type' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        if (clientData.challenge !== challengeData.challenge) {
          return new Response(
            JSON.stringify({ error: 'Challenge mismatch' }),
            { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
          );
        }

        // Update last used and counter
        await supabaseAdmin
          .from('passkey_credentials')
          .update({
            last_used_at: new Date().toISOString(),
            counter: storedCred.counter + 1,
          })
          .eq('id', storedCred.id);

        // Clean up challenges for this user
        await supabaseAdmin
          .from('webauthn_challenges')
          .delete()
          .eq('user_id', storedCred.user_id)
          .eq('type', 'authentication');

        // Get user info
        const { data: userData } = await supabaseAdmin.auth.admin.getUserById(storedCred.user_id);

        console.log('Authentication verified successfully for user:', storedCred.user_id);

        return new Response(
          JSON.stringify({ 
            success: true, 
            userId: storedCred.user_id,
            userEmail: userData?.user?.email,
          }),
          { headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: unknown) {
    console.error('WebAuthn error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } }
    );
  }
});
