import { createClient } from '@insforge/sdk';

const APP_KEY = 'y74647nz';
const REGION = 'ap-southeast';
const PROJECT_URL = `https://${APP_KEY}.${REGION}.insforge.app`;

// Anon key - set this in Vercel env vars as VITE_INSFORGE_ANON_KEY
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3OC0xMjM0LTU2NzgtOTBhYi1jZGVmMTIzNDU2NzgiLCJlbWFpbCI6ImFub25AaW5zZm9yZ2UuY29tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMjU3NjJ9.baH9CTvqRn4SLSPU8Is9KhoupSNDBqK0ue34710KDsY';

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL || PROJECT_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY || ANON_KEY
});
