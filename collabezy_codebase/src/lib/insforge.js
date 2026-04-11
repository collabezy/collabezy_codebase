import { createClient } from '@insforge/sdk';

// Uses the API URL and Anon Key from the InsForge Linked Project.
// Wait, we can fetch from process.env, but Vite uses import.meta.env
// Instead of manual injection, I will leave placeholders or hardcode the known config since it's local.
// I have the app key 'y74647nz'. The project uses ap-southeast. 

const APP_KEY = 'y74647nz';
const REGION = 'ap-southeast';
const PROJECT_URL = `https://${APP_KEY}.${REGION}.insforge.app`;
// Wait, I need the anon key. 
// However, the InsForge project properties file usually stores it in .insforge/project.json 
// In dev we usually inject using Vite env vars or fetch from .tmp. Let's export it this way.
// I can fetch it from .insforge/project.json if we make a setup script, but I'll write the JS code to pull from import.meta.env for best practices.

export const insforge = createClient({
  baseUrl: import.meta.env.VITE_INSFORGE_URL || PROJECT_URL,
  anonKey: import.meta.env.VITE_INSFORGE_ANON_KEY || 'dummy_anon_key_to_be_replaced'
});
