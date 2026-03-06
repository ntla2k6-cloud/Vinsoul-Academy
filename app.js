// ── STATE ──
let students      = JSON.parse(localStorage.getItem('vs_students') || '[]');
let classes       = JSON.parse(localStorage.getItem('vs_classes')   || '[]');
let customCourses = JSON.parse(localStorage.getItem('vs_custom_courses') || '[]');
let customPrices  = JSON.parse(localStorage.getItem('vs_custom_prices')  || '{}');
let staff         = JSON.parse(localStorage.getItem('vs_staff')    || '[]');
let leads         = JSON.parse(localStorage.getItem('vs_leads')    || '[]');
let editStudentId = null;
let editStaffId   = null;
let editLeadId    = null;
let studentFilter = 'all';
let studentClassFilter = 'all';
let studentSubjectFilter = 'all';
let staffFilter   = 'all';
let leadFilter    = 'all';


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
  {name:'Cảm Thụ Âm Nhạc', emoji:'🎼', match:'Cảm Thụ Âm Nhạc'},
  {name:'Piano Đệm Hát',   emoji:'🎹🎤', match:'Piano Đệm Hát'},
];

// ── HELPERS ──
const fmt     = n => Number(n||0).toLocaleString('vi-VN') + ' đ';
const fmtDate = d => { if (!d) return '–'; const p = d.split('-'); if (p.length === 3) return p[2]+'/'+p[1]+'/'+p[0]; return d; };
const save    = () => {
  localStorage.setItem('vs_students', JSON.stringify(students));
  localStorage.setItem('vs_staff',    JSON.stringify(staff));
  localStorage.setItem('vs_leads',    JSON.stringify(leads));
  localStorage.setItem('vs_classes',   JSON.stringify(classes));
  localStorage.setItem('vs_custom_courses', JSON.stringify(customCourses));
  localStorage.setItem('vs_custom_prices',  JSON.stringify(customPrices));
};

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
  const map = { students: renderStudentTable, staff: renderStaffTable, dashboard: renderDashboard, revenue: renderRevenue, leads: renderLeadTable, classes: renderClassTable, schedule: renderSchedule };
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
};

function populatePackages(selectedPkg) {
  const subj = document.getElementById('f-subject').value;
  const pkgSel = document.getElementById('f-package');
  const pkgs = COURSE_PACKAGES[subj] || [];
  pkgSel.innerHTML = pkgs.length
    ? '<option value="">-- Chọn gói --</option>' + pkgs.map(p => `<option${p===selectedPkg?' selected':''}>${p}</option>`).join('')
    : '<option value="">-- Chọn khóa học trước --</option>';
  // populate class dropdown
  const clSel = document.getElementById('f-classid');
  if (clSel) {
    const filtered = classes.filter(c => !subj || c.subject === subj);
    clSel.innerHTML = '<option value="">-- Chọn lớp (nếu có) --</option>'
      + filtered.map(c => `<option value="${c.id}">[${c.code}] ${c.name}</option>`).join('');
  }
}
function onClassSelect() {
  // tự động điền tên lớp nếu chọn
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
  const staticNames = new Set(STATIC_COURSES.map(c => c.name));
  const allTabs = [...STATIC_COURSES];
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
        subject=g('f-subject'),pkg=g('f-package'),classid=document.getElementById('f-classid')?document.getElementById('f-classid').value:'',start=g('f-start'),end=g('f-end'),
        payment=g('f-payment'),amount=g('f-amount'),paydate=g('f-paydate'),note=g('f-note');
  if(!name||!parent||!phone||!subject||!start||!payment){showToast('Vui lòng điền đầy đủ các trường bắt buộc (*)',true);return;}
  const obj={id:editStudentId||Date.now(),name,dob,parent,phone,subject,pkg,classid,start,end,payment,amount:Number(amount)||0,paydate,note};
  if(editStudentId!==null){const i=students.findIndex(s=>s.id===editStudentId);if(i!==-1)students[i]=obj;editStudentId=null;}
  else students.push(obj);
  save(); showToast('Đã lưu học viên thành công!'); clearStudentForm(); showPage('students');
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
  const clSel = document.getElementById('f-classid'); if(clSel && s.classid) { clSel.value = s.classid; }
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
function setStudentFilter(f,el){studentFilter=f;document.querySelectorAll('#page-students .filter-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderStudentTable();}

function renderStudentTable(){
  renderClassFilterBtns();
  renderSubjectFilterBtns();
  const q=(document.getElementById('search-input').value||'').toLowerCase();
  const filtered=students.filter(s=>{
    const mq=!q||s.name.toLowerCase().includes(q)||s.phone.includes(q)||s.subject.toLowerCase().includes(q)||(s.parent&&s.parent.toLowerCase().includes(q));
    const mf=studentFilter==='all'||s.payment===studentFilter;
    const mc=studentClassFilter==='all'||s.classid===studentClassFilter;
    const ms=studentSubjectFilter==='all'||s.subject===studentSubjectFilter||s.subject===studentSubjectFilter||(studentSubjectFilter==='Vẽ'&&s.subject&&s.subject.startsWith('Vẽ'))||(studentSubjectFilter==='Ballet'&&s.subject&&s.subject.startsWith('Ballet'))||(studentSubjectFilter==='Luyện Thi'&&s.subject&&s.subject.startsWith('Luyện Thi'));
    return mq&&mf&&ms&&mc;
  });
  const tbody=document.getElementById('student-table-body');
  if(!filtered.length){tbody.innerHTML=`<tr><td colspan="10"><div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">Không tìm thấy học viên nào</div></div></td></tr>`;return;}
  const pb=p=>p==='Đã Chuyển Khoản'?`<span class="badge badge-paid">✓ CK</span>`:p==='Tiền Mặt'?`<span class="badge badge-cash">💵 TM</span>`:`<span class="badge badge-unpaid">⚠ Chưa TT</span>`;
  tbody.innerHTML=filtered.map((s,i)=>`
    <tr>
      <td>${i+1}</td>
      <td class="td-name">${s.name}</td>
      <td>${fmtDate(s.dob)}</td>
      <td>${s.parent}</td>
      <td>${s.phone}</td>
      <td style="font-weight:600;color:var(--navy)">${s.subject}${s.pkg?`<br><span style="font-size:10px;color:var(--muted);font-weight:400">${s.pkg}</span>`:''}</td>
      <td>${(()=>{const cl=classes.find(c=>c.id===s.classid);return cl?`<span class='pos-badge'>[${cl.code}]<br>${cl.name}</span>`:'–';})()}</td>
      <td style="font-size:11.5px">${fmtDate(s.start)}<br><span style="color:var(--muted)">→ ${fmtDate(s.end)}</span></td>
      <td>${pb(s.payment)}</td>
      <td style="font-weight:700;color:var(--gold)">${s.amount?fmt(s.amount):'–'}</td>
      <td><div class="action-btns"><button class="btn-icon" onclick="editStudent(${s.id})" title="Sửa">✎</button><button class="btn-icon del" onclick="deleteStudent(${s.id})" title="Xóa">✕</button></div></td>
    </tr>`).join('');
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
    const hvCount = students.filter(s => s.classid === c.id).length;
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

  // Build grid: rows = giờ slot, cols = thứ
  const dayOrder = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ Nhật'];

  // Collect all time slots
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

  // Build lookup: day -> timeStart -> [{class, students}]
  const lookup = {};
  dayOrder.forEach(d => { lookup[d] = {}; });
  filteredClasses.forEach(c => {
    const classStudents = students.filter(s => s.classid === c.id);
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
            ? e.studs.map(s=>`<div class="tkb-cell-student">👤 ${s.name}</div>`).join('')
            : `<div class="tkb-empty">Chưa có HV</div>`;
          html += `<div class="tkb-cell">
            <div class="tkb-cell-code">[${e.cls.code}] ${e.cls.name}</div>
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

// ── INIT ──
initRevSelectors();
renderDashboard();
renderCoursesPage();
renderSubjectFilterBtns();
