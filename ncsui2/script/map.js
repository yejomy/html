// 검색 키워드 (입력 시 자동완성/검색용)
const SEARCH_KEYS = ["애월", "남원", "성산"];

// ====== 코스 데이터 + 평점/후기 ======
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
      end: { name: "섭지코지", lat: 33.4241, lng: 126.927 },
      rating: 4.8,
      review: "노을 때 가면 사진 진짜 잘 나와요 👍",
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
      rating: 4.6,
      review: "입문자도 부담 없이 타기 좋아요.",
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
      rating: 4.9,
      review: "장거리인데 바다 보면서 가서 하나도 안 지루함.",
    },
  ],
  west: [
    {
      id: "w1",
      title: "한림 → 애월 카페 로드",
      desc: "카페/포토스팟 많은 인기 구간",
      level: "중",
      tags: ["한림", "애월", "카페", "핫플"],
      image: "./images/location4.jpg",
      start: { name: "한림", lat: 33.4091, lng: 126.258 },
      end: { name: "애월", lat: 33.4629, lng: 126.3111 },
      rating: 4.7,
      review: "카페 들르면서 쉬엄쉬엄 가기 딱 좋아요.",
    },
    {
      id: "w2",
      title: "협재 → 금능 해변 코스",
      desc: "물색 미친 구간. 쉬엄쉬엄 가도 최고",
      level: "하",
      tags: ["협재", "금능", "바다", "휴식"],
      image: "./images/location5.jpg",
      start: { name: "협재", lat: 33.3943, lng: 126.2397 },
      end: { name: "금능", lat: 33.3906, lng: 126.2276 },
      rating: 5.0,
      review: "물색 미쳤다… 천천히 달리기 최고 코스.",
    },
  ],
};

// 현재 리스트/뱃지가 보고 있는 지역 ("east" | "west")
let region = "east";

// 카카오 지도 관련 전역
let map;
let routeLine;
let startMarker;
let endMarker;
let meMarker;

let selectedCourse = null;

// 코스 진행 / 배지 상태
let tracking = {
  isActive: false,
  courseId: null,
  watchId: null,
  path: [],
  traveledKm: 0,
  badges: {}, // { [courseId]: true }
};

const $ = (sel) => document.querySelector(sel);
const norm = (s) => String(s || "").trim().toLowerCase();

// ===== 기본 유틸 =====
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

function saveBadges() {
  try {
    localStorage.setItem("courseBadges", JSON.stringify(tracking.badges));
  } catch (e) {
  }
}

function hasBadge(courseId) {
  return !!tracking.badges[courseId];
}

function awardBadge(course) {
  if (hasBadge(course.id)) return;
  tracking.badges[course.id] = true;
  saveBadges();
  alert(`배지 획득! 🎉\n"${course.title}" 코스를 클리어했어요.`);
}

// ===== UI 유틸 =====
function setRouteCard(course, km, speedKmh) {
  $("#routeTitle").textContent = course ? course.title : "코스를 선택해 주세요";
  $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
  $("#routeKm").textContent = course ? `${km.toFixed(1)}km` : "-";
  $("#routeTime").textContent = course ? formatTime(km / speedKmh) : "-";
  $("#routeLevel").textContent = course ? course.level : "-";
  $("#routeHint").textContent = course
    ? `${course.start.name} → ${course.end.name} (속도 ${speedKmh}km/h 기준)`
    : "코스 카드 클릭 → 지도에 루트 표시";

  const navBtn = $("#routeNavBtn");
  const startBtn = $("#routeStartBtn");

  if (navBtn) navBtn.disabled = !course;
  if (startBtn) {
    startBtn.disabled = !course;
    startBtn.textContent = course
      ? hasBadge(course.id)
        ? "다시 타기 (배지 완료)"
        : "추천 코스 시작하기"
      : "추천 코스 시작하기";
  }
}

function allCoursesWithRegion() {
  return [
    ...COURSES.east.map((c) => ({ ...c, __region: "east" })),
    ...COURSES.west.map((c) => ({ ...c, __region: "west" })),
  ];
}

function findKeyFromQuery(q) {
  const qq = norm(q);
  if (!qq) return null;
  for (const k of SEARCH_KEYS) {
    if (qq.startsWith(norm(k))) return k;
  }
  return null;
}

// 상단 동부/서부 버튼 클릭 시
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

// 추천 코스 리스트 렌더링
function renderCards() {
  const qRaw = ($("#q") && $("#q").value) || "";
  const key = findKeyFromQuery(qRaw);

  let items = [];
  let note = "";
  const qq = norm(qRaw);

  if (key) {
    // 검색어 있으면 전체에서 검색
    const kk = norm(key);
    items = allCoursesWithRegion().filter((c) => {
      const blob = norm(
        `${c.title} ${c.desc} ${c.tags.join(" ")} ${c.start.name} ${c.end.name}`
      );
      return blob.includes(kk);
    });

    // 검색 결과 첫 코스 지역에 맞춰 상단 토글/뱃지만 동기화
    if (items[0]?.__region && items[0].__region !== region) {
      region = items[0].__region;
      document.querySelectorAll(".seg__btn").forEach((b) => {
        const active = b.dataset.region === region;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", active ? "true" : "false");
      });
      $("#routeRegion").textContent = region === "east" ? "동부" : "서부";
    }
  } else {
    // 검색어 없으면 → 현재 region 기준
    if (qq && !SEARCH_KEYS.some((k) => norm(k) === qq)) {
      note = " · 검색은 (애월/남원/성산)만 지원";
    }
    items = COURSES[region].map((c) => ({ ...c, __region: region }));
  }

  const countLabel = $("#countLabel");
  if (countLabel) countLabel.textContent = `${items.length}개${note}`;

  const wrap = $("#cards");
  if (!wrap) return;
  wrap.innerHTML = "";

  items.forEach((c) => {
    const km = kmFromHaversine(c.start, c.end);
    const speedKmh = Number($("#speed")?.value || 18);
    const hasImg = !!c.image;
    const cleared = hasBadge(c.id);

    const el = document.createElement("article");
    el.className = "course";
    el.dataset.id = c.id;

    el.innerHTML = `
      <div class="course__media">
        ${
          hasImg
            ? `<img src="${c.image}" alt="" loading="lazy" decoding="async" onerror="this.style.display='none'">`
            : ""
        }
      </div>

      <div class="course__body">
        <div class="course__left">
          <h3 class="course__title">
            ${c.title}
            ${
              cleared
                ? '<span style="margin-left:4px;font-size:10px;color:#ff7a00;">✔ 배지 완료</span>'
                : ""
            }
          </h3>
          <p class="course__desc">${c.desc}</p>
          <div class="course__tags">
            ${c.tags.map((t) => `<span class="tag">#${t}</span>`).join("")}
          </div>

          <div class="course__rating-row">
            <div class="course__rating-badge">
              <span class="course__rating-star">★</span>
              <span class="course__rating-score">${(c.rating ?? 0).toFixed(1)}</span>
            </div>
            ${
              c.review
                ? `<p class="course__review">${c.review}</p>`
                : `<p class="course__review course__review--empty">아직 후기가 없어요</p>`
            }
          </div>
        </div>

        <div class="course__right">
          <span class="pill">${c.level}</span>
          <div class="small">${km.toFixed(1)}km · ${formatTime(
      km / speedKmh
    )}</div>
        </div>
      </div>
    `;

    el.addEventListener("click", () => selectCourse(c));
    wrap.appendChild(el);
  });
}

// ===== 카카오 지도 =====
function ensureMap() {
  if (map) return;

  const container = document.getElementById("map");
  if (!container || !window.kakao || !window.kakao.maps) return;

  map = new kakao.maps.Map(container, {
    center: new kakao.maps.LatLng(33.3617, 126.5292),
    level: 9,
  });

  const zoomControl = new kakao.maps.ZoomControl();
  map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
}

function clearRoute() {
  if (routeLine) {
    routeLine.setMap(null);
    routeLine = null;
  }
}

function setMarkers(course) {
  if (!map) return;

  if (startMarker) startMarker.setMap(null);
  if (endMarker) endMarker.setMap(null);

  startMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(course.start.lat, course.start.lng),
    map,
  });

  endMarker = new kakao.maps.Marker({
    position: new kakao.maps.LatLng(course.end.lat, course.end.lng),
    map,
  });

  const iw1 = new kakao.maps.InfoWindow({
    content: `<div style="padding:4px 8px;font-size:12px;">출발: ${course.start.name}</div>`,
  });
  const iw2 = new kakao.maps.InfoWindow({
    content: `<div style="padding:4px 8px;font-size:12px;">도착: ${course.end.name}</div>`,
  });

  iw1.open(map, startMarker);
  iw2.open(map, endMarker);
}

function openKakaoRoutePage(course) {
  const { start, end } = course;
  const url =
    `https://map.kakao.com/?` +
    `sName=${encodeURIComponent(start.name)}&` +
    `eName=${encodeURIComponent(end.name)}&` +
    `sX=${start.lng}&sY=${start.lat}&` +
    `eX=${end.lng}&eY=${end.lat}`;

  window.open(url, "_blank");
}

function attachRouteClickToKakaoMap() {
  if (!routeLine || !selectedCourse) return;
  kakao.maps.event.addListener(routeLine, "click", () => {
    openKakaoRoutePage(selectedCourse);
  });
}

function drawFallbackLine(start, end) {
  if (!map) return;
  clearRoute();

  const path = [
    new kakao.maps.LatLng(start.lat, start.lng),
    new kakao.maps.LatLng(end.lat, end.lng),
  ];

  routeLine = new kakao.maps.Polyline({
    path,
    map,
    strokeWeight: 5,
    strokeOpacity: 0.9,
    strokeColor: "#ff7a00",
  });

  const bounds = new kakao.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.setBounds(bounds);

  attachRouteClickToKakaoMap();
}

// 카카오 모빌리티 자전거 길찾기
async function drawRouteKakao(start, end) {
  if (!window.fetch) {
    drawFallbackLine(start, end);
    return;
  }

  clearRoute();

  const url = "https://apis-navi.kakaomobility.com/v1/directions/bicycle";
  const params = new URLSearchParams({
    origin: `${start.lng},${start.lat}`,
    destination: `${end.lng},${end.lat}`,
  });

  const res = await fetch(`${url}?${params}`, {
    method: "GET",
    headers: {
      // 🔑 여기 Kakao REST 키 넣기 (KakaoAK {REST_KEY})
      Authorization: "KakaoAK YOUR_KAKAO_REST_API_KEY",
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    drawFallbackLine(start, end);
    return;
  }

  const data = await res.json();
  const roads = data?.routes?.[0]?.sections?.[0]?.roads;
  if (!roads || !roads.length) {
    drawFallbackLine(start, end);
    return;
  }

  const path = [];
  roads.forEach((road) => {
    const v = road.vertexes;
    for (let i = 0; i < v.length; i += 2) {
      const lng = v[i];
      const lat = v[i + 1];
      path.push(new kakao.maps.LatLng(lat, lng));
    }
  });

  routeLine = new kakao.maps.Polyline({
    path,
    map,
    strokeWeight: 5,
    strokeOpacity: 0.9,
    strokeColor: "#ff7a00",
  });

  const bounds = new kakao.maps.LatLngBounds();
  path.forEach((p) => bounds.extend(p));
  map.setBounds(bounds);

  attachRouteClickToKakaoMap();
}

// ===== GPS 추적 / 배지 =====
function stopTracking() {
  if (tracking.watchId != null) {
    navigator.geolocation.clearWatch(tracking.watchId);
  }
  tracking.watchId = null;
  tracking.isActive = false;
  tracking.courseId = null;
  tracking.path = [];
  tracking.traveledKm = 0;

  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.textContent =
      selectedCourse && hasBadge(selectedCourse.id)
        ? "다시 타기 (배지 완료)"
        : "추천 코스 시작하기";
  }
}

function startTracking() {
  if (!selectedCourse) {
    alert("먼저 추천 코스를 선택해 주세요.");
    return;
  }

  if (!navigator.geolocation) {
    alert("이 브라우저는 GPS를 지원하지 않아요.");
    return;
  }

  if (tracking.isActive) {
    stopTracking();
  }

  tracking.isActive = true;
  tracking.courseId = selectedCourse.id;
  tracking.path = [];
  tracking.traveledKm = 0;

  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.textContent = "진행 중… (눌러서 종료)";
  }

  const course = selectedCourse;
  const totalKm = kmFromHaversine(course.start, course.end);

  tracking.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const current = { lat: latitude, lng: longitude };

      const len = tracking.path.length;
      if (len > 0) {
        tracking.traveledKm += kmFromHaversine(
          tracking.path[len - 1],
          current
        );
      }
      tracking.path.push(current);

      const routeTimeElem = $("#routeTime");
      if (routeTimeElem && course) {
        const progressRatio = Math.min(1, tracking.traveledKm / totalKm);
        const percent = Math.round(progressRatio * 100);
        routeTimeElem.textContent = `${percent}% 진행`;
      }

      const distToEnd = kmFromHaversine(current, course.end);
      const enoughTravel = tracking.traveledKm > totalKm * 0.6;

      if (distToEnd < 0.2 && enoughTravel) {
        awardBadge(course);
        stopTracking();
      }
    },
    () => {
      alert("GPS 정보를 가져올 수 없어요. 위치 권한을 확인해주세요.");
      stopTracking();
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

// ===== 코스 선택 =====
async function selectCourse(course) {
  if (tracking.isActive && tracking.courseId !== course.id) {
    stopTracking();
  }

  ensureMap();

  const courseRegion =
    course.__region ||
    (COURSES.east.some((c) => c.id === course.id) ? "east" : "west");

  if (courseRegion !== region) setRegion(courseRegion, { silent: false });

  const speedKmh = Number($("#speed")?.value || 18);
  const km = kmFromHaversine(course.start, course.end);

  selectedCourse = course;
  setRouteCard(course, km, speedKmh);
  setMarkers(course);

  try {
    await drawRouteKakao(course.start, course.end);
  } catch (e) {
    drawFallbackLine(course.start, course.end);
  }
}

// ===== 기타 =====
function locateMe() {
  ensureMap();

  if (!navigator.geolocation) {
    alert("이 브라우저는 위치 정보를 지원하지 않아요.");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      if (meMarker) meMarker.setMap(null);

      meMarker = new kakao.maps.Marker({
        position: new kakao.maps.LatLng(latitude, longitude),
        map,
        zIndex: 999,
      });

      map.setCenter(new kakao.maps.LatLng(latitude, longitude));
      map.setLevel(6);
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
      if (page === "addr") window.location.href = "./map.html"; // ✅ 여기 수정
      if (page === "rank") window.location.href = "./rank.html";
      if (page === "my") window.location.href = "./my.html";
    });
  });
}

// ===== 초기화 함수 =====
function init() {
  // 배지 로드
  try {
    const raw = localStorage.getItem("courseBadges");
    if (raw) tracking.badges = JSON.parse(raw);
  } catch {
    tracking.badges = {};
  }

  // 초기 region = "east" (제주 동부)
  region = "east";
  document.querySelectorAll(".seg__btn").forEach((b) => {
    const active = b.dataset.region === region;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-selected", active ? "true" : "false");

    b.addEventListener("click", () => setRegion(b.dataset.region));
  });

  if ($("#q")) {
    $("#q").addEventListener("input", renderCards);
    $("#q").addEventListener("change", renderCards);
  }

  if ($("#speed")) {
    $("#speed").addEventListener("change", renderCards);
  }

  if ($("#btnLocate")) {
    $("#btnLocate").addEventListener("click", locateMe);
  }

  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (!tracking.isActive) {
        startTracking();
      } else if (confirm("현재 코스 진행을 종료할까요?")) {
        stopTracking();
      }
    });
  }

  const navBtn = $("#routeNavBtn");
  if (navBtn) {
    navBtn.addEventListener("click", () => {
      if (!selectedCourse) return;
      openKakaoRoutePage(selectedCourse);
    });
  }

  bindTabs();
  ensureMap();

  const speedKmh = Number($("#speed")?.value || 18);
  setRouteCard(null, 0, speedKmh);

  // ✅ 처음엔 제주 동부 코스 리스트 바로 렌더
  renderCards();
}

// DOM 이미 파싱된 상태에서 실행되니까 바로 init 호출
init();
