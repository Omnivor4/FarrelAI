import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import apiRoutes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { securityHeaders } from './middlewares/security.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, '../public');

const app = express();

app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '1mb' }));
app.use(express.static(PUBLIC_DIR));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Farrel Persona Chat',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.use('/api', apiRoutes);

app.get('/farrelai', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/admin', (req, res) => {
  res.redirect('/farrelai');
});

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.use(errorHandler);

export default app;
