const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');

const port = parseInt(process.env.PORT || '5111', 10);
const hostname = '0.0.0.0';
const dev = false;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    const { pathname } = parsedUrl;

    // 런타임 생성 이미지 직접 서빙
    if (pathname.startsWith('/generated/') || pathname.startsWith('/examples/')) {
      const filePath = path.join(process.cwd(), 'public', pathname);
      if (fs.existsSync(filePath)) {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        fs.createReadStream(filePath).pipe(res);
        return;
      }
    }

    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
