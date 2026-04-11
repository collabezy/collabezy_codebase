const INSFORGE_URL = process.env.INSFORGE_BASE_URL || 'https://y74647nz.ap-southeast.insforge.app';
const API_KEY = process.env.INSFORGE_API_KEY;
const ADMIN_EMAIL = 'influencerbrandcollaboration@gmail.com';

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (email !== ADMIN_EMAIL) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  if (!storedHash) {
    return new Response(
      JSON.stringify({ error: 'Admin credentials not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const inputHash = await hashPassword(password);

  if (inputHash !== storedHash) {
    return new Response(
      JSON.stringify({ error: 'Invalid credentials' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const signInRes = await fetch(`${INSFORGE_URL}/api/auth/sessions?client_type=server`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      },
      body: JSON.stringify({ email: ADMIN_EMAIL, password })
    });

    if (signInRes.ok) {
      const tokens = await signInRes.json();
      await ensureAdminProfile(tokens.user?.id);

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: tokens.user?.id, email: ADMIN_EMAIL, role: 'ADMIN' },
          access_token: tokens.accessToken || API_KEY,
          refresh_token: tokens.refreshToken
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const signInError = await signInRes.json().catch(() => ({}));
    const isEmailNotVerified = signInRes.status === 403 ||
      signInError?.error === 'EMAIL_NOT_VERIFIED';

    if (isEmailNotVerified) {
      const userId = signInError?.user?.id;
      if (userId) {
        await ensureAdminProfile(userId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          user: { id: userId || 'admin-user', email: ADMIN_EMAIL, role: 'ADMIN' },
          access_token: API_KEY,
          refresh_token: ''
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: signInError.message || 'Authentication failed' }),
      { status: signInRes.status, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

async function ensureAdminProfile(userId) {
  if (!userId) return;

  await fetch(`${INSFORGE_URL}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify([{ id: userId, role: 'ADMIN', full_name: 'System Admin' }])
  });
}

async function markEmailVerified(userId) {
  if (!userId) return;

  await fetch(`${INSFORGE_URL}/rest/v1/users`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({ id: userId, email_verified: true })
  });
}

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'admin_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
