// ✅ 검색 키워드(일단 3개만)
const SEARCH_KEYS = ["애월", "남원", "성산"];

// ====== 코스 데이터 ======
const COURSES = {
  east: [
    {
      id: "e1",
      title: "성산일출봉 → 섭지코지 해안 코스",
      desc: "풍경/바다/사진맛 코스. 바람 좋은 날 추천!",
      level: "중",
      tags: ["성산", "해안", "사진"],
      image: "./images/location1.jpg",
      start: { name: "성산일출봉", lat: 33.4588, lng: 126.9423 },
      end: { name: "섭지코지", lat: 33.4241, lng: 126.9270 },
    },
    {
      id: "e2",
      title: "월정리 → 김녕 해변 라이드",
      desc: "초보도 부담 없는 평지 위주 해변길",
      level: "하",
      tags: ["월정리", "카페", "평지"],
      image: "./images/location2.jpg",
      start: { name: "월정리", lat: 33.5569, lng: 126.7959 },
      end: { name: "김녕", lat: 33.5577, lng: 126.7592 },
    },
    {
      id: "e3",
      title: "표선 → 남원 바닷길",
      desc: "긴 직선 바닷길 + 노을 예쁨",
      level: "중",
      tags: ["표선", "남원", "노을", "장거리"],
      image: "./images/location3.jpg",
      start: { name: "표선", lat: 33.3266, lng: 126.8327 },
      end: { name: "남원", lat: 33.2803, lng: 126.7198 },
    },
  ],
  west: [
    {
      id: "w1",
      title: "한림 → 애월 카페 로드",
      desc: "카페/포토스팟 많은 인기 구간",
      level: "중",
      tags: ["애월", "카페", "핫플"],
      image: "./images/location4.jpg",
      start: { name: "한림", lat: 33.4091, lng: 126.2580 },
      end: { name: "애월", lat: 33.4629, lng: 126.3111 },
    },
    {
      id: "w2",
      title: "협재 → 금능 해변 코스",
      desc: "물색 미친 구간. 쉬엄쉬엄 가도 최고",
      level: "하",
      tags: ["협재", "바다", "휴식"],
      image: "./images/location5.jpg",
      start: { name: "협재", lat: 33.3943, lng: 126.2397 },
      end: { name: "금능", lat: 33.3906, lng: 126.2276 },
    },
  ],
};

let region = "east";
let map, routeLine;
let startMarker, endMarker, meMarker;

const $ = (sel) => document.querySelector(sel);
const norm = (s) => String(s || "").trim().toLowerCase();

function kmFromHaversine(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const q =
    s1 * s1 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2 * s2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(q)));
}

function formatTime(hours) {
  const totalMin = Math.max(1, Math.round(hours * 60));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}분`;
  return `${h}시간 ${m}분`;
}

function setRouteCard(course, km, speedKmh) {
  $("#routeTitle").textContent = course ? course.title : "코스를 선택해 주세요";
  $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
  $("#routeKm").textContent = course ? `${km.toFixed(1)}km` : "-";
  $("#routeTime").textContent = course ? formatTime(km / speedKmh) : "-";
  $("#routeLevel").textContent = course ? course.level : "-";
  $("#routeHint").textContent = course
    ? `${course.start.name} → ${course.end.name} (속도 ${speedKmh}km/h 기준)`
    : "코스 카드 클릭 → 지도에 루트 표시";
}

function setRegion(next, { silent = false } = {}) {
  region = next;

  document.querySelectorAll(".seg__btn").forEach((b) => {
    const active = b.dataset.region === region;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");
  });

  $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
  if (!silent) renderCards();
}

function findKeyFromQuery(q) {
  const qq = norm(q);
  if (!qq) return null;
  for (const k of SEARCH_KEYS) {
    if (qq.startsWith(norm(k))) return k;
  }
  return null;
}

function allCoursesWithRegion() {
  return [
    ...COURSES.east.map((c) => ({ ...c, __region: "east" })),
    ...COURSES.west.map((c) => ({ ...c, __region: "west" })),
  ];
}

function renderCards() {
  const qRaw = $("#q").value || "";
  const key = findKeyFromQuery(qRaw);

  let items = [];
  let note = "";

  if (key) {
    const kk = norm(key);
    items = allCoursesWithRegion().filter((c) => {
      const blob = norm(
        `${c.title} ${c.desc} ${c.tags.join(" ")} ${c.start.name} ${c.end.name}`
      );
      return blob.includes(kk);
    });

    if (items[0]?.__region && items[0].__region !== region) {
      setRegion(items[0].__region, { silent: true });
    }
  } else {
    const qq = norm(qRaw);
    if (qq && !SEARCH_KEYS.some((k) => norm(k) === qq)) {
      note = " · 검색은 (애월/남원/성산)만 지원";
    }
    items = COURSES[region].map((c) => ({ ...c, __region: region }));
  }

  $("#countLabel").textContent = `${items.length}개${note}`;

  const wrap = $("#cards");
  wrap.innerHTML = "";

  items.forEach((c) => {
    const km = kmFromHaversine(c.start, c.end);
    const speedKmh = Number($("#speed").value || 18);
    const hasImg = !!c.image;

    const el = document.createElement("article");
    el.className = "course";
    el.dataset.id = c.id;

    // ✅ 이미지: background-image 대신 <img> 사용 (더 선명)
    el.innerHTML = `
      <div class="course__media">
        ${hasImg ? `<img src="${c.image}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">` : ""}
      </div>

      <div class="course__body">
        <div class="course__left">
          <h3 class="course__title">${c.title}</h3>
          <p class="course__desc">${c.desc}</p>
          <div class="course__tags">
            ${c.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}
          </div>
        </div>

        <div class="course__right">
          <span class="pill">${c.level}</span>
          <div class="small">${km.toFixed(1)}km · ${formatTime(km / speedKmh)}</div>
        </div>
      </div>
    `;

    el.addEventListener("click", () => selectCourse(c));
    wrap.appendChild(el);
  });
}

function ensureMap() {
  if (map) return;

  map = L.map("map", { zoomControl: false }).setView([33.3617, 126.5292], 10);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);
}

function setMarkers(course) {
  if (startMarker) map.removeLayer(startMarker);
  if (endMarker) map.removeLayer(endMarker);

  startMarker = L.marker([course.start.lat, course.start.lng]).addTo(map);
  endMarker = L.marker([course.end.lat, course.end.lng]).addTo(map);

  startMarker.bindPopup(`출발: ${course.start.name}`);
  endMarker.bindPopup(`도착: ${course.end.name}`);
}

function drawFallbackLine(start, end) {
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(
    [[start.lat, start.lng], [end.lat, end.lng]],
    { weight: 5, opacity: 0.9 }
  ).addTo(map);

  map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
}

async function drawRouteOSRM(start, end) {
  const url =
    `https://router.project-osrm.org/route/v1/bicycle/` +
    `${start.lng},${start.lat};${end.lng},${end.lat}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("osrm failed");
  const data = await res.json();
  const coords = data?.routes?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) throw new Error("no coords");

  const latlngs = coords.map(([lng, lat]) => [lat, lng]);

  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(latlngs, { weight: 5, opacity: 0.9 }).addTo(map);
  map.fitBounds(routeLine.getBounds(), { padding: [24, 24] });
}

async function selectCourse(course) {
  ensureMap();

  const courseRegion = course.__region || (
    COURSES.east.some((c) => c.id === course.id) ? "east" : "west"
  );
  if (courseRegion !== region) setRegion(courseRegion, { silent: true });

  const speedKmh = Number($("#speed").value || 18);
  const km = kmFromHaversine(course.start, course.end);

  setRouteCard(course, km, speedKmh);
  setMarkers(course);

  try {
    await drawRouteOSRM(course.start, course.end);
  } catch (e) {
    drawFallbackLine(course.start, course.end);
  }
}

function locateMe() {
  ensureMap();
  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 서비스를 지원하지 않아요.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (meMarker) map.removeLayer(meMarker);

      meMarker = L.circleMarker([latitude, longitude], {
        radius: 8,
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.6,
      }).addTo(map);

      map.setView([latitude, longitude], 13);
    },
    () => alert("위치 권한을 허용해 주세요."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function bindTabs() {
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "home") window.location.href = "./home.html";
      if (page === "commu") window.location.href = "./commu.html";
      if (page === "addr") window.location.href = "./addr.html";
      if (page === "rank") window.location.href = "./rank.html";
      if (page === "my") window.location.href = "./my.html";
    });
  });
}

window.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".seg__btn").forEach((b) => {
    b.addEventListener("click", () => setRegion(b.dataset.region));
  });

  $("#q").addEventListener("input", renderCards);
  $("#q").addEventListener("change", renderCards);

  $("#speed").addEventListener("change", renderCards);
  $("#btnLocate").addEventListener("click", locateMe);

  bindTabs();
  ensureMap();
  setRouteCard(null, 0, Number($("#speed").value || 18));
  renderCards();
});
