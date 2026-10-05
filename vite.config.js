import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// assetsInlineLimit: 0 keeps every font as a real file. Small fonts would
// otherwise be inlined as data: URIs, which the CSP (font-src 'self') blocks.
export default defineConfig({ plugins: [react()], build: { target: 'es2020', assetsInlineLimit: 0 } });
