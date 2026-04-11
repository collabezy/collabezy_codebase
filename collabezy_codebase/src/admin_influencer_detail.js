import { getProfileById, getChannelsByUserId } from './lib/adminApi.js';

const urlParams = new URLSearchParams(window.location.search);
const influencerId = urlParams.get('id');

const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('content');
const avatarEl = document.getElementById('avatar');
const nameEl = document.getElementById('inf-name');
const emailEl = document.getElementById('inf-email');
const categoryEl = document.getElementById('inf-categories');
const bioEl = document.getElementById('inf-bio');
const channelsList = document.getElementById('channels-list');

window.addEventListener('DOMContentLoaded', async () => {
    const adminToken = sessionStorage.getItem('admin_token');
    if (!adminToken) {
        window.location.href = '/admin/login.html';
        return;
    }

    if (!influencerId) {
        loadingEl.textContent = 'No influencer ID provided.';
        return;
    }

    try {
        const [profileResult, channelsResult] = await Promise.all([
            getProfileById(influencerId),
            getChannelsByUserId(influencerId)
        ]);

        const profile = Array.isArray(profileResult) ? profileResult[0] : null;
        const channels = Array.isArray(channelsResult) ? channelsResult : [];

        if (!profile) {
            loadingEl.textContent = 'Influencer profile not found.';
            return;
        }

        nameEl.textContent = profile.name || 'Anonymous';
        emailEl.textContent = profile.user_id;
        bioEl.textContent = profile.bio || 'No bio available.';
        avatarEl.src = profile.avatar_url || 'https://via.placeholder.com/150';

        if (profile.category && Array.isArray(profile.category)) {
            categoryEl.innerHTML = '';
            profile.category.forEach(cat => {
                const span = document.createElement('span');
                span.className = 'pill';
                span.textContent = cat;
                categoryEl.appendChild(span);
            });
        }

        renderChannels(channels);

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    } catch (err) {
        loadingEl.textContent = 'Error loading profile: ' + err.message;
    }
});

function renderChannels(channels) {
    if (channels.length === 0) {
        channelsList.innerHTML = '<p class="subtitle">No social accounts linked.</p>';
        return;
    }

    channelsList.innerHTML = '';
    channels.forEach(ch => {
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '1.5rem';

        card.innerHTML = `
            <div class="flex-between mb-4">
                <div>
                   <h3 style="margin-bottom: 0.2rem;">${ch.platform.toUpperCase()}</h3>
                   <p class="subtitle" style="font-size: 0.8rem;">${ch.channel_name}</p>
                </div>
                <span class="pill" style="border-color: ${ch.verified ? '#10b981' : '#f59e0b'}; color: ${ch.verified ? '#10b981' : '#f59e0b'};">
                    ${ch.verified ? 'VERIFIED' : 'PENDING'}
                </span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.85rem;">
                <div>
                    <span style="color: var(--text-muted);">Followers:</span><br/>
                    <strong>${ch.followers || '0'}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Avg Views:</span><br/>
                    <strong>${ch.avg_views || '0'}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Engagement:</span><br/>
                    <strong>${ch.engagement_rate || 0}%</strong>
                </div>
            </div>
        `;
        channelsList.appendChild(card);
    });
}
