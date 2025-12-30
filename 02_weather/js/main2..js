"use strict";

/* =========================
   OpenWeather 설정
   ========================= */
const API_KEY = "671a8277bf6bb51e2c9be7fb6d4fbc96";

function weatherUrl(lat, lon) {
  return `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;
}

function airUrl(lat, lon) {
  return `https://api.openweathermap.org/data/2.5/air_pollution?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}`;
}

/* ✅ 시간대별(3시간 단위) 예보: 5-day / 3-hour */
function forecastUrl(lat, lon) {
  return `https://api.openweathermap.org/data/2.5/forecast?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;
}

function geoUrl(city) {
  return `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${API_KEY}`;
}

/* =========================
   DOM helpers
   ========================= */
const $ = (id) => document.getElementById(id);

const spinner = $("spinner");
const errorBox = $("errorBox");
const result = $("result");

const bgA = $("bgA");
const bgB = $("bgB");

const fxCanvas = $("fx");
const fxCtx = fxCanvas.getContext("2d");

function setLoading(isLoading) {
  spinner.classList.toggle("show", isLoading);
}

function showError(message) {
  if (!message) {
    errorBox.classList.remove("show");
    errorBox.textContent = "";
    return;
  }
  errorBox.textContent = message;
  errorBox.classList.add("show");
}

function showResult(isShow) {
  result.style.display = isShow ? "grid" : "none";
}

function setText(id, text) {
  $(id).textContent = text;
}

function setIcon(iconCode) {
  const img = $("icon");
  if (!iconCode) {
    img.removeAttribute("src");
    img.style.display = "none";
    return;
  }
  img.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  img.style.display = "block";
}

function aqiToKorean(aqi) {
  switch (aqi) {
    case 1: return "좋음";
    case 2: return "보통";
    case 3: return "나쁨";
    case 4: return "매우 나쁨";
    case 5: return "위험";
    default: return "알 수 없음";
  }
}

function formatLocalTime(unixSeconds, tzOffsetSeconds) {
  if (!unixSeconds || tzOffsetSeconds === undefined) return "-";
  const ms = (unixSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(ms);
  return d.toISOString().replace("T", " ").slice(0, 16) + " (local)";
}

/* =========================
   ✅ 오버레이(흐림/맑음 체감 튜닝 강하게)
   - Clear: 매우 연하게
   - Clouds/Mist: 확실히 진하게
   - Rain/Snow: 더 진하게
   ========================= */
function applyOverlayByWeather(main) {
  const m = (main || "").toLowerCase();

  // 기본(맑음)
  let shade = 0.08;

  if (m.includes("cloud")) shade = 0.20;
  if (m.includes("mist") || m.includes("fog") || m.includes("haze") || m.includes("smoke")) shade = 0.22;
  if (m.includes("rain") || m.includes("drizzle")) shade = 0.24;
  if (m.includes("thunderstorm")) shade = 0.26;
  if (m.includes("snow")) shade = 0.24;

  document.documentElement.style.setProperty("--shade", String(shade));
}

/* =========================
   ✅ 랜드마크 배경(위키) + 부드러운 줌/블러 전환
   - 이미지 있으면 전환
   - 없으면 기본 배경 유지(아무것도 안 함)
   ========================= */
const BG_CACHE = new Map();
let activeBg = "A"; // 현재 활성 레이어

function composedBgImage(url) {
  // CSS와 동일한 그라데이션 3겹 + url
  return `
    var(--bg-grad-1),
    var(--bg-grad-2),
    var(--bg-grad-3),
    url("${url}")
  `;
}

async function wikiSummaryImage(title) {
  const t = encodeURIComponent(title);
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${t}`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.originalimage?.source || json?.thumbnail?.source || null;
}

async function wikiSearchBestTitle(query) {
  const url = `https://en.wikipedia.org/w/api.php?origin=*&action=query&list=search&format=json&srlimit=1&srsearch=${encodeURIComponent(
    query
  )}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json?.query?.search?.[0]?.title || null;
}

async function fetchCityBackground(cityName, countryCode) {
  const key = `${cityName}|${countryCode || ""}`.toLowerCase();
  if (BG_CACHE.has(key)) return BG_CACHE.get(key);

  const candidates = [
    cityName,
    `${cityName} city`,
    `${cityName} skyline`,
    `${cityName} landmark`,
    countryCode ? `${cityName}, ${countryCode}` : null,
  ].filter(Boolean);

  let img = null;

  for (const c of candidates) {
    img = await wikiSummaryImage(c);
    if (img) break;
  }

  if (!img) {
    for (const c of candidates) {
      const title = await wikiSearchBestTitle(c);
      if (!title) continue;
      img = await wikiSummaryImage(title);
      if (img) break;
    }
  }

  BG_CACHE.set(key, img);
  return img;
}

async function transitionBackgroundIfExists(url) {
  if (!url) return; // ✅ 없으면 기본 배경 유지

  const incoming = activeBg === "A" ? bgB : bgA;
  const outgoing = activeBg === "A" ? bgA : bgB;

  // 들어오는 레이어: 이미지 세팅 + enter 상태(줌+블러)
  incoming.style.backgroundImage = composedBgImage(url);
  incoming.classList.add("is-enter", "is-active");

  // 다음 프레임에 enter를 풀어주면(blur -> 0, scale -> 1.02) 부드럽게 변함
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      incoming.classList.remove("is-enter");
    });
  });

  // 나가는 레이어는 opacity 0로 자연스럽게
  outgoing.classList.remove("is-active");

  // 활성 레이어 스위치
  activeBg = activeBg === "A" ? "B" : "A";
}

/* =========================
   ✅ 시간대별 기온(차트 렌더)
   - forecast(list)에서 8개(약 24시간) 사용
   ========================= */
function renderHourlyChart(list, tzOffsetSeconds) {
  const chart = $("hourlyChart");
  const labels = $("hourlyLabels");
  if (!chart || !labels) return;

  chart.innerHTML = "";
  labels.innerHTML = "";

  if (!Array.isArray(list) || list.length === 0) {
    chart.innerHTML = `<div style="color:rgba(0,0,0,0.55); font-size:12px;">시간대별 데이터 없음</div>`;
    return;
  }

  // 8개 = 24시간(3시간 간격)
  const items = list
    .slice(0, 8)
    .map((it) => ({ t: it.dt, temp: it?.main?.temp }))
    .filter((x) => x.temp !== undefined);

  if (items.length === 0) return;

  const temps = items.map((x) => x.temp);
  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = Math.max(1, maxT - minT);

  for (const it of items) {
    const h = Math.round(((it.temp - minT) / range) * 70) + 18; // 18~88px
    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${h}px`;

    const fill = document.createElement("div");
    fill.className = "barFill";

    const val = document.createElement("div");
    val.className = "barVal";
    val.textContent = `${Math.round(it.temp)}°`;

    bar.appendChild(fill);
    bar.appendChild(val);
    chart.appendChild(bar);

    // 라벨(해당 지역 로컬 시간)
    const local = new Date((it.t + tzOffsetSeconds) * 1000);
    const hh = String(local.getUTCHours()).padStart(2, "0");
    const lb = document.createElement("div");
    lb.textContent = `${hh}시`;
    labels.appendChild(lb);
  }
}

/* =========================
   ✅ 날씨 애니메이션: 비/눈
   ========================= */
let fxMode = "none";
let particles = [];
let rafId = null;

function resizeFx() {
  const dpr = window.devicePixelRatio || 1;
  fxCanvas.width = Math.floor(window.innerWidth * dpr);
  fxCanvas.height = Math.floor(window.innerHeight * dpr);
  fxCanvas.style.width = window.innerWidth + "px";
  fxCanvas.style.height = window.innerHeight + "px";
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener("resize", resizeFx);

function mapWeatherToFx(main) {
  const m = (main || "").toLowerCase();
  if (m.includes("snow")) return "snow";
  if (m.includes("rain") || m.includes("drizzle") || m.includes("thunderstorm")) return "rain";
  return "none";
}

function makeParticle(mode) {
  const w = window.innerWidth;
  const h = window.innerHeight;

  if (mode === "rain") {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: -1.2 - Math.random() * 0.8,
      vy: 10 + Math.random() * 7,
      len: 10 + Math.random() * 18,
      alpha: 0.18 + Math.random() * 0.22
    };
  }

  if (mode === "snow") {
    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: -0.4 + Math.random() * 0.8,
      vy: 0.9 + Math.random() * 2.1,
      r: 1.0 + Math.random() * 2.4,
      alpha: 0.35 + Math.random() * 0.35
    };
  }

  return { x: 0, y: 0, vx: 0, vy: 0 };
}

function startFx(mode) {
  fxMode = mode;
  particles = [];
  cancelAnimationFrame(rafId);
  resizeFx();

  if (mode === "none") {
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    return;
  }

  const count = mode === "rain" ? 240 : 180;
  for (let i = 0; i < count; i++) particles.push(makeParticle(mode));
  loopFx();
}

function loopFx() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  fxCtx.clearRect(0, 0, w, h);

  if (fxMode === "rain") {
    fxCtx.lineWidth = 1;
    fxCtx.strokeStyle = "rgba(255,255,255,0.95)";
    for (const p of particles) {
      fxCtx.globalAlpha = p.alpha;
      fxCtx.beginPath();
      fxCtx.moveTo(p.x, p.y);
      fxCtx.lineTo(p.x + p.vx, p.y + p.len);
      fxCtx.stroke();

      p.x += p.vx;
      p.y += p.vy;

      if (p.y > h + 40 || p.x < -40) {
        p.x = Math.random() * w;
        p.y = -50;
      }
    }
  }

  if (fxMode === "snow") {
    fxCtx.fillStyle = "rgba(255,255,255,0.98)";
    for (const p of particles) {
      fxCtx.globalAlpha = p.alpha;
      fxCtx.beginPath();
      fxCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      fxCtx.fill();

      p.x += p.vx;
      p.y += p.vy;

      if (p.y > h + 10) {
        p.y = -10;
        p.x = Math.random() * w;
      }
      if (p.x > w + 10) p.x = -10;
      if (p.x < -10) p.x = w + 10;
    }
  }

  fxCtx.globalAlpha = 1;
  rafId = requestAnimationFrame(loopFx);
}

/* =========================
   ✅ 핵심: 날씨 + 대기질 + 예보(시간대별) fetch
   ========================= */
async function fetchAll(lat, lon, placeLabel) {
  setLoading(true);
  showError(null);

  try {
    const [wRes, aRes, fRes] = await Promise.all([
      fetch(weatherUrl(lat, lon)),
      fetch(airUrl(lat, lon)),
      fetch(forecastUrl(lat, lon)),
    ]);

    if (!wRes.ok) throw new Error(`날씨 API 오류: ${wRes.status} ${await wRes.text()}`);
    if (!aRes.ok) throw new Error(`대기질 API 오류: ${aRes.status} ${await aRes.text()}`);
    if (!fRes.ok) throw new Error(`예보 API 오류: ${fRes.status} ${await fRes.text()}`);

    const w = await wRes.json();
    const a = await aRes.json();
    const f = await fRes.json();

    const tempC = w?.main?.temp;
    const feelsC = w?.main?.feels_like;
    const desc = w?.weather?.[0]?.description;
    const main = w?.weather?.[0]?.main;  // Clear/Clouds/Rain/Snow...
    const humidity = w?.main?.humidity;
    const wind = w?.wind?.speed;
    const icon = w?.weather?.[0]?.icon;
    const tz = w?.timezone || 0;

    const updatedAt = formatLocalTime(w?.dt, tz);
    const sunrise = formatLocalTime(w?.sys?.sunrise, tz);
    const sunset = formatLocalTime(w?.sys?.sunset, tz);

    const aqi = a?.list?.[0]?.main?.aqi;
    const comps = a?.list?.[0]?.components || {};

    // UI
    setText("place", placeLabel);
    setText("coords", `위도 ${Number(lat).toFixed(4)} · 경도 ${Number(lon).toFixed(4)}`);
    setText("updatedAt", `업데이트: ${updatedAt}`);
    setIcon(icon);

    setText("temp", tempC !== undefined ? `${Math.round(tempC)}°C` : "-");
    setText("desc", desc ? String(desc) : "-");
    setText("feels", `체감 ${feelsC !== undefined ? Math.round(feelsC) + "°C" : "-"}`);

    setText("wind", wind !== undefined ? `${wind} m/s` : "-");
    setText("humidity", humidity !== undefined ? `${humidity}%` : "-");
    setText("sun", `일출 ${sunrise} · 일몰 ${sunset}`);

    setText("aqi", aqi !== undefined ? `${aqi} (${aqiToKorean(aqi)})` : "-");
    setText("pm25", comps.pm2_5 !== undefined ? `${comps.pm2_5} μg/m³` : "-");
    setText("pm10", comps.pm10 !== undefined ? `${comps.pm10} μg/m³` : "-");

    // ✅ 시간대별 차트 렌더
    renderHourlyChart(f?.list || [], tz);

    showResult(true);

    // ✅ 오버레이/애니메이션 튜닝
    applyOverlayByWeather(main);
    startFx(mapWeatherToFx(main));

    // ✅ 랜드마크 배경(있으면만) + 부드러운 전환
    const city = w?.name || (placeLabel?.split(",")?.[0] || placeLabel);
    const country = w?.sys?.country;
    const bgUrl = await fetchCityBackground(city, country);
    await transitionBackgroundIfExists(bgUrl);

  } catch (err) {
    showResult(false);
    showError(err?.message || "오류가 발생했습니다.");
    startFx("none");
  } finally {
    setLoading(false);
  }
}

/* =========================
   내 위치
   ========================= */
function loadByMyLocation() {
  const ok = navigator && navigator.geolocation;
  if (!ok) {
    showError("이 브라우저는 위치 권한(geolocation)을 지원하지 않습니다.");
    return;
  }

  setLoading(true);
  showError(null);

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      await fetchAll(lat, lon, "내 위치");
    },
    (e) => {
      setLoading(false);
      if (e.code === e.PERMISSION_DENIED) {
        showError("위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해 주세요.");
      } else {
        showError(`위치를 가져오지 못했습니다: ${e.message}`);
      }
    },
    { enableHighAccuracy: true, timeout: 10000 }
  );
}

/* =========================
   도시 검색
   ========================= */
async function searchCity(city) {
  const q = (city || "").trim();
  if (!q) return;

  setLoading(true);
  showError(null);

  try {
    const gRes = await fetch(geoUrl(q));
    if (!gRes.ok) throw new Error(`도시 검색(지오코딩) 오류: ${gRes.status} ${await gRes.text()}`);

    const g = await gRes.json();
    const first = g?.[0];
    if (!first) throw new Error("도시를 찾지 못했습니다. 다른 이름으로 검색해 주세요.");

    const lat = first.lat;
    const lon = first.lon;
    const label = [first.name, first.state, first.country].filter(Boolean).join(", ");

    await fetchAll(lat, lon, label);
  } catch (err) {
    showResult(false);
    showError(err?.message || "검색 중 오류가 발생했습니다.");
    setLoading(false);
  }
}

/* =========================
   init
   ========================= */
document.addEventListener("DOMContentLoaded", () => {
  resizeFx();

  // ✅ 기본 배경 레이어는 CSS로 이미 깔려있음
  // (랜드마크가 있으면 그때만 transitionBackgroundIfExists로 교체됨)

  loadByMyLocation();

  $("btnMyLocation").addEventListener("click", loadByMyLocation);

  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    searchCity($("cityInput").value);
  });
});
