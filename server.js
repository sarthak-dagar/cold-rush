const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp'
};

http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  let ext = path.extname(filePath);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      filePath = path.join(__dirname, 'index.html');
      ext = '.html';
    }
    fs.readFile(filePath, (err2, data) => {
      if (err2) {
        res.writeHead(500);
        return res.end('Server error');
      }
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(data);
    });
  });
}).listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
