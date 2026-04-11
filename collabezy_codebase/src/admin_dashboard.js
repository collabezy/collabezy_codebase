import { getProfiles, getChannels, getBrandProfiles, getCampaigns, getTickets, getInstagramVerificationRequests, updateChannelVerification } from './lib/adminApi.js';

const ADMIN_EMAIL = 'influencerbrandcollaboration@gmail.com';

let currentUser = null;

const totalInfluencersEl = document.getElementById('total-influencers');
const totalBrandsEl = document.getElementById('total-brands');
const totalCampaignsEl = document.getElementById('total-campaigns');
const totalTicketsEl = document.getElementById('total-tickets');

const influencerTbody = document.getElementById('influencer-tbody');
const brandTbody = document.getElementById('brand-tbody');
const ticketTbody = document.getElementById('ticket-tbody');
const instagramVerificationTbody = document.getElementById('instagram-verification-tbody');
const logoutBtn = document.getElementById('logout-btn');

window.addEventListener('DOMContentLoaded', async () => {
    const adminToken = sessionStorage.getItem('admin_token');

    if (!adminToken) {
        window.location.href = '/admin/login.html';
        return;
    }

    const storedUser = sessionStorage.getItem('admin_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        document.getElementById('admin-info').textContent = 'System Admin';
    } else {
        sessionStorage.removeItem('admin_token');
        sessionStorage.removeItem('admin_user');
        window.location.href = '/admin/login.html';
        return;
    }

    await refreshData();
});

async function refreshData() {
    try {
        const [profiles, channels, brandProfiles, campaigns, tickets, instagramRequests] = await Promise.all([
            getProfiles(),
            getChannels(),
            getBrandProfiles(),
            getCampaigns(),
            getTickets(),
            getInstagramVerificationRequests()
        ]);

        const influencers = profiles || [];
        const brands = brandProfiles || [];
        const verifiedChannels = (channels || []).filter(c => c.verified === true);

        totalInfluencersEl.textContent = influencers.length;
        totalBrandsEl.textContent = brands.length;
        totalCampaignsEl.textContent = (campaigns || []).length;
        totalTicketsEl.textContent = (tickets || []).length;

        renderInfluencerTable(influencers, channels || []);
        renderBrandTable(brands, campaigns || []);
        renderTicketTable(tickets || [], brands, influencers, campaigns || []);
        renderInstagramVerificationTable(instagramRequests || [], profiles || []);

    } catch (err) {
        console.error("Dashboard error:", err);
    }
}

function renderInstagramVerificationTable(requests, profiles) {
    instagramVerificationTbody.innerHTML = '';

    if (requests.length === 0) {
        instagramVerificationTbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem;" class="subtitle">No pending verification requests</td></tr>';
        return;
    }

    requests.forEach(req => {
        const profile = profiles.find(p => p.user_id === req.user_id);
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${profile?.name || 'Unknown'}</strong></td>
            <td>${req.channel_name || 'N/A'}</td>
            <td><a href="${req.channel_url || '#'}" target="_blank" style="color: #ec4899;">${req.channel_url || 'N/A'}</a></td>
            <td><code style="background: rgba(255,255,255,0.1); padding: 0.2rem 0.4rem; border-radius: 4px;">${req.verification_code || 'N/A'}</code></td>
            <td>
                <button class="btn btn-success btn-sm" onclick="approveInstagram('${req.id}')" style="margin-right: 0.5rem; background: #10b981;">Approve</button>
                <button class="btn btn-danger btn-sm" onclick="rejectInstagram('${req.id}')" style="background: #ef4444;">Reject</button>
            </td>
        `;
        instagramVerificationTbody.appendChild(tr);
    });
}

window.approveInstagram = async (channelId) => {
    if (!confirm('Approve this Instagram channel verification?')) return;
    try {
        await updateChannelVerification(channelId, 'approve');
        await refreshData();
        alert('Channel approved successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

window.rejectInstagram = async (channelId) => {
    if (!confirm('Reject this Instagram channel verification?')) return;
    try {
        await updateChannelVerification(channelId, 'reject');
        await refreshData();
        alert('Channel rejected!');
    } catch (err) {
        alert('Error: ' + err.message);
    }
};

function renderInfluencerTable(influencers, channels) {
    influencerTbody.innerHTML = '';

    influencers.forEach(inf => {
        const userChannels = channels.filter(c => c.user_id === inf.user_id);
        const isVerified = userChannels.some(c => c.verified === true);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${inf.name || 'Anonymous'}</strong></td>
            <td>${(inf.category || []).join(', ') || 'N/A'}</td>
            <td>${userChannels.length} Accounts</td>
            <td><span class="status-pill ${isVerified ? 'status-yes' : 'status-no'}">${isVerified ? 'YES' : 'NO'}</span></td>
        `;
        tr.onclick = () => window.location.href = `/admin_influencer_detail.html?id=${inf.user_id}`;
        influencerTbody.appendChild(tr);
    });
}

function renderBrandTable(brandProfiles, campaigns) {
    brandTbody.innerHTML = '';

    brandProfiles.forEach(profile => {
        const brandCampaigns = campaigns.filter(c => c.brand_id === profile.user_id);

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${profile.brand_name || 'Unknown Brand'}</strong></td>
            <td>${profile.email || 'N/A'}</td>
            <td>${profile.industry || 'N/A'}</td>
            <td>${brandCampaigns.length} Campaigns</td>
            <td>${profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</td>
        `;
        tr.onclick = () => window.location.href = `/admin_brand_detail.html?id=${profile.user_id}`;
        brandTbody.appendChild(tr);
    });
}

function renderTicketTable(tickets, brands, influencers, campaigns) {
    ticketTbody.innerHTML = '';

    if (tickets.length === 0) {
        ticketTbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;" class="subtitle">No active deals</td></tr>';
        return;
    }

    tickets.forEach(ticket => {
        const brand = brands.find(b => b.user_id === ticket.brand_id);
        const influencer = influencers.find(i => i.user_id === ticket.influencer_id);
        const promo = campaigns.find(c => c.id === ticket.promotion_request_id);

        const statusClass = `status-${ticket.status?.toLowerCase() || 'pending'}`;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${brand?.brand_name || 'Unknown'}</strong></td>
            <td>${influencer?.name || 'Unknown'}</td>
            <td>${promo?.product_name || 'Direct Deal'}</td>
            <td>₹ ${ticket.proposed_amount || '0'}</td>
            <td><span class="status-pill ${statusClass}" style="text-transform: uppercase; font-size: 0.7rem;">${ticket.status || 'PENDING'}</span></td>
            <td>${ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}</td>
        `;
        ticketTbody.appendChild(tr);
    });
}

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    window.location.href = '/admin/login.html';
});
