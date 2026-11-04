const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const root=path.join(__dirname,'site');
const lan=process.argv.includes('--rede');
const host=lan?'0.0.0.0':'127.0.0.1';
const port=Number(process.env.PORT)||8790;
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end()}
 let name;try{name=decodeURIComponent(new URL(req.url,'http://localhost').pathname)}catch{res.writeHead(400);return res.end()}
 const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 fs.stat(file,(err,stat)=>{
  if(err||!stat.isFile()){res.writeHead(404);return res.end('Arquivo não encontrado')}
  const headers={'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; worker-src 'self' blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"};
  res.writeHead(200,headers);if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);
 });
});
server.on('error',e=>{console.error('Não foi possível iniciar:',e.message);process.exitCode=1});
server.listen(port,host,()=>{
 console.log(`\nHOLOARQUIVO STAR WARS\nNeste PC: http://127.0.0.1:${port}\n`);
 if(lan){for(const values of Object.values(os.networkInterfaces()))for(const n of values||[])if(n.family==='IPv4'&&!n.internal)console.log(`Na mesma rede Wi-Fi: http://${n.address}:${port}`);console.log('\nAcesso permitido aos dispositivos da rede. Use apenas sua rede de confiança.');}
 console.log('Mantenha esta janela aberta. Ctrl+C para encerrar.');
});
