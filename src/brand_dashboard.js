import { insforge } from './lib/insforge.js';

let currentUser = null;
let brandProfile = null;

const welcomeText = document.getElementById('welcome-text');
const logoutBtn = document.getElementById('logout-btn');
const campaignForm = document.getElementById('campaign-form');
const campaignsContainer = document.getElementById('campaigns-container');
const activeCountEl = document.getElementById('active-count');
const draftCountEl = document.getElementById('draft-count');
const campaignCreator = document.getElementById('promotion-creator');
const showFormBtn = document.getElementById('show-campaign-form-btn');
const cancelFormBtn = document.getElementById('cancel-campaign-btn');

const productName = document.getElementById('product-name');
const campaignDescription = document.getElementById('campaign-description');
const budgetInput = document.getElementById('budget');
const deadlineInput = document.getElementById('deadline');
const campaignMsg = document.getElementById('campaign-msg');

window.addEventListener('DOMContentLoaded', async () => {
    // 1. Verify User Session
    const { data: userData, error: userError } = await insforge.auth.getCurrentUser();
    
    if (userError || !userData?.user) {
        window.location.href = '/brand_auth.html';
        return;
    }

    currentUser = userData.user;

    // Check Role
    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
        
    if (profile?.role === 'ADMIN') {
        window.location.href = '/admin_dashboard.html';
        return;
    } else if (profile?.role === 'INFLUENCER') {
        // Instead of immediate redirect, show a warning so the user knows what's happening
        document.body.innerHTML = `
            <div style="height: 100vh; display: flex; align-items: center; justify-content: center; background: #0b0f19; color: white; text-align: center; font-family: sans-serif;">
                <div class="glass-panel" style="padding: 2rem; max-width: 400px; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; background: rgba(22,28,45,0.8);">
                    <h2 style="color: #ef4444; margin-bottom: 1rem;">Influencer Account Detected</h2>
                    <p style="color: #94a3b8; margin-bottom: 2rem;">This account is registered as an Influencer. To use the Brand Portal, please log out and use a Brand account.</p>
                    <div style="display: flex; gap: 1rem; flex-direction: column;">
                        <button id="go-influencer" class="btn btn-primary">Go to Influencer Dashboard</button>
                        <button id="go-logout" class="btn btn-secondary">Log Out & Create Brand Account</button>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('go-influencer').addEventListener('click', () => window.location.href = '/dashboard.html');
        document.getElementById('go-logout').addEventListener('click', async () => {
            await insforge.auth.signOut();
            window.location.href = '/brand_auth.html';
        });
        return;
    }

    // 3. Fetch Brand Profile
    const { data: bProfile, error: bError } = await insforge.database
        .from('brand_profiles_new')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (!bProfile) {
        window.location.href = '/brand_setup.html';
        return;
    }

    brandProfile = bProfile;
    welcomeText.textContent = `Hello, ${brandProfile.brand_name}`;
    
    // 4. Toggle Form Logic
    const showForm = () => {
        campaignCreator.style.display = 'block';
        campaignCreator.scrollIntoView({ behavior: 'smooth' });
    };

    showFormBtn.addEventListener('click', showForm);
    document.getElementById('nav-campaigns').addEventListener('click', (e) => {
        e.preventDefault();
        showForm();
    });

    cancelFormBtn.addEventListener('click', () => {
        campaignCreator.style.display = 'none';
        campaignForm.reset();
        campaignMsg.style.display = 'none';
    });

    // 5. Load Campaigns
    await loadCampaigns();
});

async function loadCampaigns() {
    const { data: campaigns, error } = await insforge.database
        .from('promotion_requests')
        .select('*')
        .eq('brand_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading promotion requests:", error);
        return;
    }

    for (const campaign of campaigns) {
        const { data: tickets } = await insforge.database
            .from('tickets')
            .select('id')
            .eq('promotion_request_id', campaign.id);
        campaign.hasCollabRequests = tickets && tickets.length > 0;
    }

    renderCampaigns(campaigns);
}

function renderCampaigns(campaigns) {
    if (!campaigns || campaigns.length === 0) {
        campaignsContainer.innerHTML = '<p class="subtitle text-center">No promotion requests created yet.</p>';
        activeCountEl.textContent = '0';
        draftCountEl.textContent = '0';
        return;
    }

    let activeCount = 0;
    let draftCount = 0;

    campaignsContainer.innerHTML = '';
    
    campaigns.forEach(campaign => {
        if (campaign.status === 'active') activeCount++;
        if (campaign.status === 'draft') draftCount++;

        const el = document.createElement('div');
        el.className = 'glass-panel mb-4';
        el.style.padding = '1.5rem';
        
        const platforms = campaign.platform ? campaign.platform.split(',').filter(p => p !== '') : [];
        let platformTag = platforms.map(p => `<span class="pill" style="border-color: #8b5cf6; color: #8b5cf6; margin-right: 0.3rem;">${p.toUpperCase()}</span>`).join('');
        let statusColor = campaign.status === 'active' ? '#10b981' : '#f59e0b';
        
        el.innerHTML = `
            <div class="flex-between mb-4">
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <h3 style="font-size: 1.25rem;">${campaign.product_name}</h3>
                    ${platformTag}
                </div>
                <div style="display: flex; gap: 0.5rem; align-items: center;">
                    <span class="pill" style="border-color: ${statusColor}; color: ${statusColor};">${campaign.status.toUpperCase()}</span>
                    ${!campaign.hasCollabRequests ? `<button class="btn btn-secondary btn-sm" onclick="removeCampaign('${campaign.id}')" style="padding: 0.25rem 0.5rem; border-color: rgba(239,68,68,0.3); color: #ef4444; background: rgba(239,68,68,0.05);">🗑️</button>` : ''}
                </div>
            </div>
            <p class="subtitle mb-4">${campaign.description || 'No description.'}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; font-size: 0.85rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05);">
                <div>
                   <span style="color: var(--text-muted);">Budget:</span><br/>
                   <strong>${campaign.budget_min || 'N/A'}</strong>
                </div>
                <div>
                   <span style="color: var(--text-muted);">Deadline:</span><br/>
                   <strong>${campaign.deadline ? new Date(campaign.deadline).toLocaleDateString() : 'N/A'}</strong>
                </div>
                <div>
                   <span style="color: var(--text-muted);">Created:</span><br/>
                   <strong>${new Date(campaign.created_at).toLocaleDateString()}</strong>
                </div>
            </div>
        `;
        campaignsContainer.appendChild(el);
    });

    activeCountEl.textContent = activeCount;
    draftCountEl.textContent = draftCount;
}

window.removeCampaign = async (id) => {
    if (!confirm("Are you sure you want to delete this promotion request?")) return;
    
    const { error } = await insforge.database
        .from('promotion_requests')
        .delete()
        .eq('id', id);

    if (error) {
        alert("Error deleting promotion request: " + error.message);
    } else {
        await loadCampaigns();
    }
};

campaignForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const saveBtn = document.getElementById('save-campaign-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Creating...';
    campaignMsg.style.display = 'none';

    const selectedPlatforms = Array.from(document.querySelectorAll('input[name="platform"]:checked'))
        .map(cb => cb.value);
    
    if (selectedPlatforms.length === 0) {
        campaignMsg.textContent = 'Please select at least one platform.';
        campaignMsg.className = 'subtitle error';
        campaignMsg.style.display = 'block';
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create Promotion Request';
        return;
    }

    const payload = {
        brand_id: currentUser.id,
        product_name: productName.value.trim(),
        description: campaignDescription.value.trim(),
        platform: selectedPlatforms.join(','),
        budget_min: budgetInput.value.trim(),
        budget_max: '',
        deadline: deadlineInput.value,
        status: 'active'
    };

    try {
        const { error } = await insforge.database
            .from('promotion_requests')
            .insert([payload]);

        if (error) throw error;

        campaignMsg.textContent = 'Promotion request created successfully!';
        campaignMsg.className = 'subtitle success';
        campaignMsg.style.display = 'block';
        
        setTimeout(async () => {
            campaignForm.reset();
            campaignCreator.style.display = 'none';
            campaignMsg.style.display = 'none';
            await loadCampaigns();
        }, 1500);

    } catch (err) {
        campaignMsg.textContent = err.message || 'Error occurred';
        campaignMsg.className = 'subtitle error';
        campaignMsg.style.display = 'block';
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Create Promotion Request';
    }
});

logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await insforge.auth.signOut();
    window.location.href = '/brand_auth.html';
});
