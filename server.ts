import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import handler from './api/extract-ktp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Dev server must always run on port 3000 per environment constraints
  const distPath = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.resolve(distPath, 'index.html');
  const isProd = process.env.NODE_ENV === 'production' || (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distIndexHtml));
  const PORT = Number(process.env.PORT || 3000);

  // Support JSON request body up to 50mb for base64 images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/healthz', (_req, res) => {
    res.status(200).send('OK');
  });

  // API endpoint for KTP extraction
  app.post('/api/extract-ktp', async (req, res) => {
    try {
      await handler(req, res);
    } catch (err: any) {
      console.error('Unhandled route error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Server error' });
      }
    }
  });

  if (isProd && fs.existsSync(distIndexHtml)) {
    app.use(express.static(distPath));
    // In Express 5, wildcard string '*' throws PathError. Use middleware fallback for SPA HTML5 history routing.
    app.use((_req, res) => {
      res.sendFile(distIndexHtml);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (isProd: ${isProd})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
