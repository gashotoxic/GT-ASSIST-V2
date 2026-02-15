import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('/react-dom/') || id.includes('/react/')) return 'react';
          if (id.includes('/@clerk/')) return 'clerk';
          if (id.includes('/@supabase/')) return 'supabase';
          if (id.includes('/react-markdown/') || id.includes('/remark-gfm/') || id.includes('/micromark') || id.includes('/mdast') || id.includes('/unist')) return 'markdown';
          if (id.includes('/@radix-ui/')) return 'radix';
          if (id.includes('/lucide-react/')) return 'icons';
          if (id.includes('/react-joyride/') || id.includes('/react-paystack/')) return 'integrations';
          return 'vendor';
        },
      },
    },
  },
});
