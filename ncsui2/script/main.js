window.addEventListener("DOMContentLoaded", () => {
  const fill = document.querySelector(".loading-fill");

  // 반짝반짝 왔다갔다
  let on = false;
  const sparkle = setInterval(() => {
    on = !on;
    fill.classList.toggle("is-on", on);
  }, 700); // 반짝 속도 (ms)

  // 5초 후 화면 전환 (기존 로직 유지)
  setTimeout(() => {
    clearInterval(sparkle);
    document.body.classList.add("is-done");

    setTimeout(() => {
      window.location.href = "./splash.html";
    }, 300);
  }, 5000);
});
