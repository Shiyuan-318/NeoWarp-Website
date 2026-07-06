/* ============================================
   NeoWarp 主页交互
   ============================================ */
(function () {
  'use strict';

  var navbar = document.getElementById('navbar');
  var heroTitle = document.getElementById('heroTitle');
  var heroSubtitle = document.getElementById('heroSubtitle');
  var heroContent = document.getElementById('heroContent');
  var scrollHint = document.getElementById('scrollHint');
  var navToggle = document.getElementById('navToggle');
  var navLinks = document.getElementById('navLinks');

  // ---------- 移动端菜单 ----------
  navToggle.addEventListener('click', function () {
    navLinks.classList.toggle('open');
  });

  // 点击链接后关闭菜单
  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
    });
  });

  // ---------- 首屏滚动联动动画 ----------
  // 滚动时 NeoWarp 文字从屏幕中心移动到导航栏位置
  var ANIMATION_RANGE = 400; // 滚动 0~400px 区间完成动画

  function updateHeroAnimation(scrollY) {
    var progress = Math.min(scrollY / ANIMATION_RANGE, 1);

    // 计算导航栏品牌文字位置（相对于视口中心）
    var navBrand = navbar.querySelector('.nav-brand');
    var navRect = navBrand.getBoundingClientRect();
    var titleRect = heroTitle.getBoundingClientRect();

    // 起始位置：标题中心
    var startX = titleRect.left + titleRect.width / 2;
    var startY = titleRect.top + titleRect.height / 2;

    // 目标位置：导航栏品牌文字中心
    var endX = navRect.left + navRect.width / 2;
    var endY = navRect.top + navRect.height / 2;

    // 计算位移
    var deltaX = (endX - startX) * progress;
    var deltaY = (endY - startY) * progress;

    // 缩放：从 1 缩小到导航栏文字大小比例
    var scale = 1 - progress * 0.85;

    // 透明度：前 70% 保持可见，后 30% 淡出
    var opacity = progress < 0.7 ? 1 : 1 - (progress - 0.7) / 0.3;

    heroTitle.style.transform = 'translate(' + deltaX + 'px, ' + deltaY + 'px) scale(' + scale + ')';
    heroTitle.style.opacity = opacity;

    // 副标题与提示在滚动开始时淡出
    heroSubtitle.style.opacity = 1 - progress * 1.5;
    scrollHint.style.opacity = 1 - progress * 2;

    // hero-content 整体在动画完成后不再拦截事件
    if (progress >= 1) {
      heroContent.style.pointerEvents = 'none';
    } else {
      heroContent.style.pointerEvents = '';
    }
  }

  // ---------- 导航栏滚动状态 ----------
  function updateNavbar(scrollY) {
    if (scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }

  // ---------- 滚动事件 ----------
  var ticking = false;

  function onScroll() {
    var scrollY = window.pageYOffset || document.documentElement.scrollTop;
    if (!ticking) {
      window.requestAnimationFrame(function () {
        updateHeroAnimation(scrollY);
        updateNavbar(scrollY);
        ticking = false;
      });
      ticking = true;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });

  // 初始化
  updateHeroAnimation(0);
  updateNavbar(0);

  // ---------- 功能介绍滚动渐入 ----------
  var features = document.querySelectorAll('[data-feature]');

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var text = entry.target.querySelector('.feature-text');
          var image = entry.target.querySelector('.feature-image');
          if (text) text.classList.add('visible');
          if (image) image.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.15,
      rootMargin: '0px 0px -80px 0px'
    });

    features.forEach(function (feature) {
      observer.observe(feature);
    });
  } else {
    // 回退：直接显示
    features.forEach(function (feature) {
      var text = feature.querySelector('.feature-text');
      var image = feature.querySelector('.feature-image');
      if (text) text.classList.add('visible');
      if (image) image.classList.add('visible');
    });
  }

  // ---------- 下载卡片鼠标追踪光晕 ----------
  var downloadCards = document.querySelectorAll('.download-card');
  downloadCards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect = card.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * 100;
      var y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mouse-x', x + '%');
      card.style.setProperty('--mouse-y', y + '%');
    });
  });

})();
