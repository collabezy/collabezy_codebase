import { insforge } from './lib/insforge.js';

let isLoginMode = true;

const form = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const toggleText = document.getElementById('toggle-text');
const messageEl = document.getElementById('auth-message');
const googleBtn = document.getElementById('google-login-btn');

function showMessage(msg, type = 'error') {
  messageEl.textContent = msg;
  messageEl.className = `mt-4 mb-4 text-center ${type}`;
}

// Check session on load
window.addEventListener('DOMContentLoaded', async () => {
    const { data } = await insforge.auth.getCurrentUser();
    if (data?.user) {
        // Fetch role to decide where to go
        const { data: profile } = await insforge.database
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();
            
        if (data.user.email === 'influencerbrandcollab@gmail.com' || profile?.role === 'ADMIN') {
            window.location.href = '/admin_dashboard.html';
        } else if (profile?.role === 'BRAND') {
            window.location.href = '/brand_dashboard.html';
        } else {
            window.location.href = '/dashboard.html';
        }
    }
});

// Google OAuth
googleBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  googleBtn.disabled = true;
  googleBtn.textContent = 'Redirecting...';
  try {
    const { data, error } = await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin + '/auth.html'
    });
    if (error) throw error;
  } catch (err) {
    showMessage(err.message || 'Google Auth failed', 'error');
    googleBtn.disabled = false;
    googleBtn.textContent = 'Continue with Google';
  }
});

toggleModeBtn.addEventListener('click', (e) => {
  e.preventDefault();
  isLoginMode = !isLoginMode;
  if (isLoginMode) {
    submitBtn.textContent = 'Login';
    toggleText.textContent = "Don't have an account?";
    toggleModeBtn.textContent = 'Sign Up';
  } else {
    submitBtn.textContent = 'Sign Up';
    toggleText.textContent = "Already have an account?";
    toggleModeBtn.textContent = 'Login';
  }
  showMessage('', '');
});

// Submit Handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Processing...';
  showMessage('', '');

  try {
    if (isLoginMode) {
      const { data, error } = await insforge.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data.user) {
        showMessage('Login successful!', 'success');
        
        const { data: profile } = await insforge.database
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        setTimeout(() => {
          if (data.user.email === 'influencerbrandcollab@gmail.com' || profile?.role === 'ADMIN') {
            window.location.href = '/admin_dashboard.html';
          } else if (profile?.role === 'BRAND') {
            window.location.href = '/brand_dashboard.html';
          } else {
            window.location.href = '/dashboard.html';
          }
        }, 1000);
      }
    } else {
      const { data, error } = await insforge.auth.signUp({
        email,
        password
      });

      if (error) throw error;

      // Handle sign up success
      if (data.user && !data.requireEmailVerification) {
          showMessage('Account created successfully!', 'success');
          
          setTimeout(() => {
            window.location.href = '/dashboard.html';
          }, 1000);
      } else if (data.user) {
          showMessage('Signup successful! Please check your email to verify.', 'success');
      }
    }
  } catch (err) {
    if (err.message?.includes('Email not confirmed')) {
      showMessage('Email verification required. Please check your inbox.', 'error');
    } else {
      showMessage(err.message || 'An error occurred', 'error');
    }
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
  }
});
