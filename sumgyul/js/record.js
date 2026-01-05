(() => {
  /* =========================
     Routes (탭 이동)
     ========================= */
  const routes = {
    home: "./home.html",
    stability: "./stability.html",
    record: "./record.html",
    community: "./community.html",
    my: "./my.html",
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
     Drawer (home/stability 동일 UX)
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

  /* drawer의 "오늘 기록하기" */
  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    window.location.href = "./diary.html";
  });

  /* =========================
     Diary storage
     ========================= */
  const STORAGE_KEY = "sbg_diary_entries_v1";

  /**
   * entries shape:
   * {
   *   "2026-01-05": { text:"...", tags:["불안감"], emoji:"happy", moodClass:"mood-b" }
   * }
   */
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function toKey(d) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  /* =========================
     Calendar
     ========================= */
  const calTitle = document.getElementById("calTitle");
  const calGrid = document.getElementById("calGrid");
  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-index
  let selectedKey = toKey(today);

  function getMonthLabel(y, m) {
    return `${y}. ${pad2(m + 1)}`;
  }

  // 달력 계산: (일요일 시작)
  function buildCalendar(y, m) {
    const entries = loadEntries();
    if (!calGrid) return;

    calTitle.textContent = getMonthLabel(y, m);
    calGrid.innerHTML = "";

    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);

    const startDay = first.getDay(); // 0=Sun
    const daysInMonth = last.getDate();

    // 이전달 마지막 날짜
    const prevLast = new Date(y, m, 0);
    const prevDays = prevLast.getDate();

    // 총 6주(42칸)로 고정 (UI 안정)
    const totalCells = 42;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "day";

      // 날짜 계산
      let cellDate;
      let isCurrentMonth = true;

      if (i < startDay) {
        // prev month
        const dayNum = prevDays - (startDay - 1 - i);
        cellDate = new Date(y, m - 1, dayNum);
        isCurrentMonth = false;
      } else if (i >= startDay + daysInMonth) {
        // next month
        const dayNum = i - (startDay + daysInMonth) + 1;
        cellDate = new Date(y, m + 1, dayNum);
        isCurrentMonth = false;
      } else {
        // current
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

      // entry mark
      if (entries[key]) {
        btn.classList.add("has-entry");
        // moodClass로 색 구분 (간단 3종)
        if (entries[key].moodClass) btn.classList.add(entries[key].moodClass);
      }

      btn.addEventListener("click", () => {
        selectedKey = key;
        // 현재 표시 월이 아닌 날짜 클릭 시, 월 이동해줘도 UX 좋음
        viewYear = cellDate.getFullYear();
        viewMonth = cellDate.getMonth();
        buildCalendar(viewYear, viewMonth);

        // ✅ 일기 쓴 날이면 diary.html로 이동
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
    if (viewMonth < 0) {
      viewMonth = 11;
      viewYear -= 1;
    }
    buildCalendar(viewYear, viewMonth);
  });

  nextMonthBtn?.addEventListener("click", () => {
    viewMonth += 1;
    if (viewMonth > 11) {
      viewMonth = 0;
      viewYear += 1;
    }
    buildCalendar(viewYear, viewMonth);
  });

  buildCalendar(viewYear, viewMonth);

  /* =========================
     FAB -> diary.html
     ========================= */
  document.getElementById("goDiaryBtn")?.addEventListener("click", () => {
    window.location.href = "./diary.html";
  });

  /* =========================
     Emoji select (단일 선택)
     ========================= */
  let selectedEmoji = null;
  document.querySelectorAll(".emojiBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedEmoji = btn.dataset.emoji || null;
    });
  });

  /* =========================
     Save diary -> calendar sync
     - 선택된 날짜(selectedKey)에 저장
     ========================= */
  const diaryInput = document.getElementById("diaryInput");
  const saveBtn = document.getElementById("saveBtn");
  const saveHint = document.getElementById("saveHint");

  function pickMoodClass(emoji, tags) {
    // 단순 매핑: 네가 나중에 원하는대로 변경 가능
    if (tags?.includes("불안감") || tags?.includes("심장 두근거림")) return "mood-c";
    if (emoji === "happy") return "mood-b";
    return "mood-a";
  }

  saveBtn?.addEventListener("click", () => {
    const text = (diaryInput?.value || "").trim();
    const tags = Array.from(document.querySelectorAll(".chk__input:checked")).map((el) => el.value);

    if (!text) {
      if (saveHint) saveHint.textContent = "기록을 입력해 주세요.";
      return;
    }

    const entries = loadEntries();
    const moodClass = pickMoodClass(selectedEmoji, tags);

    entries[selectedKey] = {
      text,
      tags,
      emoji: selectedEmoji,
      moodClass,
      savedAt: Date.now(),
    };

    saveEntries(entries);

    if (saveHint) saveHint.textContent = "저장됐어요! 캘린더에 반영했어요.";
    diaryInput.value = "";

    // 체크박스 초기화
    document.querySelectorAll(".chk__input").forEach((el) => (el.checked = false));

    // 캘린더 다시 그려서 마킹 반영
    buildCalendar(viewYear, viewMonth);
  });

  /* =========================
   Search diary
   ========================= */
const openSearchBtn = document.getElementById("openSearchBtn");
const searchModal = document.getElementById("searchModal");
const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const searchHint = document.getElementById("searchHint");

function openSearch() {
  if (!searchModal) return;
  searchModal.classList.add("is-open");
  searchModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  setTimeout(() => searchInput?.focus(), 0);
  renderSearch(""); // 초기 전체/빈 결과
}

function closeSearch() {
  if (!searchModal) return;
  searchModal.classList.remove("is-open");
  searchModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

openSearchBtn?.addEventListener("click", openSearch);

searchModal?.addEventListener("click", (e) => {
  if (e.target.closest("[data-close='search']")) closeSearch();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && searchModal?.classList.contains("is-open")) closeSearch();
});

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

  // 날짜 내림차순 정렬
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

  if (searchHint) {
    searchHint.textContent = query
      ? `검색 결과: ${filtered.length}개`
      : `저장된 일기: ${filtered.length}개`;
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

searchInput?.addEventListener("input", (e) => {
  renderSearch(e.target.value);
});

// 결과에서 “이 날짜 보기” -> diary.html로 이동
searchResults?.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-open-date]");
  if (!btn) return;
  const date = btn.getAttribute("data-open-date");
  if (!date) return;
  window.location.href = `./diary.html?date=${encodeURIComponent(date)}`;
});


  /* =========================
     Weekly bars animation (5s)
     ========================= */
  function animateBars() {
    document.querySelectorAll(".barRow").forEach((row) => {
      const pctEl = row.querySelector(".barPct");
      const fill = row.querySelector(".barFill");
      const pct = Number(pctEl?.dataset.pct || "0");
      if (!fill) return;

      // layout reflow 후 transition 적용되게
      requestAnimationFrame(() => {
        fill.style.width = `${pct}%`;
      });
    });
  }
  animateBars();
})();
