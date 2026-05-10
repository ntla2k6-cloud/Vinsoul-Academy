require('module').globalPaths.push('/home/zijgohrz/nodevenv/app/18/lib/node_modules');
const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');
const jwt     = require('jsonwebtoken');
const bcrypt  = require('bcryptjs');

const app    = express();
const PORT   = process.env.PORT || 3000;
const DB     = path.join(__dirname, 'database.json');
const USERS  = path.join(__dirname, 'users.json');
const SECRET = 'vinsoul_secret_key_2025';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

['server.js','users.json','database.json'].forEach(file => {
  app.get('/' + file, (_, res) => res.status(403).end());
});

const EMPTY = { students:[], staff:[], leads:[], classes:[], attendance:[], makeups:[], templates:[], customCourses:[], customPrices:{} };

function loadDB() {
  try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(DB,'utf8')) }; }
  catch { return {...EMPTY}; }
}
function saveDB(d) {
  fs.writeFileSync(DB + '.tmp', JSON.stringify(d,null,2));
  fs.renameSync(DB + '.tmp', DB);
}

function loadUsers() {
  if (!fs.existsSync(USERS)) {
    const def = [{ id:1, username:'admin', passwordHash: bcrypt.hashSync('Vinsoul@2024',10), displayName:'Quan Tri Vien', role:'admin' }];
    fs.writeFileSync(USERS, JSON.stringify(def,null,2));
    return def;
  }
  try { return JSON.parse(fs.readFileSync(USERS,'utf8')); }
  catch { return []; }
}
function saveUsers(u) { fs.writeFileSync(USERS, JSON.stringify(u,null,2)); }

const tries = new Map();
function locked(ip) {
  const r = tries.get(ip); if (!r) return false;
  if (Date.now() > r.reset) { tries.delete(ip); return false; }
  return r.n >= 5;
}
function fail(ip) {
  const r = tries.get(ip) || { n:0, reset: Date.now()+900000 };
  if (Date.now() > r.reset) { r.n=0; r.reset=Date.now()+900000; }
  r.n++; tries.set(ip,r);
}

function auth(req, res, next) {
  const h = req.headers['authorization'] || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : h;
  if (!t) return res.status(401).json({ error:'Chua dang nhap' });
  try { req.user = jwt.verify(t, SECRET); next(); }
  catch { res.status(401).json({ error:'Phien dang nhap het han' }); }
}
function admin(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error:'Chi quan tri vien moi co quyen nay' });
  next();
}

app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || '';
  if (locked(ip)) return res.status(429).json({ error:'Tam khoa do dang nhap sai nhieu lan.' });
  const { username='', password='' } = req.body || {};
  if (!username || !password) return res.status(400).json({ error:'Vui long nhap ten dang nhap va mat khau' });
  const users = loadUsers();
  const user  = users.find(u => u.username === username.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    fail(ip);
    const r = tries.get(ip);
    return res.status(401).json({ error:`Sai ten dang nhap hoac mat khau. Con ${Math.max(0,5-(r?r.n:1))} lan thu.` });
  }
  tries.delete(ip);
  const token = jwt.sign({ id:user.id, username:user.username, displayName:user.displayName, role:user.role }, SECRET, { expiresIn:'8h' });
  res.json({ token, username:user.username, displayName:user.displayName, role:user.role });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ username:req.user.username, displayName:req.user.displayName, role:req.user.role });
});

app.post('/api/auth/change-password', auth, (req, res) => {
  const { currentPassword='', newPassword='' } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error:'Vui long nhap day du thong tin' });
  if (newPassword.length < 8) return res.status(400).json({ error:'Mat khau moi phai co it nhat 8 ky tu' });
  const users = loadUsers();
  const i = users.findIndex(u => u.id === req.user.id);
  if (i === -1) return res.status(404).json({ error:'Khong tim thay tai khoan' });
  if (!bcrypt.compareSync(currentPassword, users[i].passwordHash)) return res.status(401).json({ error:'Mat khau hien tai khong dung' });
  users[i].passwordHash = bcrypt.hashSync(newPassword, 10);
  saveUsers(users);
  res.json({ ok:true });
});

app.get('/api/users', auth, admin, (req, res) => {
  res.json(loadUsers().map(u => ({ id:u.id, username:u.username, displayName:u.displayName, role:u.role })));
});

app.post('/api/users', auth, admin, (req, res) => {
  const { username='', password='', displayName='', role='' } = req.body || {};
  if (!username||!password||!displayName||!role) return res.status(400).json({ error:'Vui long nhap day du thong tin' });
  if (!['admin','staff'].includes(role)) return res.status(400).json({ error:'Phan quyen khong hop le' });
  if (password.length < 8) return res.status(400).json({ error:'Mat khau phai co it nhat 8 ky tu' });
  const users = loadUsers();
  if (users.find(u => u.username === username.trim().toLowerCase())) return res.status(409).json({ error:'Ten dang nhap da ton tai' });
  const u = { id:Date.now(), username:username.trim().toLowerCase(), passwordHash:bcrypt.hashSync(password,10), displayName:displayName.trim(), role };
  users.push(u); saveUsers(users);
  res.json({ ok:true, id:u.id });
});

app.put('/api/users/:id', auth, admin, (req, res) => {
  const id = Number(req.params.id);
  const { displayName, role, password } = req.body || {};
  const users = loadUsers();
  const i = users.findIndex(u => u.id === id);
  if (i === -1) return res.status(404).json({ error:'Khong tim thay tai khoan' });
  if (users[i].id === req.user.id && role && role !== 'admin') return res.status(400).json({ error:'Khong the ha cap quyen cua chinh minh' });
  if (displayName) users[i].displayName = displayName.trim();
  if (role && ['admin','staff'].includes(role)) users[i].role = role;
  if (password) {
    if (password.length < 8) return res.status(400).json({ error:'Mat khau phai co it nhat 8 ky tu' });
    users[i].passwordHash = bcrypt.hashSync(password, 10);
  }
  saveUsers(users);
  res.json({ ok:true });
});

app.delete('/api/users/:id', auth, admin, (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) return res.status(400).json({ error:'Khong the xoa tai khoan cua chinh minh' });
  const users = loadUsers();
  const i = users.findIndex(u => u.id === id);
  if (i === -1) return res.status(404).json({ error:'Khong tim thay tai khoan' });
  if (users[i].role === 'admin' && users.filter((_,j)=>j!==i&&_.role==='admin').length === 0) return res.status(400).json({ error:'Phai con it nhat 1 quan tri vien' });
  users.splice(i,1); saveUsers(users);
  res.json({ ok:true });
});

app.get('/api/load', auth, (req, res) => res.json(loadDB()));

app.post('/api/save', auth, (req, res) => {
  try {
    const db = loadDB();
    Object.keys(EMPTY).forEach(k => { if (req.body[k] !== undefined) db[k] = req.body[k]; });
    saveDB(db); res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/backup', auth, (req, res) => {
  const fn = `vinsoul_backup_${new Date().toISOString().slice(0,10)}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${fn}"`);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(loadDB(), null, 2));
});

app.post('/api/restore', auth, (req, res) => {
  try {
    if (typeof req.body !== 'object' || Array.isArray(req.body)) return res.status(400).json({ error:'Du lieu khong hop le' });
    saveDB({ ...EMPTY, ...req.body }); res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

app.get('/api/export/:type', auth, (req, res) => {
  const { type } = req.params;
  const db = loadDB();
  const BOM = '\uFEFF';
  const fd = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const fn = n => Number(n||0).toLocaleString('vi-VN');
  const q  = v => `"${String(v||'').replace(/"/g,'""')}"`;
  let csv = BOM, filename = '';
  if (type === 'students') {
    filename = 'HocVien.csv';
    csv += ['#','Ho Ten','Ngay Sinh','Phu Huynh','SDT','Mon Hoc','Goi Lop','Ngay BD','Ngay KT','Hinh Thuc','So Tien','Ngay Nop','Ghi Chu'].map(q).join(',') + '\n';
    (db.students||[]).forEach((s,i) => { csv += [i+1,s.name,fd(s.dob),s.parent,s.phone,s.subject,s.pkg||'',fd(s.start),fd(s.end),s.payment,fn(s.amount),fd(s.paydate),s.note||''].map(q).join(',') + '\n'; });
  } else if (type === 'staff') {
    filename = 'NhanSu.csv';
    csv += ['#','Ho Ten','Ngay Sinh','SDT','Vi Tri','Tinh Trang','Ghi Chu'].map(q).join(',') + '\n';
    (db.staff||[]).forEach((s,i) => { csv += [i+1,s.name,fd(s.dob),s.phone,s.role,s.status,s.note||''].map(q).join(',') + '\n'; });
  } else if (type === 'leads') {
    filename = 'HVTiemNang.csv';
    csv += ['#','Ho Ten','Ngay Sinh','Phu Huynh','SDT','Khoa Hoc','Nguon','Tinh Trang','Ghi Chu'].map(q).join(',') + '\n';
    (db.leads||[]).forEach((l,i) => { csv += [i+1,l.name,fd(l.dob),l.parent,l.phone,l.course,l.source,l.status,l.note||''].map(q).join(',') + '\n'; });
  } else if (type === 'revenue') {
    filename = 'DoanhThu.csv';
    csv += ['#','Ho Ten','Mon Hoc','Goi Lop','Hinh Thuc','So Tien','Ngay Nop'].map(q).join(',') + '\n';
    const paid = (db.students||[]).filter(s => s.payment !== 'Chua Thanh Toan' && s.amount);
    paid.forEach((s,i) => { csv += [i+1,s.name,s.subject,s.pkg||'',s.payment,fn(s.amount),fd(s.paydate)].map(q).join(',') + '\n'; });
    const total = paid.reduce((a,s) => a+Number(s.amount||0), 0);
    csv += `"","","","","TONG",${q(fn(total))},""\n`;
  } else return res.status(404).json({ error:'Loai khong hop le' });
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(csv);
});

// Static files
app.use(express.static('/home/zijgohrz/app'));
app.get('/index.html', (req, res) => res.sendFile('/home/zijgohrz/app/index.html'));
app.get('/', (req, res) => res.sendFile('/home/zijgohrz/app/index.html'));
// Fallback - FIX: dung sendFile thay vi app.get('*')
app.use(function(req, res) {
const indexPath = '/home/zijgohrz/app/index.html';  
if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Khong tim thay trang');
  }
});

app.use(function(err, req, res, next) {
  console.error('[LOI]', err.stack || err.message);
  if (req.path.startsWith('/api/')) return res.status(500).json({ error: err.message });
  res.status(500).send('Loi server: ' + err.message);
});

app.listen(PORT, function() {
  loadUsers();
  console.log('Vinsoul Academy dang chay tai port: ' + PORT);
});

process.on('uncaughtException', function(err) {
  console.error('[LOI NGHIEM TRONG]', err.message);
});
process.on('unhandledRejection', function(reason) {
  console.error('[LOI PROMISE]', reason);
});
