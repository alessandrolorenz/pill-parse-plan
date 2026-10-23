const http = require('http');
const https = require('https');

const TARGET = 'ekqygszihajwzeztdbqq.supabase.co';
const PORT = 54321;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const headers = { ...req.headers, host: TARGET };

  const options = {
    hostname: TARGET,
    port: 443,
    path: req.url,
    method: req.method,
    headers,
    rejectUnauthorized: false,
  };

  const proxyReq = https.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err);
    res.writeHead(502);
    res.end(JSON.stringify({ error: err.message }));
  });

  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Supabase Local Proxy rodando na porta ${PORT} -> https://${TARGET}`);
});
