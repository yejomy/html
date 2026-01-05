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

  document.getElementById("drawerWriteBtn")?.addEventListener("click", () => {
    // 지금 페이지가 diary라서 record로 보내거나 noop 처리 가능
    window.location.href = "./record.html";
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

  // emoji select
  document.querySelectorAll(".emojiBtn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
      selectedEmoji = btn.dataset.emoji || null;
      renderCard(); // 선택만 바뀌어도 카드 갱신
    });
  });

  // intensity
  const intensity = document.getElementById("intensity");
  const intensityVal = document.getElementById("intensityVal");
  function syncIntensity() {
    const v = Number(intensity?.value || 0);
    if (intensityVal) intensityVal.textContent = `${v}/10`;
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

    // emoji
    if (entry.emoji) {
      selectedEmoji = entry.emoji;
      const btn = document.querySelector(`.emojiBtn[data-emoji="${CSS.escape(entry.emoji)}"]`);
      if (btn) {
        document.querySelectorAll(".emojiBtn").forEach((b) => b.classList.remove("is-selected"));
        btn.classList.add("is-selected");
      }
    }

    // intensity
    if (typeof entry.intensity === "number" && intensity) {
      intensity.value = String(entry.intensity);
      syncIntensity();
    }

    // symptoms
    if (Array.isArray(entry.tags)) {
      document.querySelectorAll(".chk__input").forEach((el) => {
        el.checked = entry.tags.includes(el.value);
      });
    }

    // triggers
    selectedTriggers.clear();
    if (Array.isArray(entry.triggers)) {
      entry.triggers.forEach((t) => selectedTriggers.add(t));
      document.querySelectorAll("#triggerTags .tag").forEach((b) => {
        const tag = b.dataset.tag;
        b.classList.toggle("is-on", tag && selectedTriggers.has(tag));
      });
    }

    // texts
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
  if (existing) applyEntry(existing);
  else syncIntensity();

  /* =========================
     Save
     ========================= */
  const saveBtn = document.getElementById("saveBtn");
  const saveHint = document.getElementById("saveHint");

  function pickMoodClass(emoji, tags, intensityNum) {
    // record 캘린더 색 구분용 (3종)
    // mood-a: 안정/중립, mood-b: 긍정, mood-c: 불안/공황
    if (emoji === "happy" || emoji === "calm") return "mood-b";
    if (emoji === "panic" || (tags || []).includes("심장 두근거림") || intensityNum >= 7) return "mood-c";
    return "mood-a";
  }

  saveBtn?.addEventListener("click", () => {
    const entries = loadEntries();

    const intensityNum = Number(intensity?.value || 0);
    const tags = Array.from(document.querySelectorAll(".chk__input:checked")).map((el) => el.value);

    const triggerNote = document.getElementById("triggerNote")?.value?.trim() || "";
    const eventText = document.getElementById("eventText")?.value?.trim() || "";
    const thoughtText = document.getElementById("thoughtText")?.value?.trim() || "";
    const bodyText = document.getElementById("bodyText")?.value?.trim() || "";
    const copeText = document.getElementById("copeText")?.value?.trim() || "";
    const praiseText = document.getElementById("praiseText")?.value?.trim() || "";

    if (!eventText && !thoughtText && !bodyText) {
      if (saveHint) saveHint.textContent = "최소한 ‘무슨 일이 있었나요?’ 또는 ‘생각/몸 반응’ 중 하나는 적어줘요.";
      return;
    }

    const triggers = Array.from(selectedTriggers);

    const moodClass = pickMoodClass(selectedEmoji, tags, intensityNum);

    entries[dateKey] = {
      // record에서 쓰는 필드들(호환)
      text: [eventText, thoughtText].filter(Boolean).join("\n"),
      tags,
      emoji: selectedEmoji,
      moodClass,
      savedAt: Date.now(),

      // diary 상세 필드
      intensity: intensityNum,
      triggers,
      triggerNote,
      eventText,
      thoughtText,
      bodyText,
      copeText,
      praiseText,
    };

    saveEntries(entries);

    if (saveHint) saveHint.textContent = "저장했어요. 기록이 캘린더에 반영돼요.";
    renderCard();

    // 저장 후 record로 돌아가고 싶으면 아래 주석 해제
    // setTimeout(() => (window.location.href = "./record.html"), 300);
  });

  /* =========================
     Picture diary (canvas)
     ========================= */
  const canvas = document.getElementById("cardCanvas");
  const ctx = canvas?.getContext("2d");

  const regenBtn = document.getElementById("regenBtn");
  const downloadBtn = document.getElementById("downloadBtn");

  regenBtn?.addEventListener("click", renderCard);
  downloadBtn?.addEventListener("click", () => {
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `diary_${dateKey}.png`;
    a.click();
  });

  function roundRect(c, x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + radius, y);
    c.arcTo(x + w, y, x + w, y + h, radius);
    c.arcTo(x + w, y + h, x, y + h, radius);
    c.arcTo(x, y + h, x, y, radius);
    c.arcTo(x, y, x + w, y, radius);
    c.closePath();
  }

  function moodPalette(emoji) {
    // 감정에 따라 카드 톤 다르게 (앱 분위기)
    switch (emoji) {
      case "happy": return { bg1: "#FFE6C7", bg2: "#FFF3E5", accent: "#F1762C" };
      case "calm":  return { bg1: "#D8EFE9", bg2: "#F2FBF8", accent: "#2D5A51" };
      case "sad":   return { bg1: "#D9E2EA", bg2: "#F4F7FA", accent: "#4B6A86" };
      case "anxious":return { bg1: "#F2E6D8", bg2: "#FBF6F0", accent: "#8A5A3A" };
      case "panic": return { bg1: "#F1D7D2", bg2: "#FFF1EE", accent: "#D85B3A" };
      default:      return { bg1: "#E9E3DA", bg2: "#FBFAF7", accent: "#2D5A51" };
    }
  }

  function pickKeywords() {
    const eventText = document.getElementById("eventText")?.value || "";
    const thoughtText = document.getElementById("thoughtText")?.value || "";
    const copeText = document.getElementById("copeText")?.value || "";
    const triggers = Array.from(selectedTriggers);

    // 아주 단순 추출(서버/AI 없이 가능): 짧은 구절만
    const pick = (s) => (s || "").trim().split(/\s+/).slice(0, 6).join(" ");
    return {
      line1: pick(eventText) || "오늘의 기록",
      line2: pick(thoughtText) || (triggers[0] ? `트리거: ${triggers[0]}` : "천천히 숨을 쉬었어요"),
      line3: pick(copeText) || "내가 나를 지켜줬어요",
    };
  }

  function drawSimpleFace(x, y, r, accent, emoji) {
    // 기본 “그림일기 느낌” 얼굴(대체)
    ctx.save();
    ctx.translate(x, y);

    // face
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();

    // eyes
    ctx.fillStyle = "rgba(31,42,37,0.65)";
    ctx.beginPath(); ctx.arc(-r * 0.28, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * 0.28, -r * 0.12, r * 0.08, 0, Math.PI * 2); ctx.fill();

    // mouth
    ctx.strokeStyle = "rgba(31,42,37,0.65)";
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (emoji === "sad" || emoji === "panic") {
      ctx.arc(0, r * 0.26, r * 0.22, Math.PI, Math.PI * 2);
    } else if (emoji === "happy" || emoji === "calm") {
      ctx.arc(0, r * 0.10, r * 0.26, 0, Math.PI);
    } else {
      ctx.moveTo(-r * 0.22, r * 0.22);
      ctx.lineTo(r * 0.22, r * 0.22);
    }
    ctx.stroke();

    // accent dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.42, r * 0.10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function renderCard() {
    if (!canvas || !ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    const intensityNum = Number(document.getElementById("intensity")?.value || 0);
    const tags = Array.from(document.querySelectorAll(".chk__input:checked")).map((el) => el.value);
    const praiseText = document.getElementById("praiseText")?.value?.trim() || "";

    const pal = moodPalette(selectedEmoji);
    const kw = pickKeywords();

    // bg
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, pal.bg1);
    grad.addColorStop(1, pal.bg2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // card
    const pad = 48;
    const cardX = pad;
    const cardY = pad;
    const cardW = w - pad * 2;
    const cardH = h - pad * 2;

    roundRect(ctx, cardX, cardY, cardW, cardH, 36);
    ctx.fillStyle = "rgba(255,255,255,0.70)";
    ctx.fill();

    // header strip
    roundRect(ctx, cardX + 18, cardY + 18, cardW - 36, 86, 24);
    ctx.fillStyle = "rgba(255,255,255,0.65)";
    ctx.fill();

    // title
    ctx.fillStyle = "rgba(31,42,37,0.85)";
    ctx.font = "700 42px Pretendard";
    ctx.fillText("오늘의 그림일기", cardX + 44, cardY + 74);

    // date
    ctx.font = "600 22px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.60)";
    ctx.fillText(dateKey, cardX + cardW - 220, cardY + 74);

    // face/emoji block
    const faceX = cardX + 120;
    const faceY = cardY + 210;
    drawSimpleFace(faceX, faceY, 64, pal.accent, selectedEmoji);

    // mood label
    ctx.font = "700 24px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.78)";
    ctx.fillText(`강도 ${intensityNum}/10`, cardX + 44, cardY + 320);

    // keywords area
    roundRect(ctx, cardX + 250, cardY + 140, cardW - 300, 240, 28);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fill();

    ctx.fillStyle = "rgba(31,42,37,0.82)";
    ctx.font = "700 30px Pretendard";
    ctx.fillText(kw.line1.slice(0, 18), cardX + 290, cardY + 200);

    ctx.font = "600 24px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.72)";
    ctx.fillText(kw.line2.slice(0, 22), cardX + 290, cardY + 250);

    ctx.font = "400 22px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.68)";
    ctx.fillText(kw.line3.slice(0, 24), cardX + 290, cardY + 295);

    // tags chips
    const chips = (tags.slice(0, 4));
    let chipX = cardX + 290;
    let chipY = cardY + 322;

    ctx.font = "600 20px Pretendard";
    chips.forEach((t) => {
      const text = `#${t}`;
      const m = ctx.measureText(text);
      const bw = m.width + 26;
      roundRect(ctx, chipX, chipY, bw, 42, 21);
      ctx.fillStyle = "rgba(241,118,44,0.18)";
      ctx.fill();

      ctx.fillStyle = "rgba(31,42,37,0.75)";
      ctx.fillText(text, chipX + 13, chipY + 28);

      chipX += bw + 10;
      if (chipX > cardX + cardW - 140) {
        chipX = cardX + 290;
        chipY += 52;
      }
    });

    // praise strip
    if (praiseText) {
      roundRect(ctx, cardX + 44, cardY + cardH - 92, cardW - 88, 60, 22);
      ctx.fillStyle = "rgba(45,90,81,0.14)";
      ctx.fill();

      ctx.font = "600 22px Pretendard";
      ctx.fillStyle = "rgba(31,42,37,0.78)";
      ctx.fillText(`오늘의 칭찬: ${praiseText.slice(0, 26)}`, cardX + 66, cardY + cardH - 54);
    }

    // watermark
    ctx.font = "400 18px Pretendard";
    ctx.fillStyle = "rgba(31,42,37,0.35)";
    ctx.fillText("숨결록 • 기록은 회복의 증거", cardX + cardW - 320, cardY + cardH - 24);
  }

  // 초기 카드
  renderCard();

  /* =========================
     Search (record와 동일)
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
    renderSearch("");
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

  searchInput?.addEventListener("input", (e) => {
    renderSearch(e.target.value);
  });

  searchResults?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-open-date]");
    if (!btn) return;
    const date = btn.getAttribute("data-open-date");
    if (!date) return;
    window.location.href = `./diary.html?date=${encodeURIComponent(date)}`;
    closeSearch();
  });
})();
