import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const ALLOWED_ORIGINS = [
  "https://pqestudar.com.br",
  "https://www.pqestudar.com.br",
  "https://pqestudar-prototipo.lovable.app",
  "http://localhost:3000",
];

const LOVABLE_PREVIEW_REGEX = /^https:\/\/([a-z0-9-]+\.)?lovable\.app$/i;

function corsHeaders(origin: string | null): Record<string, string> {
  const allowed = Boolean(
    origin && (ALLOWED_ORIGINS.includes(origin) || LOVABLE_PREVIEW_REGEX.test(origin)),
  );

  return {
    "Access-Control-Allow-Origin": allowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control": "public, max-age=300, s-maxage=300",
    Vary: "Origin",
  };
}

serve(async (req: Request): Promise<Response> => {
  const headers = corsHeaders(req.headers.get("origin"));

  if (req.method === "OPTIONS") return new Response(null, { headers });

  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: config, error: configError } = await supabase
    .from("brevo_config")
    .select("default_list_id")
    .single();

  const listId = Number.parseInt(config?.default_list_id ?? "", 10);
  const apiKey = Deno.env.get("BREVO_API_KEY");

  if (configError || !Number.isInteger(listId) || !apiKey) {
    console.error(`newsletter count configuration failed: ${configError?.code ?? "invalid"}`);
    return new Response(JSON.stringify({ error: "Unable to load newsletter count" }), {
      status: 500,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const brevoResponse = await fetch(`https://api.brevo.com/v3/contacts/lists/${listId}`, {
    method: "GET",
    headers: {
      accept: "application/json",
      "api-key": apiKey,
      "user-agent": "pqestudar-edge/2.0 (+https://pqestudar.com.br)",
    },
  });

  if (!brevoResponse.ok) {
    console.error(`newsletter count Brevo request failed: ${brevoResponse.status}`);
    return new Response(JSON.stringify({ error: "Unable to load newsletter count" }), {
      status: 502,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  const list = await brevoResponse.json();
  const count = Number(list?.totalSubscribers);

  if (!Number.isSafeInteger(count) || count < 0) {
    console.error("newsletter count Brevo response was invalid");
    return new Response(JSON.stringify({ error: "Unable to load newsletter count" }), {
      status: 502,
      headers: { ...headers, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ count }), {
    status: 200,
    headers: { ...headers, "Content-Type": "application/json" },
  });
});
