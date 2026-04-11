import { insforge } from './lib/insforge.js';
import { createNotification } from './notifications.js';
import {
  calculateChannelEngagementRate,
  calculateAverageViews,
  calculateTrustScore,
  calculateOverallEngagementRate,
  calculateTotalFollowers,
  getTrustScoreLabel,
  getEngagementLabel,
  formatNumber
} from './lib/analytics.js';

let influencerId = new URLSearchParams(window.location.search).get('id');
let currentUser = null;
let brandPromotionRequests = [];

const loader = document.getElementById('loader');
const profileView = document.getElementById('profile-view');
const requestModal = document.getElementById('request-modal');
const openModalBtn = document.getElementById('open-request-modal-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const collabForm = document.getElementById('collab-request-form');
const promotionRequestSelect = document.getElementById('request-campaign');
const requestMsg = document.getElementById('request-msg');
const logoutBtn = document.getElementById('logout-btn');

window.addEventListener('DOMContentLoaded', async () => {
    if (!influencerId) {
        window.location.href = '/discover.html';
        return;
    }

    // 1. Verify Brand Session
    const { data: authData } = await insforge.auth.getCurrentUser();
    if (!authData?.user) {
        window.location.href = '/brand_auth.html';
        return;
    }
    currentUser = authData.user;

    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();

    if (profile?.role === 'INFLUENCER' && currentUser.email !== 'influencerbrandcollab@gmail.com') {
        window.location.href = '/index.html';
        return;
    }

    // 2. Fetch Detail
    loadProfileDetails();
    loadBrandPromotionRequests();
});

async function loadProfileDetails() {
    const { data: profile, error: pError } = await insforge.database
        .from('influencer_profiles')
        .select('*')
        .eq('user_id', influencerId)
        .single();

    if (pError || !profile) {
        loader.innerHTML = '<p class="error">Profile not found.</p>';
        return;
    }

    const { data: channels, error: cError } = await insforge.database
        .from('social_accounts')
        .select('*')
        .eq('user_id', influencerId);

    loader.style.display = 'none';
    profileView.style.display = 'block';

    document.getElementById('profile-name').textContent = profile.name || 'Anonymous Creator';
    document.getElementById('profile-avatar').src = profile.avatar_url || 'https://via.placeholder.com/120';
    document.getElementById('profile-categories').textContent = (profile.category || []).join(', ');
    document.getElementById('profile-bio').textContent = profile.bio || 'This creator has not added a bio yet.';

    const trustScore = calculateTrustScore(channels || [], profile);
    const trustInfo = getTrustScoreLabel(trustScore);
    const overallEngagement = calculateOverallEngagementRate(channels || []);
    const engInfo = getEngagementLabel(overallEngagement);
    const totalFollowers = calculateTotalFollowers(channels || []);

    const analyticsBar = document.createElement('div');
    analyticsBar.className = 'glass-panel mb-8';
    analyticsBar.style.padding = '2rem';
    analyticsBar.innerHTML = `
        <h2 class="mb-4">Analytics Overview</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1.5rem;">
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Total Followers</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: #a78bfa;">${formatNumber(totalFollowers)}</p>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Engagement Rate</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: ${engInfo.color};">
                    ${overallEngagement !== null ? overallEngagement.toFixed(2) + '%' : 'N/A'}
                </p>
                <span class="analytic-badge" style="color: ${engInfo.color};">${engInfo.label}</span>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Trust Score</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: ${trustInfo.color};">${trustScore}/100</p>
                <span class="analytic-badge" style="color: ${trustInfo.color};">${trustInfo.emoji} ${trustInfo.label}</span>
            </div>
            <div class="analytics-card">
                <p class="subtitle" style="font-size: 0.75rem;">Channels</p>
                <p style="font-size: 1.8rem; font-weight: 700; color: #60a5fa;">${(channels || []).length}</p>
                <span class="analytic-badge" style="color: #60a5fa;">${(channels || []).filter(c => c.verified === true).length} verified</span>
            </div>
        </div>
    `;
    profileView.insertBefore(analyticsBar, document.getElementById('channels-grid'));

    const grid = document.getElementById('channels-grid');
    grid.innerHTML = '';
    if (channels && channels.length > 0) {
        channels.forEach(ch => {
            const el = document.createElement('div');
            el.className = 'glass-panel feature-card';
            el.style.padding = '1.5rem';
            
            let statusColor = '#94a3b8';
            if (ch.verified === true) statusColor = '#10b981';

            const engagement = calculateChannelEngagementRate(ch);
            const avgViews = calculateAverageViews(ch);
            const engLabel = getEngagementLabel(engagement);

            el.innerHTML = `
                <div class="flex-between mb-4">
                    <h3 style="text-transform: uppercase; font-size: 0.9rem; letter-spacing: 1px;">${ch.platform}</h3>
                    <span class="pill" style="border-color: ${statusColor}; color: ${statusColor}; font-size: 0.75rem;">${ch.verified ? 'VERIFIED' : 'PENDING'}</span>
                </div>
                <h4 style="font-size: 1.25rem;">${ch.channel_name}</h4>
                <p class="subtitle mb-4">${formatNumber(ch.followers)} followers</p>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Engagement</p>
                        <p style="font-weight: bold; color: ${engLabel.color};">
                            ${engagement !== null ? engagement.toFixed(2) + '%' : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Avg Views</p>
                        <p style="font-weight: bold; color: #60a5fa;">
                            ${avgViews !== null ? formatNumber(avgViews) : 'N/A'}
                        </p>
                    </div>
                    <div>
                        <p class="subtitle" style="font-size: 0.75rem;">Platform</p>
                        <p style="font-weight: bold; color: #c4b5fd;">
                            ${ch.platform.toUpperCase()}
                        </p>
                    </div>
                </div>
            `;
            grid.appendChild(el);
        });
    } else {
        grid.innerHTML = '<p class="subtitle text-center" style="grid-column: 1/-1;">No social accounts linked.</p>';
    }
}

async function loadBrandPromotionRequests() {
    const { data: promotionRequests } = await insforge.database
        .from('promotion_requests')
        .select('id, product_name')
        .eq('brand_id', currentUser.id)
        .order('created_at', { ascending: false });

    brandPromotionRequests = promotionRequests || [];
    promotionRequestSelect.innerHTML = '<option value="">Choose an active promotion request...</option>';
    brandPromotionRequests.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.product_name;
        promotionRequestSelect.appendChild(opt);
    });
}

openModalBtn.addEventListener('click', () => {
    requestModal.style.display = 'block';
});

closeModalBtn.addEventListener('click', () => {
    requestModal.style.display = 'none';
});

document.getElementById('cancel-request-btn')?.addEventListener('click', () => {
    requestModal.style.display = 'none';
});

collabForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    requestMsg.style.display = 'block';
    requestMsg.className = 'text-center mt-4 mb-2';
    requestMsg.textContent = 'Submitting Request...';

    const promotionRequestId = promotionRequestSelect.value;
    const budget = document.getElementById('request-budget').value;
    const deadline = document.getElementById('request-deadline').value;

    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: dailyCount } = await insforge.database
            .from('tickets')
            .select('id', { count: 'exact' })
            .eq('brand_id', currentUser.id)
            .gte('created_at', today);

        if ((dailyCount || []).length >= 10) {
            throw new Error("You have reached your daily limit of 10 requests. Please try again tomorrow.");
        }

        const { data: insertedTickets, error } = await insforge.database
            .from('tickets')
            .insert([{
                brand_id: currentUser.id,
                influencer_id: influencerId,
                promotion_request_id: promotionRequestId || null,
                status: 'PENDING',
                proposed_amount: budget,
                deadline: deadline || null
            }])
            .select();

        console.log('Insert result:', insertedTickets, error);

        if (error) throw error;

        let newTicketId = null;
        if (insertedTickets && insertedTickets.length > 0) {
            newTicketId = insertedTickets[0].id;
        } else {
            // Fallback: fetch the most recent ticket for this brand/influencer
            const { data: recentTickets } = await insforge.database
                .from('tickets')
                .select('id')
                .eq('brand_id', currentUser.id)
                .eq('influencer_id', influencerId)
                .order('created_at', { ascending: false })
                .limit(1);
            if (recentTickets && recentTickets.length > 0) {
                newTicketId = recentTickets[0].id;
            }
        }

        const { data: brandProfile } = await insforge.database
            .from('brand_profiles_new')
            .select('brand_name')
            .eq('user_id', currentUser.id)
            .single();

        let productName = 'Direct Deal';
        if (promotionRequestId) {
            const { data: promo } = await insforge.database
                .from('promotion_requests')
                .select('product_name')
                .eq('id', promotionRequestId)
                .single();
            productName = promo?.product_name || 'Direct Deal';
        }

        await createNotification({
            userId: influencerId,
            type: 'collab_request',
            message: `📩 ${brandProfile?.brand_name || 'A brand'} sent you a collaboration request for "${productName}" at ₹${budget || '0'}`,
            referenceId: newTicketId
        });

        requestMsg.style.color = '#10b981';
        requestMsg.textContent = 'Request Sent Successfully!';
        
        setTimeout(() => {
            requestModal.style.display = 'none';
            collabForm.reset();
        }, 1500);

    } catch (err) {
        requestMsg.style.color = '#ef4444';
        requestMsg.textContent = 'Error: ' + err.message;
    }
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await insforge.auth.signOut();
    window.location.href = '/index.html';
});
