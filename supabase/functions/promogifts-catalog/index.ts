import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: validate caller is authenticated on OUR Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const localUrl = Deno.env.get("SUPABASE_URL")!;
    const localAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const localClient = createClient(localUrl, localAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await localClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Connect to external PromoGifts Supabase (read-only)
    const extUrl = Deno.env.get("PROMOGIFTS_SUPABASE_URL");
    const extKey = Deno.env.get("PROMOGIFTS_SUPABASE_ANON_KEY");
    if (!extUrl || !extKey) {
      return new Response(JSON.stringify({ error: "External DB not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extClient = createClient(extUrl, extKey);

    // Parse request
    const body = await req.json();
    const { action, params } = body;

    const startTime = performance.now();

    if (action === "list_products") {
      const {
        search,
        category_id,
        supplier_id,
        limit = 50,
        offset = 0,
        order_by = "name",
        ascending = true,
        only_active = true,
        only_in_stock = false,
      } = params || {};

      let query = extClient
        .from("products")
        .select(
          `id, name, description, short_description, sku, cost_price, sale_price, suggested_price,
           stock_quantity, primary_image_url, colors, brand, origin_country, min_quantity,
           dimensions_display, weight_g, combined_sizes, product_type, is_kit, is_active,
           is_stockout, allows_personalization, lead_time_days, supply_mode,
           category_id, supplier_id, slug, capacity_ml, ncm_code,
           categories:category_id(id, name, slug, parent_id),
           suppliers:supplier_id(id, name)`,
          { count: "exact" }
        );

      if (only_active) query = query.eq("is_active", true);
      if (only_in_stock) query = query.eq("is_stockout", false);
      if (category_id) query = query.eq("category_id", category_id);
      if (supplier_id) query = query.eq("supplier_id", supplier_id);
      if (search) {
        query = query.or(
          `name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`
        );
      }
      query = query.order(order_by, { ascending }).range(offset, offset + limit - 1);

      const { data, error, count } = await query;
      if (error) throw error;

      const duration = Math.round(performance.now() - startTime);
      return new Response(
        JSON.stringify({ data, meta: { total: count, duration_ms: duration } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "get_product") {
      const { product_id } = params || {};
      if (!product_id) {
        return new Response(JSON.stringify({ error: "product_id required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: product, error: productErr } = await extClient
        .from("products")
        .select(
          `*, categories:category_id(id, name, slug, parent_id),
           suppliers:supplier_id(id, name)`
        )
        .eq("id", product_id)
        .maybeSingle();
      if (productErr) throw productErr;
      if (!product) {
        return new Response(JSON.stringify({ error: "Product not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fetch variants
      const { data: variants, error: varErr } = await extClient
        .from("product_variants")
        .select("*")
        .eq("product_id", product_id)
        .eq("is_active", true)
        .order("color_name");
      if (varErr) throw varErr;

      const duration = Math.round(performance.now() - startTime);
      return new Response(
        JSON.stringify({ data: { ...product, variants: variants || [] }, meta: { duration_ms: duration } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list_categories") {
      const { data, error } = await extClient
        .from("categories")
        .select("id, name, slug, parent_id")
        .order("name");
      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "list_suppliers") {
      const { data, error } = await extClient
        .from("suppliers")
        .select("id, name")
        .order("name");
      if (error) throw error;

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action. Use: list_products, get_product, list_categories, list_suppliers" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[promogifts-catalog] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
