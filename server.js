const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app    = express();
const PORT   = process.env.PORT || 3000;
const DB     = path.join(__dirname, 'database.json');
const PUBLIC = path.join(__dirname, 'public');

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.static(PUBLIC));

// ── Cấu trúc mặc định đầy đủ ──
const EMPTY_DB = {
  students:      [],
  staff:         [],
  leads:         [],
  classes:       [],
  attendance:    [],
  makeups:       [],
  templates:     [],
  customCourses: [],
  customPrices:  {}
};

// ── Đọc database ──
function loadDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify(EMPTY_DB, null, 2));
    return { ...EMPTY_DB };
  }
  try {
    const data = JSON.parse(fs.readFileSync(DB, 'utf8'));
    return { ...EMPTY_DB, ...data };
  } catch {
    return { ...EMPTY_DB };
  }
}

// ── Ghi database an toàn (ghi file tạm rồi rename) ──
function saveDB(data) {
  const tmp = DB + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB);
}

// ── API: Tải toàn bộ dữ liệu ──
app.get('/api/load', (req, res) => {
  res.json(loadDB());
});

// ── API: Lưu toàn bộ dữ liệu ──
app.post('/api/save', (req, res) => {
  try {
    const db = loadDB();
    const allowed = ['students','staff','leads','classes','attendance','makeups','templates','customCourses','customPrices'];
    allowed.forEach(key => {
      if (req.body[key] !== undefined) db[key] = req.body[key];
    });
    saveDB(db);
    res.json({ ok: true, saved: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi lưu: ' + e.message });
  }
});

// ── API: Backup toàn bộ (tải file JSON) ──
app.get('/api/backup', (req, res) => {
  const db = loadDB();
  const filename = `vinsoul_backup_${new Date().toISOString().slice(0,10)}.json`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(JSON.stringify(db, null, 2));
});

// ── API: Restore từ file backup ──
app.post('/api/restore', (req, res) => {
  try {
    const data = req.body;
    if (typeof data !== 'object' || Array.isArray(data)) {
      return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
    }
    saveDB({ ...EMPTY_DB, ...data });
    res.json({ ok: true, restored: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ error: 'Lỗi restore: ' + e.message });
  }
});

// ── API: Xuất Excel/CSV ──
app.get('/api/export/:type', (req, res) => {
  const { type } = req.params;
  const db = loadDB();
  const BOM = '\uFEFF';
  let csv = BOM;
  let filename = '';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const fmtNum  = n => Number(n || 0).toLocaleString('vi-VN');
  const q = v => `"${String(v||'').replace(/"/g,'""')}"`;

  if (type === 'students') {
    filename = 'HocVien.csv';
    csv += ['#','Họ Tên','Ngày Sinh','Phụ Huynh (Zalo)','SĐT','Môn Học','Gói / Lớp','Ngày BĐ','Ngày KT','Học Phí','Số Tiền (đ)','Ngày Nộp','Ghi Chú'].map(q).join(',') + '\n';
    (db.students||[]).forEach((s,i) => {
      const cls = (db.classes||[]).find(c => c.id === Number(s.classid));
      csv += [i+1,s.name,fmtDate(s.dob),s.parent,s.phone,s.subject,s.pkg||'',fmtDate(s.start),fmtDate(s.end),s.payment,fmtNum(s.amount),fmtDate(s.paydate),s.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'staff') {
    filename = 'NhanSu.csv';
    csv += ['#','Họ Tên','Ngày Sinh','SĐT','Vị Trí','Tình Trạng','Ghi Chú'].map(q).join(',') + '\n';
    (db.staff||[]).forEach((s,i) => {
      csv += [i+1,s.name,fmtDate(s.dob),s.phone,s.role,s.status,s.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'leads') {
    filename = 'HVTiemNang.csv';
    csv += ['#','Họ Tên HV','Ngày Sinh','Phụ Huynh (Zalo)','SĐT','Khóa Học','Nguồn Data','Tình Trạng','Ghi Chú'].map(q).join(',') + '\n';
    (db.leads||[]).forEach((l,i) => {
      csv += [i+1,l.name,fmtDate(l.dob),l.parent,l.phone,l.course,l.source,l.status,l.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'revenue') {
    filename = 'DoanhThu.csv';
    csv += ['#','Họ Tên','Môn Học','Gói / Lớp','Hình Thức','Số Tiền (đ)','Ngày Nộp'].map(q).join(',') + '\n';
    const paid = (db.students||[]).filter(s => s.payment !== 'Chưa Thanh Toán' && s.amount);
    paid.forEach((s,i) => {
      csv += [i+1,s.name,s.subject,s.pkg||'',s.payment,fmtNum(s.amount),fmtDate(s.paydate)].map(q).join(',') + '\n';
    });
    const total = paid.reduce((a,s) => a + Number(s.amount||0), 0);
    csv += `"","","","",${q('TỔNG')},${q(fmtNum(total))},""\n`;
  } else {
    return res.status(404).json({ error: 'Loại xuất không hợp lệ' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(csv);
});

// ── Serve index ──
app.get('*', (req, res) => {
  const indexPath = path.join(PUBLIC, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h2>Vinsoul Academy</h2><p>Đặt file index.html vào thư mục public/</p>');
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  🎵  VINSOUL ACADEMY – Server đã khởi động!');
  console.log(`  🌐  http://localhost:${PORT}`);
  console.log(`  💾  Dữ liệu: database.json`);
  console.log('');
});
