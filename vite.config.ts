
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, '')
          }
        }
      }
    };
});