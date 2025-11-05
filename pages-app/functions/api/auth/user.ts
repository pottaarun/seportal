// Cloudflare Pages Function to get authenticated user from Access
export async function onRequest(context: any) {
  const headers = context.request.headers;

  // Get user email from Cloudflare Access
  const userEmail = headers.get('Cf-Access-Authenticated-User-Email');

  if (!userEmail) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  // Extract name from email (e.g., john.doe@cloudflare.com -> John Doe)
  const namePart = userEmail.split('@')[0];
  const userName = namePart
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return new Response(JSON.stringify({
    email: userEmail,
    name: userName,
    authenticated: true
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store, no-cache, must-revalidate'
    }
  });
}
