import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";
import { handleCors, errorResponse, jsonResponse, requireEnv, Logger, sanitizeString } from "../_shared/validation.ts";

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  const log = new Logger("create-user");

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

    // Verify the caller is authenticated and is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log.warn("Missing auth header");
      return errorResponse("Não autorizado", 401, req);
    }

    const callerClient = createClient(supabaseUrl, requireEnv("SUPABASE_ANON_KEY"), {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      log.warn("Invalid auth token");
      return errorResponse("Não autorizado", 401, req);
    }

    // Check if caller is admin
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (!roleData || roleData.role !== "admin") {
      log.warn("Non-admin attempted user creation", { callerId: caller.id });
      return errorResponse("Apenas administradores podem criar usuários", 403, req);
    }

    const bodySchema = z.object({
      email: z.string().email("Email inválido").max(255),
      password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(128),
      name: z.string().min(1, "Nome é obrigatório").max(255),
      role: z.enum(["admin", "supervisor", "agent", "special_agent"]).optional().default("agent"),
      gmail_email: z.string().email("Email Gmail inválido").max(255).optional(),
    });

    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      return errorResponse(Object.values(errors).flat().join("; "), 400, req);
    }

    const { email, password, name, role, gmail_email } = parsed.data;
    const sanitizedName = sanitizeString(name) || name;

    // Create user via admin API
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: sanitizedName },
    });

    if (createError) {
      log.error("User creation failed", { error: createError.message });
      return errorResponse(createError.message, 400, req);
    }

    // If a specific role was provided (not default 'agent'), update it
    if (role && role !== "agent" && newUser.user) {
      await adminClient
        .from("user_roles")
        .update({ role })
        .eq("user_id", newUser.user.id);
    }

    // If a Gmail email was provided, create the gmail_accounts record
    if (gmail_email && newUser.user) {
      const { error: gmailError } = await adminClient
        .from("gmail_accounts")
        .insert({
          user_id: newUser.user.id,
          email_address: gmail_email,
          is_active: true,
          sync_status: "pending",
        });

      if (gmailError) {
        log.error("Gmail account creation failed", { error: gmailError.message });
        // Don't fail the whole request, user was already created
      }
    }

    log.done(200, { userId: newUser.user?.id });
    return jsonResponse({ success: true, user_id: newUser.user?.id }, 200, req);
  } catch (err: unknown) {
    log.error("Unhandled error", { error: err instanceof Error ? err.message : String(err) });
    return errorResponse(err instanceof Error ? err.message : "Erro interno", 500, req);
  }
});
