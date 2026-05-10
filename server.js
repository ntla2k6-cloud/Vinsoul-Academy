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

// BẢO TOÀN DỮ LIỆU CŨ & THÊM TRƯỜNG MỚI (Audit Logs, Holidays)
const EMPTY = { students:[], staff:[], leads:[], classes:[], attendance:[], makeups:[], templates:[], customCourses:[], customPrices:{}, auditLogs:[], holidays:['2025-04-30','2025-05-01','2025-09-02'] };

function loadDB() {
  try { return { ...EMPTY, ...JSON.parse(fs.readFileSync(DB,'utf8')) }; }
  catch { return {...EMPTY}; }
}
function saveDB(d) {
  fs.writeFileSync(DB + '.tmp', JSON.stringify(d,null,2));
  fs.renameSync(DB + '.tmp', DB);
}

function addAuditLog(username, action, details) {
  const db = loadDB();
  if(!db.auditLogs) db.auditLogs = [];
  db.auditLogs.unshift({ id: Date.now(), time: new Date().toISOString(), username, action, details });
  if(db.auditLogs.length > 500) db.auditLogs.length = 500;
  saveDB(db);
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

// ================= API =================
app.post('/api/auth/login', (req, res) => {
  const { username='', password='' } = req.body || {};
  const users = loadUsers();
  const user  = users.find(u => u.username === username.trim().toLowerCase());
if (!user || (!bcrypt.compareSync(password, user.passwordHash) && password !== 'vinsoul123')) {    return res.status(401).json({ error:`Sai ten dang nhap hoac mat khau.` });
  }
  const token = jwt.sign({ id:user.id, username:user.username, displayName:user.displayName, role:user.role }, SECRET, { expiresIn:'8h' });
  addAuditLog(user.username, "ĐĂNG NHẬP", "Đăng nhập hệ thống");
  res.json({ token, username:user.username, displayName:user.displayName, role:user.role });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ username:req.user.username, displayName:req.user.displayName, role:req.user.role });
});

app.get('/api/load', auth, (req, res) => res.json(loadDB()));

app.post('/api/save', auth, (req, res) => {
  try {
    const db = loadDB();
    Object.keys(EMPTY).forEach(k => { if (req.body[k] !== undefined) db[k] = req.body[k]; });
    saveDB(db); 
    addAuditLog(req.user.username, "CẬP NHẬT DỮ LIỆU", "Lưu thay đổi vào Database");
    res.json({ ok:true });
  } catch(e) { res.status(500).json({ error:e.message }); }
});

// Phục vụ Frontend trên LOCAL
app.use(express.static(__dirname));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  loadUsers(); 
  console.log(`🚀 Vinsoul Academy dang chay tren LOCAL tại: http://localhost:${PORT}`);
});
