import { getBrandProfileByUserId, getCampaignsByBrandId } from './lib/adminApi.js';

const urlParams = new URLSearchParams(window.location.search);
const brandId = urlParams.get('id');

const loadingEl = document.getElementById('loading');
const contentEl = document.getElementById('content');
const brandNameEl = document.getElementById('brand-name');
const brandEmailEl = document.getElementById('brand-email');
const brandIndustryEl = document.getElementById('brand-industry');
const brandWebsiteEl = document.getElementById('brand-website');
const brandDescriptionEl = document.getElementById('brand-description');
const campaignList = document.getElementById('campaign-list');

window.addEventListener('DOMContentLoaded', async () => {
    const adminToken = sessionStorage.getItem('admin_token');
    if (!adminToken) {
        window.location.href = '/admin/login.html';
        return;
    }

    if (!brandId) {
        loadingEl.textContent = 'No brand ID provided.';
        return;
    }

    try {
        const [brandProfileResult, campaignsResult] = await Promise.all([
            getBrandProfileByUserId(brandId),
            getCampaignsByBrandId(brandId)
        ]);

        const brandProfile = Array.isArray(brandProfileResult) ? brandProfileResult[0] : null;
        const campaigns = Array.isArray(campaignsResult) ? campaignsResult : [];

        if (!brandProfile) {
            loadingEl.textContent = 'Brand profile not found.';
            return;
        }

        brandNameEl.textContent = brandProfile.brand_name || 'Anonymous Brand';
        brandEmailEl.textContent = brandProfile.user_id;
        brandIndustryEl.textContent = brandProfile.industry || 'Other';
        brandWebsiteEl.href = brandProfile.website || '#';
        brandWebsiteEl.textContent = brandProfile.website || 'No website link provided';
        brandDescriptionEl.textContent = brandProfile.description || 'No description available.';

        renderCampaigns(campaigns);

        loadingEl.style.display = 'none';
        contentEl.style.display = 'block';
    } catch (err) {
        loadingEl.textContent = 'Error loading brand: ' + err.message;
    }
});

function renderCampaigns(campaigns) {
    if (campaigns.length === 0) {
        campaignList.innerHTML = '<p class="subtitle">No promotion requests found for this brand.</p>';
        return;
    }

    campaignList.innerHTML = '';
    campaigns.forEach(cp => {
        const card = document.createElement('div');
        card.className = 'glass-panel';
        card.style.padding = '1.5rem';

        card.innerHTML = `
            <div class="flex-between mb-4">
                <div>
                   <h3 style="margin-bottom: 0.2rem;">${cp.product_name}</h3>
                   <span class="pill" style="border-color: #ec4899; color: #ec4899; font-size: 0.65rem;">${cp.platform ? cp.platform.toUpperCase() : 'N/A'}</span>
                </div>
                <span class="pill" style="border-color: ${cp.status === 'active' ? '#10b981' : '#f59e0b'}; color: ${cp.status === 'active' ? '#10b981' : '#f59e0b'};">
                    ${cp.status.toUpperCase()}
                </span>
            </div>
            
            <p class="subtitle mb-4 text-sm" style="font-size: 0.85rem;">${cp.description || 'No description.'}</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; font-size: 0.85rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                <div>
                    <span style="color: var(--text-muted);">Budget:</span><br/>
                    <strong>${cp.budget_min || 'N/A'}</strong>
                </div>
                <div>
                    <span style="color: var(--text-muted);">Deadline:</span><br/>
                    <strong>${cp.deadline ? new Date(cp.deadline).toLocaleDateString() : 'N/A'}</strong>
                </div>
            </div>
        `;
        campaignList.appendChild(card);
    });
}
