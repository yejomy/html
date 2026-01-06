(() => {
  /* =========================
     Routes
     ========================= */
  const routes = {
    home: "./home.html",
    stability: "./stability.html",
    record: "./record.html",
    community: "./community.html",
    my: "./my.html",
    diary: "./diary.html",
  };

  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.tab;
      const url = routes[key];
      if (!url) return;
      if (btn.classList.contains("is-active")) return;
      window.location.href = url;
    });
  });

  /* =========================
     Drawer
     ========================= */
  const openDrawerBtn = document.getElementById("openDrawerBtn");
  const drawer = document.getElementById("drawer");

  function openDrawer() {
    if (!drawer) return;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    if (!drawer) return;
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  openDrawerBtn?.addEventListener("click", openDrawer);
  drawer?.addEventListener("click", (e) => {
    if (e.target.closest("[data-close='drawer']")) closeDrawer();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && drawer?.classList.contains("is-open")) closeDrawer();
  });

  // ✅ 드로어: 오늘 기록하기 -> diary.html
  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    window.location.href = routes.diary;
  });

  // ✅ 드로어: 내 정보 -> my.html
  document.getElementById("drawerToMy")?.addEventListener("click", () => {
    window.location.href = routes.my;
  });

  /* =========================
     Storage
     ========================= */
  const STORAGE_KEY = "sbg_diary_entries_v1";

  function loadEntries() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  // ✅ 요청한 날짜로 “가상 데이터” 자동 삽입 (기존 데이터는 절대 덮어쓰지 않음)
  function seedEntries() {
    const current = loadEntries();
    const now = Date.now();

    const seed = {
      "2025-10-31": { text: "어쩌다 공황장애가 찾아온 걸까...", tags: ["불안감"], emoji: "panic", moodClass: "mood-c", savedAt: now - 6000000 },
      "2025-11-03": { text: "퇴근길엔 그냥 바람만 쐬고 싶었다...", tags: ["피로감"], emoji: "tired", moodClass: "mood-a", savedAt: now - 5500000 },
      "2025-11-10": { text: "오랜만에 공황도 없고 불안도 없고...", tags: ["행복"], emoji: "neutral", moodClass: "mood-b", savedAt: now - 5000000 },
      "2025-11-19": { text: "오늘 무기력했지만 끝까지 버텼다...", tags: ["우울감"], emoji: "anxious", moodClass: "mood-a", savedAt: now - 4500000 },
      "2025-12-20": { text: "조금 천천히 가도 괜찮아. 숨 고르기!", tags: ["불면증"], emoji: "sad", moodClass: "mood-c", savedAt: now - 4000000 },
      "2026-01-01": { text: "새해. 오늘은 조금 덜 불안한 하루였으면.", tags: ["기쁨"], emoji: "happy", moodClass: "mood-b", savedAt: now - 3500000 },
    };

    let changed = false;
    Object.keys(seed).forEach((k) => {
      if (!current[k]) {
        current[k] = seed[k];
        changed = true;
      }
    });

    if (changed) saveEntries(current);
  }
  seedEntries();

  function pad2(n) { return String(n).padStart(2, "0"); }
  function toKey(d) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }

  /* =========================
     ✅ Top Search (my처럼 배치/동작)
     ========================= */
  const openTopSearchBtn = document.getElementById("openTopSearchBtn");
  const closeTopSearchBtn = document.getElementById("closeTopSearchBtn");
  const topbarTitle = document.getElementById("topbarTitle");
  const topbarRight = document.getElementById("topbarRight");
  const topSearchForm = document.getElementById("topSearchForm");
  const topSearchInput = document.getElementById("topSearchInput");

  const searchInline = document.getElementById("searchInline");
  const searchResults = document.getElementById("searchResults");
  const searchHint = document.getElementById("searchHint");

  function openTopSearch() {
    topbarTitle?.classList.add("is-hidden");
    topbarRight?.classList.add("is-hidden");
    topSearchForm?.classList.remove("is-hidden");

    searchInline?.classList.add("is-hidden");
    if (searchHint) searchHint.textContent = "";
    if (searchResults) searchResults.innerHTML = "";

    setTimeout(() => topSearchInput?.focus(), 0);
  }

  function closeTopSearch() {
    topSearchForm?.classList.add("is-hidden");
    topbarTitle?.classList.remove("is-hidden");
    topbarRight?.classList.remove("is-hidden");

    if (topSearchInput) topSearchInput.value = "";

    searchInline?.classList.add("is-hidden");
    if (searchHint) searchHint.textContent = "";
    if (searchResults) searchResults.innerHTML = "";
  }

  openTopSearchBtn?.addEventListener("click", openTopSearch);
  closeTopSearchBtn?.addEventListener("click", closeTopSearch);

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderSearch(q) {
    const query = (q || "").trim().toLowerCase();
    const entries = loadEntries();

    const list = Object.entries(entries)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));

    const filtered = query
      ? list.filter((it) => {
          const text = (it.text || "").toLowerCase();
          const tags = (it.tags || []).join(" ").toLowerCase();
          return text.includes(query) || tags.includes(query) || it.date.includes(query);
        })
      : list;

    searchInline?.classList.remove("is-hidden");

    if (searchHint) {
      searchHint.textContent = query ? `검색 결과: ${filtered.length}개` : `저장된 일기: ${filtered.length}개`;
    }
    if (!searchResults) return;
    searchResults.innerHTML = "";

    if (!filtered.length) {
      searchResults.innerHTML = `<div class="hint">검색 결과가 없어요.</div>`;
      return;
    }

    const frag = document.createDocumentFragment();
    filtered.forEach((it) => {
      const item = document.createElement("div");
      item.className = "resultItem";
      const tagsText = (it.tags && it.tags.length) ? it.tags.join(", ") : "태그 없음";

      item.innerHTML = `
        <div class="resultTop">
          <div class="resultDate">${escapeHtml(it.date)}</div>
          <div class="resultTags">${escapeHtml(tagsText)}</div>
        </div>
        <div class="resultText">${escapeHtml(it.text || "")}</div>
        <button class="resultBtn" type="button" data-open-date="${escapeHtml(it.date)}">이 날짜 보기</button>
      `;
      frag.appendChild(item);
    });

    searchResults.appendChild(frag);
  }

  topSearchForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    renderSearch(topSearchInput?.value || "");
  });

  topSearchInput?.addEventListener("input", (e) => {
    renderSearch(e.target.value);
  });

  searchResults?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-date]");
    if (!btn) return;
    const date = btn.getAttribute("data-open-date");
    if (!date) return;
    window.location.href = `./diary.html?date=${encodeURIComponent(date)}`;
  });

  /* =========================
     Calendar
     ========================= */
  const calTitle = document.getElementById("calTitle");
  const calGrid = document.getElementById("calGrid");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let selectedKey = toKey(today);

  function getMonthLabel(y, m) {
    return `${y}. ${pad2(m + 1)}`;
  }

  function buildCalendar(y, m) {
    const entries = loadEntries();
    if (!calGrid) return;

    if (calTitle) calTitle.textContent = getMonthLabel(y, m);
    calGrid.innerHTML = "";

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    const startDay = first.getDay();
    const daysInMonth = last.getDate();

    const prevLast = new Date(y, m, 0);
    const prevDays = prevLast.getDate();

    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "day";

      let cellDate;
      let isCurrentMonth = true;

      if (i < startDay) {
        const dayNum = prevDays - (startDay - 1 - i);
        cellDate = new Date(y, m - 1, dayNum);
        isCurrentMonth = false;
      } else if (i >= startDay + daysInMonth) {
        const dayNum = i - (startDay + daysInMonth) + 1;
        cellDate = new Date(y, m + 1, dayNum);
        isCurrentMonth = false;
      } else {
        const dayNum = i - startDay + 1;
        cellDate = new Date(y, m, dayNum);
      }

      const key = toKey(cellDate);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dayBtn";
      btn.textContent = String(cellDate.getDate());

      if (!isCurrentMonth) btn.classList.add("is-muted");
      if (key === toKey(today)) btn.classList.add("is-today");
      if (key === selectedKey) btn.classList.add("is-selected");

      if (entries[key]) {
        btn.classList.add("has-entry");
        if (entries[key].moodClass) btn.classList.add(entries[key].moodClass);
      }

      btn.addEventListener("click", () => {
        selectedKey = key;
        viewYear = cellDate.getFullYear();
        viewMonth = cellDate.getMonth();
        buildCalendar(viewYear, viewMonth);

        const latest = loadEntries();
        if (latest[key]) {
          window.location.href = `./diary.html?date=${encodeURIComponent(key)}`;
        }
      });

      cell.appendChild(btn);
      calGrid.appendChild(cell);
    }
  }

  prevMonthBtn?.addEventListener("click", () => {
    viewMonth -= 1;
    if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
    buildCalendar(viewYear, viewMonth);
  });

  nextMonthBtn?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
    buildCalendar(viewYear, viewMonth);
  });

  buildCalendar(viewYear, viewMonth);

  /* FAB -> diary.html */
  document.getElementById("goDiaryBtn")?.addEventListener("click", () => {
    window.location.href = routes.diary;
  });

  /* bars animation */
  document.querySelectorAll(".barRow").forEach((row) => {
    const pctEl = row.querySelector(".barPct");
    const fill = row.querySelector(".barFill");
    const pct = Number(pctEl?.dataset.pct || "0");
    if (!fill) return;
    requestAnimationFrame(() => { fill.style.width = `${pct}%`; });
  });

  let selectedEmoji = null;

document.querySelectorAll(".emojiBtn").forEach((btn) => {
  btn.addEventListener("click", () => {
    // 다른 애들 선택 해제
    document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));

    // 지금 누른 것만 선택
    btn.classList.add("is-selected");
    selectedEmoji = btn.dataset.emoji || null;
  });

  /********************
 * 날짜 유틸
 ********************/
const today = new Date();

function toKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/********************
 * 저장소
 ********************/
const STORAGE_KEY = "calendarEntries";

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveEntries(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/********************
 * 상태값
 ********************/
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();
let selectedKey = toKey(today);
let selectedEmoji = null;

/********************
 * DOM
 ********************/
const calendarEl = document.getElementById("calendar");
const diaryInputEl = document.getElementById("diaryInput");
const saveBtn = document.getElementById("saveBtn");
const saveHint = document.getElementById("saveHint");

/********************
 * 헬퍼
 ********************/
function setHint(msg) {
  if (saveHint) saveHint.textContent = msg;
}

function clearChecks() {
  document.querySelectorAll(".chk__input").forEach(el => el.checked = false);
}

function setChecks(tags = []) {
  const set = new Set(tags);
  document.querySelectorAll(".chk__input").forEach(el => {
    el.checked = set.has(el.value);
  });
}

/********************
 * 폼 <-> 캘린더 연동 핵심
 ********************/
function applyEntryToForm(entry) {
  if (!diaryInputEl) return;

  if (!entry) {
    diaryInputEl.value = "";
    clearChecks();
    selectedEmoji = null;
    document.querySelectorAll(".emojiBtn").forEach(b => b.classList.remove("is-selected"));
    setHint("");
    return;
  }

  diaryInputEl.value = entry.text || "";
  setChecks(entry.tags || []);
  selectedEmoji = entry.emoji || null;

  document.querySelectorAll(".emojiBtn").forEach(b => {
    b.classList.toggle("is-selected", b.dataset.emoji === selectedEmoji);
  });

  setHint("불러왔어요");
}

/********************
 * 캘린더 그리기
 ********************/
function buildCalendar(year, month) {
  if (!calendarEl) return;

  calendarEl.innerHTML = "";

  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);

  const entries = loadEntries();

  for (let i = 0; i < first.getDay(); i++) {
    calendarEl.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= last.getDate(); d++) {
    const cellDate = new Date(year, month, d);
    const key = toKey(cellDate);

    const btn = document.createElement("button");
    btn.textContent = d;
    btn.className = "calendar-day";

    if (key === selectedKey) btn.classList.add("is-selected");
    if (entries[key]) btn.classList.add("has-entry");

    btn.addEventListener("click", () => {
      selectedKey = key;
      viewYear = cellDate.getFullYear();
      viewMonth = cellDate.getMonth();

      buildCalendar(viewYear, viewMonth);

      const latest = loadEntries();
      applyEntryToForm(latest[key] || null);
    });

    calendarEl.appendChild(btn);
  }
}

/********************
 * 이모지 선택
 ********************/
document.querySelectorAll(".emojiBtn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".emojiBtn").forEach(b => b.classList.remove("is-selected"));
    btn.classList.add("is-selected");
    selectedEmoji = btn.dataset.emoji;
  });
});

/********************
 * 저장 버튼
 ********************/
saveBtn?.addEventListener("click", () => {
  const entries = loadEntries();

  const text = diaryInputEl.value.trim();
  const tags = Array.from(document.querySelectorAll(".chk__input:checked"))
    .map(el => el.value);

  if (!text && tags.length === 0 && !selectedEmoji) {
    delete entries[selectedKey];
    saveEntries(entries);
    buildCalendar(viewYear, viewMonth);
    applyEntryToForm(null);
    setHint("삭제됨");
    return;
  }

  entries[selectedKey] = {
    text,
    tags,
    emoji: selectedEmoji,
    updatedAt: Date.now(),
  };

  saveEntries(entries);
  buildCalendar(viewYear, viewMonth);
  setHint("저장 완료");
});

/********************
 * 최초 로드
 ********************/
buildCalendar(viewYear, viewMonth);

const initEntries = loadEntries();
applyEntryToForm(initEntries[selectedKey] || null);

});


})();
