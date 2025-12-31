window.addEventListener("DOMContentLoaded", () => {
  // ===== 사용자명 (옵션) =====
  try{
    const savedName = localStorage.getItem("gyuling_name");
    if (savedName) document.getElementById("userName").textContent = savedName;
  }catch(e){}

  // ===== Weather (Open-Meteo, 키 없음) =====
  const placeEl = document.getElementById("weatherPlace");
  const tempEl = document.getElementById("weatherTemp");
  const iconWrap = document.getElementById("weatherIcon");
  const titleEl = document.getElementById("weatherTitle");

  const setWeatherText = (code) => {
    const map = [
      { codes: [0], text: "Clear<br>Sky" },
      { codes: [1,2,3], text: "Partly<br>Cloudy" },
      { codes: [45,48], text: "Foggy<br>Day" },
      { codes: [51,53,55,56,57], text: "Drizzle<br>Day" },
      { codes: [61,63,65,66,67], text: "Rainy<br>Day" },
      { codes: [71,73,75,77], text: "Snowy<br>Day" },
      { codes: [80,81,82], text: "Shower<br>Day" },
      { codes: [95,96,99], text: "Thunder<br>Day" },
    ];
    const found = map.find(m => m.codes.includes(code));
    titleEl.innerHTML = found ? found.text : "Mostly<br>Sunny";
  };

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
    else if ([1,2,3].includes(code)) svg = sunCloud;
    else if ([45,48].includes(code)) svg = cloud;
    else if ([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code)) svg = rain;

    iconWrap.innerHTML = svg;
  };

  const fetchWeather = async (lat, lon) => {
    try {
      const rev = await fetch(
        `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=ko`
      );
      const revJson = await rev.json();
      const name = revJson?.results?.[0]?.name;
      if (name) placeEl.textContent = name;
    } catch (e) {}

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
    const res = await fetch(url);
    const json = await res.json();

    const t = json?.current?.temperature_2m;
    const code = json?.current?.weather_code;

    if (typeof t === "number") tempEl.textContent = Math.round(t);
    if (typeof code === "number") {
      setWeatherText(code);
      setWeatherIcon(code);
    }
  };

  const useFallbackJeju = () => {
    placeEl.textContent = "제주";
    fetchWeather(33.4996, 126.5312).catch(() => {});
  };

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude).catch(useFallbackJeju),
      () => useFallbackJeju(),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  } else {
    useFallbackJeju();
  }

  // ===== TAB NAV =====
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "commu") window.location.href = "./commu.html";
    });
  });
});
