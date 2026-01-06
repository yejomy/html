(() => {
  /* =========================
     Shared routes
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
     Storage (record와 동일 키)
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

  /* =========================
     Date handling
     ========================= */
  function pad2(n) { return String(n).padStart(2, "0"); }
  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  const params = new URLSearchParams(window.location.search);
  const dateKey = params.get("date") || todayKey();

  const diaryDateLabel = document.getElementById("diaryDateLabel");
  if (diaryDateLabel) diaryDateLabel.textContent = dateKey;

  /* =========================
     UI state
     ========================= */
  let selectedEmoji = null;
  const selectedTriggers = new Set();

  // emoji select (단일)
  document.querySelectorAll(".emojiBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedEmoji = btn.dataset.emoji || null;
      renderCard();
    });
  });

  /* =========================
     ✅ intensity + 민트 반쪽 채움 (여기가 핵심)
     ========================= */
  const intensity = document.getElementById("intensity");
  const intensityVal = document.getElementById("intensityVal");

  // ✅ 파란 채워지는 부분만 민트로 덮어쓰기
  function paintIntensityRange() {
    if (!intensity) return;

    const min = intensity.min ? Number(intensity.min) : 0;
    const max = intensity.max ? Number(intensity.max) : 10;
    const val = Number(intensity.value || 0);
    const percent = ((val - min) / (max - min)) * 100;

    // 왼쪽(채워진 부분) = 민트 / 오른쪽(남은 트랙) = 원래 트랙색(연회색)
    intensity.style.background = `linear-gradient(
      to right,
      #2d8f83 0%,
      #2d8f83 ${percent}%,
      #e6e6e6 ${percent}%,
      #e6e6e6 100%
    )`;
  }

  function syncIntensity() {
    const v = Number(intensity?.value || 0);
    if (intensityVal) intensityVal.textContent = `${v}/10`;

    // ✅ 값 바뀔 때마다 민트 채움도 같이 갱신
    paintIntensityRange();

    renderCard();
  }

  intensity?.addEventListener("input", syncIntensity);

  // triggers (toggle)
  document.querySelectorAll("#triggerTags .tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      if (!tag) return;
      if (selectedTriggers.has(tag)) {
        selectedTriggers.delete(tag);
        btn.classList.remove("is-on");
      } else {
        selectedTriggers.add(tag);
        btn.classList.add("is-on");
      }
      renderCard();
    });
  });

  // text inputs -> 카드 갱신
  ["triggerNote","eventText","thoughtText","bodyText","copeText","praiseText"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", () => renderCard());
  });

  // load existing entry
  function applyEntry(entry) {
    if (!entry) return;

    if (entry.emoji) {
      selectedEmoji = entry.emoji;
      const btn = document.querySelector(`.emojiBtn[data-emoji="${CSS.escape(entry.emoji)}"]`);
      if (btn) {
        document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      }
    }

    if (typeof entry.intensity === "number" && intensity) {
      intensity.value = String(entry.intensity);
      syncIntensity(); // ✅ 여기서 paintIntensityRange()까지 같이 됨
    }

    if (Array.isArray(entry.tags)) {
      document.querySelectorAll(".chk__input").forEach((el) => {
        el.checked = entry.tags.includes(el.value);
      });
    }

    selectedTriggers.clear();
    if (Array.isArray(entry.triggers)) {
      entry.triggers.forEach((t) => selectedTriggers.add(t));
      document.querySelectorAll("#triggerTags .tag").forEach((b) => {
        const tag = b.dataset.tag;
        b.classList.toggle("is-on", tag && selectedTriggers.has(tag));
      });
    }

    const setVal = (id, v) => {
      const el = document.getElementById(id);
      if (el) el.value = v || "";
    };
    setVal("triggerNote", entry.triggerNote);
    setVal("eventText", entry.eventText);
    setVal("thoughtText", entry.thoughtText);
    setVal("bodyText", entry.bodyText);
    setVal("copeText", entry.copeText);
    setVal("praiseText", entry.praiseText);

    renderCard();
  }

  const existing = loadEntries()[dateKey];
  if (existing) {
    applyEntry(existing);
  } else {
    // ✅ 첫 진입일 때도 민트 채움 1회 적용
    syncIntensity();
  }

  /* =========================
     Save
     ========================= */
  const saveBtn = document.getElementById("saveBtn");
  const saveHint = document.getElementById("saveHint");

  function pickMoodClass(emoji, tags, intensityNum) {
    if (emoji === "happy" || emoji === "calm") return "mood-b";
    if (emoji === "panic" || (tags || []).includes("심장 두근거림") || intensityNum >= 7) return "mood-c";
    return "mood-a";
  }

  function collectTags() {
    return Array.from(document.querySelectorAll(".chk__input"))
      .filter((el) => el.checked)
      .map((el) => el.value);
  }

  function collectText(id) {
    return (document.getElementById(id)?.value || "").trim();
  }

  function buildSearchTextForRecord(entry) {
    const parts = [
      entry.eventText, entry.thoughtText, entry.bodyText, entry.copeText, entry.praiseText,
      entry.triggerNote,
      (entry.triggers || []).join(", "),
      (entry.tags || []).join(", "),
      entry.emoji ? `감정:${entry.emoji}` : "",
      typeof entry.intensity === "number" ? `강도:${entry.intensity}` : ""
    ].filter(Boolean);
    return parts.join("\n");
  }

  saveBtn?.addEventListener("click", () => {
    const entries = loadEntries();
    const tags = collectTags();
    const intensityNum = Number(intensity?.value || 0);

    const entry = {
      emoji: selectedEmoji,
      intensity: intensityNum,
      tags,
      triggers: Array.from(selectedTriggers),
      triggerNote: collectText("triggerNote"),
      eventText: collectText("eventText"),
      thoughtText: collectText("thoughtText"),
      bodyText: collectText("bodyText"),
      copeText: collectText("copeText"),
      praiseText: collectText("praiseText"),
      moodClass: pickMoodClass(selectedEmoji, tags, intensityNum),
      savedAt: Date.now(),
    };

    entry.text = buildSearchTextForRecord(entry);

    entries[dateKey] = entry;
    saveEntries(entries);

    if (saveHint) saveHint.textContent = "저장 완료! 기록 페이지에서 달력에 표시돼요.";
    renderCard();
  });

  /* =========================
     Canvas card (기존 그대로)
     ========================= */
  const canvas = document.getElementById("cardCanvas");
  const ctx = canvas?.getContext?.("2d");
  const regenBtn = document.getElementById("regenBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function renderCard() {
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#f7f5f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const tags = collectTags();
    const intensityNum = Number(intensity?.value || 0);
    const mood = pickMoodClass(selectedEmoji, tags, intensityNum);

    const bg = mood === "mood-b" ? "rgba(241,118,44,0.18)"
             : mood === "mood-c" ? "rgba(80,130,150,0.18)"
             : "rgba(45,90,81,0.14)";

    const cardX = 70, cardY = 60, cardW = 820, cardH = 420;

    roundRect(ctx, cardX, cardY, cardW, cardH, 42);
    ctx.fillStyle = "#ffffff";
    ctx.fill();

    roundRect(ctx, cardX, cardY, cardW, cardH, 42);
    ctx.strokeStyle = "rgba(31,42,37,0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    roundRect(ctx, cardX + 26, cardY + 26, cardW - 52, 110, 30);
    ctx.fillStyle = bg;
    ctx.fill();

    ctx.font = "700 32px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.82)";
    ctx.fillText("오늘의 기록", cardX + 44, cardY + 74);

    ctx.font = "600 20px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.62)";
    ctx.fillText(dateKey, cardX + 44, cardY + 106);

    const eventText = collectText("eventText");
    ctx.font = "600 24px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.78)";
    ctx.fillText(`감정: ${selectedEmoji || "미선택"}  ·  강도: ${intensityNum}/10`, cardX + 44, cardY + 172);

    ctx.font = "400 22px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.75)";
    const preview = (eventText || "오늘의 사건을 적어보면 카드에 요약이 보여요.").slice(0, 70);
    ctx.fillText(preview, cardX + 44, cardY + 214);

    const chips = [...tags].slice(0, 6);
    let chipX = cardX + 44;
    let chipY = cardY + 254;

    ctx.font = "600 20px Pretendard";
    chips.forEach((text) => {
      const m = ctx.measureText(text);
      const bw = m.width + 26;
      roundRect(ctx, chipX, chipY, bw, 42, 21);
      ctx.fillStyle = "rgba(241,118,44,0.18)";
      ctx.fill();

      ctx.fillStyle = "rgba(31,42,37,0.75)";
      ctx.fillText(text, chipX + 13, chipY + 28);

      chipX += bw + 10;
      if (chipX > cardX + cardW - 140) {
        chipX = cardX + 44;
        chipY += 52;
      }
    });

    const praiseText = collectText("praiseText");
    if (praiseText) {
      roundRect(ctx, cardX + 44, cardY + cardH - 92, cardW - 88, 60, 22);
      ctx.fillStyle = "rgba(45,90,81,0.14)";
      ctx.fill();

      ctx.font = "600 22px Pretendard";
      ctx.fillStyle = "rgba(31,42,37,0.78)";
      ctx.fillText(`오늘의 칭찬: ${praiseText.slice(0, 26)}`, cardX + 66, cardY + cardH - 54);
    }

    ctx.font = "400 18px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.35)";
    ctx.fillText("숨결록 • 기록은 회복의 증거", cardX + cardW - 320, cardY + cardH - 24);
  }

  regenBtn?.addEventListener("click", renderCard);
  downloadBtn?.addEventListener("click", () => {
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `diary_${dateKey}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  });

  renderCard();

  /* =========================
     ✅ Search (record와 동일: topbar form)
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
    renderSearch("");
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
        <button class="resultBtn" type="button" data-open-date="${escapeHtml(it.date)}">이 날짜 열기</button>
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
})();
