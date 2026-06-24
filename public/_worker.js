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

    // The service worker, the HTML entry, and the web manifest gate PWA update
    // detection: if any is served stale from the browser/edge cache, an installed
    // app never sees a new build. Force them to always revalidate. (A `_headers`
    // file can't do this — Cloudflare ignores it when a `_worker.js` is present.)
    const p = url.pathname;
    if (p === '/sw.js' || p === '/' || p.endsWith('.html') || p === '/manifest.webmanifest') {
      const res = new Response(response.body, response); // copy → mutable headers
      res.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res;
    }

    return response;
  },
};
