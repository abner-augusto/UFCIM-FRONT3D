export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const BACKEND_URL = 'https://ufcim-production.abner-hey.workers.dev';

    // If the request is for the API or Auth, proxy it to the backend worker
    if (url.pathname.startsWith('/api/v1/') || url.pathname.startsWith('/auth/')) {
      const newUrl = new URL(url.pathname + url.search, BACKEND_URL);
      
      // Create a new request to the backend
      const newRequest = new Request(newUrl, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'manual'
      });

      // Execute the fetch to the backend
      return fetch(newRequest);
    }

    // Otherwise, serve the static assets from the Pages project
    const response = await env.ASSETS.fetch(request);
    const res = new Response(response.body, response);
    res.headers.set('X-Frame-Options', 'DENY');
    res.headers.set('X-Content-Type-Options', 'nosniff');
    res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=()');
    res.headers.set('Content-Security-Policy-Report-Only', "default-src 'self'; script-src 'self' 'sha256-J1hQa1TV+LSR0ptHxVmggPXYep4iKYgPOu8hiVMRlnU=' 'wasm-unsafe-eval' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");

    // The service worker, the HTML entry, and the web manifest gate PWA update
    // detection: if any is served stale from the browser/edge cache, an installed
    // app never sees a new build. Force them to always revalidate. (A `_headers`
    // file can't do this — Cloudflare ignores it when a `_worker.js` is present.)
    const p = url.pathname;
    if (p === '/sw.js' || p === '/' || p.endsWith('.html') || p === '/manifest.webmanifest') {
      res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    }

    return res;
  },
};
