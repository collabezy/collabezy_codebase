const BASE_URL = import.meta.env.VITE_INSFORGE_URL || 'https://y74647nz.ap-southeast.insforge.app';

async function adminFetch(endpoint) {
  const token = sessionStorage.getItem('admin_token');
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error(`Admin API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function getProfiles() {
  return adminFetch('/api/database/records/influencer_profiles');
}

export async function getChannels() {
  return adminFetch('/api/database/records/social_accounts');
}

export async function getBrandProfiles() {
  return adminFetch('/api/database/records/brand_profiles_new');
}

export async function getCampaigns() {
  return adminFetch('/api/database/records/promotion_requests');
}

export async function getTickets() {
  return adminFetch('/api/database/records/tickets');
}

export async function getProfileById(id) {
  return adminFetch(`/api/database/records/influencer_profiles?user_id=eq.${id}`);
}

export async function getChannelsByUserId(userId) {
  return adminFetch(`/api/database/records/social_accounts?user_id=eq.${userId}`);
}

export async function getCampaignsByBrandId(brandId) {
  return adminFetch(`/api/database/records/promotion_requests?brand_id=eq.${brandId}`);
}

export async function getBrandProfileByUserId(userId) {
  return adminFetch(`/api/database/records/brand_profiles_new?user_id=eq.${userId}`);
}

export async function getCollabRequests() {
  return adminFetch('/api/database/records/collaboration_requests');
}

export async function getTicketMessages() {
  return adminFetch('/api/database/records/ticket_messages');
}

export async function getInstagramVerificationRequests() {
  return adminFetch('/api/database/records/social_accounts?platform=eq.instagram&verification_status=eq.pending');
}

export async function updateChannelVerification(channelId, status) {
  const token = sessionStorage.getItem('admin_token');
  const res = await fetch(`${BASE_URL}/api/database/records/social_accounts?id=eq.${channelId}`, {
    method: 'PATCH',
    headers: {
      'apikey': token,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      verified: status === 'approve',
      verification_status: status === 'approve' ? 'approved' : 'rejected'
    })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Admin API error: ${res.status} ${text || res.statusText}`);
  }
  if (res.status === 204) return { success: true };
  return res.json().catch(() => ({ success: true }));
}
