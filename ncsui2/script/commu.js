window.addEventListener("DOMContentLoaded", () => {
  // 만들기 버튼 (원하면 create.html로 연결)
  const btnCreate = document.getElementById("btnCreate");
  btnCreate?.addEventListener("click", () => {
    // 예: window.location.href = "./create.html";
    alert("만들기(업로드) 화면은 다음 단계에서 연결해줄게 😎");
  });

  // 탭 이동
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page === "home") window.location.href = "./home.html";
      if (page === "commu") window.location.href = "./commu.html";

      // 나머지는 파일 생기면 연결
      // if (page === "juice") window.location.href = "./juice.html";
      // if (page === "rank") window.location.href = "./rank.html";
      // if (page === "my") window.location.href = "./my.html";
    });
  });
});
