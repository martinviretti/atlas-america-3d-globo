// Servidor estático mínimo (sin dependencias) para desarrollo/preview.
// Uso: node tools/serve.mjs [puerto]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = Number(process.argv[2]) || 8080;
const MIME = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8', '.geojson':'application/json; charset=utf-8',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.woff2':'font/woff2', '.map':'application/json',
};
http.createServer((req,res)=>{
  try{
    let p = decodeURIComponent(req.url.split('?')[0]);
    if(p==='/') p='/index.html';
    const fp = path.join(ROOT, path.normalize(p));
    if(!fp.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden');}
    fs.readFile(fp,(err,data)=>{
      if(err){res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});return res.end('404 Not Found: '+p);}
      res.writeHead(200,{'Content-Type':MIME[path.extname(fp).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});
      res.end(data);
    });
  }catch(e){res.writeHead(500);res.end('500');}
}).listen(PORT,()=>console.log(`Atlas América 3D en http://localhost:${PORT}`));
