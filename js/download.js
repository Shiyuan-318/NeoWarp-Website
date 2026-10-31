"use strict";

/**
 * download.js —— 下载页脚本
 * 1. 当前系统标识（修复：Android 误判为 Linux、iPadOS 误判为 macOS）
 * 2. 全页交互粒子：流场漂移 + 运动拖尾 + 鼠标排斥/涡旋 + 邻近连线
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------------------
   当前系统标识
   旧逻辑问题：Android 的 UA 含 "Linux"、iPadOS 桌面模式 UA 含 "Macintosh"，
   导致移动端被错误标识。先排除移动端，再按平台特征匹配。
   -------------------------------------------------------------------------- */
(function markCurrentPlatform() {
    const ua = navigator.userAgent;
    const isMobile = /android|iphone|ipod|mobile/i.test(ua)
        || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1); // iPadOS 桌面模式
    if (isMobile) return;

    let platform = "";
    const dataPlatform = (navigator.userAgentData && navigator.userAgentData.platform || "").toLowerCase();
    if (dataPlatform) {
        if (dataPlatform.includes("mac")) platform = "macos";
        else if (dataPlatform.includes("win")) platform = "windows";
        else if (dataPlatform.includes("linux") || dataPlatform.includes("chrome os")) platform = "linux";
    }
    if (!platform) {
        if (/macintosh|mac os x/i.test(ua)) platform = "macos";
        else if (/windows/i.test(ua)) platform = "windows";
        else if (/linux|cros|x11/i.test(ua)) platform = "linux";
    }
    if (!platform) return;

    const row = document.querySelector(`[data-platform="${platform}"]`);
    if (row) {
        const badge = row.querySelector("[data-current]");
        if (badge) badge.hidden = false;
    }
})();

/* --------------------------------------------------------------------------
   全页交互粒子系统（Canvas 2D）
   拖尾实现：destination-out 低透明度擦除，画布保持透明叠加在页面上
   -------------------------------------------------------------------------- */
(function initFlowField() {
    if (reduceMotion) return;

    const canvas = document.getElementById('fxCanvas');
    if (!(canvas instanceof HTMLCanvasElement)) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    let width = 0;
    let height = 0;
    let particles = [];
    let linkSeed = [];

    /* 以白为主，少量品牌蓝 / 橙点缀 */
    const COLORS = [
        { c: '235,235,240', w: 0.62 },
        { c: '125,184,255', w: 0.18 },
        { c: '255,179,64', w: 0.14 },
        { c: '160,140,255', w: 0.06 }
    ];
    const pickColor = () => {
        let roll = Math.random();
        for (const item of COLORS) {
            roll -= item.w;
            if (roll <= 0) return item.c;
        }
        return COLORS[0].c;
    };

    const spawn = (scatter) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 0,
        vy: 0,
        speed: 0.35 + Math.random() * 0.75,
        size: 0.7 + Math.random() * 0.9,
        alpha: 0.28 + Math.random() * 0.4,
        color: pickColor(),
        /* 入场时从四周向场内汇聚 */
        gather: scatter ? 0 : 1
    });

    const rebuild = () => {
        const count = Math.min(1300, Math.floor((width * height) / 1200));
        particles = Array.from({ length: count }, () => spawn(true));
        /* 取少量粒子做邻近连线，避免画面杂乱 */
        linkSeed = particles.slice(0, Math.min(90, Math.floor(count / 8)));
    };

    const resize = () => {
        const nextW = window.innerWidth;
        const nextH = window.innerHeight;
        if (nextW === width && nextH === height) return;
        width = nextW;
        height = nextH;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        rebuild();
    };
    window.addEventListener('resize', resize, { passive: true });
    resize();
    /* 重建后全部重新入场汇聚 */
    particles.forEach((p) => { p.gather = 0; });

    /* 鼠标交互：排斥 + 切向涡旋 */
    const mouse = { x: -9999, y: -9999, active: false };
    window.addEventListener('pointermove', (event) => {
        mouse.x = event.clientX;
        mouse.y = event.clientY;
        mouse.active = true;
    }, { passive: true });
    window.addEventListener('pointerleave', () => { mouse.active = false; });

    /* 滚动影响流场角度 */
    let scrollEnergy = 0;
    let lastScrollY = window.scrollY;
    window.addEventListener('scroll', () => {
        scrollEnergy += Math.min(3, Math.abs(window.scrollY - lastScrollY) * 0.02);
        lastScrollY = window.scrollY;
    }, { passive: true });

    /* 伪噪声流场角度 */
    const fieldAngle = (x, y, t) => {
        const s1 = Math.cos(x * 0.0016 + t * 0.16);
        const s2 = Math.sin(y * 0.0013 - t * 0.11);
        const s3 = Math.sin((x + y) * 0.0007 + t * 0.05);
        return (s1 + s2 + s3) * 1.9 + scrollEnergy * 0.35;
    };

    const MOUSE_RADIUS = 150;

    let time = 0;
    let lastFrame = performance.now();
    let animationFrame = 0;

    const tick = (now) => {
        animationFrame = requestAnimationFrame(tick);
        if (document.hidden) {
            lastFrame = now;
            return;
        }
        const dt = Math.min(2.5, (now - lastFrame) / 16.667);
        lastFrame = now;
        time += dt * 0.016;
        scrollEnergy *= 0.94;

        /* 拖尾：擦除上一帧而非覆盖 */
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.085)';
        ctx.fillRect(0, 0, width, height);
        ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            const angle = fieldAngle(p.x, p.y, time);
            const force = p.speed * dt;
            p.vx += Math.cos(angle) * force * 0.14;
            p.vy += Math.sin(angle) * force * 0.14;

            /* 入场汇聚：向视口中心靠拢 */
            if (p.gather < 1) {
                p.gather = Math.min(1, p.gather + dt * 0.006);
                const cx = width / 2 - p.x;
                const cy = height / 2 - p.y;
                const dist = Math.hypot(cx, cy) || 1;
                const pull = (1 - p.gather) * 0.9;
                p.vx += (cx / dist) * pull * dt;
                p.vy += (cy / dist) * pull * dt;
            }

            /* 鼠标排斥 + 涡旋 */
            if (mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0.01) {
                    const dist = Math.sqrt(distSq);
                    const strength = (1 - dist / MOUSE_RADIUS) ** 2 * 2.4 * dt;
                    p.vx += (dx / dist) * strength;
                    p.vy += (dy / dist) * strength;
                    /* 切向分量形成环绕 */
                    p.vx += (-dy / dist) * strength * 0.55;
                    p.vy += (dx / dist) * strength * 0.55;
                }
            }

            /* 阻尼 + 限速 */
            p.vx *= 0.94;
            p.vy *= 0.94;
            const vMax = 2.6;
            const v = Math.hypot(p.vx, p.vy);
            if (v > vMax) {
                p.vx = (p.vx / v) * vMax;
                p.vy = (p.vy / v) * vMax;
            }

            p.x += p.vx * dt * 1.6;
            p.y += p.vy * dt * 1.6;

            /* 环绕边界 */
            if (p.x < -12) p.x = width + 12;
            else if (p.x > width + 12) p.x = -12;
            if (p.y < -12) p.y = height + 12;
            else if (p.y > height + 12) p.y = -12;

            ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }

        /* 邻近连线（极淡，仅种子粒子之间） */
        ctx.lineWidth = 0.6;
        const LINK_DIST = 78;
        for (let i = 0; i < linkSeed.length; i += 1) {
            const a = linkSeed[i];
            for (let j = i + 1; j < linkSeed.length; j += 1) {
                const b = linkSeed[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distSq = dx * dx + dy * dy;
                if (distSq < LINK_DIST * LINK_DIST) {
                    const fade = 1 - Math.sqrt(distSq) / LINK_DIST;
                    ctx.strokeStyle = `rgba(200, 215, 240,${(fade * 0.06).toFixed(3)})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }
        }
    };

    animationFrame = requestAnimationFrame(tick);
    canvas.classList.add('fx-ready');

    window.addEventListener('pagehide', () => {
        cancelAnimationFrame(animationFrame);
        window.removeEventListener('resize', resize);
    }, { once: true });
})();
