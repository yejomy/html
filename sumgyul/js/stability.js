(() => {
  /* =========================
     탭 이동
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
     ✅ SOS KIT: 핑퐁 오토플레이 + 화면에 보일 때만 실행
     1-2-3-4-3-2-1-2-3-4...
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

    let isUserInteracting = false; // 터치/드래그 중
    let isKitVisible = true;        // 화면에 보이는 중
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

    // ✅ 세로 스크롤 건드리지 않고 "가로만" 이동
    const goTo = (i, byUser = false) => {
      index = Math.max(0, Math.min(i, slides.length - 1));
      const target = slides[index];
      const left = target.offsetLeft;

      viewport.scrollTo({ left, behavior: "smooth" });

      setDot(index);
      if (byUser) restart();
    };

    // 스크롤 위치로 index 갱신
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

    // ✅ 첫 진입: 1장만 보이게 고정
    goTo(0, false);

    // 사용자 드래그/터치 시 잠깐 멈춤
    const interactOn = () => { isUserInteracting = true; };
    const interactOff = () => { isUserInteracting = false; };

    viewport.addEventListener("touchstart", () => { interactOn(); stop(); }, { passive: true });
    viewport.addEventListener("touchend", () => { interactOff(); restart(); }, { passive: true });
    viewport.addEventListener("mousedown", () => { interactOn(); stop(); });
    window.addEventListener("mouseup", () => { interactOff(); restart(); });

    // ✅ 화면에 보일 때만 오토플레이 (IntersectionObserver)
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        // 0.45 이상 보일 때만 "보인다"로 판정
        isKitVisible = e.isIntersecting && e.intersectionRatio >= 0.45;
        if (isKitVisible) start();
        else stop();
      },
      { threshold: [0, 0.25, 0.45, 0.7, 1] }
    );
    io.observe(kitRoot);

    // ✅ 탭 전환/백그라운드로 가면 멈추기
    document.addEventListener("visibilitychange", () => {
      isPageVisible = !document.hidden;
      if (isPageVisible && isKitVisible) start();
      else stop();
    });

    // 초기 상태 반영
    start();
  }

  /* =========================
     ✅ 음악: 유튜브 링크 앱 내 재생
     ========================= */
  const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

  const getYoutubeId = (url) => {
    try {
      const u = new URL(url);
      if (u.hostname.includes("youtu.be")) return u.pathname.replace("/", "");
      if (u.searchParams.get("v")) return u.searchParams.get("v");
      if (u.pathname.includes("/shorts/")) return u.pathname.split("/shorts/")[1].split("?")[0];
      return "";
    } catch {
      return "";
    }
  };

  const videoId = getYoutubeId(YOUTUBE_URL);

  const btnPlay = document.getElementById("btnPlay");
  const playIcon = document.getElementById("playIcon");
  const seek = document.getElementById("seek");
  const curTime = document.getElementById("curTime");
  const durTime = document.getElementById("durTime");
  const btnRepeat = document.getElementById("btnRepeat");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  const fmt = (s) => {
    if (!isFinite(s) || s < 0) return "0:00";
    const m = Math.floor(s / 60);
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  const setPlayIcon = (playing) => {
    if (!playIcon) return;
    playIcon.src = playing ? "./images/icon_pause.svg" : "./images/icon_play.svg";
  };

  let ytPlayer = null;
  let uiTimer = null;
  let isLoop = false;
  let isSeeking = false;

  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);

  window.onYouTubeIframeAPIReady = () => {
    if (!videoId) return;

    ytPlayer = new YT.Player("ytPlayer", {
      videoId,
      playerVars: {
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
      },
      events: {
        onReady: () => {
          setTimeout(updateDuration, 400);
          startUiLoop();
        },
        onStateChange: (e) => {
          const playing = e.data === YT.PlayerState.PLAYING;
          setPlayIcon(playing);

          if (e.data === YT.PlayerState.ENDED) {
            if (isLoop) {
              ytPlayer.seekTo(0, true);
              ytPlayer.playVideo();
            } else {
              setPlayIcon(false);
            }
          }
        }
      }
    });
  };

  const updateDuration = () => {
    if (!ytPlayer || !durTime) return;
    const d = ytPlayer.getDuration?.() ?? 0;
    durTime.textContent = fmt(d);
  };

  const startUiLoop = () => {
    stopUiLoop();
    uiTimer = setInterval(() => {
      if (!ytPlayer) return;

      const d = ytPlayer.getDuration?.() ?? 0;
      const t = ytPlayer.getCurrentTime?.() ?? 0;

      if (!isSeeking && seek) {
        const p = d > 0 ? (t / d) * 100 : 0;
        seek.value = String(p);
      }
      if (curTime) curTime.textContent = fmt(t);
      if (durTime && (durTime.textContent === "0:00")) {
        durTime.textContent = fmt(d);
      }
    }, 250);
  };

  const stopUiLoop = () => {
    if (uiTimer) clearInterval(uiTimer);
    uiTimer = null;
  };

  btnPlay?.addEventListener("click", () => {
    if (!ytPlayer) return;
    const st = ytPlayer.getPlayerState?.();
    if (st === YT.PlayerState.PLAYING) {
      ytPlayer.pauseVideo();
      setPlayIcon(false);
    } else {
      ytPlayer.playVideo();
      setPlayIcon(true);
    }
  });

  btnPrev?.addEventListener("click", () => {
    if (!ytPlayer) return;
    ytPlayer.seekTo(0, true);
  });
  btnNext?.addEventListener("click", () => {
    if (!ytPlayer) return;
    ytPlayer.seekTo(0, true);
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
})();
