/* ==========================================================================
   NeoWarp — documentation page
   Collapsible table of contents, scroll-spy for the active section, and the
   mobile drawer. The TOC markup is authored inline on the page, so this file
   only wires up behaviour.
   ========================================================================== */
(function () {
  'use strict';

  var sidebar = document.getElementById('wikiSidebar');
  var toggle = document.getElementById('wikiToggle');
  var scrim = document.getElementById('wikiScrim');
  var groups = Array.prototype.slice.call(document.querySelectorAll('.toc__group'));
  var sections = Array.prototype.slice.call(document.querySelectorAll('.doc > section'));

  /* ---------- Mobile drawer --------------------------------------------- */
  function setDrawer(open) {
    if (!sidebar) return;
    sidebar.classList.toggle('is-open', open);
    if (scrim) scrim.classList.toggle('is-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setDrawer(!sidebar.classList.contains('is-open'));
    });
  }
  if (scrim) {
    scrim.addEventListener('click', function () {
      setDrawer(false);
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setDrawer(false);
  });

  /* ---------- Collapsible groups ---------------------------------------- */
  groups.forEach(function (group) {
    var link = group.querySelector('.toc__link');
    if (!link) return;

    // Open the group that owns the section currently in view.
    var owns = sections.some(function (section) {
      return !!group.querySelector('[href="#' + section.id + '"]');
    });
    if (owns) group.dataset.open = 'true';
    link.setAttribute('aria-expanded', group.dataset.open === 'true' ? 'true' : 'false');

    link.addEventListener('click', function () {
      var open = group.dataset.open !== 'true';
      group.dataset.open = open ? 'true' : 'false';
      link.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });

  /* ---------- Scroll spy ------------------------------------------------- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc__sub a'));

  function setActive(id) {
    links.forEach(function (a) {
      var on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) {
        var group = a.closest('.toc__group');
        if (group) group.dataset.open = 'true';
      }
    });
  }

  if ('IntersectionObserver' in window && sections.length) {
    var visible = new Map();

    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.boundingClientRect.top);
          else visible.delete(entry.target.id);
        });
        if (!visible.size) return;
        var best = null;
        visible.forEach(function (top, id) {
          if (best === null || top < best.top) best = { id: id, top: top };
        });
        if (best) setActive(best.id);
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      spy.observe(section);
    });
  }

  /* Close the drawer when a link inside it is followed. */
  if (sidebar) {
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) setDrawer(false);
    });
  }
})();
