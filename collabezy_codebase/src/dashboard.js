// Make sure to use VITE_INSFORGE_URL and ANON key if they were injected, otherwise use the defaults we specified.
import { insforge } from './lib/insforge.js';
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

let currentUser = null;

// UI Elements
const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');
const profileBanner = document.getElementById('profile-banner');
const profileFormContainer = document.getElementById('profile-form-container');
const profileForm = document.getElementById('profile-form');
const editProfileBtn = document.getElementById('edit-profile-btn');
const cancelProfileBtn = document.getElementById('cancel-profile-btn');
const avatarUpload = document.getElementById('avatar-upload');
const profAvatar = document.getElementById('prof-avatar');
const profileMsg = document.getElementById('profile-msg');

// Profile Info UI
const profName = document.getElementById('prof-name');
const profBio = document.getElementById('prof-bio');
const profCategories = document.getElementById('prof-categories');
const inputFullName = document.getElementById('full-name');
const inputBio = document.getElementById('bio');
const inputCategories = document.getElementById('categories');
const inputContentTypes = document.getElementById('content-types');
const inputUpiId = document.getElementById('upi-id');

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify User Session
    const { data, error } = await insforge.auth.getCurrentUser();
    
    if (error || !data?.user) {
        window.location.href = '/auth.html';
        return;
    }

    currentUser = data.user;

    // Check Role
    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
        
    if (currentUser.email === 'influencerbrandcollab@gmail.com' || profile?.role === 'ADMIN') {
        window.location.href = '/admin_dashboard.html';
        return;
    } else if (profile?.role === 'BRAND') {
        window.location.href = '/brand_dashboard.html';
        return;
    }
    welcomeText.textContent = `Welcome back!`;

    // 2. Fetch Profile Data
    await loadProfile();
    
    // 3. Fetch Channels
    await loadChannels();
});

async function loadProfile() {
    const { data: profile, error } = await insforge.database
      .from('influencer_profiles')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    if (profile) {
        welcomeText.textContent = `Hello, ${profile.name || 'Influencer'}`;
        profName.textContent = profile.name || 'No Name Provided';
        profBio.textContent = profile.bio || 'Your bio goes here.';
        
        profCategories.innerHTML = '';
        if (profile.category && profile.category.length > 0) {
            profile.category.forEach(cat => {
                const span = document.createElement('span');
                span.className = 'pill';
                span.textContent = cat;
                profCategories.appendChild(span);
            });
        }
        
        if (profile.avatar_url) {
            profAvatar.src = profile.avatar_url;
            profAvatar.style.display = 'block';
            
            const headerAvatar = document.getElementById('header-avatar');
            if (headerAvatar) {
                headerAvatar.src = profile.avatar_url;
                headerAvatar.style.display = 'block';
            }
        } else {
            profAvatar.style.display = 'none';
        }

        profileBanner.style.display = 'block';
        profileFormContainer.style.display = 'none';
        cancelProfileBtn.style.display = 'block';

        inputFullName.value = profile.name || '';
        inputBio.value = profile.bio || '';
        inputCategories.value = (profile.category || []).join(', ');
        inputContentTypes.value = (profile.content_types || []).join(', ');
        inputUpiId.value = profile.upi_id || '';
        
    } else {
        profileBanner.style.display = 'none';
        profileFormContainer.style.display = 'block';
    }
}

editProfileBtn.addEventListener('click', () => {
    profileBanner.style.display = 'none';
    profileFormContainer.style.display = 'block';
    profileMsg.textContent = '';
});

cancelProfileBtn.addEventListener('click', () => {
    profileBanner.style.display = 'block';
    profileFormContainer.style.display = 'none';
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await insforge.auth.signOut();
    window.location.href = '/index.html';
});

profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const payload = {
        user_id: currentUser.id,
        name: inputFullName.value,
        bio: inputBio.value,
        category: inputCategories.value.split(',').map(c => c.trim()),
        content_types: inputContentTypes.value.split(',').map(c => c.trim()),
        upi_id: inputUpiId.value.trim() || null
    };

    if (avatarUpload.files.length > 0) {
        const file = avatarUpload.files[0];
        const ext = file.name.split('.').pop();
        const filePath = `${currentUser.id}/avatar.${ext}`;
        
        const { data: uploadData, error: uploadErr } = await insforge.storage.from('avatars').upload(filePath, file, { upsert: true });
        
        if (!uploadErr) {
            const { data: publicUrlData } = await insforge.storage.from('avatars').getPublicUrl(filePath);
            let finalUrl = publicUrlData?.publicUrl || uploadData?.url;

            if (!finalUrl) {
                const baseUrl = insforge.storage.from('avatars').baseUrl || `https://y74647nz.ap-southeast.insforge.app`;
                finalUrl = `${baseUrl}/storage/v1/object/public/avatars/${filePath}`;
            }

            payload.avatar_url = finalUrl;
        } else if (uploadErr) {
            console.error("Storage Error:", uploadErr);
            alert("Image Upload Failed: " + uploadErr.message);
            profileMsg.style.display = 'none';
            return;
        }
    }

    profileMsg.className = 'text-center mt-4';
    profileMsg.textContent = 'Saving...';

    const { data, error } = await insforge.database
      .from('influencer_profiles')
      .upsert(payload, { onConflict: 'user_id' });

    if (error) {
        profileMsg.style.color = 'var(--error)';
        profileMsg.textContent = 'Error: ' + error.message;
    } else {
        profileMsg.style.color = 'var(--success)';
        profileMsg.textContent = 'Profile saved successfully!';
        setTimeout(() => {
            loadProfile();
        }, 800);
    }
});

// Channel UI Elements
const openChannelFormBtn = document.getElementById('open-channel-form-btn');
const closeChannelFormBtn = document.getElementById('close-channel-form-btn');
const channelFormContainer = document.getElementById('channel-form-container');
const addChannelForm = document.getElementById('add-channel-form');
const channelsList = document.getElementById('channels-list');
const emptyChannels = document.getElementById('empty-channels');
const channelMsg = document.getElementById('channel-msg');

const channelPlatform = document.getElementById('channel-platform');
const channelName = document.getElementById('channel-name');
const channelLink = document.getElementById('channel-link');

async function loadChannels() {
    const { data: channels, error } = await insforge.database
        .from('social_accounts')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    channelsList.innerHTML = '';

    if (!channels || channels.length === 0) {
        emptyChannels.style.display = 'block';
        document.getElementById('analytics-section').style.display = 'none';
    } else {
        emptyChannels.style.display = 'none';
        
        const verifiedChannels = channels.filter(c => c.verified === true);
        const trustScore = calculateTrustScore(channels, null);
        const trustInfo = getTrustScoreLabel(trustScore);
        const overallEngagement = calculateOverallEngagementRate(channels);
        const engInfo = getEngagementLabel(overallEngagement);
        const totalFollowers = calculateTotalFollowers(channels);

        const analyticsSection = document.getElementById('analytics-section');
        analyticsSection.style.display = 'block';
        analyticsSection.innerHTML = `
            <div class="glass-panel" style="padding: 2rem;">
                <h2 class="mb-4">Your Analytics</h2>
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
                        <p class="subtitle" style="font-size: 0.75rem;">Verified Channels</p>
                        <p style="font-size: 1.8rem; font-weight: 700; color: #10b981;">${verifiedChannels.length}/${channels.length}</p>
                    </div>
                </div>
            </div>
        `;
        
        channels.forEach(ch => {
            const el = document.createElement('div');
            el.className = 'glass-panel feature-card';
            
            let statusColor = '#94a3b8';
            if (ch.verified === true) statusColor = '#10b981';
            else if (ch.verified === false) statusColor = '#f59e0b';

            let platformIcon = '🔗';
            if (ch.platform === 'youtube') platformIcon = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em" style="color: #ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"></path></svg>`;
            if (ch.platform === 'instagram') platformIcon = `<svg viewBox="0 0 24 24" fill="url(#ig-grad)" height="1em" width="1em"><defs><linearGradient id="ig-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#fdf497"/><stop offset="5%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></linearGradient></defs><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>`;
            if (ch.platform === 'tiktok') platformIcon = `<svg viewBox="0 0 24 24" fill="currentColor" height="1em" width="1em"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;

            el.innerHTML = `
                <div class="flex-between mb-2">
                  <div class="icon" style="font-size: 2rem; margin: 0; padding: 0;">${platformIcon}</div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span class="pill" style="border-color: ${statusColor}; color: ${statusColor};">${ch.verified ? 'VERIFIED' : 'PENDING'}</span>
                    <button class="btn btn-secondary btn-sm" onclick="removeChannel('${ch.id}')" style="padding: 0.1rem 0.5rem; background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 4px;" title="Remove Channel">🗑️</button>
                  </div>
                </div>
                <h3 style="font-size: 1.25rem;">${ch.channel_name}</h3>
                <p class="subtitle mt-2" style="word-break: break-all;">
                  <a href="${ch.channel_url}" target="_blank" style="color: var(--primary);">${ch.channel_url}</a>
                </p>
                
                ${ch.verified === true && ch.followers ? `
                    <div class="mt-4" style="background: rgba(255,255,255,0.05); padding: 0.75rem; border-radius: 8px; font-size: 0.9rem;">
                       <div class="flex-between" style="padding: 0.35rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                         <span style="color: var(--text-muted);">👥 Followers</span>
                         <span style="font-weight: bold; color: var(--text-main);">${Number(ch.followers).toLocaleString()}</span>
                       </div>
                       <div class="flex-between" style="padding: 0.35rem 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
                         <span style="color: var(--text-muted);">👁️ Avg Views</span>
                         <span style="font-weight: bold; color: var(--text-main);">${Number(ch.avg_views || 0).toLocaleString()}</span>
                       </div>
                       <div class="flex-between" style="padding: 0.35rem 0;">
                         <span style="color: var(--text-muted);">📊 Engagement</span>
                         <span style="font-weight: bold; color: var(--text-main);">${ch.engagement_rate || 0}%</span>
                       </div>
                    </div>
                ` : ''}

                ${ch.verified === false ? `
                    ${ch.platform === 'youtube' ? `
                       <div class="mt-4" style="background: rgba(0,0,0,0.3); padding: 0.75rem; border-radius: 8px;">
                         <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem;">Copy the code below, paste it into your channel's 'About' description, and click Verify.</p>
                         <div class="flex-between">
                            <code style="background: rgba(255,255,255,0.1); padding: 0.25rem; border-radius: 4px; font-weight: bold; color: var(--text-main); font-size: 1.1rem; user-select: all;">${ch.verification_code}</code>
                            <button class="btn btn-secondary btn-sm" onclick="copyCode('${ch.verification_code}', this)" style="padding: 0.2rem 0.5rem; font-size:0.8rem;">Copy</button>
                         </div>
                         <button id="verify-btn-${ch.id}" class="btn btn-primary mt-4" style="width: 100%;" onclick="verifyYoutubeChannel('${ch.id}', '${ch.channel_url}', '${ch.verification_code}')">Verify Channel</button>
                       </div>
                    ` : ch.platform === 'instagram' ? `
                       ${ch.verification_status === 'pending' ? `
                          <div class="mt-4" style="background: rgba(236, 72, 153, 0.1); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(236, 72, 153, 0.3);">
                            <p style="font-size: 0.85rem; color: #ec4899; margin-bottom: 0.5rem; font-weight: 600;">📸 Instagram Verification</p>
                            <p style="font-size: 0.8rem; color: #f59e0b; margin-bottom: 0.5rem;">Verification request pending. Please wait for approval.</p>
                          </div>
                       ` : `
                          <div class="mt-4" style="background: rgba(236, 72, 153, 0.1); padding: 0.75rem; border-radius: 8px; border: 1px solid rgba(236, 72, 153, 0.3);">
                            <p style="font-size: 0.85rem; color: #ec4899; margin-bottom: 0.5rem; font-weight: 600;">📸 Instagram Verification</p>
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.75rem;">DM the code below to <strong style="color: #ec4899;">@collabezy</strong> on Instagram to verify your account.</p>
                            <div class="flex-between" style="margin-bottom: 0.75rem;">
                               <code style="background: rgba(255,255,255,0.1); padding: 0.25rem; border-radius: 4px; font-weight: bold; color: var(--text-main); font-size: 1rem; user-select: all;">${ch.verification_code}</code>
                               <button class="btn btn-secondary btn-sm" onclick="copyCode('${ch.verification_code}', this)" style="padding: 0.2rem 0.5rem; font-size:0.8rem;">Copy</button>
                            </div>
                            <a href="https://instagram.com/collabezy" target="_blank" class="btn btn-secondary btn-sm" style="display: inline-block; margin-bottom: 0.5rem; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); border: none; color: white;">Open Instagram</a>
                            <button class="btn btn-primary mt-2" style="width: 100%;" onclick="markAsVerified('${ch.id}')">I've Sent the DM</button>
                          </div>
                       `}
                    ` : `
                       <button class="btn btn-primary mt-4" style="width: 100%; opacity: 0.5; cursor: not-allowed;" title="Platform verification coming soon">Verify Channel (Coming Soon)</button>
                    `}
                ` : ''}
            `;
            channelsList.appendChild(el);
        });
        
        const isVerified = channels.some(ch => ch.verified === true);
        const rawName = profName.textContent.replace(' ✔️ Verified', '');
        if (isVerified) {
            profName.innerHTML = `${rawName} <span style="color: #60a5fa; font-size: 1.2rem; vertical-align: middle;" title="Verified Influencer">✔️ Verified</span>`;
        } else {
            profName.textContent = rawName;
        }
    }
}

// Verification Logic Native Setup
const YOUTUBE_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

function parseYoutubeLink(url) {
    const handleMatch = url.match(/@([^\/\?]+)/);
    if (handleMatch) return { type: 'handle', value: handleMatch[1] };
    
    const channelMatch = url.match(/channel\/([a-zA-Z0-9_\-]+)/);
    if (channelMatch) return { type: 'channelId', value: channelMatch[1] };
    
    return null;
}

window.copyCode = (code, btn) => {
    navigator.clipboard.writeText(code);
    if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
    }
};

window.removeChannel = async (id) => {
    if (!confirm("Are you sure you want to remove this channel?")) return;
    const { error } = await insforge.database.from('social_accounts').delete().eq('id', id);
    if (error) {
        alert("Error removing channel: " + error.message);
    } else {
        loadChannels();
    }
};

window.verifyYoutubeChannel = async (channelId, url, code) => {
    try {
        const parsed = parseYoutubeLink(url);
        if (!parsed) throw new Error("Invalid YouTube URL format. Please ensure it contains an @handle or /channel/ID.");
        
        const btn = document.getElementById(`verify-btn-${channelId}`);
        if(btn) { btn.disabled = true; btn.textContent = "Verifying..."; }

        let ytChannelId;

        // If it's a handle, convert it to a channelId via Search API
        if (parsed.type === 'handle') {
            const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(parsed.value)}&type=channel&key=${YOUTUBE_API_KEY}`);
            const searchData = await searchRes.json();
            
            if (!searchData.items || searchData.items.length === 0) {
                throw new Error("Could not find YouTube channel for this handle.");
            }
            ytChannelId = searchData.items[0].snippet.channelId;
        } else {
            // Already have channelId
            ytChannelId = parsed.value;
        }
        
        // Get channel description and statistics
        const channelRes = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ytChannelId}&key=${YOUTUBE_API_KEY}`);
        const channelData = await channelRes.json();
        
        if (!channelData.items || channelData.items.length === 0) {
            throw new Error("Could not fetch channel details.");
        }
        
        const description = channelData.items[0].snippet.description;
        const stats = channelData.items[0].statistics || {};
        
        if (description && description.includes(code)) {
            const { error } = await insforge.database.from('social_accounts')
                .update({ 
                    verified: true,
                    followers: parseInt(stats.subscriberCount) || 0,
                    avg_views: parseInt(stats.viewCount) || 0
                })
                .eq('id', channelId);
                
            if (error) throw error;
            
            alert("Channel verified successfully!");
            loadChannels();
        } else {
            throw new Error("Verification code not found in channel 'About' description box. Please make sure you saved the description on YouTube before verifying.");
        }
    } catch (err) {
        alert(err.message);
        const btn = document.getElementById(`verify-btn-${channelId}`);
        if(btn) { btn.disabled = false; btn.textContent = "Verify Channel"; }
    }
};

window.markAsVerified = async (channelId) => {
    if (!confirm("Have you sent the verification code as a DM to @collabezy on Instagram?")) return;
    
    try {
        const { error } = await insforge.database.from('social_accounts')
            .update({ verification_status: 'pending' })
            .eq('id', channelId);
            
        if (error) throw error;
        
        alert("Verification requested! Our team will review your Instagram account shortly. You'll be notified once verified.");
        loadChannels();
    } catch (err) {
        alert("Error: " + err.message);
    }
};

openChannelFormBtn.addEventListener('click', () => {
    channelFormContainer.style.display = 'block';
    channelMsg.textContent = '';
});

closeChannelFormBtn.addEventListener('click', () => {
    channelFormContainer.style.display = 'none';
    addChannelForm.reset();
});

addChannelForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    channelMsg.className = 'mt-4 text-center';
    channelMsg.textContent = 'Saving...';
    
    // Generate code
    const vCode = 'VERIFY-' + Math.random().toString(36).substr(2, 6).toUpperCase();

    const newChannel = {
        user_id: currentUser.id,
        platform: channelPlatform.value,
        channel_name: channelName.value.trim(),
        channel_url: channelLink.value.trim(),
        verification_code: vCode,
        verified: false,
        verification_status: null
    };

    const { error } = await insforge.database.from('social_accounts').insert([newChannel]);

    if (error) {
        channelMsg.style.color = 'var(--error)';
        channelMsg.textContent = 'Error: ' + error.message;
    } else {
        channelMsg.style.color = 'var(--success)';
        channelMsg.textContent = 'Channel added successfully!';
        
        setTimeout(() => {
            channelFormContainer.style.display = 'none';
            addChannelForm.reset();
            loadChannels();
        }, 1000);
    }
});
