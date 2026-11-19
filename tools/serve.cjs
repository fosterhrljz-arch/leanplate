// Optional loopback-only preview. The app also opens directly from index.html.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.csv':'text/csv','.md':'text/plain'};
http.createServer((req,res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const target = path.resolve(root,'.'+(rel === '/' ? '/index.html' : rel));
  if (!target.startsWith(root+path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(target,(err,data) => {
    if (err) {res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':(types[path.extname(target)]||'application/octet-stream')+'; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);
  });
}).listen(4178,'127.0.0.1',() => console.log('LeanPlate: http://127.0.0.1:4178'));
