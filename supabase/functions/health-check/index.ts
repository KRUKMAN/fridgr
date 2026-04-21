declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

const corsHeaders: Readonly<Record<string, string>> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
};

const createJsonResponse = (body: Readonly<Record<string, string>>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

const getEnvironment = (): string => Deno.env.get('ENVIRONMENT') ?? 'unknown';

const handler = (request: Request): Response => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return createJsonResponse({ error: 'Method Not Allowed' }, 405);
  }

  return createJsonResponse({ status: 'ok', environment: getEnvironment() });
};

Deno.serve(handler);
