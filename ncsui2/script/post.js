window.addEventListener("DOMContentLoaded", () => {
  // ===== 뒤로가기 =====
 document.getElementById("btnBack")?.addEventListener("click", () => {
  window.location.href = "./commu.html";
});
  // ===== commu에서 넘긴 값(쿼리스트링) 적용 =====
  const params = new URLSearchParams(location.search);
  const name = params.get("name");
  const lv = params.get("lv");
  const time = params.get("time");
  const img = params.get("img");

  if (name) document.getElementById("authorName").textContent = name;
  if (lv) document.getElementById("authorLevel").textContent = `Lv.${lv}`;
  if (time) document.getElementById("postTime").textContent = time;
  if (img) document.getElementById("postImage").src = img;

  // ===== 좋아요 토글 =====
  const likeBtn = document.getElementById("btnLike");
  const likeCountEl = document.getElementById("likeCount");
  let liked = false;
  let likeCount = parseInt((likeCountEl.textContent || "0").replace(/,/g, ""), 10) || 0;

  likeBtn?.addEventListener("click", () => {
    liked = !liked;
    likeCount += liked ? 1 : -1;
    likeCountEl.textContent = likeCount.toLocaleString();

    likeBtn.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.12)" }, { transform: "scale(1)" }],
      { duration: 220, easing: "ease-out" }
    );
  });

  // ===== 댓글 데이터(초기 18개) =====
  const seedComments = [
    { name: "한예리", when: "2분 전", avatar: "./images/profile2.jpg", text: "와… 물색 미쳤다. 어디 구간이야??" },
    { name: "이도윤", when: "3분 전", avatar: "./images/profile3.jpg", text: "여기 진짜 바람 좋을 때 달리면 최고지 🔥" },
    { name: "박서준", when: "5분 전", avatar: "./images/profile4.jpg", text: "사진 구도 완전 깔끔.. 저장!" },
    { name: "정유진", when: "6분 전", avatar: "./images/profile5.jpg", text: "이번 주말에 저 코스로 가볼래 ㅋㅋ" },
    { name: "김하늘", when: "7분 전", avatar: "./images/profile6.jpg", text: "해안도로는 역시…🌊" },
    { name: "민지", when: "9분 전", avatar: "./images/profile7.jpg", text: "혹시 난이도 어때? 초보도 가능?" },
    { name: "도현", when: "11분 전", avatar: "./images/profile8.jpg", text: "중간에 편의점/카페 들를만한 곳 있음?" },
    { name: "서연", when: "13분 전", avatar: "./images/profile9.jpg", text: "날씨 맑을 때 또 올려줘요!" },
    { name: "지훈", when: "15분 전", avatar: "./images/profile10.jpg", text: "여기서 일몰 보면 진짜 예쁜데…🌅" },
    { name: "유나", when: "18분 전", avatar: "./images/profile2.jpg", text: "사진만 봐도 시원하다 ㅠㅠ" },
    { name: "현우", when: "21분 전", avatar: "./images/profile3.jpg", text: "라이딩 후 먹는 고기국수 국룰" },
    { name: "은지", when: "25분 전", avatar: "./images/profile4.jpg", text: "바다색 너무 예뻐… 필터 뭐야?" },
    { name: "수민", when: "32분 전", avatar: "./images/profile5.jpg", text: "자전거 어디서 대여했어?" },
    { name: "태민", when: "40분 전", avatar: "./images/profile6.jpg", text: "바람 세면 역풍 장난아님 ㅋㅋ" },
    { name: "나연", when: "1시간 전", avatar: "./images/profile7.jpg", text: "코스 이름 알려주면 저장해둘게!" },
    { name: "준호", when: "1시간 전", avatar: "./images/profile8.jpg", text: "이런 코스 공유 너무 좋다 👍" },
    { name: "소희", when: "2시간 전", avatar: "./images/profile9.jpg", text: "다음엔 감귤밭 코스도 부탁!" },
    { name: "지수", when: "어제", avatar: "./images/profile10.jpg", text: "이 구간 진짜 인생샷 나와요 ㅎㅎ" },
  ];

  const list = document.getElementById("commentList");
  const commentCountEl = document.getElementById("commentCount");
  const commentCountTopEl = document.getElementById("commentCountTop");

  const setCommentCount = (n) => {
    commentCountEl.textContent = n.toLocaleString();
    commentCountTopEl.textContent = n.toLocaleString();
  };

  const renderComment = (c) => {
    const li = document.createElement("li");
    li.className = "comment";
    li.innerHTML = `
      <span class="comment__avatar"><img src="${c.avatar}" alt=""></span>
      <div class="comment__bubble">
        <div class="comment__row">
          <div class="comment__name"></div>
          <div class="comment__when"></div>
        </div>
        <div class="comment__text"></div>
      </div>
    `;
    li.querySelector(".comment__name").textContent = c.name;
    li.querySelector(".comment__when").textContent = c.when;
    li.querySelector(".comment__text").textContent = c.text;
    return li;
  };

  // 초기 렌더
  list.innerHTML = "";
  seedComments.forEach((c) => list.appendChild(renderComment(c)));
  setCommentCount(seedComments.length);

  // ===== 댓글 입력 =====
  const form = document.getElementById("commentForm");
  const input = document.getElementById("commentInput");

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = (input.value || "").trim();
    if (!text) return;

    const myComment = {
      name: "나",
      when: "방금",
      avatar: "./images/profile.jpg",
      text
    };

    list.prepend(renderComment(myComment));
    setCommentCount(parseInt(commentCountEl.textContent.replace(/,/g, ""), 10) + 1);

    input.value = "";
    input.focus();
  });

  // ===== 탭 이동 =====
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      if (page === "home") window.location.href = "./home.html";
      if (page === "commu") window.location.href = "./commu.html";
      if (page === "addr") window.location.href = "./location.html";
    });
  });
});
