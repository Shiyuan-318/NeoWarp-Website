/**
 * wiki.ts —— Wiki 页目录：滚动高亮（scroll-spy）+ 移动端底部悬浮折叠面板
 */

(function initWikiToc(): void {
    const toc = document.querySelector<HTMLElement>('.wiki-toc');
    if (!toc) return;

    const links = Array.from(toc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'));
    const sections = links
        .map((a) => document.getElementById((a.getAttribute('href') || '').slice(1)))
        .filter((s): s is HTMLElement => !!s);
    if (!sections.length) return;

    /* 移动端：点击标题栏展开 / 折叠；点击链接后自动收起 */
    const tocTitle = toc.querySelector<HTMLElement>('.toc-title');
    if (tocTitle) {
        tocTitle.addEventListener('click', () => toc.classList.toggle('open'));
    }

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

    // 点击平滑滚动（移动端同时收起目录面板）
    links.forEach((a) => {
        a.addEventListener('click', (e) => {
            const id = (a.getAttribute('href') || '').slice(1);
            const target = document.getElementById(id);
            if (target) {
                e.preventDefault();
                toc.classList.remove('open');
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                history.replaceState(null, '', '#' + id);
            }
        });
    });
})();
