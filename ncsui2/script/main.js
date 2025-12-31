window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    document.body.classList.add("is-done");

    // 살짝 여유 주고 화면 전환
    setTimeout(() => {
      window.location.href = "./splash.html";
    }, 300);
  }, 5000);
});
