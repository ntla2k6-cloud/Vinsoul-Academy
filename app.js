// ═══════════════════════════════════════════════════════════════
//  app_additions.js – Vinsoul Academy v2.0
//  THÊM VÀO CUỐI app.js (sau dòng cuối cùng)
//
//  Chứa:
//  1. Tính ngày kết thúc tự động
//  2. VietQR modal
//  3. Audit Log page
//  4. Notification bell
//  5. Theming (đổi màu chủ đạo)
//  6. Hamburger menu responsive
//  7. Student/Teacher portal views
//  8. Zalo config page
//  9. Nhật ký hệ thống
// ═══════════════════════════════════════════════════════════════

// ════════════════════════════════════════
// 1. TÍNH NGÀY KẾT THÚC TỰ ĐỘNG
// ════════════════════════════════════════
async function calcEndDate() {
  const startEl  = document.getElementById('f-start');
  const endEl    = document.getElementById('f-end');
  const pkgEl    = document.getElementById('f-package');
  if (!startEl || !endEl || !pkgEl) return;

  const start = startEl.value;
  const pkg   = pkgEl.value;
  if (!start || !pkg) return;

  // Lấy số buổi từ tên gói (VD: "3 tháng/24 buổi" -> 24)
  const m = pkg.match(/(\d+)\s*buổi/);
  if (!m) return;
  const totalSessions = parseInt(m[1]);

  try {
    const r = await fetch('/api/calc-end-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate: start, totalSessions })
    });
    const d = await r.json();
    if (d.endDate) {
      endEl.value = d.endDate;
      showToast('Đã tính ngày kết thúc tự động: ' + fmtDate(d.endDate));
    }
  } catch(e) {
    console.error('Calc end date error:', e);
  }
}

// Hook vào form thêm học viên: khi đổi gói hoặc ngày bắt đầu
function hookAutoEndDate() {
  const startEl = document.getElementById('f-start');
  const pkgEl   = document.getElementById('f-package');
  if (startEl) startEl.addEventListener('change', calcEndDate);
  if (pkgEl)   pkgEl.addEventListener('change', calcEndDate);
}

// ════════════════════════════════════════
// 2. VIETQR MODAL
// ════════════════════════════════════════
async function showVietQR(studentId) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;
  if (!s.amount || s.amount <= 0) {
    showToast('Học viên chưa có số tiền học phí!', true); return;
  }

  // Tạo mã nội dung chuyển khoản: VS_U{id}_{subject}
  const subCode = (s.subject || 'HP').replace(/\s+/g,'').toUpperCase().slice(0,8);
  const studentCode = `U${s.id}_${subCode}`;

  try {
    const r = await fetch('/api/vietqr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: s.amount, studentCode, note: `VS_${studentCode}_HOCPHI` })
    });
    const data = await r.json();
    if (!data.qrUrl) { showToast('Lỗi tạo QR', true); return; }

    // Hiển thị modal
    let modal = document.getElementById('vietqr-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'vietqr-modal';
      modal.style.cssText = `
        position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.55);
        display:flex;align-items:center;justify-content:center;padding:16px;
      `;
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div style="background:#fff;border-radius:20px;padding:28px 24px;max-width:380px;width:100%;
                  box-shadow:0 20px 60px rgba(0,0,0,.4);font-family:'Be Vietnam Pro',sans-serif;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <div style="font-weight:800;font-size:17px;color:#234A5B;">Thanh Toán Học Phí</div>
          <button onclick="document.getElementById('vietqr-modal').style.display='none'"
            style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;">✕</button>
        </div>
        <div style="text-align:center;margin-bottom:16px;">
          <img src="${data.qrUrl}" alt="VietQR" style="width:220px;height:220px;border-radius:12px;border:2px solid #eee;">
        </div>
        <div style="background:#f8fafc;border-radius:12px;padding:14px;font-size:13px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#666;">Học viên:</span>
            <span style="font-weight:700;color:#234A5B;">${s.name}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#666;">Số tiền:</span>
            <span style="font-weight:800;color:#F69922;font-size:15px;">${fmt(s.amount)}</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#666;">Ngân hàng:</span>
            <span style="font-weight:600;">Vietcombank</span>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:#666;">Tài khoản:</span>
            <span style="font-weight:700;font-family:monospace;">1731238888</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:#666;">Nội dung CK:</span>
            <span style="font-weight:700;color:#234A5B;font-size:12px;">VS_${studentCode}_HOCPHI</span>
          </div>
        </div>
        <div style="font-size:11px;color:#aaa;text-align:center;margin-bottom:14px;">
          Quét mã QR bằng ứng dụng ngân hàng hoặc Zalo Pay
        </div>
        <button onclick="document.getElementById('vietqr-modal').style.display='none'"
          style="width:100%;background:linear-gradient(135deg,#234A5B,#2d5f75);color:#fff;
                 border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;
                 cursor:pointer;font-family:'Be Vietnam Pro',sans-serif;">
          Đóng
        </button>
      </div>
    `;
    modal.style.display = 'flex';
  } catch(e) {
    showToast('Lỗi tạo mã QR: ' + e.message, true);
  }
}

// ════════════════════════════════════════
// 3. NOTIFICATION BELL
// ════════════════════════════════════════
let _notifInterval = null;

async function loadNotifications() {
  try {
    const r = await fetch('/api/notifications');
    if (!r.ok) return;
    const notifs = await r.json();
    const unread = notifs.filter(n => !n.read).length;
    const badge = document.getElementById('notif-badge');
    if (badge) {
      badge.textContent = unread || '';
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    return notifs;
  } catch(e) {}
}

async function showNotifications() {
  const notifs = await loadNotifications() || [];
  // Mark all read
  await fetch('/api/notifications/read', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });

  let modal = document.getElementById('notif-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'notif-modal';
    modal.style.cssText = `
      position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);
      display:flex;align-items:flex-start;justify-content:flex-end;padding:70px 16px 16px;
    `;
    modal.onclick = (e) => { if(e.target===modal) modal.style.display='none'; };
    document.body.appendChild(modal);
  }

  const items = notifs.length
    ? notifs.slice(0,20).map(n => `
        <div style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:13px;">
          <div style="font-weight:600;color:#234A5B;margin-bottom:3px;">${n.studentName || n.type}</div>
          <div style="color:#666;">${n.message}</div>
          <div style="font-size:11px;color:#aaa;margin-top:3px;">${n.createdDate || ''}</div>
        </div>`).join('')
    : '<div style="text-align:center;padding:20px;color:#aaa;">Không có thông báo mới</div>';

  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;width:320px;max-height:480px;overflow-y:auto;
                box-shadow:0 10px 40px rgba(0,0,0,.2);font-family:'Be Vietnam Pro',sans-serif;">
      <div style="padding:16px 18px;border-bottom:1px solid #eee;display:flex;justify-content:space-between;align-items:center;position:sticky;top:0;background:#fff;">
        <div style="font-weight:800;color:#234A5B;font-size:15px;">Thông Báo</div>
        <button onclick="document.getElementById('notif-modal').style.display='none'"
          style="background:none;border:none;font-size:18px;cursor:pointer;color:#aaa;">✕</button>
      </div>
      <div style="padding:0 18px 12px;">${items}</div>
    </div>
  `;
  modal.style.display = 'flex';
  const badge = document.getElementById('notif-badge');
  if (badge) badge.style.display = 'none';
}

async function checkReminders() {
  try {
    await fetch('/api/check-reminders', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    await loadNotifications();
  } catch(e) {}
}

// ════════════════════════════════════════
// 4. AUDIT LOG PAGE
// ════════════════════════════════════════
async function renderAuditPage() {
  const page = document.getElementById('page-audit');
  if (!page) return;
  page.innerHTML = `
    <div class="page-header">
      <div class="page-title">Nhật Ký <span>Hệ Thống</span></div>
      <div class="page-sub">Ghi lại mọi thao tác trong hệ thống</div>
    </div>
    <div class="card">
      <div style="text-align:center;padding:20px;color:var(--muted);">Đang tải...</div>
    </div>
  `;
  showPage('audit');

  try {
    const r = await fetch('/api/audit?limit=200');
    if (!r.ok) { page.querySelector('.card').innerHTML = '<div style="padding:20px;color:red;">Lỗi tải nhật ký</div>'; return; }
    const logs = await r.json();
    const rows = logs.map((l,i) => `
      <tr>
        <td style="font-size:11px;color:var(--muted)">${i+1}</td>
        <td style="font-weight:600;color:var(--navy)">${l.user}</td>
        <td><span class="pos-badge" style="font-size:10px">${l.action}</span></td>
        <td style="font-size:12px;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.detail}</td>
        <td style="font-size:11px;color:var(--muted)">${new Date(l.time).toLocaleString('vi-VN')}</td>
      </tr>`).join('');
    page.innerHTML = `
      <div class="page-header">
        <div class="page-title">Nhật Ký <span>Hệ Thống</span></div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>Người Dùng</th><th>Hành Động</th><th>Chi Tiết</th><th>Thời Gian</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">Chưa có nhật ký</td></tr>'}</tbody>
          </table>
        </div>
      </div>
    `;
  } catch(e) {
    page.querySelector('.card div').textContent = 'Lỗi: ' + e.message;
  }
}

// ════════════════════════════════════════
// 5. THEMING - Đổi màu chủ đạo
// ════════════════════════════════════════
const THEMES = {
  default:  { '--navy':'#234A5B', '--gold':'#F69922', '--accent':'#2d5f75' },
  ocean:    { '--navy':'#1e3a5f', '--gold':'#4facde', '--accent':'#2d6a9f' },
  forest:   { '--navy':'#1b4332', '--gold':'#52b788', '--accent':'#2d6a4f' },
  sunset:   { '--navy':'#7f1d1d', '--gold':'#f97316', '--accent':'#991b1b' },
  lavender: { '--navy':'#3730a3', '--gold':'#a78bfa', '--accent':'#4338ca' },
  rose:     { '--navy':'#881337', '--gold':'#fb7185', '--accent':'#9f1239' },
};

function applyTheme(key) {
  const t = THEMES[key] || THEMES.default;
  const root = document.documentElement;
  Object.entries(t).forEach(([k,v]) => root.style.setProperty(k,v));
  localStorage.setItem('vs_theme', key);
}

function loadSavedTheme() {
  const saved = localStorage.getItem('vs_theme') || 'default';
  applyTheme(saved);
}

function showThemePicker() {
  let modal = document.getElementById('theme-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'theme-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
    modal.onclick = (e) => { if(e.target===modal) modal.style.display='none'; };
    document.body.appendChild(modal);
  }
  const names = { default:'Mặc Định', ocean:'Đại Dương', forest:'Rừng Xanh', sunset:'Hoàng Hôn', lavender:'Tím Lavender', rose:'Hồng Rose' };
  const colors = { default:'#F69922', ocean:'#4facde', forest:'#52b788', sunset:'#f97316', lavender:'#a78bfa', rose:'#fb7185' };
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:28px;max-width:380px;width:100%;font-family:'Be Vietnam Pro',sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <div style="font-weight:800;font-size:17px;color:#234A5B;margin-bottom:18px;">Chọn Giao Diện</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;">
        ${Object.entries(names).map(([k,n]) => `
          <div onclick="applyTheme('${k}');document.getElementById('theme-modal').style.display='none';"
            style="border:2px solid #eee;border-radius:12px;padding:12px 14px;cursor:pointer;display:flex;align-items:center;gap:10px;transition:.15s;hover:border-color:${colors[k]};"
            onmouseover="this.style.borderColor='${colors[k]}'" onmouseout="this.style.borderColor='#eee'">
            <div style="width:22px;height:22px;border-radius:50%;background:${colors[k]};flex-shrink:0;"></div>
            <span style="font-size:13px;font-weight:600;color:#333;">${n}</span>
          </div>`).join('')}
      </div>
      <button onclick="document.getElementById('theme-modal').style.display='none'"
        style="width:100%;border:1.5px solid #eee;background:#fff;border-radius:10px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Be Vietnam Pro',sans-serif;">
        Đóng
      </button>
    </div>
  `;
  modal.style.display = 'flex';
}

// ════════════════════════════════════════
// 6. HAMBURGER MENU RESPONSIVE
// ════════════════════════════════════════
function toggleSidebar() {
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!sidebar) return;
  sidebar.classList.toggle('open');
  if (overlay) overlay.style.display = sidebar.classList.contains('open') ? 'block' : 'none';
}

function initHamburger() {
  // Tạo overlay
  if (!document.getElementById('sidebar-overlay')) {
    const ov = document.createElement('div');
    ov.id = 'sidebar-overlay';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:99;display:none;';
    ov.onclick = toggleSidebar;
    document.body.appendChild(ov);
  }

  // Tạo hamburger button nếu chưa có
  if (!document.getElementById('hamburger-btn')) {
    const btn = document.createElement('button');
    btn.id = 'hamburger-btn';
    btn.innerHTML = '&#9776;';
    btn.style.cssText = `
      display:none;position:fixed;top:14px;left:14px;z-index:200;
      background:var(--navy);color:#fff;border:none;border-radius:8px;
      width:38px;height:38px;font-size:18px;cursor:pointer;
      align-items:center;justify-content:center;
    `;
    btn.onclick = toggleSidebar;
    document.body.appendChild(btn);

    // Responsive: hiện nút khi < 768px
    const mq = window.matchMedia('(max-width: 768px)');
    const handle = (e) => { btn.style.display = e.matches ? 'flex' : 'none'; };
    mq.addEventListener('change', handle);
    handle(mq);
  }
}

// ════════════════════════════════════════
// 7. STUDENT PORTAL - trang học viên
// ════════════════════════════════════════
function renderStudentPortal() {
  const role = window.VS_ROLE;
  if (role !== 'student') return;

  const page = document.getElementById('page-student-portal');
  if (!page) return;
  const myData = students[0]; // student load trả về chỉ 1 học viên
  if (!myData) {
    page.innerHTML = '<div class="card" style="padding:30px;text-align:center;color:var(--muted)">Không tìm thấy thông tin học viên</div>';
    return;
  }

  // Tính điểm danh
  const totalPkg = extractTotalSessions(myData.pkg);
  const doneSessions = countStudentSessions(myData.id, myData.classid);
  const pct = totalPkg ? Math.min(100, Math.round(doneSessions/totalPkg*100)) : 0;
  const daysLeft = myData.end ? Math.ceil((new Date(myData.end) - new Date()) / (1000*60*60*24)) : null;

  // Feedbacks từ giáo viên
  const feedbacks = (myData.feedbacks || []).slice().reverse();

  page.innerHTML = `
    <div class="page-header">
      <div class="page-title">Thông Tin <span>Cá Nhân</span></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;">
      <!-- Info card -->
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Hồ Sơ Học Viên</div>
        <div style="font-size:13px;line-height:2.2;">
          <div><b>Họ tên:</b> ${myData.name}</div>
          <div><b>Ngày sinh:</b> ${fmtDate(myData.dob)}</div>
          <div><b>Phụ huynh:</b> ${myData.parent || '–'}</div>
          <div><b>Môn học:</b> ${myData.subject}</div>
          <div><b>Gói học:</b> ${myData.pkg || '–'}</div>
          <div><b>Ngày bắt đầu:</b> ${fmtDate(myData.start)}</div>
          <div><b>Ngày kết thúc:</b> ${fmtDate(myData.end)}${daysLeft !== null && daysLeft <= 14 ? `<span style="color:#dc2626;font-weight:700;margin-left:6px;">⏰ còn ${daysLeft} ngày</span>` : ''}</div>
        </div>
      </div>
      <!-- Progress card -->
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">Tiến Độ Học</div>
        <div style="text-align:center;padding:10px 0;">
          <div style="font-size:36px;font-weight:800;color:var(--gold)">${doneSessions}<span style="font-size:18px;color:var(--muted)">/${totalPkg||'?'}</span></div>
          <div style="font-size:13px;color:var(--muted);margin:6px 0 14px;">buổi đã học</div>
          <div style="background:var(--cream2);border-radius:8px;height:10px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--gold);border-radius:8px;transition:.4s"></div>
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:6px;">${pct}% hoàn thành</div>
        </div>
      </div>
    </div>

    <!-- Nhận xét giáo viên -->
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title" style="margin-bottom:14px;">Nhận Xét Từ Giáo Viên</div>
      ${feedbacks.length ? feedbacks.slice(0,10).map(f => `
        <div style="border-left:3px solid var(--gold);padding:10px 14px;margin-bottom:10px;background:var(--cream);border-radius:0 8px 8px 0;">
          <div style="font-size:12px;color:var(--muted);margin-bottom:4px;">${f.by} · ${new Date(f.at).toLocaleDateString('vi-VN')}</div>
          ${f.feedback ? `<div style="font-size:13px;color:var(--navy);margin-bottom:4px;">${f.feedback}</div>` : ''}
          ${f.homework ? `<div style="font-size:12px;color:#666;"><b>Bài về nhà:</b> ${f.homework}</div>` : ''}
          ${(f.mediaUrls||[]).length ? f.mediaUrls.map(u => `<a href="${u}" target="_blank" style="font-size:11px;color:var(--gold);">Xem tệp đính kèm</a>`).join(' ') : ''}
        </div>`).join('') : '<div style="color:var(--muted);font-size:13px;">Chưa có nhận xét nào</div>'}
    </div>

    <!-- Chia sẻ của học viên -->
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">Chia Sẻ Của Học Viên</div>
      <textarea id="student-share-input" style="width:100%;min-height:100px;border:1.5px solid var(--cream2);border-radius:10px;padding:12px;font-size:13px;font-family:'Be Vietnam Pro',sans-serif;resize:vertical;box-sizing:border-box;"
        placeholder="Chia sẻ cảm nhận, ý kiến hoặc câu hỏi...">${myData.studentShare || ''}</textarea>
      <button onclick="saveStudentShare(${myData.id})" class="btn btn-gold" style="margin-top:10px;">Lưu Chia Sẻ</button>
    </div>
  `;
}

async function saveStudentShare(studentId) {
  const input = document.getElementById('student-share-input');
  if (!input) return;
  try {
    const r = await fetch(`/api/student/${studentId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ share: input.value })
    });
    if (r.ok) showToast('Đã lưu chia sẻ!');
    else showToast('Lỗi lưu!', true);
  } catch(e) { showToast('Lỗi kết nối', true); }
}

// ════════════════════════════════════════
// 8. TEACHER FEEDBACK MODAL
// ════════════════════════════════════════
function openFeedbackModal(studentId) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;

  let modal = document.getElementById('feedback-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'feedback-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;padding:16px;';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px;padding:28px;max-width:500px;width:100%;font-family:'Be Vietnam Pro',sans-serif;box-shadow:0 20px 60px rgba(0,0,0,.3);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
        <div style="font-weight:800;font-size:16px;color:#234A5B;">Nhận Xét: ${s.name}</div>
        <button onclick="document.getElementById('feedback-modal').style.display='none'"
          style="background:none;border:none;font-size:20px;cursor:pointer;color:#aaa;">✕</button>
      </div>
      <label style="font-size:12px;font-weight:600;color:#234A5B;display:block;margin-bottom:6px;">Nhận Xét</label>
      <textarea id="fb-feedback" style="width:100%;min-height:80px;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:13px;font-family:'Be Vietnam Pro',sans-serif;margin-bottom:12px;box-sizing:border-box;"
        placeholder="Nhận xét về quá trình học tập..."></textarea>
      <label style="font-size:12px;font-weight:600;color:#234A5B;display:block;margin-bottom:6px;">Bài Về Nhà / Báo Bài</label>
      <textarea id="fb-homework" style="width:100%;min-height:60px;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:13px;font-family:'Be Vietnam Pro',sans-serif;margin-bottom:12px;box-sizing:border-box;"
        placeholder="Giao bài về nhà hoặc ghi chú bài tiếp theo..."></textarea>
      <label style="font-size:12px;font-weight:600;color:#234A5B;display:block;margin-bottom:6px;">Link Video/Hình Ảnh (mỗi dòng 1 link)</label>
      <textarea id="fb-media" style="width:100%;min-height:50px;border:1.5px solid #e0e0e0;border-radius:10px;padding:10px;font-size:13px;font-family:'Be Vietnam Pro',sans-serif;margin-bottom:16px;box-sizing:border-box;"
        placeholder="https://drive.google.com/..."></textarea>
      <div style="display:flex;gap:10px;">
        <button onclick="submitFeedback(${studentId})" class="btn btn-gold" style="flex:1;">Lưu Nhận Xét</button>
        <button onclick="document.getElementById('feedback-modal').style.display='none'"
          style="flex:1;border:1.5px solid #eee;background:#fff;border-radius:10px;padding:10px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Be Vietnam Pro',sans-serif;">
          Hủy
        </button>
      </div>
    </div>
  `;
  modal.style.display = 'flex';
}

async function submitFeedback(studentId) {
  const feedback  = document.getElementById('fb-feedback')?.value || '';
  const homework  = document.getElementById('fb-homework')?.value || '';
  const mediaRaw  = document.getElementById('fb-media')?.value || '';
  const mediaUrls = mediaRaw.split('\n').map(l=>l.trim()).filter(Boolean);

  try {
    const r = await fetch(`/api/student/${studentId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feedback, homework, mediaUrls })
    });
    if (r.ok) {
      showToast('Đã lưu nhận xét!');
      document.getElementById('feedback-modal').style.display = 'none';
    } else {
      const d = await r.json();
      showToast(d.error || 'Lỗi lưu nhận xét', true);
    }
  } catch(e) { showToast('Lỗi kết nối', true); }
}

// ════════════════════════════════════════
// 9. ZALO CONFIG PAGE
// ════════════════════════════════════════
async function renderZaloConfig() {
  const page = document.getElementById('page-zalo');
  if (!page) return;
  const r = await fetch('/api/zalo/config');
  const cfg = r.ok ? await r.json() : {};
  page.innerHTML = `
    <div class="page-header">
      <div class="page-title">Cấu Hình <span>Zalo ZNS</span></div>
      <div class="page-sub">Tích hợp gửi tin nhắn tự động qua Zalo</div>
    </div>
    <div class="card" style="max-width:520px;">
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:12px 14px;font-size:12px;color:#92400e;margin-bottom:18px;">
        Để sử dụng Zalo ZNS, truy cập <b>business.zalo.me</b>, tạo Official Account, 
        lấy OA Access Token và Template ID rồi điền vào đây.
      </div>
      <label style="font-size:13px;font-weight:600;color:var(--navy);display:block;margin-bottom:6px;">OA Access Token</label>
      <input id="zalo-token" class="search-box" style="width:100%;margin-bottom:14px;box-sizing:border-box;"
        placeholder="Nhập OA Access Token từ Zalo Business" value="${cfg.oaAccessToken||''}">
      <label style="font-size:13px;font-weight:600;color:var(--navy);display:block;margin-bottom:6px;">Template ID (ZNS)</label>
      <input id="zalo-template" class="search-box" style="width:100%;margin-bottom:18px;box-sizing:border-box;"
        placeholder="Nhập Template ID từ Zalo ZNS" value="${cfg.templateId||''}">
      <button onclick="saveZaloConfig()" class="btn btn-gold">Lưu Cấu Hình</button>
      ${cfg.updatedAt ? `<div style="font-size:11px;color:var(--muted);margin-top:10px;">Cập nhật lần cuối: ${new Date(cfg.updatedAt).toLocaleString('vi-VN')}</div>` : ''}
    </div>
  `;
  showPage('zalo');
}

async function saveZaloConfig() {
  const token    = document.getElementById('zalo-token')?.value || '';
  const template = document.getElementById('zalo-template')?.value || '';
  const r = await fetch('/api/zalo/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oaAccessToken: token, templateId: template })
  });
  if (r.ok) showToast('Đã lưu cấu hình Zalo!');
  else showToast('Lỗi lưu cấu hình', true);
}

// ════════════════════════════════════════
// INIT - Chạy sau khi app load xong
// ════════════════════════════════════════
// Override initAppAfterLogin để thêm các init mới
const _origInit = window.initAppAfterLogin;
window.initAppAfterLogin = async function() {
  if (typeof _origInit === 'function') _origInit();

  // Load theme đã lưu
  loadSavedTheme();

  // Init hamburger
  initHamburger();

  // Hook auto end date vào form
  setTimeout(hookAutoEndDate, 500);

  // Load notifications và set interval
  const role = window.VS_ROLE;
  if (role === 'admin' || role === 'staff') {
    await checkReminders();
    await loadNotifications();
    if (_notifInterval) clearInterval(_notifInterval);
    _notifInterval = setInterval(() => { checkReminders(); loadNotifications(); }, 5 * 60 * 1000); // 5 phút
  }

  // Student portal
  if (role === 'student') {
    setTimeout(renderStudentPortal, 300);
    const defPage = document.getElementById('page-student-portal');
    // Tự động show page student portal
    setTimeout(() => {
      if (defPage) showPage('student-portal');
    }, 400);
  }
};
