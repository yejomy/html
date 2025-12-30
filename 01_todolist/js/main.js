'use strict';

const LS_KEY = 'todaytodo.web.v6';

let tasks = [];

const state = {
  tab: 'today',
  search: '',
  sort: 'smart',
  prio: '',
  dueQuick: '',
  editingId: null,
  reminderTimers: new Map(),

  // calendar
  calYear: null,
  calMonth: null,
  calSelectedISO: null,
};

const priorityLabel = { low: '낮음', med: '보통', high: '높음' };
const priorityScore = { low: 1, med: 2, high: 3 };

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const fmtDate = (d) => {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth()+1).padStart(2,'0');
  const day = String(x.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
};
const sameDay = (a,b)=> startOfDay(a).getTime()===startOfDay(b).getTime();

function uid(){ return Math.random().toString(16).slice(2) + Date.now().toString(16); }
function vibrate(ms=10){ if(navigator.vibrate) navigator.vibrate(ms); }

function escapeHtml(str){
  return String(str)
    .replaceAll('&','&amp;')
    .replaceAll('<','&lt;')
    .replaceAll('>','&gt;')
    .replaceAll('"','&quot;')
    .replaceAll("'",'&#039;');
}

function dueLabel(dueStr){
  if(!dueStr) return null;
  const d = new Date(dueStr);
  const today = startOfDay(new Date());
  const t = startOfDay(d).getTime();
  const diff = Math.round((t - today.getTime())/(24*3600*1000));
  if(diff===0) return '오늘';
  if(diff===1) return '내일';
  if(diff===-1) return '어제';
  return fmtDate(d);
}
function isOverdue(dueStr){
  if(!dueStr) return false;
  const today = startOfDay(new Date());
  return startOfDay(new Date(dueStr)).getTime() < today.getTime();
}

/* storage */
function load(){
  const raw = localStorage.getItem(LS_KEY);
  if(!raw){ tasks = []; save(); return; }
  try{
    const parsed = JSON.parse(raw);
    tasks = Array.isArray(parsed) ? parsed : [];
  }catch{
    tasks = [];
  }
}
function save(){ localStorage.setItem(LS_KEY, JSON.stringify(tasks)); }

/* notifications */
function requestNotificationPermission(){
  if(!('Notification' in window)) return Promise.resolve('unsupported');
  if(Notification.permission==='granted') return Promise.resolve('granted');
  if(Notification.permission==='denied') return Promise.resolve('denied');
  return Notification.requestPermission();
}
function scheduleReminder(task, minutesBefore=30){
  if(state.reminderTimers.has(task.id)){
    clearTimeout(state.reminderTimers.get(task.id));
    state.reminderTimers.delete(task.id);
  }
  if(!task.remind || !task.due || task.done) return;

  const due = new Date(task.due);
  const target = new Date(due);
  target.setHours(9,0,0,0);
  target.setTime(target.getTime() - minutesBefore*60*1000);

  const ms = target.getTime() - Date.now();
  if(ms<=0) return;

  const id = setTimeout(()=>{
    if('Notification' in window && Notification.permission==='granted'){
      new Notification('하루하나', { body: `리마인더: ${task.title}` });
    }
  }, ms);
  state.reminderTimers.set(task.id, id);
}
function rescheduleAll(){ tasks.forEach(t=>scheduleReminder(t)); }

/* sorting/filtering */
const sorters = {
  smart(a,b){
    if(a.done!==b.done) return a.done?1:-1;
    const ad = a.due ? startOfDay(new Date(a.due)).getTime() : Infinity;
    const bd = b.due ? startOfDay(new Date(b.due)).getTime() : Infinity;
    if(ad!==bd) return ad-bd;
    const ap = priorityScore[a.priority] ?? 2;
    const bp = priorityScore[b.priority] ?? 2;
    if(ap!==bp) return bp-ap;
    return (b.createdAt??0)-(a.createdAt??0);
  },
  due(a,b){
    const ad = a.due ? startOfDay(new Date(a.due)).getTime() : Infinity;
    const bd = b.due ? startOfDay(new Date(b.due)).getTime() : Infinity;
    if(ad!==bd) return ad-bd;
    return (b.createdAt??0)-(a.createdAt??0);
  },
  priority(a,b){
    const ap = priorityScore[a.priority] ?? 2;
    const bp = priorityScore[b.priority] ?? 2;
    if(ap!==bp) return bp-ap;
    return (b.createdAt??0)-(a.createdAt??0);
  },
  newest(a,b){ return (b.createdAt??0)-(a.createdAt??0); }
};

function visibleTasks(){
  const q = state.search.trim().toLowerCase();
  let list = tasks.slice();

  const today = startOfDay(new Date());
  if(state.tab==='today'){
    list = list.filter(t=>{
      if(t.done) return false;
      if(!t.due) return true;
      return sameDay(new Date(t.due), today);
    });
  }else if(state.tab==='done'){
    list = list.filter(t=>t.done);
  }

  if(q) list = list.filter(t=>t.title.toLowerCase().includes(q));
  if(state.prio) list = list.filter(t=>t.priority===state.prio);

  if(state.dueQuick){
    const now = startOfDay(new Date());
    const tomo = new Date(now); tomo.setDate(tomo.getDate()+1);
    if(state.dueQuick==='today') list = list.filter(t=>t.due && sameDay(new Date(t.due), now));
    if(state.dueQuick==='tomorrow') list = list.filter(t=>t.due && sameDay(new Date(t.due), tomo));
    if(state.dueQuick==='overdue') list = list.filter(t=>t.due && !t.done && isOverdue(t.due));
    if(state.dueQuick==='none') list = list.filter(t=>!t.due);
  }

  list.sort(sorters[state.sort] || sorters.smart);
  return list;
}

function todayStats(){
  const now = startOfDay(new Date());
  const list = tasks.filter(t=>{
    if(!t.due) return true;
    return sameDay(new Date(t.due), now);
  });
  const total = list.length;
  const done = list.filter(t=>t.done).length;
  const pct = total ? Math.round(done/total*100) : 0;
  return { total, done, pct };
}

/* render main */
function setHeader(){
  const now = new Date();
  const days = ['일','월','화','수','목','금','토'];
  $('#todayText').textContent = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 (${days[now.getDay()]})`;

  const { total, done, pct } = todayStats();
  $('#statText').textContent = `${done}/${total}`;
  const ring = $('#ring');
  ring.style.setProperty('--p', pct + '%');
  ring.textContent = pct + '%';
}

function badgeHTML(t){
  const pr = priorityLabel[t.priority] || '보통';
  const due = t.due ? dueLabel(t.due) : null;

  let dueCls = '';
  if(due){
    if(!t.done && isOverdue(t.due)) dueCls = 'bad';
    else if(due==='오늘') dueCls = 'warn';
    else if(due==='내일') dueCls = 'ok';
  }

  const rep = (t.repeat && t.repeat!=='none') ? (t.repeat==='daily'?'매일':'매주') : null;
  const rem = t.remind ? '리마인더' : null;

  const calIcon = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-calendar"></use></svg>`;
  const repIcon = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-repeat"></use></svg>`;
  const bellIcon = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-bell"></use></svg>`;

  return `
    <span class="badge">${pr}</span>
    ${due ? `<span class="badge ${dueCls}">${calIcon}${due}</span>` : ''}
    ${rep ? `<span class="badge">${repIcon}${rep}</span>` : ''}
    ${rem ? `<span class="badge">${bellIcon}${rem}</span>` : ''}
  `;
}

function taskCard(t){
  const doneCls = t.done ? 'done' : '';
  const checkIcon = `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check"></use></svg>`;
  const editIcon  = `<svg class="icon icon-soft" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-edit"></use></svg>`;
  const trashIcon = `<svg class="icon icon-soft" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-trash"></use></svg>`;

  return `
    <div class="card" data-id="${t.id}">
      <div class="check ${doneCls}" data-action="toggle" data-id="${t.id}">
        ${t.done ? checkIcon : ''}
      </div>

      <div class="content">
        <div class="task-title ${doneCls}">${escapeHtml(t.title)}</div>
        <div class="meta">${badgeHTML(t)}</div>
      </div>

      <div class="actions">
        <button class="pill-btn pill-icon" data-action="edit" data-id="${t.id}" type="button" title="수정">${editIcon}</button>
        <button class="pill-btn pill-icon danger" data-action="delete" data-id="${t.id}" type="button" title="삭제">${trashIcon}</button>
      </div>
    </div>
  `;
}

function render(){
  setHeader();
  const list = visibleTasks();
  const root = $('#list');

  if(list.length===0){
    root.innerHTML = `
      <div class="empty">
        <div class="t1">표시할 할 일이 없어요</div>
        <div class="t2">아래에서 빠르게 추가해보세요.</div>
      </div>
    `;
    return;
  }
  root.innerHTML = list.map(taskCard).join('');
}

/* sheet */
const backdrop = $('#backdrop');
const sheet = $('#sheet');

function setSwitch(el, on){
  el.classList.toggle('on', !!on);
  el.setAttribute('aria-checked', on ? 'true' : 'false');
}
function getSwitch(el){ return el.classList.contains('on'); }

function openSheet(mode, task){
  const isEdit = mode === 'edit';
  state.editingId = isEdit ? task.id : null;

  $('#sheetTitle').textContent = isEdit ? '할 일 수정' : '할 일 추가';
  $('#sheetDesc').textContent = isEdit ? '내용을 수정하고 저장하세요.' : '제목/우선순위/마감일을 설정할 수 있어요.';

  $('#title').value = isEdit ? task.title : ($('#quickTitle').value.trim() || '');
  $('#priority').value = isEdit ? task.priority : 'med';
  $('#due').value = isEdit ? (task.due || '') : '';
  $('#repeat').value = isEdit ? task.repeat : 'none';
  setSwitch($('#remind'), isEdit ? !!task.remind : false);

  $('#deleteBtn').style.display = isEdit ? 'inline-flex' : 'none';

  backdrop.classList.add('show');
  sheet.classList.add('show');
  backdrop.setAttribute('aria-hidden','false');

  setTimeout(()=>$('#title').focus(), 60);
}
function closeSheet(){
  backdrop.classList.remove('show');
  sheet.classList.remove('show');
  backdrop.setAttribute('aria-hidden','true');
  state.editingId = null;
  $('#quickTitle').value = '';
}

/* CRUD */
function addTask(data){
  const now = Date.now();
  const t = {
    id: uid(),
    title: data.title.trim(),
    done: false,
    priority: data.priority || 'med',
    due: data.due || null,      // ✅ 지정했을 때만
    repeat: data.repeat || 'none',
    remind: !!data.remind,
    createdAt: now,
    updatedAt: now,
  };
  tasks.unshift(t);
  save();
  scheduleReminder(t);
  render();
  renderCalendar();
  vibrate(12);
}

function updateTask(id, patch){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;
  Object.assign(t, patch, { updatedAt: Date.now() });
  save();
  scheduleReminder(t);
  render();
  renderCalendar();
  vibrate(10);
}

function deleteTask(id){
  tasks = tasks.filter(t=>t.id!==id);
  save();
  if(state.reminderTimers.has(id)){
    clearTimeout(state.reminderTimers.get(id));
    state.reminderTimers.delete(id);
  }
  render();
  renderCalendar();
  vibrate(8);
}

function toggleTask(id){
  const t = tasks.find(x=>x.id===id);
  if(!t) return;

  t.done = !t.done;

  if(t.done && t.repeat && t.repeat !== 'none'){
    const base = t.due ? new Date(t.due) : new Date();
    const next = new Date(base);
    if(t.repeat==='daily') next.setDate(next.getDate()+1);
    if(t.repeat==='weekly') next.setDate(next.getDate()+7);

    addTask({
      title: t.title,
      priority: t.priority,
      due: fmtDate(next),
      repeat: t.repeat,
      remind: t.remind
    });
  }

  save();
  scheduleReminder(t);
  render();
  renderCalendar();
  vibrate(12);
}

/* ===== calendar log ===== */
const calDialog = $('#calendarDialog');
const calGrid = $('#calGrid');
const calMonthText = $('#calMonthText');
const calLogTitle = $('#calLogTitle');
const calLogList = $('#calLogList');

function getCreatedISO(task){
  const d = new Date(task.createdAt || Date.now());
  return fmtDate(d);
}
function getCreatedTime(task){
  const d = new Date(task.createdAt || Date.now());
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${hh}:${mm}`;
}
function buildCreatedMap(){
  const map = new Map();
  for(const t of tasks){
    const iso = getCreatedISO(t);
    if(!map.has(iso)) map.set(iso, []);
    map.get(iso).push(t);
  }
  for(const [k, arr] of map.entries()){
    arr.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    map.set(k, arr);
  }
  return map;
}
function setCalendarTo(date){
  state.calYear = date.getFullYear();
  state.calMonth = date.getMonth();
}
function monthLabel(y,m){ return `${y}년 ${m+1}월`; }

function renderCalendar(){
  if(state.calYear == null || state.calMonth == null) setCalendarTo(new Date());
  const y = state.calYear;
  const m = state.calMonth;

  calMonthText.textContent = monthLabel(y,m);

  const createdMap = buildCreatedMap();
  const first = new Date(y, m, 1);
  const firstDow = first.getDay();
  const start = new Date(y, m, 1 - firstDow);
  const totalCells = 42;

  const todayISO = fmtDate(new Date());
  calGrid.innerHTML = '';

  for(let i=0;i<totalCells;i++){
    const d = new Date(start);
    d.setDate(start.getDate()+i);

    const iso = fmtDate(d);
    const inMonth = d.getMonth() === m;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cal-day' + (inMonth ? '' : ' muted');
    if(createdMap.has(iso)) btn.classList.add('has');
    if(state.calSelectedISO === iso) btn.classList.add('selected');

    btn.textContent = String(d.getDate());
    btn.dataset.iso = iso;

    if(iso === todayISO && state.calSelectedISO !== iso){
      btn.style.boxShadow = 'inset 0 0 0 2px rgba(255,179,90,.28)';
    }

    btn.addEventListener('click', ()=>{
      state.calSelectedISO = iso;
      renderCalendar();
      renderCalendarLog(iso);
    });

    calGrid.appendChild(btn);
  }

  if(!state.calSelectedISO){
    if(createdMap.has(todayISO)){
      state.calSelectedISO = todayISO;
      renderCalendar();
      renderCalendarLog(todayISO);
    } else {
      const keys = Array.from(createdMap.keys()).sort().reverse();
      const found = keys.find(k => {
        const kd = new Date(k);
        return kd.getFullYear()===y && kd.getMonth()===m;
      });
      if(found){
        state.calSelectedISO = found;
        renderCalendar();
        renderCalendarLog(found);
      } else {
        calLogTitle.textContent = '날짜를 선택하세요';
        calLogList.innerHTML = '';
      }
    }
  }
}

function renderCalendarLog(iso){
  const createdMap = buildCreatedMap();
  const arr = createdMap.get(iso) || [];

  const [yy,mm,dd] = iso.split('-');
  calLogTitle.textContent = `${yy}년 ${Number(mm)}월 ${Number(dd)}일 · 작성 기록`;

  if(arr.length===0){
    calLogList.innerHTML = `<div style="color:rgba(0,0,0,.55);font-size:13px;">이 날 작성한 항목이 없어요.</div>`;
    return;
  }

  calLogList.innerHTML = arr.map(t=>{
    const time = getCreatedTime(t);
    return `
      <div class="log-item">
        <div class="log-time">${time}</div>
        <div class="log-title">${escapeHtml(t.title)}</div>
      </div>
    `;
  }).join('');
}

/* more */
function downloadText(filename, text){
  const blob = new Blob([text], {type:'application/json;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click(); a.remove();
  URL.revokeObjectURL(url);
}

/* events */
function bindEvents(){
  // search
  $('#search').addEventListener('input', (e)=>{ state.search = e.target.value; render(); });

  // tabs
  $$('.tab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      $$('.tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      state.tab = tab.dataset.tab;
      $$('.tab').forEach(t=>t.setAttribute('aria-selected', t.classList.contains('active')?'true':'false'));
      render();
    });
  });

  // filters toggle
  $('#toggleFilters').addEventListener('click', ()=>{
    const p = $('#filters');
    const show = p.style.display === 'none';
    p.style.display = show ? 'flex' : 'none';
    $('#toggleFilters').setAttribute('aria-expanded', show ? 'true' : 'false');
  });

  // list actions
  $('#list').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if(action==='toggle') toggleTask(id);
    if(action==='delete') deleteTask(id);
    if(action==='edit'){
      const t = tasks.find(x=>x.id===id);
      if(t) openSheet('edit', t);
    }
  });

  // quick add (no due auto)
  $('#openSheet').addEventListener('click', ()=>{
    const input = $('#quickTitle');
    const title = input.value.trim();
    if(title){
      addTask({ title, priority:'med', due:null, repeat:'none', remind:false });
      input.value = '';
      return;
    }
    openSheet('add');
  });

  $('#quickTitle').addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      e.preventDefault();
      const title = $('#quickTitle').value.trim();
      if(title) addTask({ title, priority:'med', due:null, repeat:'none', remind:false });
      $('#quickTitle').value='';
    }
  });

  // sheet close
  backdrop.addEventListener('click', closeSheet);
  $('#closeSheet').addEventListener('click', closeSheet);

  // switch
  const remindSwitch = $('#remind');
  remindSwitch.addEventListener('click', ()=> setSwitch(remindSwitch, !getSwitch(remindSwitch)));
  remindSwitch.addEventListener('keydown', (e)=>{
    if(e.key==='Enter' || e.key===' '){
      e.preventDefault();
      setSwitch(remindSwitch, !getSwitch(remindSwitch));
    }
  });

  // form submit
  $('#form').addEventListener('submit', async (e)=>{
    e.preventDefault();
    const title = $('#title').value.trim();
    if(!title) return;

    const data = {
      title,
      priority: $('#priority').value,
      due: $('#due').value || null,
      repeat: $('#repeat').value,
      remind: getSwitch(remindSwitch),
    };

    if(data.remind){
      const perm = await requestNotificationPermission();
      if(perm!=='granted'){
        data.remind = false;
        setSwitch(remindSwitch, false);
        alert('알림 권한이 없어 리마인더를 켤 수 없어요.');
      }
    }

    if(state.editingId) updateTask(state.editingId, data);
    else addTask(data);

    closeSheet();
  });

  // delete in sheet
  $('#deleteBtn').addEventListener('click', ()=>{
    if(!state.editingId) return;
    if(confirm('이 할 일을 삭제할까요?')){
      deleteTask(state.editingId);
      closeSheet();
    }
  });

  // more dialog
  const moreDialog = $('#moreDialog');
  $('#moreBtn').addEventListener('click', ()=>{
    if(typeof moreDialog.showModal==='function') moreDialog.showModal();
    else moreDialog.setAttribute('open','');
  });
  $('#closeMore').addEventListener('click', ()=> moreDialog.close());

  $('#exportBtn').addEventListener('click', ()=>{
    downloadText(`haruhana-${fmtDate(new Date())}.json`, JSON.stringify(tasks, null, 2));
  });

  $('#importFile').addEventListener('change', async (e)=>{
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      if(!Array.isArray(parsed)) throw new Error('invalid');

      tasks = parsed.map(x=>({
        id: x.id || uid(),
        title: String(x.title||'').slice(0,120) || '제목 없음',
        done: !!x.done,
        priority: (x.priority==='low'||x.priority==='med'||x.priority==='high') ? x.priority : 'med',
        due: x.due ? String(x.due) : null,
        repeat: (x.repeat==='daily'||x.repeat==='weekly'||x.repeat==='none') ? x.repeat : 'none',
        remind: !!x.remind,
        createdAt: Number(x.createdAt)||Date.now(),
        updatedAt: Number(x.updatedAt)||Date.now(),
      }));

      save();
      rescheduleAll();
      render();
      renderCalendar();
      alert('가져오기 완료!');
      moreDialog.close();
    }catch{
      alert('가져오기에 실패했어요. JSON 파일을 확인해주세요.');
    }finally{
      e.target.value='';
    }
  });

  $('#notifyBtn').addEventListener('click', async ()=>{
    const perm = await requestNotificationPermission();
    if(perm==='unsupported') alert('이 브라우저는 Notification API를 지원하지 않아요.');
    else alert(`알림 권한: ${perm}`);
  });

  $('#testNotifyBtn').addEventListener('click', async ()=>{
    const perm = await requestNotificationPermission();
    if(perm!=='granted') return alert('알림 권한이 필요해요.');
    new Notification('하루하나', { body: '테스트 알림입니다.' });
  });

  $('#clearDoneBtn').addEventListener('click', ()=>{
    const n = tasks.filter(t=>t.done).length;
    if(n===0) return alert('정리할 완료 항목이 없어요.');
    if(confirm(`완료된 ${n}개 항목을 삭제할까요?`)){
      tasks = tasks.filter(t=>!t.done);
      save();
      render();
      renderCalendar();
      alert('정리 완료!');
      moreDialog.close();
    }
  });

  // calendar
  $('#calendarBtn').addEventListener('click', ()=>{
    setCalendarTo(new Date());
    state.calSelectedISO = null;
    if(typeof calDialog.showModal === 'function') calDialog.showModal();
    else calDialog.setAttribute('open','');
    renderCalendar();
  });
  $('#calClose').addEventListener('click', ()=> calDialog.close());
  $('#calPrev').addEventListener('click', ()=>{
    const d = new Date(state.calYear, state.calMonth, 1);
    d.setMonth(d.getMonth()-1);
    setCalendarTo(d);
    state.calSelectedISO = null;
    renderCalendar();
  });
  $('#calNext').addEventListener('click', ()=>{
    const d = new Date(state.calYear, state.calMonth, 1);
    d.setMonth(d.getMonth()+1);
    setCalendarTo(d);
    state.calSelectedISO = null;
    renderCalendar();
  });

  // escape
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Escape'){
      if($('#moreDialog')?.open) $('#moreDialog').close();
      if($('#calendarDialog')?.open) $('#calendarDialog').close();
      closeSheet();
      closeAllDD();
    }
  });

  // ✅ custom dropdown wiring
  const ddMap = {
    sort: { label: $('#sortLabel'), set: (v)=>{ state.sort=v; render(); }, get: ()=>state.sort },
    prio: { label: $('#prioLabel'), set: (v)=>{ state.prio=v; render(); }, get: ()=>state.prio },
    dueQuick: { label: $('#dueLabel'), set: (v)=>{ state.dueQuick=v; render(); }, get: ()=>state.dueQuick },
  };

  function closeAllDD(){
    $$('.dd').forEach(dd=>{
      dd.classList.remove('open');
      dd.querySelector('.dd-btn')?.setAttribute('aria-expanded','false');
    });
  }
  window.closeAllDD = closeAllDD;

  $$('.dd').forEach(dd=>{
    const key = dd.dataset.dd;
    const btn = dd.querySelector('.dd-btn');
    const items = Array.from(dd.querySelectorAll('.dd-item'));

    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = dd.classList.contains('open');
      closeAllDD();
      dd.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', (!isOpen).toString());
    });

    items.forEach(it=>{
      it.addEventListener('click', ()=>{
        const val = it.dataset.value ?? '';
        ddMap[key].set(val);
        ddMap[key].label.textContent = it.textContent.trim();
        items.forEach(x=>x.classList.remove('active'));
        it.classList.add('active');
        closeAllDD();
      });
    });

    const current = String(ddMap[key].get() ?? '');
    const match = items.find(x => String(x.dataset.value ?? '') === current) || items[0];
    if(match){
      items.forEach(x=>x.classList.remove('active'));
      match.classList.add('active');
      ddMap[key].label.textContent = match.textContent.trim();
    }
  });

  document.addEventListener('click', closeAllDD);
}

/* init */
function init(){
  load();

  const dueEl = $('#due');
  const min = new Date(); min.setFullYear(min.getFullYear()-1);
  const max = new Date(); max.setFullYear(max.getFullYear()+5);
  dueEl.min = fmtDate(min);
  dueEl.max = fmtDate(max);

  bindEvents();
  render();
  rescheduleAll();
}

document.addEventListener('DOMContentLoaded', init);
