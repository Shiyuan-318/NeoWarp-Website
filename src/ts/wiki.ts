/**
 * wiki.ts —— Wiki 页侧边目录滚动高亮（scroll-spy）
 */

(function initWikiToc(): void {
    const toc = document.querySelector<HTMLElement>('.wiki-toc');
    if (!toc) return;

    const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const sections = links
        .map((a) => document.getElementById((a.getAttribute('href') || '').slice(1)))
        .filter((s): s is HTMLElement => !!s);
    if (!sections.length) return;

    const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = (entry.target as HTMLElement).id;
                links.forEach((a) => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { rootMargin: '-30% 0px -60% 0px' });

    sections.forEach((s) => io.observe(s));

    // 点击平滑滚动（CSS scroll-behavior 已处理，这里补充 scroll-margin 兼容）
    links.forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = (a.getAttribute('href') || '').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + id);
            }
        });
    });
})();
