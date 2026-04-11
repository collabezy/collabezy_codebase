import { insforge } from './lib/insforge.js';
import {
  calculateTrustScore,
  calculateOverallEngagementRate,
  calculateTotalFollowers,
  getTrustScoreLabel,
  getEngagementLabel,
  formatNumber
} from './lib/analytics.js';

let influencerProfiles = [];
let influencerChannels = [];
let currentUser = null;

const influencerContainer = document.getElementById('influencer-container');
const filterCategory = document.getElementById('filter-category');
const filterPlatform = document.getElementById('filter-platform');
const filterVerified = document.getElementById('filter-verified');
const applyFiltersBtn = document.getElementById('apply-filters-btn');
const logoutBtn = document.getElementById('logout-btn');

window.addEventListener('DOMContentLoaded', async () => {
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

    // 2. Load Filter Options
    loadInfluencers();
});

async function loadInfluencers() {
    influencerContainer.innerHTML = '<p class="subtitle text-center" style="grid-column: 1/-1;">Loading influencers...</p>';
    
    // Fetch all influencer profiles
    const { data: profiles, error: pError } = await insforge.database
        .from('influencer_profiles')
        .select('*');

    if (pError) {
        console.error("Profiles error:", pError);
        influencerContainer.innerHTML = '<p class="error">Failed to load influencers.</p>';
        return;
    }

    // Fetch all social accounts
    const { data: channels, error: cError } = await insforge.database
        .from('social_accounts')
        .select('*');

    if (cError) {
        console.error("Social accounts error:", cError);
    }

    influencerProfiles = profiles;
    influencerChannels = channels || [];

    renderInfluencers();
}

function renderInfluencers() {
    const category = filterCategory.value;
    const platform = filterPlatform.value;
    const verifiedOnly = filterVerified.checked;

    let filtered = influencerProfiles.filter(p => {
        // Filter by category
        if (category && (!p.category || !p.category.some(cat => cat.toLowerCase().includes(category.toLowerCase())))) {
            return false;
        }

        const userChannels = influencerChannels.filter(c => c.user_id === p.user_id);
        
        // Filter by platform
        if (platform && !userChannels.some(c => c.platform === platform)) {
            return false;
        }

        // Filter by verified
        if (verifiedOnly && !userChannels.some(c => c.verified === true)) {
            return false;
        }

        return true;
    });

    if (filtered.length === 0) {
        influencerContainer.innerHTML = '<p class="subtitle text-center" style="grid-column: 1/-1;">No influencers found matching these filters.</p>';
        return;
    }

    influencerContainer.innerHTML = '';
    filtered.forEach(p => {
        const userChannels = influencerChannels.filter(c => c.user_id === p.user_id);
        const isVerified = userChannels.some(c => c.verified === true);
        
        const totalFollowers = calculateTotalFollowers(userChannels);
        const trustScore = calculateTrustScore(userChannels, p);
        const trustInfo = getTrustScoreLabel(trustScore);
        const engagement = calculateOverallEngagementRate(userChannels);
        const engInfo = getEngagementLabel(engagement);

        const card = document.createElement('div');
        card.className = 'glass-panel influencer-card';
        card.style.padding = '1.5rem';
        card.style.cursor = 'pointer';
        card.onclick = () => window.location.href = `/influencer_detail.html?id=${p.user_id}`;
        card.innerHTML = `
            <div class="flex-between mb-4">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${p.avatar_url || 'https://via.placeholder.com/60'}" style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid rgba(255,255,255,0.1);">
                    <div>
                        <h3 style="font-size: 1.1rem; color: white;">${p.name || 'Anonymous Creator'}</h3>
                        <p class="subtitle" style="font-size: 0.85rem;">${(p.category || []).join(', ')}</p>
                    </div>
                </div>
                ${isVerified ? '<span style="background: #10b981; color: white; padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.7rem; font-weight: bold;">✓</span>' : ''}
            </div>

            <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;">
                ${userChannels.filter(c => c.verified === true).map(c => `
                    <span class="stat-badge">${c.platform.toUpperCase()}</span>
                `).join('')}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
                <div class="mini-stat">
                    <span class="mini-stat-label">Followers</span>
                    <span class="mini-stat-value">${formatNumber(totalFollowers)}</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-label">Engagement</span>
                    <span class="mini-stat-value" style="color: ${engInfo.color};">${engagement !== null ? engagement.toFixed(1) + '%' : 'N/A'}</span>
                </div>
                <div class="mini-stat">
                    <span class="mini-stat-label">Trust</span>
                    <span class="mini-stat-value" style="color: ${trustInfo.color};">${trustScore}/100</span>
                </div>
            </div>

            <p class="subtitle" style="font-size: 0.9rem; line-height: 1.5; margin-bottom: 1.5rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 2.7rem;">
                ${p.bio || 'No bio available for this creator.'}
            </p>

            
        `;
        influencerContainer.appendChild(card);
    });
}

applyFiltersBtn.addEventListener('click', renderInfluencers);

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await insforge.auth.signOut();
    window.location.href = '/index.html';
});
