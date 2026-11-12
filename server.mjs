/* Tiny zero-dependency development server. Node.js 18+ */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.txt':'text/plain; charset=utf-8' };
const server = createServer(async (req, res) => {
  try {
    const route = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + (route === '/' ? '/index.html' : route));
    if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403); res.end('Forbidden'); return; }
    const details = await stat(target);
    if (!details.isFile()) throw new Error('Not a file');
    const body = await readFile(target);
    res.writeHead(200, { 'Content-Type': mime[extname(target)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
    res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
});
const port = Number(process.env.PORT || 5173);
server.listen(port, '127.0.0.1', () => { process.stdout.write(`Atlas UI → http://127.0.0.1:${port}\n`); });
