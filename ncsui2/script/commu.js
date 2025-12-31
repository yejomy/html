window.addEventListener("DOMContentLoaded", () => {
  // ===== 만들기 버튼 =====
  const btnCreate = document.getElementById("btnCreate");
  btnCreate?.addEventListener("click", () => {
    alert("만들기(업로드) 화면은 다음 단계에서 연결해줄게 😎");
  });

  // ===== 탭 이동 =====
  document.querySelectorAll(".tabbar .tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page === "home") window.location.href = "./home.html";
      if (page === "commu") window.location.href = "./commu.html";
    });
  });

  // ===== ✅ 좋아요 버튼 토글 + 카운트 =====
  document
    .querySelectorAll('.stat[aria-label="좋아요"]')
    .forEach((likeBtn) => {
      likeBtn.addEventListener("click", (e) => {
        e.preventDefault();

        const countEl = likeBtn.querySelector("span");
        if (!countEl) return;

        const current =
          Number(String(countEl.textContent).replace(/,/g, "")) || 0;

        const isLiked = likeBtn.classList.toggle("is-liked");

        const next = isLiked
          ? current + 1
          : Math.max(0, current - 1);

        countEl.textContent = next.toLocaleString("ko-KR");

        // 접근성 (선택)
        likeBtn.setAttribute(
          "aria-pressed",
          isLiked ? "true" : "false"
        );
      });
    });
});
