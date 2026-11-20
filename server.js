/**
 * AlgoLab - Unified Local Development Server
 * Zero-dependency static file server using Node.js standard libraries.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

function openBrowser(url) {
  // Prevent auto-open if RUNNING_IN_CI or NO_OPEN is set
  if (process.env.NO_OPEN || process.env.CI) return;

  const startCmd =
    process.platform === 'win32'
      ? `start "" "${url}"`
      : process.platform === 'darwin'
      ? `open "${url}"`
      : `xdg-open "${url}"`;

  exec(startCmd, (err) => {
    if (err) {
      console.log(`Note: Browser could not be opened automatically (${err.message}).`);
    }
  });
}

function handleRequest(req, res) {
  // Normalize URL and remove query strings
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Security check: prevent directory traversal
  let safePath = path.normalize(path.join(ROOT_DIR, pathname));
  if (!safePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden: Access denied.');
    return;
  }

  // Check if target is a directory and serve index.html
  fs.stat(safePath, (err, stats) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;padding:32px;"><h2>404 Not Found</h2><p>The requested URL <code>${pathname}</code> was not found on this server.</p><p><a href="/">Return to AlgoLab Hub</a></p></body></html>`);
      return;
    }

    if (stats.isDirectory()) {
      safePath = path.join(safePath, 'index.html');
    }

    fs.readFile(safePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<!DOCTYPE html><html><head><title>404 Not Found</title></head><body style="font-family:sans-serif;padding:32px;"><h2>404 Not Found</h2><p>File not found: <code>${pathname}</code></p><p><a href="/">Return to AlgoLab Hub</a></p></body></html>`);
        return;
      }

      const ext = path.extname(safePath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      });
      res.end(content);
    });
  });
}

function startServer(portToTry) {
  const server = http.createServer(handleRequest);

  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });

  server.listen(portToTry, () => {
    const url = `http://localhost:${portToTry}`;
    console.log('='.repeat(60));
    console.log(`  ALGOLAB - UNIFIED APPLICATION SERVER`);
    console.log('='.repeat(60));
    console.log(`  > Application:    ${url}`);
    console.log(`  > Home Hub:       ${url}/#home`);
    console.log(`  > Path Finder:    ${url}/#pathfinder`);
    console.log(`  > Sudoku Solver:  ${url}/#sudoku`);
    console.log(`  > Serving from:   ${ROOT_DIR}`);
    console.log('='.repeat(60));
    console.log('  Press Ctrl+C to stop the server.');

    openBrowser(url);
  });
}

startServer(PORT);
