import { insforge } from './lib/insforge.js';

let currentUser = null;

const form = document.getElementById('brand-setup-form');
const brandNameInput = document.getElementById('brand-name');
const websiteInput = document.getElementById('website');
const industryInput = document.getElementById('industry');
const descriptionInput = document.getElementById('description');
const submitBtn = document.getElementById('submit-btn');
const messageEl = document.getElementById('setup-message');

function showMessage(msg, type = 'error') {
  messageEl.textContent = msg;
  messageEl.style.display = 'block';
  messageEl.className = `mt-4 mb-4 text-center ${type}`;
}

// Check session on load
window.addEventListener('DOMContentLoaded', async () => {
    const { data } = await insforge.auth.getCurrentUser();
    
    if (!data?.user) {
        window.location.href = '/brand_auth.html';
        return;
    }

    currentUser = data.user;

    // Verify role - only bounce if already an INFLUENCER
    const { data: profile } = await insforge.database
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .single();
        
    if (profile?.role === 'INFLUENCER') {
        window.location.href = '/dashboard.html';
        return;
    }

    // Check if brand profile already exists
    const { data: brandProfile } = await insforge.database
        .from('brand_profiles_new')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

    if (brandProfile) {
        // Redirect to dashboard
        window.location.href = '/brand_dashboard.html';
    }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving...';
  showMessage('', '');

  let website = websiteInput.value.trim();
  if (website && !website.startsWith('http://') && !website.startsWith('https://')) {
      website = 'https://' + website;
  }

  const payload = {
    user_id: currentUser.id,
    brand_name: brandNameInput.value.trim(),
    website: website,
    industry: industryInput.value,
    description: descriptionInput.value.trim()
  };

  try {
    // 1. Create/Update Brand Profile
    const { error: brandErr } = await insforge.database
        .from('brand_profiles_new')
        .upsert(payload, { onConflict: 'user_id' });

    if (brandErr) throw brandErr;

    // 2. Ensure role is set to BRAND in main profiles table
    await insforge.database
        .from('profiles')
        .upsert({ id: currentUser.id, role: 'BRAND' });

    showMessage('Brand profile completed!', 'success');
    setTimeout(() => {
        window.location.href = '/brand_dashboard.html';
    }, 1000);

  } catch (err) {
    showMessage(err.message || 'An error occurred', 'error');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Complete Setup';
  }
});
