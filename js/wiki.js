/* ============================================
   NeoWarp Wiki 交互
   ============================================ */
(function () {
  'use strict';

  var tocItems = document.querySelectorAll('.wiki-toc-item');
  var leafLinks = document.querySelectorAll('.wiki-toc-link.leaf');
  var sections = document.querySelectorAll('.wiki-content-section');
  var sidebar = document.getElementById('wikiSidebar');
  var toggle = document.getElementById('wikiToggle');
  var overlay = document.getElementById('wikiOverlay');

  // ---------- 展开 / 折叠目录 ----------
  tocItems.forEach(function (item) {
    var link = item.querySelector('.wiki-toc-link');
    var sub = item.querySelector('.wiki-toc-sub');

    if (sub) {
      link.addEventListener('click', function (e) {
        // 如果点击的是叶子链接则不切换展开
        if (e.target.closest('.leaf')) return;
        item.classList.toggle('expanded');
      });
    }
  });

  // 默认展开第一个目录
  if (tocItems.length > 0) {
    tocItems[0].classList.add('expanded');
  }

  // ---------- 点击叶子链接滚动到内容 ----------
  leafLinks.forEach(function (link) {
    link.addEventListener('click', function () {
      var targetId = link.getAttribute('data-target');
      var target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // 高亮当前选中
        leafLinks.forEach(function (l) { l.classList.remove('active'); });
        link.classList.add('active');

        // 移动端关闭侧栏
        if (window.innerWidth <= 900) {
          sidebar.classList.remove('open');
          overlay.classList.remove('open');
        }
      }
    });
  });

  // ---------- 滚动高亮当前目录 ----------
  if ('IntersectionObserver' in window) {
    var sectionObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          entry.target.classList.add('visible');
          leafLinks.forEach(function (link) {
            if (link.getAttribute('data-target') === id) {
              link.classList.add('active');
              // 展开父级目录
              var parentItem = link.closest('.wiki-toc-item');
              if (parentItem) {
                parentItem.classList.add('expanded');
              }
            } else {
              link.classList.remove('active');
            }
          });
        }
      });
    }, {
      rootMargin: '-20% 0px -60% 0px',
      threshold: 0
    });

    sections.forEach(function (section) {
      sectionObserver.observe(section);
    });

    // 内容渐入观察器
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    sections.forEach(function (section) {
      revealObserver.observe(section);
    });
  } else {
    // 回退：直接显示
    sections.forEach(function (section) {
      section.classList.add('visible');
    });
  }

  // ---------- 移动端侧栏切换 ----------
  toggle.addEventListener('click', function () {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });

  overlay.addEventListener('click', function () {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

})();
