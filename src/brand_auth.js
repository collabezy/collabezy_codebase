import { insforge } from './lib/insforge.js';

let isLoginMode = true;
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleModeBtn = document.getElementById('toggle-mode-btn');
const toggleText = document.getElementById('toggle-text');
const messageEl = document.getElementById('auth-message');
const googleBtn = document.getElementById('google-login-btn');

function showMessage(msg, type = 'error') {
  messageEl.textContent = msg;
  messageEl.style.display = 'block';
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
            
        if (profile?.role === 'BRAND') {
            window.location.href = '/brand_dashboard.html';
        } else if (profile?.role === 'INFLUENCER') {
            // If they are on the BRAND auth page but are an INFLUENCER, stay here and show option to logout
            const logoutLink = document.createElement('div');
            logoutLink.innerHTML = `<p class="mt-4" style="color: var(--error); font-size: 0.9rem;">
                You are currently logged in as an Influencer.<br/>
                <a href="#" id="force-logout" style="text-decoration: underline; color: white;">Log out</a> to use a Brand account.
            </p>`;
            document.getElementById('auth-form').prepend(logoutLink);
            document.getElementById('force-logout').addEventListener('click', async (e) => {
                e.preventDefault();
                await insforge.auth.signOut();
                window.location.reload();
            });
        } else {
            // No role assigned yet - since they are on the BRAND portal, assume they want BRAND
            window.location.href = '/brand_dashboard.html';
        }
    }
});

// Google OAuth
googleBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  googleBtn.disabled = true;
  googleBtn.textContent = 'Redirecting...';
  try {
    const { error } = await insforge.auth.signInWithOAuth({
      provider: 'google',
      redirectTo: window.location.origin + '/brand_auth.html'
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
    document.getElementById('auth-title').textContent = 'Brand Login';
    document.getElementById('auth-subtitle').textContent = 'Sign in to manage your campaigns';
    toggleText.textContent = "Don't have a brand account?";
    toggleModeBtn.textContent = 'Sign Up';
  } else {
    submitBtn.textContent = 'Sign Up';
    document.getElementById('auth-title').textContent = 'Brand Signup';
    document.getElementById('auth-subtitle').textContent = 'Create an account for your brand';
    toggleText.textContent = "Already have an account?";
    toggleModeBtn.textContent = 'Login';
  }
  showMessage('', '');
  messageEl.style.display = 'none';
});

// Submit Handler
const form = document.getElementById('auth-form');
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  submitBtn.disabled = true;
  submitBtn.textContent = 'Authenticating...';
  showMessage('', '');

  try {
    if (isLoginMode) {
      const { data, error } = await insforge.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data.user) {
        // Check role
        const { data: profile } = await insforge.database
            .from('profiles')
            .select('role')
            .eq('id', data.user.id)
            .single();

        if (profile?.role === 'INFLUENCER') {
            throw new Error("This account is registered as an Influencer. Please use the Influencer login.");
        }

        showMessage('Login successful!', 'success');
        setTimeout(() => {
          window.location.href = '/brand_dashboard.html';
        }, 1000);
      }
    } else {
      submitBtn.textContent = 'Creating account...';
      submitBtn.disabled = true;
      
      try {
        const { data, error } = await insforge.auth.signUp({ email, password });
        
        if (error) {
          showMessage(error.message || 'Signup failed', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign Up';
          return;
        }

        console.log('Signup response:', data);
        
        if (data.requireEmailVerification) {
          sessionStorage.setItem('pending_verification_email', email);
          sessionStorage.setItem('pending_role', 'BRAND');
          showMessage('Verification email sent! Redirecting...', 'success');
          setTimeout(() => {
            window.location.href = '/verify_email.html';
          }, 500);
        } else {
          sessionStorage.setItem('pending_verification_email', email);
          sessionStorage.setItem('pending_role', 'BRAND');
          window.location.href = '/brand_setup.html';
        }
      } catch (err) {
        console.error('Signup error:', err);
        showMessage(err.message || 'An error occurred', 'error');
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sign Up';
    }
  } catch (err) {
    showMessage(err.message || 'An error occurred', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
  }
});
