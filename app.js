// ── STATE ──
let students      = [];
let classes       = [];
let customCourses = [];
let customPrices  = {};
let staff         = [];
let leads         = [];
let attendance    = [];
let makeups       = [];
let templates     = [];
let editStudentId = null;
let editStaffId   = null;
let editLeadId    = null;
let editTmplId    = null;
let editMakeupId  = null;
let studentFilter = 'all';
let studentClassFilter = 'all';
let studentSubjectFilter = 'all';
let staffFilter   = 'all';
let leadFilter    = 'all';
let _serverMode   = false; // true nếu kết nối được server


// ── STATIC COURSE LIST FOR FILTER TABS ──
const STATIC_COURSES = [
  {name:'Piano',      emoji:'🎹', match:'Piano'},
  {name:'Guitar',     emoji:'🎸', match:'Guitar'},
  {name:'Violin',     emoji:'🎻', match:'Violin'},
  {name:'Ukulele',    emoji:'🪕', match:'Ukulele'},
  {name:'Vẽ',         emoji:'🎨', match:'Vẽ'},
  {name:'Ballet',     emoji:'🩰', match:'Ballet'},
  {name:'Dance',      emoji:'💃', match:'Dance'},
  {name:'Khiêu Vũ',   emoji:'🕺', match:'Khiêu Vũ'},
  {name:'Múa Cổ Trang',emoji:'👘', match:'Múa Cổ Trang'},
  {name:'Thanh Nhạc', emoji:'🎤', match:'Thanh Nhạc'},
  {name:'Luyện Thi',  emoji:'🏆', match:'Luyện Thi'},
  {name:'Cảm Thụ Âm Nhạc', emoji:'🎼', match:'Cảm Thụ Âm Nhạc'},
  {name:'Piano Đệm Hát',   emoji:'🎹🎤', match:'Piano Đệm Hát'},
  {name:'Trống',      emoji:'🥁', match:'Trống'},
];

// ── HELPERS ──
const fmt     = n => Number(n||0).toLocaleString('vi-VN') + ' đ';
const fmtDate = d => { if (!d) return '–'; const p = d.split('-'); if (p.length === 3) return p[2]+'/'+p[1]+'/'+p[0]; return d; };

// ── LƯU DỮ LIỆU: server trước, localStorage dự phòng ──
const save = () => {
  const data = { students, staff, leads, classes, attendance, makeups, templates, customCourses, customPrices };
  // Luôn lưu localStorage làm cache
  Object.entries({
    vs_students: students, vs_staff: staff, vs_leads: leads,
    vs_classes: classes, vs_attendance: attendance, vs_makeups: makeups,
    vs_templates: templates, vs_custom_courses: customCourses, vs_custom_prices: customPrices
  }).forEach(([k,v]) => localStorage.setItem(k, JSON.stringify(v)));
  // Lưu server
  if (_serverMode) {
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).catch(() => { _serverMode = false; });
  }
};

// ── TẢI DỮ LIỆU KHI KHỞI ĐỘNG ──
async function loadData() {
  try {
    const res = await fetch('/api/load');
    if (!res.ok) throw new Error('Server không phản hồi');
    const data = await res.json();
    _serverMode = true;
    students      = data.students      || [];
    staff         = data.staff         || [];
    leads         = data.leads         || [];
    classes       = data.classes       || [];
    attendance    = data.attendance    || [];
    makeups       = data.makeups       || [];
    templates     = data.templates     || [];
    customCourses = data.customCourses || [];
    customPrices  = data.customPrices  || {};
    // Sync về localStorage
    localStorage.setItem('vs_students',      JSON.stringify(students));
    localStorage.setItem('vs_staff',         JSON.stringify(staff));
    localStorage.setItem('vs_leads',         JSON.stringify(leads));
    localStorage.setItem('vs_classes',       JSON.stringify(classes));
    localStorage.setItem('vs_attendance',    JSON.stringify(attendance));
    localStorage.setItem('vs_makeups',       JSON.stringify(makeups));
    localStorage.setItem('vs_templates',     JSON.stringify(templates));
    localStorage.setItem('vs_custom_courses',JSON.stringify(customCourses));
    localStorage.setItem('vs_custom_prices', JSON.stringify(customPrices));
    showToast('Đã kết nối server – dữ liệu được lưu an toàn');
  } catch {
    // Fallback: đọc từ localStorage
    _serverMode   = false;
    students      = JSON.parse(localStorage.getItem('vs_students')       || '[]');
    staff         = JSON.parse(localStorage.getItem('vs_staff')          || '[]');
    leads         = JSON.parse(localStorage.getItem('vs_leads')          || '[]');
    classes       = JSON.parse(localStorage.getItem('vs_classes')        || '[]');
    attendance    = JSON.parse(localStorage.getItem('vs_attendance')     || '[]');
    makeups       = JSON.parse(localStorage.getItem('vs_makeups')        || '[]');
    templates     = JSON.parse(localStorage.getItem('vs_templates')      || '[]');
    customCourses = JSON.parse(localStorage.getItem('vs_custom_courses') || '[]');
    customPrices  = JSON.parse(localStorage.getItem('vs_custom_prices')  || '{}');
  }
  // Migration classid
  let changed = false;
  students.forEach(s => {
    if (s.classid !== '' && s.classid !== null && s.classid !== undefined) {
      const n = Number(s.classid);
      if (!isNaN(n) && n !== 0 && s.classid !== n) { s.classid = n; changed = true; }
    }
  });
  if (changed) save();
  // Khởi động UI
  initRevSelectors();
  renderDashboard();
  renderCoursesPage();
  renderSubjectFilterBtns();
}

// ── DELETE MODAL ──
function confirmDelete(name, fn) {
  document.getElementById('del-modal-name').textContent = name;
  document.getElementById('del-confirm-btn').onclick = () => { fn(); closeDelModal(); };
  document.getElementById('del-modal').classList.add('open');
}
function closeDelModal() { document.getElementById('del-modal').classList.remove('open'); }

// ── NAVIGATION ──
function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if (oc.includes("'" + id + "'") || oc.includes('"' + id + '"')) n.classList.add('active');
  });
  const map = { students: renderStudentTable, staff: renderStaffTable, dashboard: renderDashboard, revenue: renderRevenue, leads: renderLeadTable, classes: renderClassTable, schedule: renderSchedule, attendance: initAttendancePage, makeup: initMakeupPage, consult: initConsultPage };
  if (map[id]) map[id]();
}
function startAddStudent() { editStudentId = null; clearStudentForm(); showPage('add-student'); }
function startAddClass()   { editClassId   = null; clearClassForm();   showPage('add-class'); }
function startAddStaff()   { editStaffId   = null; clearStaffForm();   showPage('add-staff'); }
function startAddLead()    { editLeadId    = null; clearLeadForm();    showPage('add-lead'); }

// ── COURSE DATA ──
const CD={
  piano:{name:'PIANO',emoji:'🎹',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  guitar:{name:'GUITAR',emoji:'🎸',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  violin:{name:'VIOLIN',emoji:'🎻',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  ukulele:{name:'UKULELE',emoji:'🪕',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  ve:{name:'VẼ',emoji:'🎨',sections:[{title:'Vẽ Mầm Non',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1400000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1800000}]},{title:'Vẽ Căn Bản',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3300000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1300000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1650000}]},{title:'Ký Họa / Màu Nước / Màu Marker',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1400000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1800000}]},{title:'Màu Acrylic / Digital Art',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:4800000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1800000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:2400000}]}]},
  ballet:{name:'BALLET',emoji:'🩰',sections:[{title:'Ballet 3–5 Tuổi',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3000000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1200000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1500000}]},{title:'Ballet 6–9 Tuổi',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1400000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1800000}]}]},
  dance:{name:'DANCE',emoji:'💃',sections:[{title:'Dance',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3000000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1200000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1500000}]}]},
  'khieuvũ':{name:'KHIÊU VŨ',emoji:'🕺',sections:[{title:'Khiêu Vũ',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3000000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1200000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1500000}]}]},
  muacotrang:{name:'MÚA CỔ TRANG',emoji:'👘',sections:[{title:'Múa Cổ Trang',rows:[{desc:'Lớp nhóm · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp nhóm · 1 tháng/8 buổi',amount:1400000},{desc:'Đóng 2 lần · 3 tháng/24 buổi',amount:1800000}]}]},
  thanhnhac:{name:'THANH NHẠC',emoji:'🎤',sections:[{title:'Căn Bản',rows:[{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  'luyen-thi':{name:'LUYỆN THI QUỐC TẾ',emoji:'🏆',sections:[{title:'Luyện Thi – Guitar',rows:[{desc:'Luyện 3-1 · 3T/24b',amount:6000000},{desc:'Luyện 2-1 · 3T/24b',amount:8400000},{desc:'Luyện 1-1 · 3T/24b',amount:12000000},{desc:'Luyện 3-1 · 1T/8b',amount:2200000},{desc:'Luyện 2-1 · 1T/8b',amount:3000000},{desc:'Luyện 1-1 · 1T/8b',amount:4200000}]},{title:'Luyện Thi – Violin',rows:[{desc:'Luyện 3-1 · 3T/24b',amount:6000000},{desc:'Luyện 2-1 · 3T/24b',amount:8400000},{desc:'Luyện 1-1 · 3T/24b',amount:12000000}]},{title:'Luyện Thi – Piano',rows:[{desc:'Luyện 3-1 · 3T/24b',amount:6000000},{desc:'Luyện 2-1 · 3T/24b',amount:8400000},{desc:'Luyện 1-1 · 3T/24b',amount:12000000}]},{title:'Luyện Thi – Vẽ',rows:[{desc:'Lớp nhóm · 3T/24b',amount:7200000},{desc:'Lớp nhóm · 1T/8b',amount:2600000},{desc:'Đóng 2 lần · 3T/24b',amount:3600000}]}]},
  hocthu:{name:'HỌC THỬ',emoji:'⭐',sections:[{title:'Các Loại Học Thử',rows:[{desc:'Học thử lớp nhóm',amount:100000},{desc:'Học thử 2-1',amount:250000},{desc:'Học thử 1-1',amount:500000}]}]},
  camthu:{name:'CẢM THỤ ÂM NHẠC',emoji:'🎼',sections:[{title:'Cảm Thụ Âm Nhạc Miễn Phí',rows:[{desc:'Lớp nhóm · 24 buổi · Miễn phí',amount:0}]}]},
  pianodemhat:{name:'PIANO ĐỆM HÁT',emoji:'🎹🎤',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]},
  trong:{name:'TRỐNG',emoji:'🥁',sections:[{title:'Lớp Thông Thường',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:5400000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:7200000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:12000000},{desc:'Lớp 3-1 · 1 tháng/8 buổi',amount:2000000},{desc:'Lớp 2-1 · 1 tháng/8 buổi',amount:2600000},{desc:'Lớp 1-1 · 1 tháng/8 buổi',amount:4200000}]},{title:'Đóng 2 Lần (Ưu Đãi)',rows:[{desc:'Lớp 3-1 · 3 tháng/24 buổi',amount:2700000},{desc:'Lớp 2-1 · 3 tháng/24 buổi',amount:3600000},{desc:'Lớp 1-1 · 3 tháng/24 buổi',amount:6000000}]}]}
};

function getAllCourses() {
  // Merge static CD + customCourses
  const all = {...CD};
  customCourses.forEach(c => { all[c.key] = c; });
  return all;
}

function openCourse(key){
  const allC = getAllCourses();
  const c = allC[key];
  if (!c) return;
  document.getElementById('modal-emoji').textContent = c.emoji;
  document.getElementById('modal-title').textContent = c.name;
  renderCourseModalContent(key, c);
  document.getElementById('course-modal').classList.add('open');
}

function renderCourseModalContent(key, c) {
  const prices = customPrices[key] || {};
  let html = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
    <button class="btn btn-outline" style="font-size:10px;padding:5px 12px;" onclick="toggleCourseEdit('${key}')">✏️ Chỉnh Sửa Học Phí</button>
  </div>`;
  c.sections.forEach((s,si)=>{
    html+=`<div class="price-section"><div class="price-section-title">${s.title}</div>`;
    s.rows.forEach((r,ri)=>{
      const priceKey = si+'_'+ri;
      const curAmount = prices[priceKey] !== undefined ? prices[priceKey] : r.amount;
      html+=`<div class="price-row">
        <div class="price-desc">${r.desc}</div>
        <div class="price-amount" id="pa_${key}_${priceKey}">${curAmount===0?'Miễn phí':fmt(curAmount)}</div>
        <input type="number" class="price-edit-input" id="pi_${key}_${priceKey}" value="${curAmount}" style="display:none;width:130px;padding:5px 8px;border:1.5px solid var(--gold);border-radius:8px;font-size:12px;font-weight:700;color:var(--navy);background:var(--cream);text-align:right;" min="0">
      </div>`;
    });
    html+='</div>';
  });
  html+=`<div id="course-edit-actions" style="display:none;margin-top:14px;padding-top:14px;border-top:1.5px solid var(--cream2);display:none;gap:9px;" class="form-actions">
    <button class="btn btn-gold" onclick="saveCourseEdit('${key}')">💾 Lưu Học Phí</button>
    <button class="btn btn-outline" onclick="resetCourseEdit('${key}')">↺ Khôi Phục Mặc Định</button>
  </div>`;
  document.getElementById('modal-content').innerHTML = html;
}

function toggleCourseEdit(key) {
  const inputs = document.querySelectorAll(`[id^="pi_${key}_"]`);
  const amounts = document.querySelectorAll(`[id^="pa_${key}_"]`);
  const actions = document.getElementById('course-edit-actions');
  const isEditing = inputs[0] && inputs[0].style.display !== 'none';
  inputs.forEach(el => el.style.display = isEditing ? 'none' : 'inline-block');
  amounts.forEach(el => el.style.display = isEditing ? '' : 'none');
  if (actions) actions.style.display = isEditing ? 'none' : 'flex';
}

function saveCourseEdit(key) {
  const allC = getAllCourses();
  const c = allC[key];
  if (!c) return;
  if (!customPrices[key]) customPrices[key] = {};
  c.sections.forEach((s,si) => {
    s.rows.forEach((r,ri) => {
      const priceKey = si+'_'+ri;
      const input = document.getElementById(`pi_${key}_${priceKey}`);
      if (input) customPrices[key][priceKey] = Number(input.value) || 0;
    });
  });
  save();
  renderCourseModalContent(key, c);
  showToast('Đã lưu học phí!');
}

function resetCourseEdit(key) {
  if (customPrices[key]) { delete customPrices[key]; save(); }
  const allC = getAllCourses();
  renderCourseModalContent(key, allC[key]);
  showToast('Đã khôi phục học phí mặc định!');
}

// ── PACKAGE OPTIONS PER COURSE ──
const COURSE_PACKAGES = {
  'Piano':                              ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Guitar':                             ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Violin':                             ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Ukulele':                            ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Vẽ Mầm Non':                         ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Vẽ Căn Bản':                         ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Vẽ - Ký Họa / Màu Nước / Màu Marker':['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Vẽ - Màu Acrylic Canvas / Digital Art':['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Ballet (3-5 tuổi)':                  ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Ballet (6-9 tuổi)':                  ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Dance':                              ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Khiêu Vũ':                           ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Múa Cổ Trang':                       ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Thanh Nhạc':                         ['Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Luyện Thi - Piano':                  ['Luyện 3-1 · 3 tháng/24 buổi','Luyện 2-1 · 3 tháng/24 buổi','Luyện 1-1 · 3 tháng/24 buổi'],
  'Luyện Thi - Guitar':                 ['Luyện 3-1 · 3 tháng/24 buổi','Luyện 2-1 · 3 tháng/24 buổi','Luyện 1-1 · 3 tháng/24 buổi','Luyện 3-1 · 1 tháng/8 buổi','Luyện 2-1 · 1 tháng/8 buổi','Luyện 1-1 · 1 tháng/8 buổi'],
  'Luyện Thi - Violin':                 ['Luyện 3-1 · 3 tháng/24 buổi','Luyện 2-1 · 3 tháng/24 buổi','Luyện 1-1 · 3 tháng/24 buổi'],
  'Luyện Thi - Vẽ':                     ['Lớp nhóm · 3 tháng/24 buổi','Lớp nhóm · 1 tháng/8 buổi','Đóng 2 lần · 3 tháng/24 buổi'],
  'Cảm Thụ Âm Nhạc':                   ['Miễn Phí · 24 buổi'],
  'Piano Đệm Hát':                      ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Trống':                               ['Lớp 3-1 · 3 tháng/24 buổi','Lớp 2-1 · 3 tháng/24 buổi','Lớp 1-1 · 3 tháng/24 buổi','Lớp 3-1 · 1 tháng/8 buổi','Lớp 2-1 · 1 tháng/8 buổi','Lớp 1-1 · 1 tháng/8 buổi','Đóng 2 lần – Lớp 3-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 2-1 · 3 tháng/24 buổi','Đóng 2 lần – Lớp 1-1 · 3 tháng/24 buổi'],
  'Học Thử':                             ['Học thử lớp nhóm','Học thử lớp 2-1','Học thử lớp 1-1'],
};

function populatePackages(selectedPkg) {
  const subj = document.getElementById('f-subject').value;
  const pkgSel = document.getElementById('f-package');
  const pkgs = COURSE_PACKAGES[subj] || [];
  pkgSel.innerHTML = pkgs.length
    ? '<option value="">-- Chọn gói --</option>' + pkgs.map(p => `<option${p===selectedPkg?' selected':''}>${p}</option>`).join('')
    : '<option value="">-- Chọn khóa học trước --</option>';
  // populate class dropdown - lọc theo môn học đã chọn
  const clSel = document.getElementById('f-classid');
  if (clSel) {
    const currentVal = clSel.value;
    const filtered = classes.filter(c => !subj || c.subject === subj);
    clSel.innerHTML = '<option value="">-- Chọn lớp (nếu có) --</option>'
      + filtered.map(c => {
          const hvCount = students.filter(s => Number(s.classid) === c.id && s.id !== editStudentId).length;
          const sched = (c.schedule||[]).map(s=>`${s.day} ${s.start}`).join(', ') || 'Chưa có lịch';
          return `<option value="${c.id}"${c.id===Number(currentVal)?' selected':''}>[${c.code}] ${c.name} · ${sched} · ${hvCount} HV</option>`;
        }).join('');
  }
}

function onClassSelect() {
  // Khi chọn lớp: tự động điền môn học nếu chưa chọn
  const clSel = document.getElementById('f-classid');
  const subjSel = document.getElementById('f-subject');
  if (!clSel || !subjSel) return;
  const classId = Number(clSel.value);
  if (!classId) return;
  const cls = classes.find(c => c.id === classId);
  if (cls && !subjSel.value) {
    subjSel.value = cls.subject;
    populatePackages('');
  }
}

function setStudentClassFilter(f, el) {
  studentClassFilter = f;
  document.querySelectorAll('#filter-class-tabs .filter-tab').forEach(t => t.classList.remove('active'));
  if(el) el.classList.add('active');
  renderStudentTable();
}
function renderClassFilterBtns() {
  const wrap = document.getElementById('class-filter-btns');
  if (!wrap) return;
  const allActive = studentClassFilter==='all' ? ' active' : '';
  wrap.innerHTML = `<button class="filter-tab${allActive}" onclick="setStudentClassFilter('all',this)">Tất Cả</button>`
    + classes.map(c => `<button class="filter-tab${studentClassFilter===c.id?' active':''}" onclick="setStudentClassFilter('${c.id}',this)">[${c.code}] ${c.name}</button>`).join('');
}
function setStudentSubjectFilter(f, el) {
  studentSubjectFilter = f;
  document.querySelectorAll('#filter-subject-tabs .filter-tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderStudentTable();
}

function renderSubjectFilterBtns() {
  const wrap = document.getElementById('subject-filter-btns');
  if (!wrap) return;
  // Build full list: static + custom (dedup by name)
  const staticNames = new Set();
  const allTabs = [];
  STATIC_COURSES.forEach(c => {
    if (!staticNames.has(c.name)) { staticNames.add(c.name); allTabs.push(c); }
  });
  customCourses.forEach(c => {
    if (!staticNames.has(c.name)) allTabs.push({name: c.name, emoji: c.emoji||'📚', match: c.name});
  });
  const allBtn = `<button class="filter-tab${studentSubjectFilter==='all'?' active':''}" onclick="setStudentSubjectFilter('all',this)">Tất Cả</button>`;
  const tabBtns = allTabs.map(c => {
    const active = (studentSubjectFilter === c.match || studentSubjectFilter === c.name) ? ' active' : '';
    return `<button class="filter-tab${active}" onclick="setStudentSubjectFilter('${c.match}',this)">${c.emoji} ${c.name}</button>`;
  }).join('');
  wrap.innerHTML = allBtn + tabBtns;
}

function closeCourse(){document.getElementById('course-modal').classList.remove('open');}
function closeCourseModal(e){if(e.target===document.getElementById('course-modal'))closeCourse();}

// ── STUDENTS ──
function saveStudent(){
  const g=id=>document.getElementById(id).value.trim?document.getElementById(id).value.trim():document.getElementById(id).value;
  const name=g('f-name'),dob=g('f-dob'),parent=g('f-parent'),phone=g('f-phone'),
        subject=g('f-subject'),pkg=g('f-package'),classid=document.getElementById('f-classid')?Number(document.getElementById('f-classid').value)||'':'' ,start=g('f-start'),end=g('f-end'),
        payment=g('f-payment'),amount=g('f-amount'),paydate=g('f-paydate'),note=g('f-note');
  if(!name||!parent||!phone||!subject||!start||!payment){showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)',true);return;}
  const obj={id:editStudentId||Date.now(),name,dob,parent,phone,subject,pkg,classid,start,end,payment,amount:Number(amount)||0,paydate,note};
  if(editStudentId!==null){const i=students.findIndex(s=>s.id===editStudentId);if(i!==-1)students[i]=obj;editStudentId=null;}
  else students.push(obj);
  save(); showToast('Đã lưu học viên thành công!'); clearStudentForm(); showPage('students');
  // Cũng cập nhật TKB nếu đang mở
  if (document.getElementById('page-schedule') && document.getElementById('page-schedule').classList.contains('active')) {
    renderSchedule();
  }
}
function clearStudentForm(){
  ['f-name','f-dob','f-parent','f-phone','f-package','f-start','f-end','f-note','f-amount','f-paydate'].forEach(id=>document.getElementById(id).value='');
  ['f-subject','f-payment'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('f-package').innerHTML='<option value="">-- Chọn khóa học trước --</option>';
  const clSel=document.getElementById('f-classid');if(clSel)clSel.innerHTML='<option value="">-- Chọn lớp (nếu có) --</option>';
  editStudentId=null; document.getElementById('form-title').innerHTML='Thêm <span>Học Viên</span>';
}
function editStudent(id){
  const s=students.find(x=>x.id===id); if(!s)return; editStudentId=id;
  document.getElementById('f-name').value=s.name;
  document.getElementById('f-dob').value=s.dob||'';
  document.getElementById('f-parent').value=s.parent;
  document.getElementById('f-phone').value=s.phone;
  document.getElementById('f-subject').value=s.subject;
  populatePackages(s.pkg||'');
  // Set classid SAU populatePackages (vì populatePackages mới build options)
  const clSel = document.getElementById('f-classid');
  if (clSel && s.classid) {
    // Option value là string trong HTML, classid có thể là number -> ép string
    clSel.value = String(s.classid);
    // Nếu không tìm thấy option (lớp bị xóa), để trống
    if (!clSel.value) clSel.value = '';
  }
  document.getElementById('f-start').value=s.start;
  document.getElementById('f-end').value=s.end||'';
  document.getElementById('f-payment').value=s.payment;
  document.getElementById('f-amount').value=s.amount||'';
  document.getElementById('f-paydate').value=s.paydate||'';
  document.getElementById('f-note').value=s.note||'';
  document.getElementById('form-title').innerHTML='Chỉnh Sửa <span>Học Viên</span>';
  showPage('add-student');
}
function deleteStudent(id) {
  const s = students.find(x => x.id === id); if (!s) return;
  confirmDelete(s.name, () => {
    students = students.filter(x => x.id !== id);
    save(); renderStudentTable(); renderDashboard();
    showToast('Đã xóa học viên ' + s.name + '.');
  });
}
function isExpiringSoon(s) {
  if (!s.end) return false;
  const end = new Date(s.end);
  const now = new Date();
  const diff = (end - now) / (1000*60*60*24);
  return diff >= 0 && diff <= 10;
}

function renderExpiryBanner() {
  const expiring = students.filter(s => s.subject !== 'Học Thử' && isExpiringSoon(s));
  const banner = document.getElementById('expiry-alert-banner');
  const list = document.getElementById('expiry-alert-list');
  if (!banner) return;
  if (!expiring.length) { banner.style.display = 'none'; return; }
  banner.style.display = 'flex';
  list.innerHTML = expiring.map(s => {
    const daysLeft = Math.ceil((new Date(s.end) - new Date()) / (1000*60*60*24));
    return `<b>${s.name}</b> (${s.subject}) – còn <b style="color:#dc2626">${daysLeft} ngày</b>`;
  }).join(' &nbsp;|&nbsp; ');
}

function setStudentFilter(f,el){studentFilter=f;document.querySelectorAll('#page-students .filter-tab').forEach(t=>t.classList.remove('active'));if(el)el.classList.add('active');renderStudentTable();}

function quickAssignClass(studentId) {
  const s = students.find(x => x.id === studentId);
  if (!s) return;
  // Build modal content
  const filtered = classes.filter(c => !s.subject || c.subject === s.subject);
  const allClasses = classes; // hiển thị tất cả nếu không có lớp cùng môn
  const listToShow = filtered.length ? filtered : allClasses;
  const opts = listToShow.map(c => {
    const hvCount = students.filter(x => Number(x.classid) === c.id).length;
    const sched = (c.schedule||[]).map(x=>`${x.day} ${x.start}–${x.end}`).join(', ') || 'Chưa có lịch';
    const selected = Number(s.classid) === c.id ? ' selected' : '';
    return `<option value="${c.id}"${selected}>[${c.code}] ${c.name} · ${sched} · ${hvCount} HV</option>`;
  }).join('');

  const modalHtml = `
    <div id="quick-assign-modal" style="position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;" onclick="if(event.target===this)closeAssignModal()">
      <div style="background:#fff;border-radius:16px;padding:28px 28px 22px;min-width:380px;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,.25);">
        <div style="font-size:16px;font-weight:800;color:#1a3a5c;margin-bottom:6px;">Gán Lớp Nhanh</div>
        <div style="font-size:13px;color:#888;margin-bottom:18px;">Học viên: <b style="color:#1a3a5c">${s.name}</b> · ${s.subject}</div>
        <select id="qa-classid" style="width:100%;padding:10px 12px;border:2px solid #e2c97e;border-radius:10px;font-size:13px;color:#1a3a5c;margin-bottom:18px;background:#fffbf0;">
          <option value="">-- Chưa gán lớp --</option>
          ${opts}
        </select>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button onclick="closeAssignModal()" style="padding:8px 18px;border-radius:8px;border:1.5px solid #ddd;background:#f5f5f5;cursor:pointer;font-size:13px;">Hủy</button>
          <button onclick="doAssignClass(${studentId})" style="padding:8px 20px;border-radius:8px;border:none;background:#e2c97e;color:#1a3a5c;font-weight:800;cursor:pointer;font-size:13px;">Lưu Gán Lớp</button>
        </div>
      </div>
    </div>`;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function doAssignClass(studentId) {
  const sel = document.getElementById('qa-classid');
  if (!sel) return;
  const classId = sel.value ? Number(sel.value) : '';
  const i = students.findIndex(x => x.id === studentId);
  if (i !== -1) {
    students[i].classid = classId;
    save();
    renderStudentTable();
    if (document.getElementById('schedule-grid')) renderSchedule();
    showToast('Đã gán lớp thành công!');
  }
  closeAssignModal();
}

function closeAssignModal() {
  const m = document.getElementById('quick-assign-modal');
  if (m) m.remove();
}

function viewClassSchedule(classId) {
  // Nhảy sang trang TKB và lọc theo môn của lớp đó
  const cls = classes.find(c => c.id === classId);
  if (!cls) return;
  // Set filter môn học trên TKB
  const tkbSel = document.getElementById('tkb-filter-subject');
  if (tkbSel) tkbSel.value = cls.subject;
  showPage('schedule');
}

function renderStudentTable(){
  renderClassFilterBtns();
  renderSubjectFilterBtns();
  renderExpiryBanner();
  const q=(document.getElementById('search-input').value||'').toLowerCase();
  const filtered=students.filter(s=>{
    const mq=!q||s.name.toLowerCase().includes(q)||s.phone.includes(q)||s.subject.toLowerCase().includes(q)||(s.parent&&s.parent.toLowerCase().includes(q));
    let mf=true;
    if(studentFilter==='hoc-thu') mf=s.subject==='Học Thử';
    else if(studentFilter==='sap-het-khoa') mf=isExpiringSoon(s)&&s.subject!=='Học Thử';
    else if(studentFilter!=='all') mf=s.payment===studentFilter;
    const mc=studentClassFilter==='all'||Number(s.classid)===Number(studentClassFilter);
    const ms=studentSubjectFilter==='all'||s.subject===studentSubjectFilter||s.subject===studentSubjectFilter||(studentSubjectFilter==='Vẽ'&&s.subject&&s.subject.startsWith('Vẽ'))||(studentSubjectFilter==='Ballet'&&s.subject&&s.subject.startsWith('Ballet'))||(studentSubjectFilter==='Luyện Thi'&&s.subject&&s.subject.startsWith('Luyện Thi'));
    return mq&&mf&&ms&&mc;
  });
  const tbody=document.getElementById('student-table-body');
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="11"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Không tìm thấy học viên nào</div></div></td></tr>`;return;}
  const pb=p=>p==='Đã Chuyển Khoản'?`<span class="badge badge-paid">✓ CK</span>`:p==='Tiền Mặt'?`<span class="badge badge-cash">💵 TM</span>`:`<span class="badge badge-unpaid">⚠ Chưa TT</span>`;
  tbody.innerHTML=filtered.map((s,i)=>{
    const isHocThu = s.subject==='Học Thử';
    const expiring = isExpiringSoon(s)&&!isHocThu;
    const rowStyle = isHocThu?'background:linear-gradient(90deg,#fefce8,#fff);':expiring?'background:linear-gradient(90deg,#fff7ed,#fff);':'';
    const daysLeft = s.end ? Math.ceil((new Date(s.end)-new Date())/(1000*60*60*24)) : null;
    const expiryTag = expiring&&daysLeft!==null ? `<br><span style="font-size:10px;color:#dc2626;font-weight:700">⏰ còn ${daysLeft} ngày</span>` : '';
    const hocThuTag = isHocThu ? `<br><span style="font-size:10px;background:#fde047;color:#713f12;padding:1px 6px;border-radius:4px;font-weight:700">⭐ HỌC THỬ</span>` : '';
    return `<tr style="${rowStyle}">
      <td>${i+1}</td>
      <td class="td-name">${s.name}${hocThuTag}</td>
      <td>${fmtDate(s.dob)}</td>
      <td>${s.parent}</td>
      <td>${s.phone}</td>
      <td style="font-weight:600;color:var(--navy)">${s.subject}${s.pkg?`<br><span style="font-size:10px;color:var(--muted);font-weight:400">${s.pkg}</span>`:''}</td>
      <td>${(()=>{const cl=classes.find(c=>c.id===Number(s.classid));return cl?`<span class='pos-badge' style='cursor:pointer' onclick='viewClassSchedule(${cl.id})' title='Xem TKB lớp này'>[${cl.code}]<br>${cl.name}</span>`:'–';})()}</td>
      <td style="font-size:11.5px">${fmtDate(s.start)}<br><span style="color:var(--muted)">→ ${fmtDate(s.end)}</span>${expiryTag}</td>
      <td>${pb(s.payment)}</td>
      <td style="font-weight:700;color:var(--gold)">${s.amount?fmt(s.amount):'–'}</td>
      <td><div class="action-btns"><button class="btn-icon" onclick="quickAssignClass(${s.id})" title="Gán Lớp Nhanh" style="background:#e0f2fe;color:#0369a1;border-color:#bae6fd">⊞</button><button class="btn-icon" onclick="editStudent(${s.id})" title="Sửa">✎</button><button class="btn-icon del" onclick="deleteStudent(${s.id})" title="Xóa">✕</button></div></td>
    </tr>`;
  }).join('');
}

// ── STAFF ──
function saveStaff(){
  const g=id=>document.getElementById(id).value.trim?document.getElementById(id).value.trim():document.getElementById(id).value;
  const name=g('sf-name'),dob=g('sf-dob'),phone=g('sf-phone'),role=g('sf-role'),status=g('sf-status'),note=g('sf-note');
  if(!name||!phone||!role||!status){showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)',true);return;}
  const obj={id:editStaffId||Date.now(),name,dob,phone,role,status,note};
  if(editStaffId!==null){const i=staff.findIndex(s=>s.id===editStaffId);if(i!==-1)staff[i]=obj;editStaffId=null;}
  else staff.push(obj);
  save(); showToast('Đã lưu nhân sự thành công!'); clearStaffForm(); showPage('staff');
}
function clearStaffForm(){
  ['sf-name','sf-dob','sf-phone','sf-note'].forEach(id=>document.getElementById(id).value='');
  ['sf-role','sf-status'].forEach(id=>document.getElementById(id).value='');
  editStaffId=null; document.getElementById('staff-form-title').innerHTML='Thêm <span>Nhân Sự</span>';
}
function editStaffMember(id){
  const s=staff.find(x=>x.id===id); if(!s)return; editStaffId=id;
  document.getElementById('sf-name').value=s.name;
  document.getElementById('sf-dob').value=s.dob||'';
  document.getElementById('sf-phone').value=s.phone;
  document.getElementById('sf-role').value=s.role;
  document.getElementById('sf-status').value=s.status;
  document.getElementById('sf-note').value=s.note||'';
  document.getElementById('staff-form-title').innerHTML='Chỉnh Sửa <span>Nhân Sự</span>';
  showPage('add-staff');
}
function deleteStaff(id) {
  const s = staff.find(x => x.id === id); if (!s) return;
  confirmDelete(s.name, () => {
    staff = staff.filter(x => x.id !== id);
    save(); renderStaffTable(); renderDashboard();
    showToast('Đã xóa nhân sự ' + s.name + '.');
  });
}
function setStaffFilter(f,el){staffFilter=f;document.querySelectorAll('#page-staff .filter-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderStaffTable();}

function renderStaffTable(){
  const q=(document.getElementById('staff-search').value||'').toLowerCase();
  const filtered=staff.filter(s=>{
    const mq=!q||s.name.toLowerCase().includes(q)||s.phone.includes(q)||s.role.toLowerCase().includes(q);
    let mf=true;
    if(staffFilter==='Giáo Viên') mf=s.role.startsWith('Giáo Viên');
    else if(staffFilter==='Nhân Viên') mf=!s.role.startsWith('Giáo Viên');
    else if(staffFilter!=='all') mf=s.status===staffFilter;
    return mq&&mf;
  });
  const tbody=document.getElementById('staff-table-body');
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">👥</div><div class="empty-text">Không tìm thấy nhân sự nào</div></div></td></tr>`;return;}
  tbody.innerHTML=filtered.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td class="td-name">${s.name}</td>
      <td>${fmtDate(s.dob)}</td>
      <td>${s.phone}</td>
      <td><span class="pos-badge">${s.role}</span></td>
      <td>${s.status==='Đang hoạt động'?`<span class="badge badge-active">● Hoạt Động</span>`:`<span class="badge badge-offline">○ Offline</span>`}</td>
      <td><div class="action-btns"><button class="btn-icon" onclick="editStaffMember(${s.id})" title="Sửa">✎</button><button class="btn-icon del" onclick="deleteStaff(${s.id})" title="Xóa">✕</button></div></td>
    </tr>`).join('');
}

// ── LEADS ──
function saveLead() {
  const g = id => document.getElementById(id).value.trim ? document.getElementById(id).value.trim() : document.getElementById(id).value;
  const name=g('lf-name'),dob=g('lf-dob'),parent=g('lf-parent'),phone=g('lf-phone'),
        course=g('lf-course'),source=g('lf-source'),status=g('lf-status'),note=g('lf-note');
  if (!name||!parent||!phone||!course||!source||!status) { showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)', true); return; }
  const existing = editLeadId ? (leads.find(l => l.id === editLeadId) || {}) : {};
  const obj = { id: editLeadId || Date.now(), name, dob, parent, phone, course, source, status, note, createdAt: existing.createdAt || new Date().toISOString().slice(0,10) };
  if (editLeadId !== null) {
    const i = leads.findIndex(l => l.id === editLeadId);
    if (i !== -1) leads[i] = obj;
    editLeadId = null;
  } else leads.push(obj);
  save(); showToast('Đã lưu học viên tiềm năng!'); clearLeadForm(); showPage('leads');
}
function clearLeadForm() {
  ['lf-name','lf-dob','lf-parent','lf-phone','lf-note'].forEach(id => document.getElementById(id).value = '');
  ['lf-course','lf-source','lf-status'].forEach(id => document.getElementById(id).value = '');
  editLeadId = null;
  document.getElementById('lead-form-title').innerHTML = 'Thêm <span>HV Tiềm Năng</span>';
}
function editLead(id) {
  const l = leads.find(x => x.id === id); if (!l) return;
  editLeadId = id;
  document.getElementById('lf-name').value   = l.name;
  document.getElementById('lf-dob').value    = l.dob||'';
  document.getElementById('lf-parent').value = l.parent;
  document.getElementById('lf-phone').value  = l.phone;
  document.getElementById('lf-course').value = l.course;
  document.getElementById('lf-source').value = l.source;
  document.getElementById('lf-status').value = l.status;
  document.getElementById('lf-note').value   = l.note||'';
  document.getElementById('lead-form-title').innerHTML = 'Chỉnh Sửa <span>HV Tiềm Năng</span>';
  showPage('add-lead');
}
function deleteLead(id) {
  const l = leads.find(x => x.id === id); if (!l) return;
  confirmDelete(l.name, () => {
    leads = leads.filter(x => x.id !== id);
    save(); renderLeadTable(); renderDashboard();
    showToast('Đã xóa học viên tiềm năng ' + l.name + '.');
  });
}
function setLeadFilter(f, el) {
  leadFilter = f;
  document.querySelectorAll('#page-leads .filter-tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  renderLeadTable();
}
function renderLeadTable() {
  const q = (document.getElementById('lead-search').value || '').toLowerCase();
  const filtered = leads.filter(l => {
    const mq = !q || l.name.toLowerCase().includes(q) || l.phone.includes(q) || l.course.toLowerCase().includes(q) || (l.parent && l.parent.toLowerCase().includes(q));
    const mf = leadFilter === 'all' || l.status === leadFilter || l.source === leadFilter;
    return mq && mf;
  });
  const tbody = document.getElementById('lead-table-body');
  if (!filtered.length) { tbody.innerHTML = `<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">🎯</div><div class="empty-text">Không tìm thấy học viên tiềm năng nào</div></div></td></tr>`; return; }
  const srcBadge = s => {
    if (s === 'Facebook') return `<span class="badge badge-src-fb">📘 Facebook</span>`;
    if (s === 'Tiktok')   return `<span class="badge badge-src-tt">🎵 Tiktok</span>`;
    return `<span class="badge badge-src-direct">🏠 Trực Tiếp</span>`;
  };
  const stBadge = s => s === 'Đã tư vấn'
    ? `<span class="badge badge-consulted">✓ Đã Tư Vấn</span>`
    : s === 'Đã đăng ký học'
    ? `<span class="badge" style="background:#dcfce7;color:#14532d;border:1px solid #4ade80;">✅ Đã Đăng Ký</span>`
    : `<span class="badge badge-new">○ Chưa Liên Hệ</span>`;
  tbody.innerHTML = filtered.map((l, i) => `
    <tr>
      <td>${i+1}</td>
      <td class="td-name">${l.name}</td>
      <td>${fmtDate(l.dob)}</td>
      <td>${l.parent}</td>
      <td>${l.phone}</td>
      <td style="font-weight:600;color:var(--navy)">${l.course}</td>
      <td>${srcBadge(l.source)}</td>
      <td>${stBadge(l.status)}</td>
      <td style="font-size:11px;color:var(--muted);max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${l.note||''}">${l.note||'–'}</td>
      <td><div class="action-btns">
        <button class="btn-icon" onclick="editLead(${l.id})" title="Sửa">✎</button>
        <button class="btn-icon del" onclick="deleteLead(${l.id})" title="Xóa">✕</button>
      </div></td>
    </tr>`).join('');
}

// ── REVENUE ──
function initRevSelectors(){
  const mSel=document.getElementById('rev-month');
  const ySel=document.getElementById('rev-year');
  const months=['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'];
  if(!mSel.options.length){
    months.forEach((m,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=m;mSel.appendChild(o);});
    const curY=new Date().getFullYear();
    for(let y=curY-2;y<=curY+1;y++){const o=document.createElement('option');o.value=y;o.textContent=y;ySel.appendChild(o);}
  }
  const now=new Date();
  mSel.value=now.getMonth()+1;
  ySel.value=now.getFullYear();
}
function setRevToday(){const now=new Date();document.getElementById('rev-month').value=now.getMonth()+1;document.getElementById('rev-year').value=now.getFullYear();renderRevenue();}

function renderRevenue(){
  const m=parseInt(document.getElementById('rev-month').value);
  const y=parseInt(document.getElementById('rev-year').value);
  const paid=students.filter(s=>{
    if(!s.paydate||s.payment==='Chưa Thanh Toán')return false;
    const d=new Date(s.paydate);
    return d.getFullYear()===y&&(d.getMonth()+1)===m;
  });
  const unpaidMonth=students.filter(s=>{
    if(s.payment!=='Chưa Thanh Toán')return false;
    const d=new Date(s.start);
    return d.getFullYear()===y&&(d.getMonth()+1)===m;
  });
  const total=paid.reduce((a,s)=>a+Number(s.amount||0),0);
  document.getElementById('rev-total-value').textContent=fmt(total);
  document.getElementById('rev-total-count').textContent=paid.length;
  document.getElementById('rev-unpaid-count').textContent=unpaidMonth.length;
  const breakdown={};
  paid.forEach(s=>{
    const key=s.subject||'Khác';
    if(!breakdown[key])breakdown[key]={total:0,count:0};
    breakdown[key].total+=Number(s.amount||0);
    breakdown[key].count++;
  });
  const bEl=document.getElementById('rev-breakdown');
  const entries=Object.entries(breakdown).sort((a,b)=>b[1].total-a[1].total);
  bEl.innerHTML=entries.length?entries.map(([k,v])=>`
    <div class="rev-cat">
      <div class="rev-cat-name">${k}</div>
      <div class="rev-cat-amount">${fmt(v.total)}</div>
      <div class="rev-cat-count">${v.count} học viên</div>
    </div>`).join(''):'<p style="color:var(--muted);font-size:13px;padding:12px 0;">Không có dữ liệu trong tháng này.</p>';
  const tbody=document.getElementById('rev-table-body');
  const pb=p=>p==='Đã Chuyển Khoản'?`<span class="badge badge-paid">✓ CK</span>`:`<span class="badge badge-cash">💵 TM</span>`;
  if(!paid.length){tbody.innerHTML=`<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">💰</div><div class="empty-text">Chưa có khoản thu nào trong tháng này</div></div></td></tr>`;return;}
  tbody.innerHTML=paid.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td class="td-name">${s.name}</td>
      <td style="color:var(--navy);font-weight:600">${s.subject}</td>
      <td style="font-size:11px;color:var(--muted)">${s.pkg||'–'}</td>
      <td style="font-weight:800;color:var(--gold)">${fmt(s.amount)}</td>
      <td>${fmtDate(s.paydate)}</td>
      <td>${pb(s.payment)}</td>
    </tr>`).join('');
}

// ── DASHBOARD ──
function renderDashboard(){
  document.getElementById('stat-total').textContent   = students.length;
  document.getElementById('stat-paid').textContent    = students.filter(s=>s.payment!=='Chưa Thanh Toán').length;
  document.getElementById('stat-unpaid').textContent  = students.filter(s=>s.payment==='Chưa Thanh Toán').length;
  document.getElementById('stat-staff').textContent   = staff.length;
  document.getElementById('stat-leads').textContent   = leads.length;
  const recent=[...students].reverse().slice(0,5);
  const pb=p=>p==='Đã Chuyển Khoản'?`<span class="badge badge-paid" style="font-size:10px">✓ CK</span>`:p==='Tiền Mặt'?`<span class="badge badge-cash" style="font-size:10px">TM</span>`:`<span class="badge badge-unpaid" style="font-size:10px">Chưa</span>`;
  const dtEl=document.getElementById('dashboard-table');
  dtEl.innerHTML=recent.length?recent.map(s=>`<tr><td class="td-name">${s.name}</td><td style="font-size:11.5px">${s.subject}</td><td>${pb(s.payment)}</td></tr>`).join(''):`<tr><td colspan="3"><div class="empty-state" style="padding:20px"><div class="empty-text">Chưa có học viên nào</div></div></td></tr>`;
  const now=new Date();
  const m=now.getMonth()+1,y=now.getFullYear();
  const paidM=students.filter(s=>{if(!s.paydate||s.payment==='Chưa Thanh Toán')return false;const d=new Date(s.paydate);return d.getFullYear()===y&&(d.getMonth()+1)===m;});
  const totalM=paidM.reduce((a,s)=>a+Number(s.amount||0),0);
  document.getElementById('dash-revenue-summary').innerHTML=`
    <div style="text-align:center;padding:20px 0;">
      <div style="font-size:9.5px;letter-spacing:2.5px;text-transform:uppercase;color:var(--muted);font-weight:700;margin-bottom:8px;">Tháng ${m}/${y}</div>
      <div style="font-size:32px;font-weight:800;color:var(--gold);letter-spacing:-1px">${fmt(totalM)}</div>
      <div style="font-size:12px;color:var(--muted);margin-top:6px;font-weight:400;">từ ${paidM.length} học viên đã thanh toán</div>
    </div>
    ${totalM===0?'<p style="text-align:center;font-size:12px;color:var(--muted2);padding-bottom:8px;">Chưa có khoản thu nào trong tháng này</p>':''}`;
}

// ── XUẤT EXCEL ──
function exportExcel(type) {
  // Thử gọi server trước; nếu không có server thì xuất CSV trực tiếp từ browser
  const serverUrl = `http://localhost:3000/api/export/${type}`;

  fetch(serverUrl, { method: 'GET' })
    .then(res => {
      if (!res.ok) throw new Error('Server lỗi');
      return res.blob();
    })
    .then(blob => {
      const names = { students: 'HocVien', staff: 'NhanSu', leads: 'HVTiemNang', revenue: 'DoanhThu' };
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${names[type]}_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Đã xuất file Excel thành công!');
    })
    .catch(() => {
      // Fallback: xuất thẳng từ dữ liệu localStorage
      exportCSVLocal(type);
    });
}

function exportCSVLocal(type) {
  const BOM = '\uFEFF';
  const fmtDate = d => d ? new Date(d).toLocaleDateString('vi-VN') : '';
  const fmtNum  = n => Number(n || 0).toLocaleString('vi-VN');
  const q = v  => `"${String(v || '').replace(/"/g, '""')}"`;

  let csv = BOM;
  let filename = '';

  if (type === 'students') {
    filename = `HocVien_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`;
    csv += ['#','Họ Tên','Ngày Sinh','Phụ Huynh (Zalo)','SĐT','Môn Học','Gói / Lớp','Ngày BĐ','Ngày KT','Học Phí','Số Tiền (đ)','Ngày Nộp','Ghi Chú'].map(q).join(',') + '\n';
    students.forEach((s, i) => {
      csv += [i+1,s.name,fmtDate(s.dob),s.parent,s.phone,s.subject,s.pkg||'',fmtDate(s.start),fmtDate(s.end),s.payment,fmtNum(s.amount),fmtDate(s.paydate),s.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'staff') {
    filename = `NhanSu_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`;
    csv += ['#','Họ Tên','Ngày Sinh','SĐT','Vị Trí','Tình Trạng','Ghi Chú'].map(q).join(',') + '\n';
    staff.forEach((s, i) => {
      csv += [i+1,s.name,fmtDate(s.dob),s.phone,s.role,s.status,s.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'leads') {
    filename = `HVTiemNang_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`;
    csv += ['#','Họ Tên HV','Ngày Sinh','Phụ Huynh (Zalo)','SĐT','Khóa Học','Nguồn Data','Tình Trạng','Ghi Chú'].map(q).join(',') + '\n';
    leads.forEach((l, i) => {
      csv += [i+1,l.name,fmtDate(l.dob),l.parent,l.phone,l.course,l.source,l.status,l.note||''].map(q).join(',') + '\n';
    });
  } else if (type === 'revenue') {
    filename = `DoanhThu_${new Date().toLocaleDateString('vi-VN').replace(/\//g,'-')}.csv`;
    csv += ['#','Họ Tên','Môn Học','Gói / Lớp','Hình Thức','Số Tiền (đ)','Ngày Nộp'].map(q).join(',') + '\n';
    const paid = students.filter(s => s.payment !== 'Chưa Thanh Toán' && s.amount);
    paid.forEach((s, i) => {
      csv += [i+1,s.name,s.subject,s.pkg||'',s.payment,fmtNum(s.amount),fmtDate(s.paydate)].map(q).join(',') + '\n';
    });
    const total = paid.reduce((a, s) => a + Number(s.amount || 0), 0);
    csv += ['','','','',q('TỔNG'),q(fmtNum(total)),q('')].join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Đã xuất file Excel thành công!');
}


function showToast(msg,err){
  const t=document.getElementById('toast');
  document.getElementById('toast-msg').textContent=msg;
  t.style.borderLeftColor=err?'var(--red)':'var(--gold)';
  t.className='toast show';
  setTimeout(()=>t.className='toast',3200);
}


// ── CLASSES ──
let editClassId = null;
const DAYS = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'];

function addScheduleRow(day, timeStart, timeEnd) {
  const list = document.getElementById('cl-schedule-list');
  const idx = list.children.length;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;gap:8px;align-items:center;';
  div.innerHTML = `
    <select class="rev-month-select cl-day" style="flex:1">
      ${DAYS.map(d=>`<option${d===(day||'')?' selected':''}>${d}</option>`).join('')}
    </select>
    <input type="time" class="search-box cl-time-start" value="${timeStart||''}" style="flex:1;padding:8px 10px;" placeholder="Giờ bắt đầu">
    <input type="time" class="search-box cl-time-end" value="${timeEnd||''}" style="flex:1;padding:8px 10px;" placeholder="Giờ kết thúc">
    <button type="button" class="btn-icon del" onclick="this.parentElement.remove()" title="Xóa">✕</button>`;
  list.appendChild(div);
}

function getScheduleRows() {
  const rows = [];
  document.querySelectorAll('#cl-schedule-list > div').forEach(div => {
    const day   = div.querySelector('.cl-day').value;
    const start = div.querySelector('.cl-time-start').value;
    const end   = div.querySelector('.cl-time-end').value;
    if (day) rows.push({day, start, end});
  });
  return rows;
}

function saveClass() {
  const g = id => document.getElementById(id).value.trim();
  const code = g('cl-code'), name = g('cl-name'), subject = g('cl-subject'),
        teacher = g('cl-teacher'), room = g('cl-room'), note = g('cl-note');
  if (!code || !name || !subject) { showToast('Vui lòng điền Mã Lớp, Tên Lớp và Khóa Học (*)', true); return; }
  if (classes.find(c => c.code === code && c.id !== editClassId)) { showToast('Mã lớp đã tồn tại!', true); return; }
  const schedule = getScheduleRows();
  const obj = { id: editClassId || Date.now(), code, name, subject, teacher, room, note, schedule };
  if (editClassId !== null) {
    const i = classes.findIndex(c => c.id === editClassId);
    if (i !== -1) classes[i] = obj;
    editClassId = null;
  } else classes.push(obj);
  save(); showToast('Đã lưu lớp thành công!'); clearClassForm(); showPage('classes');
}

function clearClassForm() {
  ['cl-code','cl-name','cl-teacher','cl-room','cl-note'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cl-subject').value = '';
  document.getElementById('cl-schedule-list').innerHTML = '';
  editClassId = null;
  document.getElementById('class-form-title').innerHTML = 'Thêm <span>Lớp Học</span>';
}

function editClass(id) {
  const c = classes.find(x => x.id === id); if (!c) return;
  editClassId = id;
  document.getElementById('cl-code').value    = c.code;
  document.getElementById('cl-name').value    = c.name;
  document.getElementById('cl-subject').value = c.subject;
  document.getElementById('cl-teacher').value = c.teacher || '';
  document.getElementById('cl-room').value    = c.room || '';
  document.getElementById('cl-note').value    = c.note || '';
  document.getElementById('cl-schedule-list').innerHTML = '';
  (c.schedule || []).forEach(s => addScheduleRow(s.day, s.start, s.end));
  document.getElementById('class-form-title').innerHTML = 'Chỉnh Sửa <span>Lớp Học</span>';
  showPage('add-class');
}

function deleteClass(id) {
  const c = classes.find(x => x.id === id); if (!c) return;
  confirmDelete(c.name, () => {
    classes = classes.filter(x => x.id !== id);
    save(); renderClassTable(); renderDashboard();
    showToast('Đã xóa lớp ' + c.name + '.');
  });
}

function renderClassTable() {
  const q = (document.getElementById('class-search').value || '').toLowerCase();
  const filtered = classes.filter(c =>
    !q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.subject.toLowerCase().includes(q)
  );
  const tbody = document.getElementById('class-table-body');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><div class="empty-icon">🏫</div><div class="empty-text">Chưa có lớp nào</div></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((c, i) => {
    const hvCount = students.filter(s => Number(s.classid) === c.id).length;
    const sched = (c.schedule || []).map(s => `${s.day} ${s.start}–${s.end}`).join('<br>') || '–';
    return `<tr>
      <td>${i+1}</td>
      <td><span class="pos-badge">${c.code}</span></td>
      <td class="td-name">${c.name}</td>
      <td style="color:var(--navy);font-weight:600">${c.subject}</td>
      <td style="font-size:11.5px">${c.teacher||'–'}</td>
      <td style="font-size:11px;color:var(--muted)">${sched}</td>
      <td style="font-size:11.5px">${c.room||'–'}</td>
      <td style="font-weight:700;color:var(--navy)">${hvCount}</td>
      <td><div class="action-btns">
        <button class="btn-icon" onclick="editClass(${c.id})" title="Sửa">✎</button>
        <button class="btn-icon del" onclick="deleteClass(${c.id})" title="Xóa">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}

// ── SCHEDULE / TKB ──
function renderSchedule() {
  const filterSubj = document.getElementById('tkb-filter-subject').value;
  const filteredClasses = filterSubj === 'all' ? classes : classes.filter(c => c.subject === filterSubj);

  const dayOrder = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'];

  const slots = new Set();
  filteredClasses.forEach(c => (c.schedule||[]).forEach(s => {
    if (s.start) slots.add(s.start);
  }));
  const sortedSlots = [...slots].sort();

  if (!filteredClasses.length || !sortedSlots.length) {
    document.getElementById('schedule-grid').innerHTML =
      '<div class="empty-state" style="padding:60px 0"><div class="empty-icon">📅</div><div class="empty-text">Chưa có lịch học nào. Hãy tạo lớp và thêm buổi học.</div></div>';
    return;
  }

  // Build lookup: day -> timeStart -> [{class, students, end}]
  const lookup = {};
  dayOrder.forEach(d => { lookup[d] = {}; });
  filteredClasses.forEach(c => {
    const classStudents = students.filter(s => Number(s.classid) === c.id);
    (c.schedule||[]).forEach(s => {
      if (!s.day || !s.start) return;
      if (!lookup[s.day]) lookup[s.day] = {};
      if (!lookup[s.day][s.start]) lookup[s.day][s.start] = [];
      lookup[s.day][s.start].push({ cls: c, studs: classStudents, end: s.end });
    });
  });

  let html = `<div class="table-wrap"><table style="min-width:900px;">
    <thead><tr><th style="width:90px">Giờ</th>${dayOrder.map(d=>`<th>${d}</th>`).join('')}</tr></thead>
    <tbody>`;

  sortedSlots.forEach(slot => {
    html += `<tr><td class="tkb-time-cell">${slot}</td>`;
    dayOrder.forEach(day => {
      const entries = (lookup[day] && lookup[day][slot]) || [];
      if (!entries.length) {
        html += `<td style="background:rgba(251,237,211,.15)"></td>`;
      } else {
        html += `<td>`;
        entries.forEach(e => {
          const endStr = e.end ? `–${e.end}` : '';
          const studsHtml = e.studs.length
            ? `<div class="tkb-student-list">` +
              e.studs.map(s => `<div class="tkb-cell-student" title="${s.subject} · ${s.pkg||''}">
                <span style="font-weight:700">${s.name}</span>
                <span style="font-size:9px;color:var(--muted);margin-left:3px">${s.subject}</span>
              </div>`).join('') +
              `</div>`
            : `<div class="tkb-empty" style="font-size:10px;color:var(--muted);padding:4px 0;">Chưa có HV</div>`;
          const hvBadge = e.studs.length
            ? `<span style="background:var(--navy);color:#fff;font-size:9px;padding:1px 5px;border-radius:10px;margin-left:4px;font-weight:700">${e.studs.length} HV</span>`
            : '';
          html += `<div class="tkb-cell">
            <div class="tkb-cell-code">[${e.cls.code}] ${e.cls.name}${hvBadge}</div>
            <div class="tkb-cell-info">🕐 ${slot}${endStr} · ${e.cls.subject}</div>
            ${e.cls.teacher?`<div class="tkb-cell-teacher">👩‍🏫 ${e.cls.teacher}</div>`:''}
            ${studsHtml}
          </div>`;
        });
        html += `</td>`;
      }
    });
    html += `</tr>`;
  });

  html += `</tbody></table></div>`;
  document.getElementById('schedule-grid').innerHTML = html;
}


// ── CUSTOM COURSES CRUD ──
let editCustomCourseKey = null;

function startAddCourse() {
  editCustomCourseKey = null;
  document.getElementById('cc-key').value = '';
  document.getElementById('cc-name').value = '';
  document.getElementById('cc-emoji').value = '';
  document.getElementById('cc-rows-wrap').innerHTML = '';
  addCustomCourseRow();
  document.getElementById('custom-course-modal').classList.add('open');
}

function editCustomCourse(key) {
  const c = customCourses.find(x => x.key === key);
  if (!c) return;
  editCustomCourseKey = key;
  document.getElementById('cc-key').value = key;
  document.getElementById('cc-name').value = c.name;
  document.getElementById('cc-emoji').value = c.emoji || '';
  const wrap = document.getElementById('cc-rows-wrap');
  wrap.innerHTML = '';
  (c.sections||[]).forEach(sec => {
    (sec.rows||[]).forEach(r => addCustomCourseRow(sec.title, r.desc, r.amount));
  });
  document.getElementById('custom-course-modal').classList.add('open');
}

function deleteCustomCourse(key) {
  const c = customCourses.find(x => x.key === key);
  if (!c) return;
  confirmDelete(c.name, () => {
    customCourses = customCourses.filter(x => x.key !== key);
    if (customPrices[key]) delete customPrices[key];
    save(); renderCoursesPage(); showToast('Đã xóa khóa học ' + c.name);
  });
}

function addCustomCourseRow(section, desc, amount) {
  const wrap = document.getElementById('cc-rows-wrap');
  const div = document.createElement('div');
  div.style.cssText = 'display:grid;grid-template-columns:1fr 2fr 1fr auto;gap:8px;align-items:center;margin-bottom:8px;';
  div.innerHTML = `
    <input type="text" class="search-box cc-section" placeholder="Tên nhóm gói" value="${section||''}" style="padding:8px 10px;font-size:12px;">
    <input type="text" class="search-box cc-desc" placeholder="Mô tả gói học" value="${desc||''}" style="padding:8px 10px;font-size:12px;">
    <input type="number" class="search-box cc-amount" placeholder="Học phí (đ)" value="${amount||0}" min="0" style="padding:8px 10px;font-size:12px;">
    <button type="button" class="btn-icon del" onclick="this.parentElement.remove()" title="Xóa">✕</button>`;
  wrap.appendChild(div);
}

function saveCustomCourse() {
  const key = document.getElementById('cc-key').value.trim().replace(/\s+/g,'_').toLowerCase();
  const name = document.getElementById('cc-name').value.trim();
  const emoji = document.getElementById('cc-emoji').value.trim() || '📚';
  if (!key || !name) { showToast('Vui lòng điền Mã khóa và Tên khóa học!', true); return; }
  if (!editCustomCourseKey && (CD[key] || customCourses.find(c=>c.key===key))) {
    showToast('Mã khóa học đã tồn tại!', true); return;
  }
  // Build sections from rows
  const rows = document.querySelectorAll('#cc-rows-wrap > div');
  const sectMap = {};
  rows.forEach(div => {
    const sec = div.querySelector('.cc-section').value.trim() || 'Học Phí';
    const desc = div.querySelector('.cc-desc').value.trim();
    const amount = Number(div.querySelector('.cc-amount').value) || 0;
    if (!desc) return;
    if (!sectMap[sec]) sectMap[sec] = [];
    sectMap[sec].push({desc, amount});
  });
  const sections = Object.entries(sectMap).map(([title, rows]) => ({title, rows}));
  if (!sections.length) { showToast('Vui lòng thêm ít nhất 1 gói học phí!', true); return; }
  const obj = {key, name, emoji, sections};
  // packages
  const pkgList = [];
  sections.forEach(s => s.rows.forEach(r => pkgList.push(r.desc)));
  if (editCustomCourseKey) {
    const i = customCourses.findIndex(c => c.key === editCustomCourseKey);
    if (i !== -1) customCourses[i] = obj;
  } else {
    customCourses.push(obj);
  }
  // update COURSE_PACKAGES dynamically
  COURSE_PACKAGES[name] = pkgList;
  save(); closeCustomCourseModal(); renderCoursesPage();
  showToast('Đã lưu khóa học ' + name + '!');
}

function closeCustomCourseModal() {
  document.getElementById('custom-course-modal').classList.remove('open');
  editCustomCourseKey = null;
}

function renderCoursesPage() {
  renderSubjectFilterBtns();
  // Re-render course cards including custom ones
  const grid = document.getElementById('courses-grid');
  if (!grid) return;
  // static cards are already in HTML, just append/re-render custom ones
  let customHtml = '';
  customCourses.forEach(c => {
    const totalPkg = c.sections ? c.sections.reduce((a,s)=>a+s.rows.length,0) : 0;
    customHtml += `<div class="course-card" onclick="openCourse('${c.key}')">
      <span class="course-emoji">${c.emoji||'📚'}</span>
      <div class="course-name">${c.name}</div>
      <div class="course-count">${totalPkg} gói học phí</div>
      <div style="display:flex;gap:5px;margin-top:8px;">
        <button class="btn-icon" onclick="event.stopPropagation();editCustomCourse('${c.key}')" title="Sửa">✎</button>
        <button class="btn-icon del" onclick="event.stopPropagation();deleteCustomCourse('${c.key}')" title="Xóa">✕</button>
      </div>
    </div>`;
  });
  document.getElementById('custom-courses-container').innerHTML = customHtml;
  // Sync COURSE_PACKAGES for all custom
  customCourses.forEach(c => {
    const pkgList = [];
    (c.sections||[]).forEach(s => s.rows.forEach(r => pkgList.push(r.desc)));
    COURSE_PACKAGES[c.name] = pkgList;
  });
  // Sync f-subject selects
  syncCourseSelects();
}

function syncCourseSelects() {
  ['f-subject','cl-subject','lf-course','tkb-filter-subject'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    [...sel.querySelectorAll('option.custom-opt')].forEach(o => o.remove());
    customCourses.forEach(c => {
      const o = document.createElement('option');
      o.textContent = c.name;
      o.className = 'custom-opt';
      sel.appendChild(o);
    });
  });
}

// ── MIGRATION: classid string -> number ──
// (đã chuyển vào loadData())

// ── INIT ──
loadData();

// ════════════════════════════════════════════
// ── ĐIỂM DANH ──
// ════════════════════════════════════════════

function initAttendancePage() {
  // Populate class select
  const sel = document.getElementById('att-class-sel');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Chọn lớp --</option>'
    + classes.map(c => `<option value="${c.id}"${String(c.id)===cur?' selected':''}>[${c.code}] ${c.name} · ${c.subject}</option>`).join('');
  // Set today if no date
  const dateSel = document.getElementById('att-date');
  if (dateSel && !dateSel.value) dateSel.value = new Date().toISOString().slice(0,10);
  renderAttendance();
}

function renderAttendance() {
  const classId = Number(document.getElementById('att-class-sel').value);
  const date = document.getElementById('att-date').value;
  const cont = document.getElementById('att-content');
  if (!classId || !date) {
    cont.innerHTML = '<div class="empty-state" style="padding:60px 0"><div class="empty-icon">✔</div><div class="empty-text">Chọn lớp và ngày để bắt đầu điểm danh</div></div>';
    return;
  }
  const cls = classes.find(c => c.id === classId);
  const classStudents = students.filter(s => Number(s.classid) === classId);

  // Đếm tổng buổi đã điểm danh của lớp
  const classAttendances = attendance.filter(a => a.classId === classId);
  const allDates = [...new Set(classAttendances.map(a => a.date))].sort();

  // Kiểm tra buổi hiện tại đã có chưa
  const existing = attendance.filter(a => a.classId === classId && a.date === date);
  const existingMap = {};
  existing.forEach(a => { existingMap[a.studentId] = a.status; });

  if (!classStudents.length) {
    cont.innerHTML = `<div class="card"><div class="empty-state" style="padding:40px 0"><div class="empty-icon">👥</div><div class="empty-text">Lớp [${cls.code}] chưa có học viên nào</div></div></div>`;
    return;
  }

  // Thống kê buổi học mỗi HV
  let statsHtml = '';
  if (allDates.length) {
    const maxSessions = extractTotalSessions(classStudents);
    statsHtml = `<div class="card" style="margin-bottom:12px;">
      <div class="card-title" style="margin-bottom:10px;">Thống Kê Buổi Học – Lớp [${cls.code}] ${cls.name}</div>
      <div class="table-wrap"><table>
        <thead><tr><th>Học Viên</th><th>Tổng Đăng Ký</th><th>Đã Học</th><th>Vắng Phép</th><th>Vắng KP</th><th>Còn Lại</th><th>Tiến Độ</th></tr></thead>
        <tbody>${classStudents.map(s => {
          const sAtt = classAttendances.filter(a => a.studentId === s.id);
          const present = sAtt.filter(a => a.status === 'present').length;
          const absentExcused = sAtt.filter(a => a.status === 'absent-excused').length;
          const absentNo = sAtt.filter(a => a.status === 'absent').length;
          const total = extractTotalSessionsForStudent(s);
          const remaining = Math.max(0, total - present);
          const pct = total > 0 ? Math.round(present/total*100) : 0;
          return `<tr>
            <td class="td-name">${s.name}</td>
            <td style="font-weight:700">${total} buổi</td>
            <td><span style="color:#16a34a;font-weight:700">${present}</span></td>
            <td><span style="color:#d97706;font-weight:700">${absentExcused}</span></td>
            <td><span style="color:#dc2626;font-weight:700">${absentNo}</span></td>
            <td><span style="color:#0369a1;font-weight:700">${remaining}</span></td>
            <td><div style="background:#e5e7eb;border-radius:99px;height:8px;width:80px;overflow:hidden;"><div style="background:#22c55e;height:100%;width:${pct}%;border-radius:99px;"></div></div><span style="font-size:10px;color:var(--muted)">${pct}%</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </div>`;
  }

  let rows = classStudents.map(s => {
    const status = existingMap[s.id] || 'present';
    return `<tr>
      <td class="td-name">${s.name}</td>
      <td style="font-size:11px;color:var(--muted)">${s.subject}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;${status==='present'?'background:#dcfce7;color:#14532d;':'background:#f1f5f9;color:#64748b;'}border:1.5px solid ${status==='present'?'#4ade80':'#e2e8f0'};">
            <input type="radio" name="att_${s.id}" value="present" ${status==='present'?'checked':''} onchange="updateAttRow(${s.id})" style="margin:0;">
            Có Mặt
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;${status==='absent-excused'?'background:#fef9c3;color:#92400e;':'background:#f1f5f9;color:#64748b;'}border:1.5px solid ${status==='absent-excused'?'#fcd34d':'#e2e8f0'};">
            <input type="radio" name="att_${s.id}" value="absent-excused" ${status==='absent-excused'?'checked':''} onchange="updateAttRow(${s.id})" style="margin:0;">
            Vắng Bù Phép
          </label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;${status==='absent'?'background:#fee2e2;color:#991b1b;':'background:#f1f5f9;color:#64748b;'}border:1.5px solid ${status==='absent'?'#f87171':'#e2e8f0'};">
            <input type="radio" name="att_${s.id}" value="absent" ${status==='absent'?'checked':''} onchange="updateAttRow(${s.id})" style="margin:0;">
            Vắng KP
          </label>
        </div>
      </td>
    </tr>`;
  }).join('');

  cont.innerHTML = statsHtml + `<div class="card">
    <div class="section-row" style="margin-bottom:12px;">
      <div class="card-title">Điểm Danh – [${cls.code}] ${cls.name} – ${fmtDate(date)}</div>
      ${existing.length?'<span style="font-size:11px;color:#16a34a;font-weight:700;">✓ Đã lưu buổi này</span>':'<span style="font-size:11px;color:#d97706;font-weight:700;">Chưa lưu</span>'}
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>Học Viên</th><th>Khóa Học</th><th>Tình Trạng</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`;
}

function updateAttRow(studentId) {
  // just re-style labels on change (radio auto-handles)
  const radios = document.querySelectorAll(`[name="att_${studentId}"]`);
  radios.forEach(r => {
    const lbl = r.parentElement;
    if (r.value === 'present') {
      lbl.style.cssText = `display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;background:${r.checked?'#dcfce7':'#f1f5f9'};color:${r.checked?'#14532d':'#64748b'};border:1.5px solid ${r.checked?'#4ade80':'#e2e8f0'};`;
    } else if (r.value === 'absent-excused') {
      lbl.style.cssText = `display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;background:${r.checked?'#fef9c3':'#f1f5f9'};color:${r.checked?'#92400e':'#64748b'};border:1.5px solid ${r.checked?'#fcd34d':'#e2e8f0'};`;
    } else {
      lbl.style.cssText = `display:flex;align-items:center;gap:4px;cursor:pointer;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;background:${r.checked?'#fee2e2':'#f1f5f9'};color:${r.checked?'#991b1b':'#64748b'};border:1.5px solid ${r.checked?'#f87171':'#e2e8f0'};`;
    }
  });
}

function extractTotalSessionsForStudent(s) {
  // Trích xuất số buổi từ pkg: tìm "24 buổi" hoặc "8 buổi"
  if (!s.pkg) return 24;
  const m = s.pkg.match(/(\d+)\s*buổi/);
  return m ? parseInt(m[1]) : 24;
}
function extractTotalSessions(studs) {
  if (!studs.length) return 24;
  return extractTotalSessionsForStudent(studs[0]);
}

function saveAttendance() {
  const classId = Number(document.getElementById('att-class-sel').value);
  const date = document.getElementById('att-date').value;
  if (!classId || !date) { showToast('Vui lòng chọn lớp và ngày!', true); return; }
  const classStudents = students.filter(s => Number(s.classid) === classId);
  if (!classStudents.length) { showToast('Lớp chưa có học viên!', true); return; }

  // Xóa điểm danh cũ của buổi này
  attendance = attendance.filter(a => !(a.classId === classId && a.date === date));

  classStudents.forEach(s => {
    const radios = document.querySelectorAll(`[name="att_${s.id}"]`);
    let status = 'present';
    radios.forEach(r => { if (r.checked) status = r.value; });
    attendance.push({ id: Date.now() + s.id, classId, studentId: s.id, date, status });
    // Nếu vắng có phép, tự tạo record bù
    if (status === 'absent-excused') {
      const existing = makeups.find(m => m.studentId === s.id && m.absentDate === date && m.classId === classId);
      if (!existing) {
        makeups.push({ id: Date.now() + s.id + 1, classId, studentId: s.id, absentDate: date, reason: 'Vắng có phép', makeupDate: '', status: 'pending', note: '' });
      }
    }
  });
  save();
  showToast('Đã lưu điểm danh buổi ' + fmtDate(date) + '!');
  renderAttendance();
}


// ════════════════════════════════════════════
// ── LỊCH BÙ ──
// ════════════════════════════════════════════

function initMakeupPage() {
  const sel = document.getElementById('mu-class-sel');
  if (!sel) return;
  const cur = sel.value;
  sel.innerHTML = '<option value="">-- Tất cả lớp --</option>'
    + classes.map(c => `<option value="${c.id}"${String(c.id)===cur?' selected':''}>[${c.code}] ${c.name}</option>`).join('');
  renderMakeup();
}

function renderMakeup() {
  const classId = Number(document.getElementById('mu-class-sel').value) || null;
  const statusF = document.getElementById('mu-status-sel').value;
  let list = [...makeups];
  if (classId) list = list.filter(m => m.classId === classId);
  if (statusF !== 'all') list = list.filter(m => m.status === statusF);
  list.sort((a,b) => (b.absentDate||'').localeCompare(a.absentDate||''));

  const tbody = document.getElementById('makeup-table-body');
  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="padding:40px 0"><div class="empty-icon">🔄</div><div class="empty-text">Không có lịch bù nào</div></div></td></tr>`;
    return;
  }
  const stBadge = s => ({
    pending: `<span style="background:#fef9c3;color:#92400e;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;border:1px solid #fcd34d;">Chờ Bù</span>`,
    scheduled: `<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;border:1px solid #93c5fd;">Đã Xếp Lịch</span>`,
    done: `<span style="background:#dcfce7;color:#14532d;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:700;border:1px solid #4ade80;">Đã Bù Xong</span>`,
  }[s] || s);

  tbody.innerHTML = list.map((m, i) => {
    const s = students.find(x => x.id === m.studentId);
    const c = classes.find(x => x.id === m.classId);
    return `<tr>
      <td>${i+1}</td>
      <td class="td-name">${s ? s.name : '–'}</td>
      <td>${c ? `<span class="pos-badge">[${c.code}]</span>` : '–'}</td>
      <td>${fmtDate(m.absentDate)}</td>
      <td style="font-size:11px">${m.reason||'–'}</td>
      <td>${m.makeupDate ? fmtDate(m.makeupDate) : '<span style="color:var(--muted);font-size:11px;">Chưa xếp</span>'}</td>
      <td>${stBadge(m.status)}</td>
      <td><div class="action-btns">
        <button class="btn-icon" onclick="editMakeup(${m.id})" title="Sửa">✎</button>
        <button class="btn-icon" onclick="markMakeupDone(${m.id})" title="Đánh dấu xong" style="background:#dcfce7;color:#14532d;border-color:#4ade80;">✓</button>
        <button class="btn-icon del" onclick="deleteMakeup(${m.id})" title="Xóa">✕</button>
      </div></td>
    </tr>`;
  }).join('');
}

function openAddMakeup() {
  editMakeupId = null;
  // populate student select
  const sSel = document.getElementById('mu-student-sel');
  sSel.innerHTML = '<option value="">-- Chọn học viên --</option>'
    + students.map(s => `<option value="${s.id}">${s.name} · ${s.subject}</option>`).join('');
  const cSel = document.getElementById('mu-class-inp');
  cSel.innerHTML = '<option value="">-- Chọn lớp --</option>'
    + classes.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
  document.getElementById('mu-absent-date').value = '';
  document.getElementById('mu-makeup-date').value = '';
  document.getElementById('mu-reason').value = 'Vắng có phép';
  document.getElementById('mu-status-inp').value = 'pending';
  document.getElementById('mu-note-inp').value = '';
  document.getElementById('makeup-modal').classList.add('open');
}

function editMakeup(id) {
  const m = makeups.find(x => x.id === id); if (!m) return;
  editMakeupId = id;
  openAddMakeup();
  setTimeout(() => {
    document.getElementById('mu-student-sel').value = m.studentId;
    document.getElementById('mu-class-inp').value = m.classId;
    document.getElementById('mu-absent-date').value = m.absentDate;
    document.getElementById('mu-makeup-date').value = m.makeupDate || '';
    document.getElementById('mu-reason').value = m.reason || 'Vắng có phép';
    document.getElementById('mu-status-inp').value = m.status || 'pending';
    document.getElementById('mu-note-inp').value = m.note || '';
  }, 50);
}

function saveMakeup() {
  const studentId = Number(document.getElementById('mu-student-sel').value);
  const classId = Number(document.getElementById('mu-class-inp').value);
  const absentDate = document.getElementById('mu-absent-date').value;
  const makeupDate = document.getElementById('mu-makeup-date').value;
  const reason = document.getElementById('mu-reason').value;
  const status = document.getElementById('mu-status-inp').value;
  const note = document.getElementById('mu-note-inp').value.trim();
  if (!studentId || !classId || !absentDate) { showToast('Vui lòng chọn học viên, lớp và ngày vắng!', true); return; }
  const obj = { id: editMakeupId || Date.now(), classId, studentId, absentDate, reason, makeupDate, status, note };
  if (editMakeupId) {
    const i = makeups.findIndex(x => x.id === editMakeupId);
    if (i !== -1) makeups[i] = obj;
    editMakeupId = null;
  } else makeups.push(obj);
  save(); closeMakeupModal(); renderMakeup();
  showToast('Đã lưu lịch bù!');
}

function markMakeupDone(id) {
  const m = makeups.find(x => x.id === id); if (!m) return;
  m.status = 'done';
  if (!m.makeupDate) m.makeupDate = new Date().toISOString().slice(0,10);
  save(); renderMakeup();
  showToast('Đã đánh dấu bù xong!');
}

function deleteMakeup(id) {
  const m = makeups.find(x => x.id === id); if (!m) return;
  const s = students.find(x => x.id === m.studentId);
  confirmDelete((s ? s.name : 'lịch bù này'), () => {
    makeups = makeups.filter(x => x.id !== id);
    save(); renderMakeup();
    showToast('Đã xóa lịch bù.');
  });
}

function closeMakeupModal() { document.getElementById('makeup-modal').classList.remove('open'); }


// ════════════════════════════════════════════
// ── TƯ VẤN & MẪU TIN NHẮN ──
// ════════════════════════════════════════════

function initConsultPage() {
  renderTemplates();
  syncConsultCourseSelects();
}

function syncConsultCourseSelects() {
  ['tmpl-filter-course','tmpl-course-inp'].forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    [...sel.querySelectorAll('option.custom-opt')].forEach(o => o.remove());
    customCourses.forEach(c => {
      const o = document.createElement('option');
      o.textContent = c.name;
      o.className = 'custom-opt';
      sel.appendChild(o);
    });
  });
}

function genGroupMsg() {
  const hvname = document.getElementById('cq-hvname').value.trim();
  const age = document.getElementById('cq-age').value.trim();
  const parent = document.getElementById('cq-parent').value.trim();
  const subject = document.getElementById('cq-subject').value.trim();
  const note = document.getElementById('cq-note').value.trim();
  if (!hvname) { showToast('Vui lòng nhập tên học viên!', true); return; }
  const now = new Date();
  const dateStr = `${now.getDate()}/${now.getMonth()+1}/${now.getFullYear()} ${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`;
  const msg = `KH MỚI – ${dateStr}
─────────────────────
Học Viên  : ${hvname}
Độ Tuổi   : ${age || '–'}
PH Zalo   : ${parent || '–'}
Môn Học   : ${subject || '–'}
Ghi Chú   : ${note || '–'}
─────────────────────
Trạng Thái: Đang tư vấn`;
  document.getElementById('cq-result-text').textContent = msg;
  document.getElementById('cq-result').style.display = 'block';

  // ── Tự động thêm vào HV Tiềm Năng ──
  // Kiểm tra đã tồn tại chưa (cùng tên + cùng SĐT hoặc tên PH)
  const alreadyExists = leads.find(l =>
    l.name.toLowerCase() === hvname.toLowerCase() &&
    (l.parent.toLowerCase() === (parent||'').toLowerCase() || !parent)
  );

  if (!alreadyExists) {
    const newLead = {
      id: Date.now(),
      name: hvname,
      dob: '',
      parent: parent || '',
      phone: '',
      course: subject || 'Chưa xác định',
      source: 'Trực tiếp',
      status: 'Chưa liên hệ',
      note: (note ? note + '\n' : '') + `Độ tuổi: ${age || '–'} | Tạo từ form tư vấn ${dateStr}`,
      createdAt: new Date().toISOString().slice(0,10)
    };
    leads.push(newLead);
    save();

    // Hiển thị thông báo có link
    const resultDiv = document.getElementById('cq-result');
    const existingNote = resultDiv.querySelector('.cq-lead-note');
    if (existingNote) existingNote.remove();
    const noteEl = document.createElement('div');
    noteEl.className = 'cq-lead-note';
    noteEl.style.cssText = 'margin-top:10px;padding:8px 12px;background:#dcfce7;border:1.5px solid #4ade80;border-radius:8px;font-size:12px;color:#14532d;display:flex;align-items:center;gap:8px;';
    noteEl.innerHTML = `<span style="font-size:16px;">✅</span>
      <span>Đã tự động thêm <b>${hvname}</b> vào <b>HV Tiềm Năng</b></span>
      <button onclick="showPage('leads')" style="margin-left:auto;background:var(--navy);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:700;">Xem ngay →</button>`;
    resultDiv.appendChild(noteEl);
  } else {
    // Đã có rồi, cập nhật note
    alreadyExists.note = (alreadyExists.note ? alreadyExists.note + '\n' : '') + `Liên hệ lại ${dateStr}: ${note || '–'}`;
    alreadyExists.status = 'Chưa liên hệ';
    save();

    const resultDiv = document.getElementById('cq-result');
    const existingNote = resultDiv.querySelector('.cq-lead-note');
    if (existingNote) existingNote.remove();
    const noteEl = document.createElement('div');
    noteEl.className = 'cq-lead-note';
    noteEl.style.cssText = 'margin-top:10px;padding:8px 12px;background:#fef9c3;border:1.5px solid #fcd34d;border-radius:8px;font-size:12px;color:#92400e;display:flex;align-items:center;gap:8px;';
    noteEl.innerHTML = `<span style="font-size:16px;">⚠</span>
      <span><b>${hvname}</b> đã có trong HV Tiềm Năng – đã cập nhật ghi chú</span>
      <button onclick="showPage('leads')" style="margin-left:auto;background:var(--navy);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:700;">Xem ngay →</button>`;
    resultDiv.appendChild(noteEl);
  }
}

function copyConsultMsg(elId) {
  const text = document.getElementById(elId).textContent;
  navigator.clipboard.writeText(text).then(() => showToast('Đã copy!'));
}

// ── TEMPLATE CRUD ──

function renderTemplates() {
  const filterCourse = document.getElementById('tmpl-filter-course').value;
  const q = (document.getElementById('tmpl-search').value || '').toLowerCase();
  let list = [...templates];
  if (filterCourse !== 'all') list = list.filter(t => t.course === filterCourse);
  if (q) list = list.filter(t => t.title.toLowerCase().includes(q) || t.body.toLowerCase().includes(q));

  const grid = document.getElementById('templates-grid');
  if (!list.length) {
    grid.innerHTML = `<div class="empty-state" style="padding:40px 0"><div class="empty-icon">💬</div><div class="empty-text">Chưa có mẫu tin nào. Nhấn "+ Thêm Mẫu Tin" để tạo.</div></div>`;
    return;
  }
  grid.innerHTML = list.map(t => `
    <div style="border:1.5px solid var(--cream2);border-radius:14px;padding:18px;background:#fff;position:relative;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div>
          <span style="font-size:9px;font-weight:800;color:var(--gold);letter-spacing:1.5px;text-transform:uppercase;background:#fffbf0;border:1px solid #e2c97e;padding:2px 8px;border-radius:10px;">${t.course}</span>
          <div style="font-size:14px;font-weight:800;color:var(--navy);margin-top:6px;">${t.title}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="btn-icon" onclick="editTemplate(${t.id})" title="Sửa">✎</button>
          <button class="btn-icon del" onclick="deleteTemplate(${t.id})" title="Xóa">✕</button>
        </div>
      </div>
      <pre style="font-family:inherit;font-size:12px;white-space:pre-wrap;color:#374151;background:#f8fafc;border-radius:10px;padding:14px;max-height:200px;overflow-y:auto;border:1px solid #e5e7eb;margin:0;">${escHtml(t.body)}</pre>
      <div style="margin-top:10px;display:flex;gap:8px;">
        <button onclick="copyTmplBody(${t.id})" class="btn btn-gold" style="font-size:11px;padding:6px 14px;">Copy Tin Nhắn</button>
        <button onclick="sendToLead(${t.id})" class="btn btn-outline" style="font-size:11px;padding:6px 14px;">Xem & Copy</button>
      </div>
    </div>`).join('');
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function openAddTemplate() {
  editTmplId = null;
  document.getElementById('tmpl-title-inp').value = '';
  document.getElementById('tmpl-course-inp').value = '';
  document.getElementById('tmpl-body-inp').value = '';
  document.getElementById('tmpl-modal').classList.add('open');
}

function editTemplate(id) {
  const t = templates.find(x => x.id === id); if (!t) return;
  editTmplId = id;
  document.getElementById('tmpl-title-inp').value = t.title;
  document.getElementById('tmpl-course-inp').value = t.course;
  document.getElementById('tmpl-body-inp').value = t.body;
  document.getElementById('tmpl-modal').classList.add('open');
}

function saveTemplate() {
  const title = document.getElementById('tmpl-title-inp').value.trim();
  const course = document.getElementById('tmpl-course-inp').value;
  const body = document.getElementById('tmpl-body-inp').value.trim();
  if (!title || !course || !body) { showToast('Vui lòng điền đầy đủ tiêu đề, khóa học và nội dung!', true); return; }
  const obj = { id: editTmplId || Date.now(), title, course, body };
  if (editTmplId) {
    const i = templates.findIndex(x => x.id === editTmplId);
    if (i !== -1) templates[i] = obj;
    editTmplId = null;
  } else templates.push(obj);
  save(); closeTmplModal(); renderTemplates();
  showToast('Đã lưu mẫu tin nhắn!');
}

function deleteTemplate(id) {
  const t = templates.find(x => x.id === id); if (!t) return;
  confirmDelete(t.title, () => {
    templates = templates.filter(x => x.id !== id);
    save(); renderTemplates();
    showToast('Đã xóa mẫu tin.');
  });
}

function copyTmplBody(id) {
  const t = templates.find(x => x.id === id); if (!t) return;
  navigator.clipboard.writeText(t.body).then(() => showToast('Đã copy mẫu tin "' + t.title + '"!'));
}

function sendToLead(id) {
  const t = templates.find(x => x.id === id); if (!t) return;
  // Show preview popup
  const div = document.createElement('div');
  div.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
  div.innerHTML = `<div style="background:#fff;border-radius:16px;padding:24px;max-width:500px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);">
    <div style="font-weight:800;color:var(--navy);font-size:14px;margin-bottom:4px;">${t.title}</div>
    <span style="font-size:9px;color:var(--gold);font-weight:700;letter-spacing:1px;">${t.course}</span>
    <pre style="font-family:inherit;font-size:12px;white-space:pre-wrap;margin:14px 0;background:#f8fafc;padding:14px;border-radius:10px;border:1px solid #e5e7eb;">${escHtml(t.body)}</pre>
    <div style="display:flex;gap:10px;">
      <button onclick="navigator.clipboard.writeText(${JSON.stringify(t.body)}).then(()=>{showToast('Đã copy!');this.closest('div[style]').remove();})" class="btn btn-gold" style="font-size:12px;">Copy & Đóng</button>
      <button onclick="this.closest('div[style]').remove()" class="btn btn-outline" style="font-size:12px;">Đóng</button>
    </div>
  </div>`;
  document.body.appendChild(div);
}

function closeTmplModal() { document.getElementById('tmpl-modal').classList.remove('open'); editTmplId = null; }


// ════════════════════════════════════════════
// ── BACKUP / RESTORE ──
// ════════════════════════════════════════════

function exportBackup() {
  window.open('/api/backup', '_blank');
}

function importBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (_serverMode) {
        const res = await fetch('/api/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Server lỗi');
      }
      // Load lại
      await loadData();
      renderDashboard();
      showToast('Đã restore dữ liệu thành công!');
    } catch (err) {
      showToast('Lỗi restore: ' + err.message, true);
    }
  };
  input.click();
}
