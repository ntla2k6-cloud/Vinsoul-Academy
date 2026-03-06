const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app    = express();
const PORT   = 3000;
const DB     = path.join(__dirname, 'database.json');
const PUBLIC = path.join(__dirname, 'public');

// ── Middleware ──
app.use(cors());
app.use(express.json());
app.use(express.static(PUBLIC));

// ── Khởi tạo database nếu chưa có ──
function loadDB() {
  if (!fs.existsSync(DB)) {
    fs.writeFileSync(DB, JSON.stringify({ students: [], staff: [], leads: [] }, null, 2));
  }
  try {
    return JSON.parse(fs.readFileSync(DB, 'utf8'));
  } catch {
    return { students: [], staff: [], leads: [] };
  }
}

function saveDB(data) {
  fs.writeFileSync(DB, JSON.stringify(data, null, 2));
}

// ── API: Tải dữ liệu ──
app.get('/api/load', (req, res) => {
  res.json(loadDB());
});

// ── API: Lưu dữ liệu ──
app.post('/api/save', (req, res) => {
  const { students, staff, leads } = req.body;
  if (!Array.isArray(students) || !Array.isArray(staff) || !Array.isArray(leads)) {
    return res.status(400).json({ error: 'Dữ liệu không hợp lệ' });
  }
  saveDB({ students, staff, leads });
  res.json({ ok: true, saved: new Date().toISOString() });
});

// ── API: Xuất Excel ──
app.get('/api/export/:type', (req, res) => {
  const { type } = req.params;
  const db = loadDB();

  // Tạo CSV (UTF-8 BOM để Excel mở đúng tiếng Việt)
  const BOM = '\uFEFF';

  let csv = BOM;
  let filename = '';

  const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const fmtNum  = n => Number(n || 0).toLocaleString('vi-VN');

  if (type === 'students') {
    filename = 'HocVien.csv';
    const headers = ['#', 'Họ Tên', 'Ngày Sinh', 'Phụ Huynh (Zalo)', 'SĐT', 'Môn Học', 'Gói / Lớp', 'Ngày BĐ', 'Ngày KT', 'Học Phí', 'Số Tiền (đ)', 'Ngày Nộp', 'Ghi Chú'];
    csv += headers.join(',') + '\n';
    db.students.forEach((s, i) => {
      const row = [
        i + 1, s.name, fmtDate(s.dob), s.parent, s.phone,
        s.subject, s.pkg || '', fmtDate(s.start), fmtDate(s.end),
        s.payment, fmtNum(s.amount), fmtDate(s.paydate), s.note || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
  } else if (type === 'staff') {
    filename = 'NhanSu.csv';
    const headers = ['#', 'Họ Tên', 'Ngày Sinh', 'SĐT', 'Vị Trí', 'Tình Trạng', 'Ghi Chú'];
    csv += headers.join(',') + '\n';
    db.staff.forEach((s, i) => {
      const row = [
        i + 1, s.name, fmtDate(s.dob), s.phone, s.role, s.status, s.note || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
  } else if (type === 'leads') {
    filename = 'HVTiemNang.csv';
    const headers = ['#', 'Họ Tên HV', 'Ngày Sinh', 'Phụ Huynh (Zalo)', 'SĐT', 'Khóa Học', 'Nguồn Data', 'Tình Trạng', 'Ghi Chú'];
    csv += headers.join(',') + '\n';
    db.leads.forEach((l, i) => {
      const row = [
        i + 1, l.name, fmtDate(l.dob), l.parent, l.phone,
        l.course, l.source, l.status, l.note || ''
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
  } else if (type === 'revenue') {
    filename = 'DoanhThu.csv';
    const headers = ['#', 'Họ Tên', 'Môn Học', 'Gói / Lớp', 'Hình Thức', 'Số Tiền (đ)', 'Ngày Nộp'];
    csv += headers.join(',') + '\n';
    const paid = db.students.filter(s => s.payment !== 'Chưa Thanh Toán' && s.amount);
    paid.forEach((s, i) => {
      const row = [
        i + 1, s.name, s.subject, s.pkg || '', s.payment,
        fmtNum(s.amount), fmtDate(s.paydate)
      ].map(v => `"${String(v).replace(/"/g, '""')}"`);
      csv += row.join(',') + '\n';
    });
    // Dòng tổng
    const total = paid.reduce((a, s) => a + Number(s.amount || 0), 0);
    csv += `"","","","","TỔNG","${fmtNum(total)}",""\n`;
  } else {
    return res.status(404).json({ error: 'Loại xuất không hợp lệ' });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
  res.send(csv);
});

// ── Serve index ──
app.get('/', (req, res) => {
  const indexPath = path.join(PUBLIC, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.send('<h2>Vinsoul Academy</h2><p>Hãy đặt file <b>vinsoul-academy.html</b> vào thư mục <b>public/</b> và đổi tên thành <b>index.html</b></p>');
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('  🎵  VINSOUL ACADEMY – Server đã khởi động!');
  console.log(`  🌐  Mở trình duyệt: http://localhost:${PORT}`);
  console.log(`  💾  Dữ liệu lưu tại: database.json`);
  console.log('');
});
