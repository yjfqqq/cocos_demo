const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../build/demo-web');
const port = Number(process.env.DEMO_PORT || 4173);
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.ttf': 'font/ttf', '.wasm': 'application/wasm', '.bin': 'application/octet-stream' };
if (!fs.existsSync(path.join(root, 'index.html'))) throw new Error('Build the web-mobile Demo first.');
http.createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204).end(); return; }
    let filename;
    try { filename = path.resolve(root, '.' + decodeURIComponent(new URL(request.url, 'http://localhost').pathname)); }
    catch { response.writeHead(400).end(); return; }
    if (filename !== root && !filename.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    if (filename === root) filename = path.join(root, 'index.html');
    fs.readFile(filename, (error, data) => {
        if (error) { response.writeHead(404).end(); return; }
        response.writeHead(200, { 'Content-Type': mime[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(data);
    });
}).listen(port, '127.0.0.1', () => console.log(`Demo ready at http://127.0.0.1:${port}`));
