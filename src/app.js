import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import routes from './routes.js';
import cors from 'cors';
import path from 'path';
import { connectMaster } from './services/dbService.js';
import { startDailyReportScheduler } from './services/schedulerService.js';
import { serve as serveSwagger, setup as setupSwagger } from './swagger.js';

dotenv.config();
const app = express();
app.use(cors());

app.use('/api-docs', serveSwagger, setupSwagger);
app.use('/downloads', express.static('public/downloads'));
app.use('/reports', express.static(path.join(process.cwd(), 'public', 'reports')));
app.use('/faces', express.static(path.join(process.cwd(), 'public', 'faces')));
// ── KSA-style body parsing ────────────────────────────────────────────────────
// Raw buffer for Razorpay-style HMAC webhook validation (keep untouched)
// XML text bodies from Hikvision devices
app.use(express.text({ type: '*/xml' }));
// JSON and plain-text-JSON bodies
app.use(express.json({ limit: '10mb', type: ['application/json', 'text/plain'] }));
app.use(express.urlencoded({ extended: true }));

// Capture raw body for non-JSON, non-multipart requests (e.g. Hikvision XML)
// This sets req.rawBody so the controller can parse it if express.text() missed it
app.use((req, res, next) => {
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json') && !ct.includes('multipart/') && !ct.includes('xml') && !ct.includes('urlencoded')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => { req.rawBody = data; next(); });
  } else {
    next();
  }
});
app.use(morgan('dev'));
app.use('/api', routes);

const PORT = process.env.PORT || 4000;

// Connect to the master database first
connectMaster()
  .then(() => {
    console.log('Master database connected');
    startDailyReportScheduler();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Master database connection error:', err);
  });

// Trigger restart 6

// Handle graceful shutdown
process.on('SIGINT', async () => {
  try {
    console.log('Shutting down server...');
    // Close all database connections
    await import('./services/dbService.js').then(({ closeAllConnections }) => closeAllConnections());
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});