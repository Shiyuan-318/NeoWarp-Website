(() => {
    "use strict";

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
