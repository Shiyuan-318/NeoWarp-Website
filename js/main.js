"use strict";
/**
 * main.ts —— 全站通用脚本
 * · 滚动入场动画（IntersectionObserver + data-animate）
 * · 导航栏当前页高亮
 * · 统计数字滚动
 * · 页脚年份
 */
/* 当前页导航高亮 */
(function markCurrent() {
    const page = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach((a) => {
        const href = a.getAttribute('href') || '';
        if (href === page || (page === '' && href === 'index.html')) {
            a.classList.add('nav-current');
        }
    });
})();
/* ---------------- 滚动入场动画 ---------------- */
(function initScrollAnimations() {
    const els = document.querySelectorAll('[data-animate]');
    if (!els.length)
        return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
})();
/* ---------------- 统计数字滚动 ---------------- */
function animateNumber(el, target) {
    const numMatch = target.match(/^(\d+)(.*)$/);
    if (!numMatch) {
        el.textContent = target;
        return;
    }
    const end = parseInt(numMatch[1], 10);
    const suffix = numMatch[2];
    const dur = 1400;
    const start = performance.now();
    const step = (now) => {
        const t = Math.min(1, (now - start) / dur);
        const eased = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(end * eased).toString() + suffix;
        if (t < 1)
            requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
(function initStats() {
    const stats = document.querySelectorAll('.stat-number');
    if (!stats.length)
        return;
    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const raw = el.getAttribute('data-value') || el.textContent || '';
                animateNumber(el, raw);
                io.unobserve(el);
            }
        });
    }, { threshold: 0.4 });
    stats.forEach((el) => {
        el.setAttribute('data-value', el.textContent || '');
        el.textContent = '0';
        io.observe(el);
    });
})();
/* ---------------- 页脚年份 ---------------- */
(function initFooter() {
    const yearEl = document.getElementById('footerYear');
    if (yearEl)
        yearEl.textContent = new Date().getFullYear().toString();
})();
