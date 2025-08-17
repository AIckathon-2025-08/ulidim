import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: './',
  server: {
    host: true,
    port: 3000,
    // Allow tunneling domains like *.ngrok-free.app to prevent 403 (host check)
    allowedHosts: ['localhost', '127.0.0.1', '::1', '.ngrok-free.app'],
    // Proxy API requests to backend server
    proxy: {
      '/api': {
        target: (process.env.VITE_API_URL || 'http://localhost:3001').replace('/api', ''),
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: (process.env.VITE_API_URL || 'http://localhost:3001').replace('/api', ''),
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html'
      }
    }
  },
  assetsInclude: ['**/*.mp3', '**/*.png', '**/*.svg']
});
