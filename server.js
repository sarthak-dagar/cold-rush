const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.webp': 'image/webp'
};

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(ORDERS_FILE)) fs.writeFileSync(ORDERS_FILE, '[]');

function readOrders() {
  try { return JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8') || '[]'); }
  catch { return []; }
}

function writeOrders(orders) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  // API routes
  if (url === '/api/orders' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(readOrders()));
  }

  if (url === '/api/orders' && method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const order = JSON.parse(body);
        const orders = readOrders();
        orders.unshift(order);
        writeOrders(orders);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  if (url.startsWith('/api/orders/') && method === 'PATCH') {
    const id = parseInt(url.split('/')[3]);
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const { status } = JSON.parse(body);
        const orders = readOrders();
        const order = orders.find(o => o.id === id);
        if (order) {
          order.status = status;
          writeOrders(orders);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } else {
          res.writeHead(404);
          res.end('Order not found');
        }
      } catch {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
    return;
  }

  // Static files
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
