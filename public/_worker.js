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
    return env.ASSETS.fetch(request);
  },
};
