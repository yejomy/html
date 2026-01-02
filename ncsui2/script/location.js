// 검색 키워드 (입력 시 자동완성/검색용)
const SEARCH_KEYS = ["애월", "남원", "성산"];

// ====== 코스 데이터 + 평점/후기 + 육지 경로(path) ======
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
      path: [
        { lat: 33.4588, lng: 126.9423 },
        { lat: 33.4525, lng: 126.9360 },
        { lat: 33.4440, lng: 126.9320 },
        { lat: 33.4350, lng: 126.9295 },
        { lat: 33.4280, lng: 126.9280 },
        { lat: 33.4241, lng: 126.9270 },
      ],
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
      path: [
        { lat: 33.5569, lng: 126.7959 },
        { lat: 33.5575, lng: 126.7870 },
        { lat: 33.5578, lng: 126.7785 },
        { lat: 33.5579, lng: 126.7690 },
        { lat: 33.5577, lng: 126.7592 },
      ],
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
      path: [
        { lat: 33.3266, lng: 126.8327 },
        { lat: 33.3180, lng: 126.8200 },
        { lat: 33.3100, lng: 126.8050 },
        { lat: 33.2990, lng: 126.7850 },
        { lat: 33.2890, lng: 126.7550 },
        { lat: 33.2803, lng: 126.7198 },
      ],
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
      path: [
        { lat: 33.4091, lng: 126.2580 },
        { lat: 33.4190, lng: 126.2670 },
        { lat: 33.4330, lng: 126.2780 },
        { lat: 33.4460, lng: 126.2910 },
        { lat: 33.4550, lng: 126.3020 },
        { lat: 33.4629, lng: 126.3111 },
      ],
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
      path: [
        { lat: 33.3943, lng: 126.2397 },
        { lat: 33.3935, lng: 126.2350 },
        { lat: 33.3925, lng: 126.2310 },
        { lat: 33.3915, lng: 126.2285 },
        { lat: 33.3906, lng: 126.2276 },
      ],
    },
  ],
};

// 나만의 코스 (자동/수동) 저장용
let customCourses = [];

// 현재 리스트/뱃지가 보고 있는 지역 ("east" | "west")
let region = "east";

// 카카오 지도 관련 전역
let map;
let routeLine;
let startMarker;
let endMarker;
let meMarker;

let selectedCourse = null;

// 코스 진행 / 배지 / 자유라이딩 상태
let tracking = {
  isActive: false,
  mode: null, // "course" | "free" | null
  courseId: null,
  watchId: null,
  path: [],
  traveledKm: 0,
  badges: {}, // { [courseId]: true }
  totalKm: 0,
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
  } catch (e) {}
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

// 커스텀 코스 로드/저장
function loadCustomCourses() {
  try {
    const raw = localStorage.getItem("myCustomCoursesV1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
function saveCustomCourses() {
  try {
    localStorage.setItem("myCustomCoursesV1", JSON.stringify(customCourses));
  } catch {}
}

// ===== 경로 관련 유틸 =====
function getCoursePathPoints(course) {
  if (Array.isArray(course.path) && course.path.length >= 2) return course.path;
  return [course.start, course.end];
}

function getCourseDistanceKm(course) {
  const pts = getCoursePathPoints(course);
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += kmFromHaversine(pts[i - 1], pts[i]);
  }
  return d;
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

  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.disabled = !course;
    startBtn.textContent = course
      ? hasBadge(course.id)
        ? "다시 타기 (배지 완료)"
        : "추천 코스 시작하기"
      : "추천 코스 시작하기";
  }

  const shareBtn = $("#shareCourseBtn");
  if (shareBtn) shareBtn.disabled = !course;
}

function allCoursesWithRegion() {
  const builtIn = [
    ...COURSES.east.map((c) => ({ ...c, __region: "east", _builtin: true })),
    ...COURSES.west.map((c) => ({ ...c, __region: "west", _builtin: true })),
  ];
  const mine = customCourses.map((c) => ({ ...c }));
  return [...mine, ...builtIn];
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

// 추천 코스 리스트 렌더링 (커스텀 + 기본)
function renderCards() {
  const qRaw = ($("#q") && $("#q").value) || "";
  const key = findKeyFromQuery(qRaw);

  let items = [];
  let note = "";
  const qq = norm(qRaw);

  if (key) {
    const kk = norm(key);
    items = allCoursesWithRegion().filter((c) => {
      const blob = norm(
        `${c.title} ${c.desc} ${c.tags.join(" ")} ${c.start.name} ${c.end.name}`
      );
      return blob.includes(kk);
    });

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
    if (qq && !SEARCH_KEYS.some((k) => norm(k) === qq)) {
      note = " · 검색은 (애월/남원/성산)만 지원";
    }
    const mine = customCourses
      .filter((c) => c.__region === region)
      .map((c) => ({ ...c }));
    const base = COURSES[region].map((c) => ({ ...c, __region: region }));
    items = [...mine, ...base];
  }

  const countLabel = $("#countLabel");
  if (countLabel) countLabel.textContent = `${items.length}개${note}`;

  const wrap = $("#cards");
  if (!wrap) return;
  wrap.innerHTML = "";

  items.forEach((c) => {
    const km = getCourseDistanceKm(c);
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
              c.isCustom
                ? '<span style="margin-left:4px;font-size:10px;color:#ff7a00;">MY</span>'
                : ""
            }
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

// 우리가 정의한 path 기준으로 육지 폴리라인 그리기
function drawCourseRoute(course) {
  if (!map) return;

  clearRoute();

  const pts = getCoursePathPoints(course);
  const path = pts.map((p) => new kakao.maps.LatLng(p.lat, p.lng));

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
}

// ===== GPS 추적 / 배지 / 자유라이딩 =====
function stopTracking(options = {}) {
  const { skipSaveFreeRide = false } = options;
  const wasFree = tracking.mode === "free";
  const freePathCopy = wasFree ? [...tracking.path] : null;

  if (tracking.watchId != null) {
    navigator.geolocation.clearWatch(tracking.watchId);
  }

  tracking.watchId = null;
  tracking.isActive = false;
  tracking.courseId = null;
  tracking.path = [];
  tracking.traveledKm = 0;
  tracking.totalKm = 0;
  tracking.mode = null;

  // 버튼/카드 텍스트 복구
  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.textContent =
      selectedCourse && hasBadge(selectedCourse?.id)
        ? "다시 타기 (배지 완료)"
        : "추천 코스 시작하기";
  }

  const freeBtn = $("#freeRideBtn");
  if (freeBtn) {
    freeBtn.textContent = "자유 라이딩 시작하기 (자동 기록)";
  }

  const speedKmh = Number($("#speed")?.value || 18);
  if (selectedCourse) {
    const km = getCourseDistanceKm(selectedCourse);
    setRouteCard(selectedCourse, km, speedKmh);
  } else {
    setRouteCard(null, 0, speedKmh);
  }

  // 자유 라이딩이면 저장 오버레이 열기
  if (wasFree && !skipSaveFreeRide && freePathCopy && freePathCopy.length >= 2) {
    openFreeRideSaveOverlay(freePathCopy);
  }
}

// 추천 코스 따라가기
function startCourseTracking() {
  if (!selectedCourse) {
    alert("먼저 추천 코스를 선택해 주세요.");
    return;
  }
  if (!navigator.geolocation) {
    alert("이 브라우저는 GPS를 지원하지 않아요.");
    return;
  }

  if (tracking.isActive) {
    stopTracking({ skipSaveFreeRide: true });
  }

  tracking.isActive = true;
  tracking.mode = "course";
  tracking.courseId = selectedCourse.id;
  tracking.path = [];
  tracking.traveledKm = 0;
  tracking.totalKm = getCourseDistanceKm(selectedCourse);

  const startBtn = $("#routeStartBtn");
  if (startBtn) startBtn.textContent = "진행 중… (눌러서 종료)";

  tracking.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const current = { lat: latitude, lng: longitude };

      const len = tracking.path.length;
      if (len > 0) {
        tracking.traveledKm += kmFromHaversine(tracking.path[len - 1], current);
      }
      tracking.path.push(current);

      const routeTimeElem = $("#routeTime");
      if (routeTimeElem && selectedCourse && tracking.totalKm > 0) {
        const progressRatio = Math.min(1, tracking.traveledKm / tracking.totalKm);
        const percent = Math.round(progressRatio * 100);
        routeTimeElem.textContent = `${percent}% 진행`;
      }

      const distToEnd = kmFromHaversine(current, selectedCourse.end);
      const enoughTravel = tracking.traveledKm > tracking.totalKm * 0.6;

      if (distToEnd < 0.2 && enoughTravel) {
        awardBadge(selectedCourse);
        stopTracking({ skipSaveFreeRide: true });
      }
    },
    () => {
      alert("GPS 정보를 가져올 수 없어요. 위치 권한을 확인해주세요.");
      stopTracking({ skipSaveFreeRide: true });
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

// 자유 라이딩 모드 (코스 없이 자동 기록)
function startFreeRide() {
  if (!navigator.geolocation) {
    alert("이 브라우저는 GPS를 지원하지 않아요.");
    return;
  }

  if (tracking.isActive && tracking.mode === "free") {
    // 현재 자유 라이딩 중 → 종료 & 저장
    stopTracking({ skipSaveFreeRide: false });
    return;
  }

  if (tracking.isActive && tracking.mode === "course") {
    if (!confirm("현재 추천 코스 진행을 종료하고 자유 라이딩을 시작할까요?")) {
      return;
    }
    stopTracking({ skipSaveFreeRide: true });
  }

  tracking.isActive = true;
  tracking.mode = "free";
  tracking.courseId = null;
  tracking.path = [];
  tracking.traveledKm = 0;
  tracking.totalKm = 0;

  const freeBtn = $("#freeRideBtn");
  if (freeBtn) {
    freeBtn.textContent = "자유 라이딩 종료 및 저장";
  }

  $("#routeTitle").textContent = "자유 라이딩 중";
  $("#routeKm").textContent = "0km";
  $("#routeTime").textContent = "-";
  $("#routeLevel").textContent = "커스텀";
  $("#routeHint").textContent = "주행 종료 시, 자동으로 나만의 코스로 저장할 수 있어요.";

  tracking.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      const current = { lat: latitude, lng: longitude };

      const len = tracking.path.length;
      if (len > 0) {
        tracking.traveledKm += kmFromHaversine(tracking.path[len - 1], current);
      }
      tracking.path.push(current);

      const kmVal = tracking.traveledKm.toFixed(1);
      const kmElem = $("#routeKm");
      if (kmElem) kmElem.textContent = `${kmVal}km`;

      const speedKmh = Number($("#speed")?.value || 18);
      const timeElem = $("#routeTime");
      if (timeElem) timeElem.textContent = formatTime(tracking.traveledKm / speedKmh);
    },
    () => {
      alert("GPS 정보를 가져올 수 없어요. 위치 권한을 확인해주세요.");
      stopTracking({ skipSaveFreeRide: true });
    },
    { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
  );
}

// 자유 라이딩 저장 오버레이
function openFreeRideSaveOverlay(path) {
  let overlay = document.getElementById("freeRideOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "freeRideOverlay";
    overlay.className = "mycourse-overlay";
    overlay.innerHTML = `
      <div class="mycourse-panel">
        <div class="mycourse-panel__header">
          <div class="mycourse-title">자유 라이딩 코스 저장</div>
          <button class="mycourse-close" type="button" id="freeRideCloseBtn">×</button>
        </div>
        <div class="mycourse-hint">
          방금 달린 루트를 나만의 코스로 저장해서 다음에 다시 탈 수 있어요.
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">지역</div>
          <select class="mycourse-select" id="freeRideRegion">
            <option value="east">제주 동부</option>
            <option value="west">제주 서부</option>
          </select>
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">코스 이름</div>
          <input class="mycourse-input" id="freeRideTitle" placeholder="예) 000님의 라이딩 코스" />
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">간단 설명</div>
          <textarea class="mycourse-textarea" id="freeRideDesc" placeholder="어떤 느낌의 라이딩이었는지 적어주세요."></textarea>
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">총 거리</div>
          <div class="mycourse-distance" id="freeRideDistance">0km</div>
        </div>

        <div class="mycourse-actions">
          <button class="mycourse-reset" type="button" id="freeRideCancelBtn">취소</button>
          <button class="mycourse-save" type="button" id="freeRideSaveBtn">코스 저장</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  // 거리 계산
  let d = 0;
  for (let i = 1; i < path.length; i++) {
    d += kmFromHaversine(path[i - 1], path[i]);
  }
  const distEl = $("#freeRideDistance");
  if (distEl) distEl.textContent = `${d.toFixed(1)}km`;

  const regionSel = $("#freeRideRegion");
  if (regionSel) regionSel.value = region;

  const titleInput = $("#freeRideTitle");
  const descInput = $("#freeRideDesc");
  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";

  overlay.style.display = "flex";

  const closeOverlay = () => {
    overlay.style.display = "none";
  };

  const closeBtn = $("#freeRideCloseBtn");
  const cancelBtn = $("#freeRideCancelBtn");
  if (closeBtn) closeBtn.onclick = closeOverlay;
  if (cancelBtn) cancelBtn.onclick = closeOverlay;

  const saveBtn = $("#freeRideSaveBtn");
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (path.length < 2) {
        alert("기록된 경로가 부족합니다.");
        return;
      }

      const regionVal = (regionSel && regionSel.value) || "east";
      const title =
        (titleInput && titleInput.value.trim()) || "나의 라이딩 코스";
      const desc =
        (descInput && descInput.value.trim()) ||
        "자유 라이딩으로 생성된 코스입니다.";

      const start = path[0];
      const end = path[path.length - 1];

      const newCourse = {
        id: "free_" + Date.now(),
        title,
        desc,
        level: "커스텀",
        tags: ["마이코스", "라이딩기록"],
        image: null,
        start: { name: "시작 지점", lat: start.lat, lng: start.lng },
        end: { name: "도착 지점", lat: end.lat, lng: end.lng },
        rating: 0,
        review: "",
        path: [...path],
        __region: regionVal,
        isCustom: true,
        isFreeRide: true,
      };

      customCourses.push(newCourse);
      saveCustomCourses();

      overlay.style.display = "none";

      setRegion(regionVal);
      renderCards();
      selectCourse(newCourse);

      alert("나만의 코스로 저장되었습니다! 🎉\n커뮤니티에서 이 코스를 공유해보세요.");
    };
  }
}

// ===== 수동 "나만의 코스 만들기" (지도 클릭 버전) =====
let myCourseEditing = false;
let myCoursePath = [];
let myCourseMarkers = [];
let myCourseLine = null;
let myCourseMapClickHandler = null;

function stopMyCourseEditing() {
  myCourseEditing = false;
  myCoursePath = [];

  if (myCourseLine) {
    myCourseLine.setMap(null);
    myCourseLine = null;
  }
  myCourseMarkers.forEach((m) => m.setMap(null));
  myCourseMarkers = [];

  if (map && myCourseMapClickHandler) {
    kakao.maps.event.removeListener(map, "click", myCourseMapClickHandler);
    myCourseMapClickHandler = null;
  }

  const distEl = $("#myCourseDistance");
  if (distEl) distEl.textContent = "0km";
}

function updateMyCourseDistance() {
  const distEl = $("#myCourseDistance");
  if (!distEl) return;

  if (myCoursePath.length < 2) {
    distEl.textContent = "0km";
    return;
  }
  let d = 0;
  for (let i = 1; i < myCoursePath.length; i++) {
    d += kmFromHaversine(myCoursePath[i - 1], myCoursePath[i]);
  }
  distEl.textContent = d.toFixed(1) + "km";
}

function drawMyCourseTempLine() {
  if (!map) return;
  if (myCourseLine) myCourseLine.setMap(null);
  if (myCoursePath.length < 2) return;

  const path = myCoursePath.map(
    (p) => new kakao.maps.LatLng(p.lat, p.lng)
  );

  myCourseLine = new kakao.maps.Polyline({
    path,
    map,
    strokeWeight: 4,
    strokeOpacity: 0.7,
    strokeColor: "#ff7a00",
    strokeStyle: "shortdash",
  });
}

function openMyCourseOverlay() {
  ensureMap();

  let overlay = document.getElementById("myCourseOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "myCourseOverlay";
    overlay.className = "mycourse-overlay";
    overlay.innerHTML = `
      <div class="mycourse-panel">
        <div class="mycourse-panel__header">
          <div class="mycourse-title">나만의 코스 만들기</div>
          <button class="mycourse-close" type="button" id="myCourseCloseBtn">×</button>
        </div>
        <div class="mycourse-hint">
          지도 위를 탭해서 경로를 찍어 주세요. (최소 2개 이상)
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">지역</div>
          <select class="mycourse-select" id="myCourseRegion">
            <option value="east">제주 동부</option>
            <option value="west">제주 서부</option>
          </select>
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">코스 이름</div>
          <input class="mycourse-input" id="myCourseTitle" placeholder="예) 나만의 섭지코지 뷰 코스" />
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">간단 설명</div>
          <textarea class="mycourse-textarea" id="myCourseDesc" placeholder="어떤 느낌의 코스인지 적어주세요."></textarea>
        </div>

        <div class="mycourse-field">
          <div class="mycourse-label">예상 거리</div>
          <div class="mycourse-distance" id="myCourseDistance">0km</div>
        </div>

        <div class="mycourse-actions">
          <button class="mycourse-reset" type="button" id="myCourseResetBtn">경로 초기화</button>
          <button class="mycourse-save" type="button" id="myCourseSaveBtn">코스 저장</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  overlay.style.display = "flex";
  myCourseEditing = true;
  myCoursePath = [];
  myCourseMarkers = [];
  updateMyCourseDistance();

  const regSel = $("#myCourseRegion");
  if (regSel) regSel.value = region;
  const titleInput = $("#myCourseTitle");
  const descInput = $("#myCourseDesc");
  if (titleInput) titleInput.value = "";
  if (descInput) descInput.value = "";

  if (map && !myCourseMapClickHandler) {
    myCourseMapClickHandler = function (mouseEvent) {
      if (!myCourseEditing) return;
      const latlng = mouseEvent.latLng;
      const p = { lat: latlng.getLat(), lng: latlng.getLng() };
      myCoursePath.push(p);

      const mk = new kakao.maps.Marker({
        position: latlng,
        map,
        zIndex: 500,
      });
      myCourseMarkers.push(mk);

      drawMyCourseTempLine();
      updateMyCourseDistance();
    };
    kakao.maps.event.addListener(map, "click", myCourseMapClickHandler);
  }

  const closeBtn = $("#myCourseCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.style.display = "none";
      stopMyCourseEditing();
    };
  }

  const resetBtn = $("#myCourseResetBtn");
  if (resetBtn) {
    resetBtn.onclick = () => {
      stopMyCourseEditing();
      myCourseEditing = true;
      updateMyCourseDistance();
    };
  }

  const saveBtn = $("#myCourseSaveBtn");
  if (saveBtn) {
    saveBtn.onclick = () => {
      if (myCoursePath.length < 2) {
        alert("최소 2개 이상 포인트를 찍어주세요.");
        return;
      }
      const regionVal =
        (regSel && regSel.value) || "east";
      const title =
        (titleInput && titleInput.value.trim()) || "나만의 코스";
      const desc =
        (descInput && descInput.value.trim()) || "직접 만든 코스";

      const start = myCoursePath[0];
      const end = myCoursePath[myCoursePath.length - 1];

      const newCourse = {
        id: "c_" + Date.now(),
        title,
        desc,
        level: "커스텀",
        tags: ["마이코스"],
        image: null,
        start: { name: "시작 지점", lat: start.lat, lng: start.lng },
        end: { name: "도착 지점", lat: end.lat, lng: end.lng },
        rating: 0,
        review: "",
        path: [...myCoursePath],
        __region: regionVal,
        isCustom: true,
      };

      customCourses.push(newCourse);
      saveCustomCourses();

      overlay.style.display = "none";
      stopMyCourseEditing();

      setRegion(regionVal);
      renderCards();
      selectCourse(newCourse);
    };
  }
}

// ===== 코스 선택 =====
async function selectCourse(course) {
  if (tracking.isActive && tracking.mode === "course" && tracking.courseId !== course.id) {
    stopTracking({ skipSaveFreeRide: true });
  }

  ensureMap();

  const courseRegion =
    course.__region ||
    (COURSES.east.some((c) => c.id === course.id) ? "east" : "west");

  if (courseRegion !== region) setRegion(courseRegion, { silent: false });

  selectedCourse = course;

  const speedKmh = Number($("#speed")?.value || 18);
  const km = getCourseDistanceKm(course);

  setRouteCard(course, km, speedKmh);
  setMarkers(course);
  drawCourseRoute(course);
}

// ===== 공유 기능 =====
function shareCourse(course) {
  if (!course) return;
  const km = getCourseDistanceKm(course);
  const speedKmh = Number($("#speed")?.value || 18);
  const text =
    `[코스 공유]\n` +
    `${course.title}\n` +
    `거리: ${km.toFixed(1)}km · 예상시간: ${formatTime(km / speedKmh)}\n` +
    `태그: ${course.tags.map((t) => "#" + t).join(" ")}\n` +
    `설명: ${course.desc}`;

  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("코스 정보가 복사되었습니다!\n커뮤니티 글쓰기에서 붙여넣기 하면 돼요.");
      })
      .catch(() => {
        prompt("아래 내용을 복사해 주세요.", text);
      });
  } else {
    prompt("아래 내용을 복사해 주세요.", text);
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
      if (page === "addr") window.location.href = "./location.html";
      if (page === "rank") window.location.href = "./rank.html";
      if (page === "my") window.location.href = "./my.html";
    });
  });
}

// ===== 초기화 =====
window.addEventListener("DOMContentLoaded", () => {
  // 배지 / 커스텀 코스 로드
  try {
    const raw = localStorage.getItem("courseBadges");
    if (raw) tracking.badges = JSON.parse(raw);
  } catch {
    tracking.badges = {};
  }
  customCourses = loadCustomCourses();

  // 초기 region = 동부
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
    $("#speed").addEventListener("change", () => {
      renderCards();
      // 선택된 코스 정보도 속도 기준으로 다시 표시
      if (selectedCourse) {
        const speedKmh = Number($("#speed")?.value || 18);
        const km = getCourseDistanceKm(selectedCourse);
        setRouteCard(selectedCourse, km, speedKmh);
      }
    });
  }

  if ($("#btnLocate")) {
    $("#btnLocate").addEventListener("click", locateMe);
  }

  const startBtn = $("#routeStartBtn");
  if (startBtn) {
    startBtn.addEventListener("click", () => {
      if (!tracking.isActive || tracking.mode !== "course") {
        startCourseTracking();
      } else {
        if (confirm("현재 코스 진행을 종료할까요?")) {
          stopTracking({ skipSaveFreeRide: true });
        }
      }
    });
  }

  const freeBtn = $("#freeRideBtn");
  if (freeBtn) {
    freeBtn.addEventListener("click", () => {
      startFreeRide();
    });
  }

  const shareBtn = $("#shareCourseBtn");
  if (shareBtn) {
    shareBtn.addEventListener("click", () => {
      if (!selectedCourse) return;
      shareCourse(selectedCourse);
    });
  }

  const myCourseBtn = $("#btnMyCourse");
  if (myCourseBtn) {
    myCourseBtn.addEventListener("click", openMyCourseOverlay);
  }

  bindTabs();
  ensureMap();

  const speedKmh = Number($("#speed")?.value || 18);
  setRouteCard(null, 0, speedKmh);

  // 처음엔 제주 동부 코스 리스트
  renderCards();
});