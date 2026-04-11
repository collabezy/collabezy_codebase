import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        brand_auth: resolve(__dirname, 'brand_auth.html'),
        admin_auth: resolve(__dirname, 'admin_auth.html'),
        admin_login: resolve(__dirname, 'admin/login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        brand_dashboard: resolve(__dirname, 'brand_dashboard.html'),
        brand_setup: resolve(__dirname, 'brand_setup.html'),
        brand_requests: resolve(__dirname, 'brand_requests.html'),
        brand_deal_detail: resolve(__dirname, 'brand_deal_detail.html'),
        discover: resolve(__dirname, 'discover.html'),
        influencer_detail: resolve(__dirname, 'influencer_detail.html'),
        collab_requests: resolve(__dirname, 'collab_requests.html'),
        deal_detail: resolve(__dirname, 'deal_detail.html'),
        admin_dashboard: resolve(__dirname, 'admin_dashboard.html'),
        admin_influencer_detail: resolve(__dirname, 'admin_influencer_detail.html'),
        admin_brand_detail: resolve(__dirname, 'admin_brand_detail.html')
      }
    }
  }
});
