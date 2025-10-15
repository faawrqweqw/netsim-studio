
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      server: {
        host: true,
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            ws: true
          }
        }
      }
    };
});
