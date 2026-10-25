(() => {
    "use strict";

    const clamp01 = (value) => Math.min(1, Math.max(0, value));

    /* 阶梯式 3D 卡片：根据滚动位置更新 --p */
    const stairCards = Array.from(document.querySelectorAll(".stair-card"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const updateStairCards = () => {
        const viewportHeight = window.innerHeight || 1;
        const viewportCenter = viewportHeight * 0.5;

        stairCards.forEach((card) => {
            const rect = card.getBoundingClientRect();
            if (!rect.height) return;
            const cardCenter = rect.top + rect.height / 2;
            const progress = clamp01(0.5 + (viewportCenter - cardCenter) / (viewportHeight * 0.85));
            card.style.setProperty("--p", progress.toFixed(3));
        });
    };

    if (stairCards.length) {
        if (reduceMotion) {
            stairCards.forEach((card) => card.style.setProperty("--p", "0.5"));
        } else {
            let ticking = false;
            const requestTick = () => {
                if (ticking) return;
                ticking = true;
                window.requestAnimationFrame(() => {
                    updateStairCards();
                    ticking = false;
                });
            };

            updateStairCards();
            window.addEventListener("scroll", requestTick, { passive: true });
            window.addEventListener("resize", requestTick);
            window.addEventListener("load", requestTick);
        }
    }

    /* 当前系统标识 */
    const userAgent = navigator.userAgent.toLowerCase();
    let currentPlatform = "";
    if (userAgent.includes("mac")) currentPlatform = "macos";
    else if (userAgent.includes("win")) currentPlatform = "windows";
    else if (userAgent.includes("linux") || userAgent.includes("x11")) currentPlatform = "linux";

    if (currentPlatform) {
        const card = document.querySelector(`[data-platform="${currentPlatform}"]`);
        if (card) {
            const badge = card.querySelector("[data-current]");
            if (badge) badge.hidden = false;
        }
    }
})();
