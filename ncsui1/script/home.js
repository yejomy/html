(() => {
  // 탭 active UI
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(t => {
    t.addEventListener("click", () => {
      tabs.forEach(x => x.classList.remove("is-active"));
      t.classList.add("is-active");
      // TODO: 페이지 이동 필요하면 여기서 location.href 처리
    });
  });

  // Hero 상단 탭(추천/내 목적지) UI만
  const heroTabs = document.querySelectorAll(".hero__tab");
  heroTabs.forEach(t => {
    t.addEventListener("click", () => {
      heroTabs.forEach(x => x.classList.remove("is-active"));
      t.classList.add("is-active");
    });
  });

  // Bottom sheet
const dim = document.getElementById("sheetDim");
const sheet = document.getElementById("sheet");
const closeBtn = document.getElementById("closeBtn");
const routeBtn = document.getElementById("routeBtn"); // ✅ 이거 반드시 있어야 함

const sheetTitle = document.getElementById("sheetTitle");
const sheetAddr = document.getElementById("sheetAddr");
const sheetImg = document.getElementById("sheetImg");

const bookmarkBtn = document.getElementById("bookmarkBtn");
const bookmarkIcon = document.getElementById("bookmarkIcon");
let bookmarked = false;

function openSheet({ title, addr, img }) {
  sheetTitle.textContent = title || "테마별 카테고리";
  sheetAddr.textContent = addr || "";
  if (img) sheetImg.src = img;

  dim.hidden = false;
  sheet.classList.add("is-open");
  sheet.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeSheet() {
  sheet.classList.remove("is-open");
  sheet.setAttribute("aria-hidden", "true");
  dim.hidden = true;
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-open-sheet='true']").forEach((el) => {
  el.addEventListener("click", () => {
    const clickedImg = el.querySelector("img");
    const src = clickedImg ? clickedImg.getAttribute("src") : "";

    openSheet({
      title: el.dataset.title,
      addr: el.dataset.addr,
      img: src
    });
  });
});

dim.addEventListener("click", closeSheet);
closeBtn.addEventListener("click", closeSheet);

// ✅ 길찾기: alert 제거하고 구글지도로만 이동
routeBtn.addEventListener("click", () => {
  const addr = (sheetAddr.textContent || "").trim();
  if (!addr) return;

  // 원하면 시트 닫고 이동
  // closeSheet();

  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}`;
  window.open(url, "_blank");
});

bookmarkBtn.addEventListener("click", () => {
  bookmarked = !bookmarked;
  bookmarkIcon.textContent = bookmarked ? "★" : "☆";
});

  // 카테고리 클릭(예시)
  document.querySelectorAll(".cat").forEach(btn => {
    btn.addEventListener("click", () => {
      // 필요하면 여기서 필터/이동 처리
      // console.log("category:", btn.dataset.cat);
    });
  });

  (() => {
  const liveList = document.getElementById("liveList");
  if (!liveList) return;

  // ✅ 더미 데이터 (나중에 API로 교체 가능)
  let data = [
    {
      name: "강원 평창 ○○캠핑장",
      loc: "강원 · 차로 1시간 40분",
      now: 7,          // 지금 예약 중(팀)
      left: 3,         // 잔여 자리
      status: "few",   // good | few | hot
      img: "./images/location1.png" // ✅ 일단 너가 가진 이미지로 연결 (원하면 교체)
    },
    {
      name: "충북 제천 △△숲 캠핑장",
      loc: "충북 · 차로 1시간 20분",
      now: 5,
      left: 8,
      status: "good",
      img: "./images/location2.png"
    },
    {
      name: "경남 남해 바다캠핑장",
      loc: "경남 · 차로 3시간 10분",
      now: 9,
      left: 1,
      status: "hot",
      img: "./images/location3.png"
    },
    {
      name: "경기 가평 계곡캠핑장",
      loc: "경기 · 차로 55분",
      now: 6,
      left: 2,
      status: "few",
      img: "./images/location4.png"
    }
  ];

  const statusText = {
    good: "여유",
    few: "잔여 소수",
    hot: "거의 마감"
  };

  function render() {
    liveList.innerHTML = data.map((it, idx) => {
      return `
        <article class="live-card" data-index="${idx}">
          <div class="live-thumb">
            <img src="${it.img}" alt="">
          </div>

          <div class="live-meta">
            <div class="live-name">${escapeHtml(it.name)}</div>
            <div class="live-loc">${escapeHtml(it.loc)}</div>

            <div class="live-row">
              <div class="live-count">
                지금 <strong>${it.now}</strong>팀 예약 중 · 잔여 <strong>${it.left}</strong>자리
              </div>

              <div class="live-status live-status--${it.status}">
                <span class="dot" aria-hidden="true"></span>
                <span>${statusText[it.status] || ""}</span>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  // 간단한 “실시간 느낌” 업데이트 (더미)
  // 4초마다 랜덤으로 now/left 약간 변동
  function tick() {
    const i = Math.floor(Math.random() * data.length);
    const item = data[i];

    // now +0~1
    item.now = Math.max(0, item.now + (Math.random() > 0.55 ? 1 : 0));

    // left -0~1 (가끔 감소)
    if (Math.random() > 0.65) item.left = Math.max(0, item.left - 1);

    // 상태 자동 갱신
    if (item.left <= 1) item.status = "hot";
    else if (item.left <= 3) item.status = "few";
    else item.status = "good";

    render();
  }

  // 카드 클릭 시: (원하면 너 바텀시트 openSheet에 연결 가능)
  liveList.addEventListener("click", (e) => {
    const card = e.target.closest(".live-card");
    if (!card) return;

    const idx = Number(card.dataset.index);
    const item = data[idx];

    // ✅ 여기서 바텀시트로 연결하고 싶으면 이렇게:
    // openSheet({ title: item.name, addr: item.loc, img: item.img });

    alert(`${item.name}\n${item.loc}\n지금 ${item.now}팀 예약 중 / 잔여 ${item.left}자리`);
  });

  function escapeHtml(str){
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  render();
  setInterval(tick, 4000);
})();

})();
