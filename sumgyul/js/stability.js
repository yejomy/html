(() => {
  /* =========================
     0) 탭 이동 (home과 동일)
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
     1) LEFT DRAWER (home과 동일)
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

  /* =========================
     2) SOS KIT: 핑퐁 오토플레이 + 화면에 보일 때만 + 가로만 이동
     ========================= */
  const kitRoot = document.getElementById("kit");
  const viewport = document.getElementById("kitViewport");
  const track = document.getElementById("kitTrack");
  const dotsWrap = document.getElementById("kitDots");

  if (kitRoot && viewport && track) {
    const slides = Array.from(track.querySelectorAll(".kitCard"));
    let index = 0;
    let dir = 1;
    let timer = null;

    let isUserInteracting = false;
    let isKitVisible = true;
    let isPageVisible = !document.hidden;

    // dots
    if (dotsWrap) {
      dotsWrap.innerHTML = "";
      slides.forEach((_, i) => {
        const d = document.createElement("span");
        d.className = "kitDot" + (i === 0 ? " is-active" : "");
        d.addEventListener("click", () => goTo(i, true));
        dotsWrap.appendChild(d);
      });
    }

    const setDot = (i) => {
      if (!dotsWrap) return;
      const dots = Array.from(dotsWrap.querySelectorAll(".kitDot"));
      dots.forEach((d, idx) => d.classList.toggle("is-active", idx === i));
    };

    // ✅ 세로 스크롤 절대 건드리지 않음 (scrollIntoView 금지)
    const goTo = (i, byUser = false) => {
      index = Math.max(0, Math.min(i, slides.length - 1));
      const left = slides[index].offsetLeft;
      viewport.scrollTo({ left, behavior: "smooth" });
      setDot(index);
      if (byUser) restart();
    };

    // scroll position -> index
    const updateIndexByScroll = () => {
      const center = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;

      slides.forEach((s, i) => {
        const mid = s.offsetLeft + s.clientWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });

      index = best;
      setDot(index);
    };

    let raf = 0;
    viewport.addEventListener("scroll", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateIndexByScroll);
    });

    const canAutoPlay = () => isKitVisible && isPageVisible && !isUserInteracting;

    const tick = () => {
      if (!canAutoPlay()) return;

      if (index === slides.length - 1) dir = -1;
      if (index === 0) dir = 1;

      goTo(index + dir, false);
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, 3200);
    };

    const stop = () => {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    };

    const restart = () => {
      stop();
      if (isKitVisible && isPageVisible) start();
    };

    // 첫 진입은 1장 고정
    goTo(0, false);

    // user interaction -> stop autoplay temporarily
    const interactOn = () => { isUserInteracting = true; };
    const interactOff = () => { isUserInteracting = false; };

    viewport.addEventListener("touchstart", () => { interactOn(); stop(); }, { passive: true });
    viewport.addEventListener("touchend", () => { interactOff(); restart(); }, { passive: true });
    viewport.addEventListener("mousedown", () => { interactOn(); stop(); });
    window.addEventListener("mouseup", () => { interactOff(); restart(); });

    // ✅ 화면에 보일 때만
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        isKitVisible = e.isIntersecting && e.intersectionRatio >= 0.45;
        if (isKitVisible) start();
        else stop();
      },
      { threshold: [0, 0.25, 0.45, 0.7, 1] }
    );
    io.observe(kitRoot);

    // 탭이 백그라운드면 stop
    document.addEventListener("visibilitychange", () => {
      isPageVisible = !document.hidden;
      if (isPageVisible && isKitVisible) start();
      else stop();
    });

    start();
  }

/* =========================
   3) ✅ 영상 재생 (YouTube IFrame Player API)
   ========================= */

const YOUTUBE_URL = "https://www.youtube.com/watch?v=PhL1u3Hn4ok&list=RDPhL1u3Hn4ok&start_radio=1";

const getYoutubeParams = (url) => {
  try {
    const u = new URL(url);
    const videoId =
      u.searchParams.get("v") ||
      (u.hostname.includes("youtu.be") ? u.pathname.replace("/", "") : "") ||
      (u.pathname.includes("/shorts/") ? u.pathname.split("/shorts/")[1].split("?")[0] : "");

    const list = u.searchParams.get("list") || ""; // RD... 같은 플레이리스트
    return { videoId, list };
  } catch {
    return { videoId: "", list: "" };
  }
};

const { videoId, list } = getYoutubeParams(YOUTUBE_URL);

const btnPlay = document.getElementById("btnPlay");
const btnRepeat = document.getElementById("btnRepeat");
const btnPrev = document.getElementById("btnPrev");
const btnNext = document.getElementById("btnNext");
const seek = document.getElementById("seek");
const curTime = document.getElementById("curTime");
const durTime = document.getElementById("durTime");

const fmt = (s) => {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${m}:${ss}`;
};

let ytPlayer = null;
let uiTimer = null;
let isLoop = false;
let isSeeking = false;

function showPlayerError(msg) {
  const mediaSub = document.getElementById("mediaSub");
  if (mediaSub) mediaSub.textContent = msg;
  if (btnPlay) btnPlay.disabled = true;
}

if (!videoId) {
  showPlayerError("유튜브 링크/ID가 올바르지 않아요");
} else {
  // API 로드
  if (!window.__YT_API_LOADING__) {
    window.__YT_API_LOADING__ = true;
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }

  window.onYouTubeIframeAPIReady = () => {
    // ✅ 핵심: videoId는 필수, list는 있으면 같이 넣기
    const playerVars = {
      controls: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: window.location.origin || undefined,
    };

    // 라디오/믹스(list)까지 같이 재생하고 싶으면 listType/list를 세팅
    // (list가 RD...로 들어오면 보통 동작함. 단, 유튜브 정책/지역/저작권 따라 막힐 수 있음)
    if (list) {
      playerVars.listType = "playlist";
      playerVars.list = list;
    }

    ytPlayer = new YT.Player("ytPlayer", {
      videoId,
      playerVars,
      events: {
        onReady: () => {
          // duration은 로딩 직후 0일 수 있음
          setTimeout(() => {
            const d = ytPlayer.getDuration?.() ?? 0;
            if (durTime) durTime.textContent = fmt(d);
          }, 600);

          if (uiTimer) clearInterval(uiTimer);
          uiTimer = setInterval(() => {
            if (!ytPlayer) return;
            const d = ytPlayer.getDuration?.() ?? 0;
            const t = ytPlayer.getCurrentTime?.() ?? 0;

            if (!isSeeking && seek) {
              seek.value = String(d > 0 ? (t / d) * 100 : 0);
            }
            if (curTime) curTime.textContent = fmt(t);
            if (durTime && durTime.textContent === "0:00") durTime.textContent = fmt(d);
          }, 250);
        },

        onStateChange: (e) => {
          const playing = e.data === YT.PlayerState.PLAYING;
          if (btnPlay) btnPlay.textContent = playing ? "⏸" : "▶";

          if (e.data === YT.PlayerState.ENDED) {
            if (isLoop) {
              ytPlayer.seekTo(0, true);
              ytPlayer.playVideo();
            } else {
              if (btnPlay) btnPlay.textContent = "▶";
            }
          }
        },

        onError: (e) => {
          const code = e?.data;
          if (code === 101 || code === 150) {
            showPlayerError("이 영상은 외부 재생(임베드)이 막혀있어요. 다른 영상으로 바꿔줘!");
          } else if (code === 100) {
            showPlayerError("영상이 삭제되었거나 비공개예요.");
          } else {
            showPlayerError(`유튜브 재생 오류(code: ${code})`);
          }
        }
      }
    });
  };

  // ✅ 유튜브는 사용자 제스처가 있어야 재생되는 경우가 많음 → 버튼 클릭으로만 재생
  btnPlay?.addEventListener("click", () => {
    if (!ytPlayer) return;
    const st = ytPlayer.getPlayerState?.();
    if (st === YT.PlayerState.PLAYING) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
  });

  // ✅ playlist가 있으면 다음/이전은 실제로 넘길 수 있음
  btnNext?.addEventListener("click", () => {
    if (!ytPlayer) return;
    if (list && ytPlayer.nextVideo) ytPlayer.nextVideo();
    else ytPlayer.seekTo(0, true);
  });

  btnPrev?.addEventListener("click", () => {
    if (!ytPlayer) return;
    if (list && ytPlayer.previousVideo) ytPlayer.previousVideo();
    else ytPlayer.seekTo(0, true);
  });

  seek?.addEventListener("input", () => { isSeeking = true; });
  seek?.addEventListener("change", () => {
    if (!ytPlayer || !seek) return;
    const d = ytPlayer.getDuration?.() ?? 0;
    const p = Number(seek.value) / 100;
    ytPlayer.seekTo(p * d, true);
    isSeeking = false;
  });

  btnRepeat?.addEventListener("click", () => {
    isLoop = !isLoop;
    btnRepeat.classList.toggle("is-on", isLoop);
  });
}

})();
