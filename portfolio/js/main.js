const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];

const header = $('#header');

function headerOffset() {
  return (header?.offsetHeight || 0) + 14;
}

function scrollToSection(selector) {
  const el = document.querySelector(selector);
  if (!el) return;

  if (selector === '#main') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  const top = el.getBoundingClientRect().top + window.pageYOffset - headerOffset();
  window.scrollTo({ top, behavior: 'smooth' });
}

/* dot nav click */
$$('.dotnav .dot').forEach((btn) => {
  btn.addEventListener('click', () => scrollToSection(btn.dataset.target));
});

/* top nav click */
$$('.gnb a').forEach((a) => {
  a.addEventListener('click', (e) => {
    const href = a.getAttribute('href');
    if (href && href.startsWith('#')) {
      e.preventDefault();
      scrollToSection(href);
    }
  });
});

/* About -> Contact shortcut */
$('#aboutGoContact')?.addEventListener('click', () => {
  const card = $('#contactCard');
  if (card) {
    const top = card.getBoundingClientRect().top + window.pageYOffset - headerOffset() - 120;
    window.scrollTo({ top, behavior: 'smooth' });
  } else {
    scrollToSection('#contact');
  }
});

/* scroll spy */
const sectionIds = ['main', 'about', 'coding', 'design', 'contact'];
const sections = sectionIds.map(id => document.getElementById(id)).filter(Boolean);
const navLinks = $$('.gnb a');
const dots = $$('.dotnav .dot');

function setActive(id) {
  navLinks.forEach(a => a.classList.toggle('is-active', a.dataset.link === id));
  dots.forEach(d => d.classList.toggle('is-active', d.dataset.target === `#${id}`));
}

function setThemeBySection(sec) {
  const theme = sec?.dataset?.theme || 'light';
  document.body.classList.toggle('theme-dark', theme === 'dark');
}

function getCurrentSectionId() {
  const y = window.scrollY + headerOffset() + 1;

  if (window.scrollY < 10) return 'main';

  const nearBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (nearBottom) return 'contact';

  for (const sec of sections) {
    const top = sec.offsetTop;
    const bottom = top + sec.offsetHeight;
    if (y >= top && y < bottom) return sec.id;
  }
  return sections[sections.length - 1]?.id || 'main';
}

let ticking = false;
function onScrollSpy() {
  if (ticking) return;
  ticking = true;

  window.requestAnimationFrame(() => {
    const id = getCurrentSectionId();
    const sec = document.getElementById(id);
    setActive(id);
    setThemeBySection(sec);
    ticking = false;
  });
}

window.addEventListener('scroll', onScrollSpy, { passive: true });
window.addEventListener('resize', onScrollSpy);
window.addEventListener('load', onScrollSpy);

/* gallery modal */
const modal = $('#modal');
const modalBackdrop = $('#modalBackdrop');
const closeBtn = $('#closeBtn');
const prevBtn = $('#prevBtn');
const nextBtn = $('#nextBtn');
const modalImg = $('#modalImg');
const modalTitle = $('#modalTitle');
const modalCategory = $('#modalCategory');
const modalThumbs = $('#modalThumbs');

const galleryItems = $$('#galleryGrid .gitem');
let currentIndex = 0;

function buildThumbs() {
  if (!modalThumbs) return;
  modalThumbs.innerHTML = '';
  galleryItems.forEach((item, idx) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'thumb' + (idx === currentIndex ? ' is-on' : '');
    t.textContent = String(idx + 1).padStart(2, '0');
    t.addEventListener('click', () => openModal(idx));
    modalThumbs.appendChild(t);
  });
}

function openModal(idx) {
  currentIndex = idx;
  const item = galleryItems[currentIndex];
  if (!item || !modal) return;

  if (modalTitle) modalTitle.textContent = item.dataset.title || 'Design';
  if (modalCategory) modalCategory.textContent = item.dataset.category || '';

  if (modalImg) {
    modalImg.alt = item.dataset.title || 'Design';
    modalImg.src = item.dataset.src || '';
    modalImg.onerror = () => modalImg.removeAttribute('src');
  }

  buildThumbs();
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function prev() {
  if (!galleryItems.length) return;
  openModal((currentIndex - 1 + galleryItems.length) % galleryItems.length);
}
function next() {
  if (!galleryItems.length) return;
  openModal((currentIndex + 1) % galleryItems.length);
}

galleryItems.forEach((item, idx) => item.addEventListener('click', () => openModal(idx)));
modalBackdrop?.addEventListener('click', closeModal);
closeBtn?.addEventListener('click', closeModal);
prevBtn?.addEventListener('click', prev);
nextBtn?.addEventListener('click', next);

window.addEventListener('keydown', (e) => {
  if (!modal?.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeModal();
  if (e.key === 'ArrowLeft') prev();
  if (e.key === 'ArrowRight') next();
});

/* copy */
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

$$('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const target = $(btn.dataset.copy);
    if (!target) return;

    const ok = await copyText(target.textContent.trim());
    const original = btn.textContent;
    btn.textContent = ok ? 'Done' : 'Fail';
    setTimeout(() => (btn.textContent = original), 900);

    const toast = $('#copyToast');
    if (toast) {
      toast.hidden = false;
      toast.textContent = ok ? '복사되었습니다.' : '복사 실패(권한 확인 필요)';
      setTimeout(() => (toast.hidden = true), 1200);
    }
  });
});

/* mailto */
$('#mailtoBtn')?.addEventListener('click', (e) => {
  e.preventDefault();
  const email = $('#emailVal')?.textContent?.trim() || '';
  if (!email) return;
  window.location.href = `mailto:${email}?subject=${encodeURIComponent('포트폴리오 문의')}`;
});

/* year */
const yearEl = $('#year');
if (yearEl) yearEl.textContent = new Date().getFullYear();
