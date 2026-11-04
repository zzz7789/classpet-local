import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
export default defineConfig({plugins:[vue()],server:{port:5173,proxy:{'/api':{target:process.env.API_PROXY_TARGET||'http://localhost:5050',changeOrigin:false},'/health':{target:process.env.API_PROXY_TARGET||'http://localhost:5050',changeOrigin:false}}}});
