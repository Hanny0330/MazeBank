#!/usr/bin/env node
// Small Express server to serve the production "browser" output and always
// return index.csr.html for SPA routes (avoids copying files).
const express = require('express');
const path = require('path');
const fs = require('fs');

const argv = require('minimist')(process.argv.slice(2));
const port = argv.p || argv.port || process.env.PORT || 4201;

const app = express();
const browserDir = path.join(__dirname, '..', 'dist', 'MazeBankProject', 'browser');
const indexFile = path.join(browserDir, 'index.csr.html');

if (!fs.existsSync(browserDir)) {
  console.error('Browser folder not found at', browserDir);
  process.exit(1);
}

if (!fs.existsSync(indexFile)) {
  console.error('index.csr.html not found in browser folder. Run `npx ng build --configuration production` first.');
  process.exit(1);
}

// Try to add /api proxy to backend for convenience when serving frontend from a different port
try {
  const { createProxyMiddleware } = require('http-proxy-middleware');
  app.use('/api', createProxyMiddleware({ target: 'http://localhost:3000', changeOrigin: true }));
  console.log('Proxy /api -> http://localhost:3000 enabled');
} catch (e) {
  console.warn('http-proxy-middleware not installed; /api requests will be served from the same origin. Install it with `npm install http-proxy-middleware` to enable proxy.');
}

// Try to remap paths so that resources referenced under subpaths (e.g. /login/styles-...)
// will still be served from the browser root. This middleware rewrites the request
// URL to a candidate path if the original path doesn't exist on disk.
app.use((req, res, next) => {
  try {
    const fileOnDisk = path.join(browserDir, decodeURIComponent(req.path.replace(/\?.*$/, '')));
    if (fs.existsSync(fileOnDisk)) return next();

    // If the request is like /someRoute/asset.css and the asset actually lives at /asset.css
    // try stripping the first path segment and use that instead.
    const stripped = req.path.replace(/^\/[^\/]+/, '') || '/';
    const candidate = path.join(browserDir, decodeURIComponent(stripped.replace(/\?.*$/, '')));
    if (fs.existsSync(candidate)) {
      req.url = stripped + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '');
    }
  } catch (e) {
    // ignore and continue
  }
  return next();
});

// Also serve legacy /public/* requests from the browser folder root (maps /public/icons -> browser/icons)
app.use('/public', express.static(browserDir));

app.use(express.static(browserDir, { extensions: ['html', 'htm'] }));

// Diagnostic logging middleware to help debug 404s
app.use((req, res, next) => {
  try {
    const reqPath = decodeURIComponent(req.path || '/');
    const fileOnDisk = path.join(browserDir, reqPath.replace(/^[\\/]+/, ''));
    const exists = fs.existsSync(fileOnDisk);
    console.log(new Date().toISOString(), req.method, req.url, '-> fileOnDisk=', fileOnDisk, 'exists=', exists);
  } catch (e) {
    console.log('Error in diagnostic middleware', e && e.message);
  }
  next();
});
    
    // Redirect the root URL to the login route so the browser opens the Login page
    app.get('/', (req, res) => {
      return res.redirect('/login');
    });

// For SPA routes, always return index.csr.html using a middleware fallback
app.use((req, res) => {
  res.sendFile(indexFile);
});

app.listen(port, () => {
  console.log(`Serving browser output from ${browserDir} on http://localhost:${port}`);
});
