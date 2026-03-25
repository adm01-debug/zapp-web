import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  try {
    const mapboxToken = Deno.env.get('MAPBOX_PUBLIC_TOKEN');
    
    if (!mapboxToken) {
      return new Response(
        JSON.stringify({ error: 'Mapbox token not configured' }),
        { 
          status: 500, 
          headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
        }
      );
    }

    return new Response(
      JSON.stringify({ token: mapboxToken }),
      { 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } 
      }
    );
  }
});
