const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000",
};

function secureResponse(response) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const requestUrl = new URL(request.url);
    const acceptsHtml = request.headers.get("accept")?.includes("text/html") || requestUrl.pathname === "/";

    if (response.status !== 404 || !acceptsHtml || !["GET", "HEAD"].includes(request.method)) {
      return secureResponse(response);
    }

    const shellUrl = new URL(request.url);
    // Sites asset bindings do not infer an .html extension for exact Worker
    // subrequests. Fetch the emitted file explicitly so direct SPA routes do
    // not inherit the original 404 response.
    shellUrl.pathname = "/app-shell.html";
    shellUrl.search = "";
    return secureResponse(await env.ASSETS.fetch(new Request(shellUrl, request)));
  },
};
