import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    return {
      server: {
        host: true,
        port: 5173,
        proxy: {
          // WebSocket 代理 - 必须放在前面，优先匹配
          '/api/ws': {
            target: 'ws://localhost:3001',
            changeOrigin: true,
            ws: true,
            rewrite: (path) => path
          },
          // 普通 HTTP API 代理
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
            secure: false,
            rewrite: (path) => path
          }
        }
      }
    };
});