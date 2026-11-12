const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000",
};

function secureResponse(response, additionalHeaders = {}) {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(securityHeaders)) headers.set(key, value);
  for (const [key, value] of Object.entries(additionalHeaders)) headers.set(key, value);
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
    // The fallback uses a non-HTML asset extension because Sites applies clean
    // URL redirects to .html files. Returning the asset body with an explicit
    // HTML content type preserves the reader's original deep-link URL.
    shellUrl.pathname = "/app-shell.asset";
    shellUrl.search = "";
    return secureResponse(
      await env.ASSETS.fetch(new Request(shellUrl, request)),
      { "Content-Type": "text/html; charset=UTF-8" },
    );
  },
};
