import { insforge } from './lib/insforge.js';

const ADMIN_EMAIL = 'influencerbrandcollaboration@gmail.com';

const form = document.getElementById('admin-login-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const messageEl = document.getElementById('admin-message');

function showMessage(msg, type = 'error') {
  messageEl.textContent = msg;
  messageEl.style.display = 'block';
  messageEl.className = `mt-4 text-center ${type}`;
}

window.addEventListener('DOMContentLoaded', async () => {
  const storedToken = sessionStorage.getItem('admin_token');
  if (storedToken) {
    window.location.href = '/admin_dashboard.html';
    return;
  }

  const { data } = await insforge.auth.getCurrentUser();
  if (data?.user) {
    const { data: profile } = await insforge.database
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profile?.role === 'ADMIN' || data.user.email === ADMIN_EMAIL) {
      sessionStorage.setItem('admin_token', 'valid');
      window.location.href = '/admin_dashboard.html';
    }
  }
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showMessage('Please enter email and password.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';
  showMessage('', '');

  try {
    const baseUrl = import.meta.env.VITE_INSFORGE_URL || 'https://y74647nz.ap-southeast.insforge.app';

    const response = await fetch(`${baseUrl}/functions/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Invalid credentials');
    }

    if (result.success && result.access_token) {
      sessionStorage.setItem('admin_token', result.access_token);
      sessionStorage.setItem('admin_user', JSON.stringify(result.user));

      showMessage('Login successful! Redirecting...', 'success');
      setTimeout(() => {
        window.location.href = '/admin_dashboard.html';
      }, 800);
    }
  } catch (err) {
    showMessage(err.message || 'Invalid credentials');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login to Console';
  }
});
