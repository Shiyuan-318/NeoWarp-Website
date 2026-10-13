/* ==========================================================================
   NeoWarp — site behaviour
   Kept deliberately small: theme, navigation, and the fallback paths for the
   two modern CSS features the pages lean on (scroll-driven animations and
   view-timeline reveals). Where the browser supports the CSS, no JS runs.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;

  /* ---------- Theme ------------------------------------------------------ */
  var THEME_KEY = 'neowarp-theme';

  function storedTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return v === 'light' || v === 'dark' ? v : null;
    } catch (e) {
      return null;
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches
      ? 'light'
      : 'dark';
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    var btn = document.getElementById('themeToggle');
    if (btn) {
      var next = theme === 'light' ? '深色' : '浅色';
      btn.setAttribute('aria-label', '切换到' + next + '主题');
      btn.title = '切换到' + next + '主题';
    }
  }

  applyTheme(storedTheme() || systemTheme());

  var themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', function () {
      var next = root.dataset.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {}
    });
  }

  /* ---------- Header + mobile navigation --------------------------------- */
  var header = document.getElementById('header');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  function closeMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', function () {
      var open = navLinks.classList.toggle('is-open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });

    navLinks.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });

    document.addEventListener('click', function (e) {
      if (!navLinks.classList.contains('is-open')) return;
      if (e.target.closest('.nav')) return;
      closeMenu();
    });
  }

  /* ---------- Scroll progress bar (fallback) ----------------------------- */
  var progress = document.querySelector('.progress');
  var supportsScrollTimeline =
    window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');

  function paintProgress() {
    if (!progress) return;
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
    progress.style.scale = ratio + ' 1';
  }

  /* ---------- Scroll loop ------------------------------------------------- */
  var ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      var y = window.scrollY || document.documentElement.scrollTop;
      if (header) header.classList.toggle('is-stuck', y > 12);
      if (!supportsScrollTimeline) paintProgress();
      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () {
    if (!supportsScrollTimeline) paintProgress();
  });

  onScroll();
  if (!supportsScrollTimeline) paintProgress();
})();
