window.addEventListener("DOMContentLoaded", () => {
  // ===== 사용자명 (옵션) =====
  try {
    const savedName = localStorage.getItem("gyuling_name");
    if (savedName) document.getElementById("userName").textContent = savedName;
  } catch (e) {
    console.error("name load error", e);
  }

  // ===== Weather (Open-Meteo) =====
  const placeEl = document.getElementById("weatherPlace");
  const tempEl = document.getElementById("weatherTemp");
  const iconWrap = document.getElementById("weatherIcon");
  const titleEl = document.getElementById("weatherTitle");

  // --- 날씨 설명 텍스트 ---
  const setWeatherText = (code) => {
    const map = [
      { codes: [0], text: "Clear<br>Sky" },
      { codes: [1, 2, 3], text: "Partly<br>Cloudy" },
      { codes: [45, 48], text: "Foggy<br>Day" },
      { codes: [51, 53, 55, 56, 57], text: "Drizzle<br>Day" },
      { codes: [61, 63, 65, 66, 67], text: "Rainy<br>Day" },
      { codes: [71, 73, 75, 77], text: "Snowy<br>Day" },
      { codes: [80, 81, 82], text: "Shower<br>Day" },
      { codes: [95, 96, 99], text: "Thunder<br>Day" },
    ];
    const found = map.find((m) => m.codes.includes(code));
    if (titleEl) titleEl.innerHTML = found ? found.text : "Mostly<br>Sunny";
  };

  // --- 날씨 아이콘 ---
  const setWeatherIcon = (code) => {
    const sun = `
      <svg viewBox="0 0 64 64" class="wx" aria-hidden="true">
        <circle cx="32" cy="32" r="12" fill="currentColor"/>
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".95">
          <path d="M32 6v8"/><path d="M32 50v8"/>
          <path d="M6 32h8"/><path d="M50 32h8"/>
          <path d="M12 12l6 6"/><path d="M46 46l6 6"/>
          <path d="M52 12l-6 6"/><path d="M12 52l6-6"/>
        </g>
      </svg>`;

    const cloud = `
      <svg viewBox="0 0 64 64" class="wx" aria-hidden="true">
        <path d="M18 44c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 57 18 52 18 44Z"
              fill="currentColor" opacity=".35"/>
        <path d="M18 44c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 57 18 52 18 44Z"
              fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/>
      </svg>`;

    const sunCloud = `
      <svg viewBox="0 0 64 64" class="wx" aria-hidden="true">
        <circle cx="24" cy="24" r="10" fill="currentColor" opacity=".95"/>
        <path d="M18 48c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 61 18 56 18 48Z"
              fill="currentColor" opacity=".25"/>
        <path d="M18 48c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 61 18 56 18 48Z"
              fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/>
      </svg>`;

    const rain = `
      <svg viewBox="0 0 64 64" class="wx" aria-hidden="true">
        <path d="M18 36c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 49 18 44 18 36Z"
              fill="currentColor" opacity=".35"/>
        <path d="M18 36c0-7 6-12 13-12 5 0 9 2 11 6 5 0 9 4 9 9 0 6-5 10-11 10H29C22 49 18 44 18 36Z"
              fill="none" stroke="currentColor" stroke-width="2" opacity=".55"/>
        <g stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".9">
          <path d="M26 52l-2 6"/><path d="M36 52l-2 6"/><path d="M46 52l-2 6"/>
        </g>
      </svg>`;

    let svg = sunCloud;
    if ([0].includes(code)) svg = sun;
    else if ([1, 2, 3].includes(code)) svg = sunCloud;
    else if ([45, 48].includes(code)) svg = cloud;
    else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code))
      svg = rain;

    if (iconWrap) iconWrap.innerHTML = svg;
  };

  // --- 실제 날씨 + 위치 이름 가져오기 ---
  const fetchWeather = async (lat, lon) => {
    // 1) 좌표 → 위치 이름 (제주 / 김포 등)
    try {
      const revRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ko`
      );
      if (!revRes.ok) throw new Error("reverse geocoding failed: " + revRes.status);
      const revJson = await revRes.json();
      const r = revJson && revJson.results && revJson.results[0];

      if (r && placeEl) {
        // 예: r.name = "제주시", "김포시", "부산진구" ...
        let label = r.name || r.admin1 || "";

        // 한국인 경우, 끝 글자가 시/군/구면 잘라서 "제주", "김포"처럼 표현
        if (r.country_code === "KR" && /[시군구]$/.test(label)) {
          label = label.slice(0, -1);
        }

        if (label) {
          placeEl.textContent = label;
        } else {
          placeEl.textContent = "위치 정보 없음";
        }
      }
    } catch (e) {
      console.error("reverse geocoding error", e);
      if (placeEl) placeEl.textContent = "위치 정보 없음";
    }

    // 2) 날씨 데이터
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("weather api failed: " + res.status);
      const json = await res.json();

      const t = json?.current?.temperature_2m;
      const code = json?.current?.weather_code;

      if (typeof t === "number" && tempEl) tempEl.textContent = Math.round(t);
      if (typeof code === "number") {
        setWeatherText(code);
        setWeatherIcon(code);
      }
    } catch (e) {
      console.error("weather api error", e);
    }
  };

  // --- 위치 실패 시 제주 폴백 ---
  const useFallbackJeju = () => {
    if (placeEl) placeEl.textContent = "제주";
    // 제주 시청 근처 좌표
    fetchWeather(33.4996, 126.5312).catch((e) => console.error(e));
  };

  // ===== 위치 서비스 사용 =====
  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        fetchWeather(lat, lon).catch(useFallbackJeju);
      },
      (err) => {
        console.error("geo error", err);
        useFallbackJeju();
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  } else {
    useFallbackJeju();
  }

  // ===== TAB NAV =====
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page === "commu") {
        window.location.href = "./commu.html";
      } else if (page === "juice") {
        // ✅ 주소 탭 → location.html로 이동
        window.location.href = "./location.html";
      }
      // 나머지 탭은 아직 미구현이면 그대로 두기
    });
  });
});
