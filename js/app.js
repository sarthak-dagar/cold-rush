// ===== STATE =====
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
let orderType = 'delivery';
let currentMenuCat = 'all';
let isLogin = true;
let orders = [];
let loggedIn = false;
let adminLoggedIn = localStorage.getItem('adminLoggedIn') === 'true';
let customerId = localStorage.getItem('customerId') || genId();

function genId() {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  localStorage.setItem('customerId', id);
  return id;
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  return res.json();
}

// ===== RENDER FUNCTIONS =====
function renderCategories() {
  document.getElementById('categoryGrid').innerHTML = categories.map(c => `
    <div class="category-tile" onclick="filterMenuBy('${c.id}')">
      <img src="${c.img}" alt="${c.name}" loading="lazy">
      <div class="overlay"></div>
      <div class="label">${c.name}</div>
    </div>
  `).join('');
}

function renderFeatured() {
  const items = featured.map(id => menuItems.find(m => m.id === id)).filter(Boolean);
  document.getElementById('favGrid').innerHTML = items.map(item => `
    <div class="fav-card" onclick="addToCart('${item.id}')">
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <div class="info">
        <div class="badge">Featured</div>
        <h3>${item.name}</h3>
        <p>${item.desc}</p>
        <div class="price">₹${item.price}</div>
      </div>
    </div>
  `).join('');
}

function renderMenuPills() {
  const labels = { all:'All', burgers:'Burgers', sandwiches:'Sandwiches', fries:'French Fries', salads:'Salads', wraps:'Wraps', 'chocolate-bowls':'Chocolate Bowls', combos:'Combos' };
  const cats = ['all', ...new Set(menuItems.map(m => m.category))];
  document.getElementById('menuPills').innerHTML = cats.map(c => `
    <button class="menu-pill ${c === 'all' ? 'active' : ''}" data-cat="${c}" onclick="filterMenuBy('${c}')">${labels[c]}</button>
  `).join('');
}

function renderMenu() {
  const search = (document.getElementById('menuSearch')?.value || '').toLowerCase();
  let items = currentMenuCat === 'all' ? menuItems : menuItems.filter(m => m.category === currentMenuCat);
  if (search) items = items.filter(m => m.name.toLowerCase().includes(search) || m.desc.toLowerCase().includes(search));
  document.getElementById('menuGrid').innerHTML = items.map(item => `
    <div class="menu-item-card">
      <img src="${item.img}" alt="${item.name}" loading="lazy">
      <div class="body">
        <h3>${item.name}</h3>
        <div class="desc">${item.desc}</div>
        <div class="bottom">
          <span class="price">₹${item.price}</span>
          <button onclick="addToCart('${item.id}')">Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

function filterMenu() { renderMenu(); }

function filterMenuBy(cat) {
  currentMenuCat = cat;
  showPage('menu', () => {
    document.querySelectorAll('.menu-pill').forEach(p => p.classList.toggle('active', p.dataset.cat === cat));
    renderMenu();
  });
}

// ===== CART =====
function addToCart(id) {
  const item = menuItems.find(m => m.id === id);
  if (!item) return;
  const existing = cart.find(c => c.id === id);
  if (existing) { existing.qty++; }
  else { cart.push({ ...item, qty: 1 }); }
  saveCart();
  updateCartUI();
}

function removeFromCart(index) { cart.splice(index, 1); saveCart(); updateCartUI(); }

function changeQty(index, delta) {
  cart[index].qty += delta;
  if (cart[index].qty <= 0) cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function updateCartUI() {
  const badge = document.getElementById('cartBadge');
  badge.textContent = cart.reduce((s,c) => s + c.qty, 0);

  const itemsDiv = document.getElementById('cartItems');
  const footer = document.getElementById('cartFooter');
  const subtotalSpan = document.getElementById('cartSubtotal');

  if (cart.length === 0) {
    itemsDiv.innerHTML = '<div class="cart-empty"><div class="icon">🛒</div><p>Your cart is empty</p></div>';
    footer.style.display = 'none';
    return;
  }

  footer.style.display = 'block';
  let subtotal = 0;
  itemsDiv.innerHTML = cart.map((item, i) => {
    const total = item.price * item.qty;
    subtotal += total;
    return `
      <div class="cart-item">
        <img class="img" src="${item.img}" alt="${item.name}">
        <div class="detail">
          <h4>${item.name}</h4>
          <p>₹${item.price}</p>
        </div>
        <div class="qty">
          <button onclick="changeQty(${i}, -1)">−</button>
          <span>${item.qty}</span>
          <button onclick="changeQty(${i}, 1)">+</button>
        </div>
        <div class="total">₹${total}</div>
        <button class="remove" onclick="removeFromCart(${i})">✕</button>
      </div>
    `;
  }).join('');
  subtotalSpan.textContent = `₹${subtotal}`;
}

function openCart() {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartDrawer').classList.add('open');
}

function closeCart() {
  document.getElementById('cartOverlay').classList.remove('open');
  document.getElementById('cartDrawer').classList.remove('open');
}

function openCheckoutModal() {
  if (cart.length === 0) return;
  closeCart();
  renderCheckoutSummary();
  document.getElementById('coPayment').value = 'online';
  document.getElementById('paymentDetails').style.display = 'block';
  document.querySelector('.payment-tab[data-method="card"]').click();
  document.getElementById('addressSection').style.display = 'block';
  document.getElementById('checkoutOverlay').classList.add('open');
}

function closeCheckoutModal(e) {
  if (e && e.target !== document.getElementById('checkoutOverlay')) return;
  document.getElementById('checkoutOverlay').classList.remove('open');
}

// ===== CHECKOUT =====
function setOrderType(btn) {
  document.querySelectorAll('.order-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  orderType = btn.dataset.type;
  const addrSection = document.getElementById('addressSection');
  if (addrSection) addrSection.style.display = orderType === 'delivery' ? 'block' : 'none';
}

function renderCheckoutSummary() {
  const container = document.getElementById('checkoutItems');
  let subtotal = 0;
  container.innerHTML = cart.map(item => {
    const t = item.price * item.qty;
    subtotal += t;
    return `<div class="item"><span>${item.name} x${item.qty}</span><span>₹${t}</span></div>`;
  }).join('');
  document.getElementById('checkoutTotal').textContent = `₹${subtotal}`;
}

function togglePaymentMethod() {
  const val = document.getElementById('coPayment').value;
  document.getElementById('paymentDetails').style.display = val === 'cod' ? 'none' : 'block';
}

function switchPaymentTab(btn) {
  document.querySelectorAll('.payment-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('cardFields').style.display = btn.dataset.method === 'card' ? 'block' : 'none';
  document.getElementById('upiFields').style.display = btn.dataset.method === 'upi' ? 'block' : 'none';
}

function placeOrder() {
  if (cart.length === 0) return;

  const name = document.getElementById('coName').value.trim();
  const phone = document.getElementById('coPhone').value.trim();
  const address = document.getElementById('coAddress').value.trim();
  const city = document.getElementById('coCity').value.trim();
  const payment = document.getElementById('coPayment').value;
  const cardNum = document.getElementById('coCardNumber').value.trim();
  const upiId = document.getElementById('coUpiId').value.trim();

  if (!name) { alert('Please enter your name'); document.getElementById('coName').focus(); return; }
  if (!phone) { alert('Please enter your phone number'); document.getElementById('coPhone').focus(); return; }
  if (orderType === 'delivery') {
    if (!address) { alert('Please enter your delivery address'); document.getElementById('coAddress').focus(); return; }
    if (!city) { alert('Please enter your city'); document.getElementById('coCity').focus(); return; }
  }

  let paymentInfo = payment;
  if (payment === 'online') {
    const activeTab = document.querySelector('.payment-tab.active');
    if (activeTab) {
      const method = activeTab.dataset.method;
      if (method === 'card') {
        if (!cardNum) { alert('Please enter card number'); return; }
        paymentInfo = 'Card (••••' + cardNum.slice(-4) + ')';
      } else if (method === 'upi') {
        if (!upiId) { alert('Please enter UPI ID'); return; }
        paymentInfo = 'UPI (' + upiId + ')';
      }
    }
  }

  const total = cart.reduce((s,c) => s + c.price * c.qty, 0);
  const order = { id: Date.now(), customerId, items: [...cart], total, name, phone, address, city, payment: paymentInfo, type: orderType, status: 'placed', date: new Date().toLocaleString() };
  api('/api/orders', { method: 'POST', body: JSON.stringify(order) });
  orders.unshift(order);
  cart = [];
  saveCart();
  updateCartUI();
  closeCheckoutModal();
  showPage('success');
}

// ===== AUTH =====
function openAuth() { document.getElementById('authOverlay').classList.add('open'); }

function closeAuth(e) {
  if (e && e.target !== document.getElementById('authOverlay')) return;
  document.getElementById('authOverlay').classList.remove('open');
}

function toggleAuthMode() {
  isLogin = !isLogin;
  document.getElementById('authTitle').textContent = isLogin ? 'Welcome' : 'Create Account';
  document.getElementById('authSub').textContent = isLogin ? 'Sign in to your account' : 'Join Cold Rush today';
  document.getElementById('authBtn').textContent = isLogin ? 'Sign In' : 'Sign Up';
  document.getElementById('authNameField').style.display = isLogin ? 'none' : 'block';
  document.getElementById('authToggleText').textContent = isLogin ? "Don't have an account?" : 'Already have an account?';
  document.getElementById('authToggleLink').textContent = isLogin ? 'Sign Up' : 'Sign In';
}

function submitAuth() {
  const email = document.getElementById('authEmail').value;
  if (!email) return alert('Please enter your email');
  loggedIn = true;
  closeAuth(null);
  alert(isLogin ? 'Signed in successfully!' : 'Account created successfully!');
}

// ===== PAGE NAVIGATION =====
const pageCache = {};
let pageCallbacks = {};

function showPage(page, cb) {
  if (page === 'admin' && !adminLoggedIn) {
    showPage('admin-login');
    return;
  }

  const pageMap = { home:'home', menu:'menu', 'my-orders':'orders', success:'success', admin:'admin', 'admin-login':'admin-login' };
  const file = pageMap[page] || page;

  if (cb) pageCallbacks[page] = cb;

  if (pageCache[file]) {
    document.getElementById('pageContent').innerHTML = pageCache[file];
    afterPageLoad(page);
  } else {
    fetch('pages/' + file + '.html')
      .then(r => r.text())
      .then(html => {
        pageCache[file] = html;
        document.getElementById('pageContent').innerHTML = html;
        afterPageLoad(page);
      })
      .catch(() => {
        document.getElementById('pageContent').innerHTML = '<p style="text-align:center;padding:80px 24px;color:var(--sage);">Page not found.</p>';
      });
  }

  document.querySelectorAll('nav .links a').forEach(a => a.classList.remove('active'));
  const link = document.querySelector(`nav .links a[onclick*="'${page}'"]`);
  if (link) link.classList.add('active');
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  const path = '/' + page;
  if (location.pathname !== path) {
    navigating = true;
    history.pushState(null, '', path);
    navigating = false;
  }
}

function afterPageLoad(page) {
  if (page === 'home') {
    renderCategories();
    renderFeatured();
  } else if (page === 'menu') {
    renderMenuPills();
    renderMenu();
  } else if (page === 'my-orders') {
    renderOrders();
  } else if (page === 'admin') {
    renderAdmin();
  } else if (page === 'admin-login') {
    document.getElementById('adminLoginError').style.display = 'none';
    document.getElementById('adminId').value = '';
    document.getElementById('adminPass').value = '';
  }
  if (pageCallbacks[page]) {
    pageCallbacks[page]();
    delete pageCallbacks[page];
  }
}

function submitAdminLoginPage() {
  const id = document.getElementById('adminId').value.trim();
  const pass = document.getElementById('adminPass').value.trim();
  if (id === 'admin' && pass === 'admin123') {
    adminLoggedIn = true;
    localStorage.setItem('adminLoggedIn', 'true');
    document.getElementById('adminLoginError').style.display = 'none';
    showPage('admin');
  } else {
    document.getElementById('adminLoginError').style.display = 'block';
  }
}

async function renderAdmin() {
  const container = document.getElementById('adminOrderList');
  orders = await api('/api/orders');
  if (orders.length === 0) {
    container.innerHTML = '<p style="color:var(--sage);">No orders yet.</p>';
    return;
  }
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s,o) => s + o.total, 0);
  const activeOrders = orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;

  container.innerHTML = `
    <div class="admin-stats">
      <div class="admin-stat-card"><div class="num">${totalOrders}</div><div class="label">Total Orders</div></div>
      <div class="admin-stat-card"><div class="num">₹${totalRevenue}</div><div class="label">Total Revenue</div></div>
      <div class="admin-stat-card"><div class="num">${activeOrders}</div><div class="label">Active Orders</div></div>
    </div>
    ${orders.map(o => {
      const statusLabels = { placed:'Placed', preparing:'Preparing', ready:'Ready', delivered:'Delivered', cancelled:'Cancelled' };
      const nextStatuses = { placed:['preparing','cancelled'], preparing:['ready','cancelled'], ready:['delivered','cancelled'], delivered:[], cancelled:[] };
      return `
        <div class="admin-order-card">
          <div class="top">
            <strong>#${o.id}</strong>
            <span class="date">${o.date}</span>
          </div>
          <div class="customer"><span>Name:</span> ${o.name}</div>
          <div class="customer"><span>Phone:</span> ${o.phone}</div>
          ${o.address ? `<div class="customer"><span>Address:</span> ${o.address}, ${o.city}</div>` : ''}
          <div class="customer"><span>Payment:</span> ${o.payment} &middot; <span>Type:</span> ${o.type}</div>
          <div class="items-list">${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
          <div class="bottom">
            <span class="total">₹${o.total}</span>
            <span class="status-badge ${o.status}">${statusLabels[o.status] || o.status}</span>
          </div>
          ${nextStatuses[o.status] && nextStatuses[o.status].length > 0 ? `
            <div class="status-actions">
              ${nextStatuses[o.status].map(ns => `
                <button onclick="updateOrderStatus(${o.id}, '${ns}')">Mark ${statusLabels[ns]}</button>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('')}
  `;
}

function updateOrderStatus(orderId, newStatus) {
  api('/api/orders/' + orderId, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
  const order = orders.find(o => o.id === orderId);
  if (order) {
    order.status = newStatus;
    renderAdmin();
  }
}

async function renderOrders() {
  const container = document.getElementById('ordersList');
  const allOrders = await api('/api/orders');
  const myOrders = allOrders.filter(o => o.customerId === customerId);
  if (myOrders.length === 0) {
    container.innerHTML = '<p style="color:var(--sage);">No orders yet. Place your first order!</p>';
    return;
  }
  container.innerHTML = myOrders.map(o => `
    <div style="background:var(--white);border-radius:var(--radius);padding:16px;margin-bottom:12px;box-shadow:var(--shadow-sm);">
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <strong>#${o.id}</strong>
        <span style="color:var(--sage);font-size:0.85rem;">${o.date}</span>
      </div>
      <div style="font-size:0.85rem;color:var(--sage);margin-bottom:8px;">
        ${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-weight:700;">₹${o.total}</span>
        <span style="color:var(--gold);font-weight:600;text-transform:uppercase;font-size:0.8rem;">${o.status}</span>
      </div>
    </div>
  `).join('');
}

function toggleMenu() { document.getElementById('navLinks').classList.toggle('open'); }

// ===== CROSS-TAB SYNC =====
window.addEventListener('storage', (e) => {
  if (e.key === 'cart') {
    cart = JSON.parse(e.newValue || '[]');
    updateCartUI();
  }
});

// ===== HISTORY API ROUTING =====
let navigating = false;

function handlePop() {
  if (navigating) return;
  let page = location.pathname.replace(/^\//, '');
  if (!page || page === 'index.html') page = 'home';
  showPage(page);
}

window.addEventListener('popstate', handlePop);

// ===== INIT =====
updateCartUI();
let page = location.pathname.replace(/^\//, '');
if (!page || page === 'index.html') page = 'home';
showPage(page);
