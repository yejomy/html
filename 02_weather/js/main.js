// app.js
"use strict";

// ==============================
// 설정
// ==============================
const API_KEY = "671a8277bf6bb51e2c9be7fb6d4fbc96";

// 2) 요청하신 API 주소 형태 (lat/lon 치환)
function weatherUrl(lat, lon) {
  return `https://api.openweathermap.org/data/2.5/weather?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}&units=metric`;
}

// 대기질(air pollution) API: AQI + PM2.5/PM10
function airUrl(lat, lon) {
  return `https://api.openweathermap.org/data/2.5/air_pollution?lat=${encodeURIComponent(
    lat
  )}&lon=${encodeURIComponent(lon)}&appid=${API_KEY}`;
}

// 5) 도시 검색을 위한 지오코딩 API
function geoUrl(city) {
  return `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    city
  )}&limit=1&appid=${API_KEY}`;
}

// ==============================
// UI helpers
// ==============================
const $ = (id) => document.getElementById(id);

const spinner = $("spinner");
const errorBox = $("errorBox");
const result = $("result");

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
  result.style.display = isShow ? "block" : "none";
}

function aqiToKorean(aqi) {
  // OpenWeather AQI: 1(좋음) ~ 5(위험)
  switch (aqi) {
    case 1:
      return "좋음";
    case 2:
      return "보통";
    case 3:
      return "나쁨";
    case 4:
      return "매우 나쁨";
    case 5:
      return "위험";
    default:
      return "알 수 없음";
  }
}

function formatLocalTime(unixSeconds, tzOffsetSeconds) {
  if (!unixSeconds || tzOffsetSeconds === undefined) return "-";
  // unixSeconds(UTC) + timezone offset
  const ms = (unixSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(ms);
  // ISO를 단순 표시용으로
  return d.toISOString().replace("T", " ").slice(0, 16) + " (local)";
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

// ==============================
// Core fetch
// ==============================
async function fetchWeatherAndAir(lat, lon, placeLabel) {
  setLoading(true);
  showError(null);

  try {
    // 3) 비동기 방식 (날씨/대기질 동시 호출)
    const [wRes, aRes] = await Promise.all([fetch(weatherUrl(lat, lon)), fetch(airUrl(lat, lon))]);

    if (!wRes.ok) {
      const t = await wRes.text();
      throw new Error(`날씨 API 오류: ${wRes.status} ${t}`);
    }
    if (!aRes.ok) {
      const t = await aRes.text();
      throw new Error(`대기질 API 오류: ${aRes.status} ${t}`);
    }

    const w = await wRes.json();
    const a = await aRes.json();

    const tempC = w?.main?.temp;
    const feelsC = w?.main?.feels_like;
    const desc = w?.weather?.[0]?.description;
    const humidity = w?.main?.humidity;
    const wind = w?.wind?.speed;
    const icon = w?.weather?.[0]?.icon;
    const tz = w?.timezone;

    const updatedAt = formatLocalTime(w?.dt, tz);
    const sunrise = formatLocalTime(w?.sys?.sunrise, tz);
    const sunset = formatLocalTime(w?.sys?.sunset, tz);

    const aqi = a?.list?.[0]?.main?.aqi;
    const comps = a?.list?.[0]?.components || {};

    // UI 반영
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

    showResult(true);
  } catch (err) {
    showResult(false);
    showError(err?.message || "오류가 발생했습니다.");
  } finally {
    setLoading(false);
  }
}

// ==============================
// 1) 현재 내 위치 기반
// ==============================
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
      await fetchWeatherAndAir(lat, lon, "내 위치");
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

// ==============================
// 5) 도시 검색
// ==============================
async function searchCity(city) {
  const q = (city || "").trim();
  if (!q) return;

  setLoading(true);
  showError(null);

  try {
    const gRes = await fetch(geoUrl(q));
    if (!gRes.ok) {
      const t = await gRes.text();
      throw new Error(`도시 검색(지오코딩) 오류: ${gRes.status} ${t}`);
    }
    const g = await gRes.json();
    const first = g?.[0];
    if (!first) throw new Error("도시를 찾지 못했습니다. 다른 이름으로 검색해 주세요.");

    const lat = first.lat;
    const lon = first.lon;
    const label = [first.name, first.state, first.country].filter(Boolean).join(", ");

    await fetchWeatherAndAir(lat, lon, label);
  } catch (err) {
    showResult(false);
    showError(err?.message || "검색 중 오류가 발생했습니다.");
    setLoading(false);
  }
}

// ==============================
// 이벤트 바인딩
// ==============================
document.addEventListener("DOMContentLoaded", () => {
  // 초기 로드: 내 위치
  loadByMyLocation();

  $("btnMyLocation").addEventListener("click", loadByMyLocation);

  $("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const city = $("cityInput").value;
    searchCity(city);
  });
});
