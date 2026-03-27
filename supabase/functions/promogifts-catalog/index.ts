import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// ─── Input Schemas ────────────────────────────────────────────
const ALLOWED_ORDER_FIELDS = ["name", "sale_price", "stock_quantity", "brand", "created_at", "sku"] as const;

const ListProductsSchema = z.object({
  search: z.string().max(200).optional(),
  category_id: z.string().uuid().optional(),
  supplier_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
  order_by: z.enum(ALLOWED_ORDER_FIELDS).default("name"),
  ascending: z.boolean().default(true),
  only_active: z.boolean().default(true),
  only_in_stock: z.boolean().default(false),
}).default({});

const GetProductSchema = z.object({
  product_id: z.string().uuid("product_id must be a valid UUID"),
});

const ActionSchema = z.object({
  action: z.enum(["list_products", "get_product", "list_categories", "list_suppliers"]),
  params: z.record(z.unknown()).optional().default({}),
});

// ─── Sanitize search ─────────────────────────────────────────
function sanitizeSearch(input: string): string {
  // Remove PostgREST special chars to prevent filter injection
  return input.replace(/[%_.\\()]/g, "").trim().slice(0, 100);
}

// ─── Product select fields (no cost_price) ───────────────────
const PRODUCT_FIELDS = `id, name, description, short_description, sku, sale_price, suggested_price,
  stock_quantity, primary_image_url, colors, brand, origin_country, min_quantity,
  dimensions_display, weight_g, combined_sizes, product_type, is_kit, is_active,
  is_stockout, allows_personalization, lead_time_days, supply_mode,
  category_id, supplier_id, slug, capacity_ml, ncm_code,
  categories:category_id(id, name, slug, parent_id),
  suppliers:supplier_id(id, name)`;

// ─── Rate limiter (per-user, in-memory) ──────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 60; // requests per window
const RATE_WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    const localClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData, error: userErr } = await localClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonRes({ error: "Unauthorized" }, 401);
    }

    // Rate limit
    if (!checkRateLimit(userData.user.id)) {
      return jsonRes({ error: "Too many requests. Try again in 1 minute." }, 429);
    }

    // External DB
    const extUrl = Deno.env.get("PROMOGIFTS_SUPABASE_URL");
    const extKey = Deno.env.get("PROMOGIFTS_SUPABASE_ANON_KEY");
    if (!extUrl || !extKey) {
      return jsonRes({ error: "External DB not configured" }, 500);
    }
    const extClient = createClient(extUrl, extKey);

    // Parse & validate body
    const rawBody = await req.json();
    const bodyParse = ActionSchema.safeParse(rawBody);
    if (!bodyParse.success) {
      return jsonRes({ error: "Invalid request", details: bodyParse.error.flatten().fieldErrors }, 400);
    }
    const { action, params } = bodyParse.data;

    const startTime = performance.now();

    // ── list_products ──
    if (action === "list_products") {
      const paramsParse = ListProductsSchema.safeParse(params);
      if (!paramsParse.success) {
        return jsonRes({ error: "Invalid parameters", details: paramsParse.error.flatten().fieldErrors }, 400);
      }
      const { search, category_id, supplier_id, limit, offset, order_by, ascending, only_active, only_in_stock } = paramsParse.data;

      let query = extClient
        .from("products")
        .select(PRODUCT_FIELDS, { count: "exact" });

      if (only_active) query = query.eq("is_active", true);
      if (only_in_stock) query = query.eq("is_stockout", false);
      if (category_id) query = query.eq("category_id", category_id);
      if (supplier_id) query = query.eq("supplier_id", supplier_id);
      if (search) {
        const safe = sanitizeSearch(search);
        if (safe.length > 0) {
          query = query.or(
            `name.ilike.%${safe}%,sku.ilike.%${safe}%,brand.ilike.%${safe}%`
          );
        }
      }
      query = query.order(order_by, { ascending }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const duration = Math.round(performance.now() - startTime);
      return jsonRes({ data, meta: { total: count, duration_ms: duration } });
    }

    // ── get_product ──
    if (action === "get_product") {
      const paramsParse = GetProductSchema.safeParse(params);
      if (!paramsParse.success) {
        return jsonRes({ error: "Invalid parameters", details: paramsParse.error.flatten().fieldErrors }, 400);
      }
      const { product_id } = paramsParse.data;

      const { data: product, error: productErr } = await extClient
        .from("products")
        .select(PRODUCT_FIELDS)
        .eq("id", product_id)
        .maybeSingle();
      if (productErr) throw productErr;
      if (!product) {
        return jsonRes({ error: "Product not found" }, 404);
      }

      const { data: variants, error: varErr } = await extClient
        .from("product_variants")
        .select("*")
        .eq("product_id", product_id)
        .eq("is_active", true)
        .order("color_name");
      if (varErr) throw varErr;

      const duration = Math.round(performance.now() - startTime);
      return jsonRes({ data: { ...product, variants: variants || [] }, meta: { duration_ms: duration } });
    }

    // ── list_categories ──
    if (action === "list_categories") {
      const { data, error } = await extClient
        .from("categories")
        .select("id, name, slug, parent_id")
        .order("name");
      if (error) throw error;
      return jsonRes({ data });
    }

    // ── list_suppliers ──
    if (action === "list_suppliers") {
      const { data, error } = await extClient
        .from("suppliers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      return jsonRes({ data });
    }

    return jsonRes({ error: "Invalid action" }, 400);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[promogifts-catalog] error:", msg);
    return jsonRes({ error: msg }, 500);
  }
});
