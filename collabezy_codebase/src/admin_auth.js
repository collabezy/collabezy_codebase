import { insforge } from './lib/insforge.js';

const ADMIN_EMAIL = 'influencerbrandcollab@gmail.com';
const form = document.getElementById('admin-auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const messageEl = document.getElementById('auth-message');

function showMessage(msg, type = 'error') {
  messageEl.textContent = msg;
  messageEl.style.display = 'block';
  messageEl.className = `mb-4 ${type}`;
}

// Session Check
window.addEventListener('DOMContentLoaded', async () => {
    const { data } = await insforge.auth.getCurrentUser();
    if (data?.user) {
        const { data: profile } = await insforge.database
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profile?.role === 'ADMIN') {
            window.location.href = '/admin_dashboard.html';
        }
    }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (email !== ADMIN_EMAIL) {
    showMessage("Access Denied: unauthorized administrator email.");
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';
  showMessage('', '');

  try {
    // 1. Sign In
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    
    // Emergency Bypass: if it's the admin and verification is required, allow dev login
    if (error && (error.message?.includes('Email not confirmed') || error.message?.includes('verification'))) {
        console.warn("ADMIN BYPASS: Verification pending, using development override.");
        // Store a temporary flag to allow dashboard access
        localStorage.setItem('admin_dev_login', 'true');
        showMessage('Verification pending, logging in via development bypass...', 'success');
        setTimeout(() => {
          window.location.href = '/admin_dashboard.html';
        }, 1500);
        return;
    }

    if (error) {
      // Create account if doesn't exist
      const isInvalid = error.message?.toLowerCase().includes('invalid');
      if (isInvalid) {
          const { data: signUpData, error: signUpErr } = await insforge.auth.signUp({ email, password });
          if (signUpErr) throw signUpErr;
          
          if (signUpData.user) {
            await insforge.database
                .from('profiles')
                .upsert({ id: signUpData.user.id, role: 'ADMIN', full_name: 'System Admin' });
                
            showMessage('Admin account initialized! Logging in...', 'success');
            setTimeout(() => {
                localStorage.setItem('admin_dev_login', 'true');
                window.location.href = '/admin_dashboard.html';
            }, 1000);
            return;
          }
      }
      throw error;
    }

    if (data.user) {
      localStorage.removeItem('admin_dev_login');
      await insforge.database.from('profiles').upsert({ id: data.user.id, role: 'ADMIN' });
      showMessage('Login successful!', 'success');
      setTimeout(() => { window.location.href = '/admin_dashboard.html'; }, 1000);
    }

  } catch (err) {
    showMessage(err.message || 'Authentication failed');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login to Console';
  }
});
