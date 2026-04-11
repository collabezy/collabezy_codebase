const INSFORGE_URL = process.env.INSFORGE_BASE_URL || 'https://y74647nz.ap-southeast.insforge.app';
const API_KEY = process.env.INSFORGE_API_KEY;

const ADMIN_EMAIL = 'influencerbrandcollaboration@gmail.com';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['ACCEPTED', 'REJECTED', 'NEGOTIATION'],
  NEGOTIATION: ['ACCEPTED', 'REJECTED', 'NEGOTIATION'],
  ACCEPTED: ['PAYMENT_PROOF_SUBMITTED'],
  PAYMENT_PROOF_SUBMITTED: ['PAYMENT_CONFIRMED', 'ACCEPTED'],
  PAYMENT_CONFIRMED: ['WORK_SUBMITTED'],
  WORK_SUBMITTED: ['COMPLETED', 'PAYMENT_CONFIRMED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

const CONTACT_PATTERNS = [
  /@/,
  /\d{10}/,
  /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
  /whatsapp/i,
  /watsapp/i,
  /instagram/i,
  /dm\s*me/i,
  /contact\s*me/i,
  /phone/i,
  /telegram/i,
  /signal/i,
  /call\s*me/i,
];

function containsContactInfo(text: string): boolean {
  return CONTACT_PATTERNS.some((p) => p.test(text));
}

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function adminFetch(endpoint: string) {
  const res = await fetch(`${INSFORGE_URL}${endpoint}`, {
    headers: {
      apikey: API_KEY,
      Authorization: `Bearer ${API_KEY}`,
    },
  });
  return res.json();
}

async function getUserFromToken(authHeader: string | null): Promise<{ id: string; email: string } | null> {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const res = await fetch(`${INSFORGE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { id: data.id, email: data.email };
    }
  } catch {
    // ignore
  }
  return null;
}

async function getTicket(ticketId: string) {
  const result = await adminFetch(`/rest/v1/tickets?id=eq.${ticketId}`);
  if (Array.isArray(result) && result.length > 0) return result[0];
  return null;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400);
  }

  const { action, ticketId, data } = body;

  if (!action || !ticketId) {
    return jsonResponse({ error: 'action and ticketId are required' }, 400);
  }

  const authHeader = req.headers.get('authorization');
  const user = await getUserFromToken(authHeader);

  if (!user) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const ticket = await getTicket(ticketId);
  if (!ticket) {
    return jsonResponse({ error: 'Ticket not found' }, 404);
  }

  const isAdmin = user.email === ADMIN_EMAIL;
  const isOwner = user.id === ticket.brand_id || user.id === ticket.influencer_id;

  if (!isAdmin && !isOwner) {
    return jsonResponse({ error: 'Access denied' }, 403);
  }

  switch (action) {
    case 'send_message': {
      const message = (data as Record<string, unknown>)?.message as string;
      if (!message || message.trim().length === 0) {
        return jsonResponse({ error: 'Message cannot be empty' }, 400);
      }
      if (containsContactInfo(message)) {
        return jsonResponse({ error: 'Sharing contact details is not allowed' }, 400);
      }

      const insertResult = await adminFetch('/rest/v1/ticket_messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify([
          {
            ticket_id: ticketId,
            sender_id: user.id,
            message: message.trim(),
          },
        ]),
      });

      return jsonResponse({ success: true, data: insertResult }, 200);
    }

    case 'update_status': {
      const newStatus = (data as Record<string, unknown>)?.status as string;
      if (!newStatus) {
        return jsonResponse({ error: 'status is required' }, 400);
      }

      const currentStatus = ticket.status;
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];

      if (!isAdmin && !allowed.includes(newStatus)) {
        return jsonResponse({
          error: `Invalid status transition from ${currentStatus} to ${newStatus}`,
          allowed,
        }, 400);
      }

      const updateResult = await adminFetch('/rest/v1/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      return jsonResponse({ success: true, data: updateResult }, 200);
    }

    case 'counter_offer': {
      const amount = (data as Record<string, unknown>)?.amount as string;
      if (!amount || amount.trim().length === 0) {
        return jsonResponse({ error: 'Amount is required' }, 400);
      }

      const updateResult = await adminFetch('/rest/v1/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          proposed_amount: amount.trim(),
          status: 'NEGOTIATION',
        }),
      });

      return jsonResponse({ success: true, data: updateResult }, 200);
    }

    case 'create_ticket': {
      const { brand_id, influencer_id, promotion_request_id, proposed_amount } =
        data as Record<string, string>;

      if (!brand_id || !influencer_id) {
        return jsonResponse({ error: 'brand_id and influencer_id are required' }, 400);
      }

      const createResult = await adminFetch('/rest/v1/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: API_KEY,
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify([
          {
            brand_id,
            influencer_id,
            promotion_request_id: promotion_request_id || null,
            status: 'PENDING',
            proposed_amount: proposed_amount || null,
          },
        ]),
      });

      return jsonResponse({ success: true, data: createResult }, 200);
    }

    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  }
}
