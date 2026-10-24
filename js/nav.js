"use strict";
/**
 * nav.ts —— 顶部导航栏（完全复刻 SyServer 官网逻辑）
 * 1. 贴顶全宽条 ⇄ 滚动后悬浮胶囊 形变
 * 2. 液态玻璃：毛玻璃 + 边缘折射（SVG feDisplacementMap）+ 方向性高光
 * 3. 移动端汉堡菜单 + 错位淡入
 * 4. 子页面 hero 标题滚出视口后，导航栏中间浮现页面标题
 */
const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';
function initNavigation() {
    const nav = document.querySelector('.nav');
    if (!nav)
        return;
    /* ---------------- 形变 / 页面标题 ---------------- */
    const pageTitle = document.querySelector('.wiki-hero-title');
    const navTitle = document.getElementById('navPageTitle');
    const updateNavState = () => {
        if (window.scrollY > 8) {
            nav.classList.add('scrolled');
        }
        else {
            nav.classList.remove('scrolled');
        }
        if (navTitle && pageTitle) {
            const rect = pageTitle.getBoundingClientRect();
            const navBottom = nav.getBoundingClientRect().bottom;
            if (rect.bottom < navBottom) {
                nav.classList.add('show-page-title');
            }
            else {
                nav.classList.remove('show-page-title');
            }
        }
    };
    updateNavState();
    window.addEventListener('scroll', updateNavState, { passive: true });
    window.addEventListener('resize', updateNavState, { passive: true });
    /* ---------------- 移动端汉堡菜单 ---------------- */
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');
    if (navToggle && nav && navLinks) {
        const closeMenu = () => {
            navLinks.classList.remove('is-shown');
            window.setTimeout(() => {
                if (!navLinks.classList.contains('is-shown')) {
                    nav.classList.remove('menu-open');
                }
            }, 350);
            navToggle.setAttribute('aria-expanded', 'false');
        };
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                nav.classList.remove('menu-open');
                navLinks.classList.remove('is-shown');
                navToggle.setAttribute('aria-expanded', 'false');
            }
        });
        document.addEventListener('click', (e) => {
            if (nav.classList.contains('menu-open') &&
                e.target instanceof Node &&
                !nav.contains(e.target)) {
                closeMenu();
            }
        });
        navToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (nav.classList.contains('menu-open') && navLinks.classList.contains('is-shown')) {
                closeMenu();
                return;
            }
            nav.classList.add('menu-open');
            navToggle.setAttribute('aria-expanded', 'true');
            window.requestAnimationFrame(() => {
                window.requestAnimationFrame(() => {
                    navLinks.classList.add('is-shown');
                });
            });
        });
        navLinks.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => closeMenu());
        });
    }
    initLiquidGlass(nav);
}
/* ==========================================================================
   液态玻璃（复刻 Kyant0/AndroidLiquidGlass 观感，同 SyServer 实现）
   按导航栏实际尺寸烘焙两张贴图：
     · 位移贴图（边缘折射） → SVG feDisplacementMap
     · 高光贴图（45° 方向性高光）
   ========================================================================== */
function initLiquidGlass(nav) {
    const P = {
        blur: 10, sat: 165, refractHeight: 29, refractAmount: 76,
        hlWidth: 1, hlAngle: 45, hlFalloff: 1,
        menuBlur: 24, menuSat: 175, menuRefractHeight: 18,
        menuRefractAmount: 44, menuHlWidth: 1
    };
    const svgBackdropOk = (() => {
        if (!(window.CSS && CSS.supports))
            return false;
        if (!CSS.supports('backdrop-filter', 'blur(1px)') &&
            !CSS.supports('-webkit-backdrop-filter', 'blur(1px)'))
            return false;
        return CSS.supports('backdrop-filter', 'url(#a)');
    })();
    /* ---------- 圆角矩形 SDF 及梯度 ---------- */
    function sdRoundedRect(x, y, hw, hh, r) {
        const cx = Math.abs(x) - (hw - r);
        const cy = Math.abs(y) - (hh - r);
        const mx = Math.max(cx, 0), my = Math.max(cy, 0);
        return Math.sqrt(mx * mx + my * my) - r + Math.min(Math.max(cx, cy), 0);
    }
    function gradSdRoundedRect(x, y, hw, hh, r) {
        const cx = Math.abs(x) - (hw - r);
        const cy = Math.abs(y) - (hh - r);
        const sx = x < 0 ? -1 : 1, sy = y < 0 ? -1 : 1;
        if (cx >= 0 || cy >= 0) {
            const mx = Math.max(cx, 0), my = Math.max(cy, 0);
            const L = Math.sqrt(mx * mx + my * my) || 1;
            return [sx * mx / L, sy * my / L];
        }
        const gx = cy <= cx ? 1 : 0;
        return [sx * gx, sy * (1 - gx)];
    }
    function circleMap(x) {
        return 1 - Math.sqrt(Math.max(0, 1 - x * x));
    }
    /* ---------- 贴图缓存 ---------- */
    const cache = {};
    const cacheKeys = [];
    function cached(key, make) {
        if (cache[key])
            return cache[key];
        const url = make();
        cache[key] = url;
        cacheKeys.push(key);
        while (cacheKeys.length > 60) {
            delete cache[cacheKeys.shift()];
        }
        return url;
    }
    /* ---------- 位移贴图：R=X 位移，G=Y 位移，128 = 不位移 ---------- */
    function buildLensMap(w, h, radius, height, amount) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(w, h);
        const data = img.data;
        const hw = w / 2, hh = h / 2;
        const gradRadius = Math.min(radius * 1.5, Math.min(hw, hh));
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const x = px + 0.5 - hw, y = py + 0.5 - hh;
                const dist = -sdRoundedRect(x, y, hw, hh, radius);
                let dx = 0, dy = 0;
                if (dist < height && dist > 0) {
                    const d = circleMap(1 - dist / height) * amount;
                    const g = gradSdRoundedRect(x, y, hw, hh, gradRadius);
                    const gl = Math.sqrt(g[0] * g[0] + g[1] * g[1]) || 1;
                    dx = (g[0] / gl) * d / amount;
                    dy = (g[1] / gl) * d / amount;
                }
                const i = (py * w + px) * 4;
                data[i] = Math.max(0, Math.min(255, Math.round(128 + dx * 127)));
                data[i + 1] = Math.max(0, Math.min(255, Math.round(128 + dy * 127)));
                data[i + 2] = 128;
                data[i + 3] = 255;
            }
        }
        ctx.putImageData(img, 0, 0);
        return cv.toDataURL();
    }
    /* ---------- 方向性高光贴图：纯白 + 逐像素 alpha ---------- */
    function buildHighlightMap(w, h, radius, ring, angleDeg, falloff) {
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        const img = ctx.createImageData(w, h);
        const data = img.data;
        const hw = w / 2, hh = h / 2;
        const gradRadius = Math.min(radius * 1.5, Math.min(hw, hh));
        const blur = ring / 2;
        const rad = angleDeg * Math.PI / 180;
        const nx = Math.cos(rad), ny = Math.sin(rad);
        for (let py = 0; py < h; py++) {
            for (let px = 0; px < w; px++) {
                const x = px + 0.5 - hw, y = py + 0.5 - hh;
                const dist = -sdRoundedRect(x, y, hw, hh, radius);
                let alpha = 0;
                if (dist > -blur) {
                    const t = (ring + blur - dist) / (2 * blur);
                    alpha = t < 0 ? 0 : (t > 1 ? 1 : t);
                    if (dist < blur) {
                        alpha *= Math.max(0, (dist + blur) / (2 * blur));
                    }
                    const g = gradSdRoundedRect(x, y, hw, hh, gradRadius);
                    const gl = Math.sqrt(g[0] * g[0] + g[1] * g[1]) || 1;
                    const d = (g[0] / gl) * nx + (g[1] / gl) * ny;
                    alpha *= Math.pow(Math.abs(d), falloff);
                }
                const i = (py * w + px) * 4;
                data[i] = 255;
                data[i + 1] = 255;
                data[i + 2] = 255;
                data[i + 3] = Math.max(0, Math.min(255, Math.round(alpha * 255)));
            }
        }
        ctx.putImageData(img, 0, 0);
        return cv.toDataURL();
    }
    /* ---------- SVG feDisplacementMap 滤镜 ---------- */
    let svgHost = null;
    function ensureFilter(id) {
        if (!svgHost) {
            svgHost = document.createElementNS(SVG_NS, 'svg');
            svgHost.setAttribute('aria-hidden', 'true');
            svgHost.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
            document.body.appendChild(svgHost);
        }
        const existing = svgHost.querySelector('#' + id);
        if (existing) {
            return {
                feImage: existing.querySelector('feImage'),
                feDisp: existing.querySelector('feDisplacementMap')
            };
        }
        const filter = document.createElementNS(SVG_NS, 'filter');
        filter.setAttribute('id', id);
        filter.setAttribute('color-interpolation-filters', 'sRGB');
        filter.setAttribute('x', '0');
        filter.setAttribute('y', '0');
        filter.setAttribute('width', '100%');
        filter.setAttribute('height', '100%');
        filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
        const feImage = document.createElementNS(SVG_NS, 'feImage');
        feImage.setAttribute('result', 'dmap');
        feImage.setAttribute('preserveAspectRatio', 'none');
        feImage.setAttribute('x', '0');
        feImage.setAttribute('y', '0');
        const feDisp = document.createElementNS(SVG_NS, 'feDisplacementMap');
        feDisp.setAttribute('in', 'SourceGraphic');
        feDisp.setAttribute('in2', 'dmap');
        feDisp.setAttribute('xChannelSelector', 'R');
        feDisp.setAttribute('yChannelSelector', 'G');
        filter.appendChild(feImage);
        filter.appendChild(feDisp);
        svgHost.appendChild(filter);
        return { feImage, feDisp };
    }
    function setLensImage(parts, url, w, h, amount) {
        parts.feImage.setAttribute('href', url);
        parts.feImage.setAttributeNS(XLINK_NS, 'xlink:href', url);
        parts.feImage.setAttribute('width', String(w));
        parts.feImage.setAttribute('height', String(h));
        parts.feDisp.setAttribute('scale', String(amount));
    }
    /* ---------- 导航栏玻璃层 ---------- */
    let glass = nav.querySelector('.nav-glass');
    if (!glass) {
        glass = document.createElement('div');
        glass.className = 'nav-glass';
        glass.setAttribute('aria-hidden', 'true');
        glass.appendChild(document.createElement('i'));
        const hl = document.createElement('span');
        hl.className = 'lg-highlight';
        glass.appendChild(hl);
        nav.insertBefore(glass, nav.firstChild);
    }
    const glassBlur = glass.querySelector('i');
    const glassHl = glass.querySelector('.lg-highlight');
    const navFilter = svgBackdropOk ? ensureFilter('nwLiquidGlassNav') : null;
    let navKey = '';
    function applyNav() {
        const rect = glass.getBoundingClientRect();
        const w = Math.round(rect.width), h = Math.round(rect.height);
        if (w < 8 || h < 8)
            return;
        const qw = Math.max(8, Math.round(w / 4) * 4);
        const qh = Math.max(8, Math.round(h / 2) * 2);
        const rawR = parseFloat(getComputedStyle(glass).borderTopLeftRadius) || 0;
        const r = Math.min(rawR, Math.min(qw, qh) / 2);
        const qr = Math.round(r / 2) * 2;
        const key = qw + 'x' + qh + 'r' + qr;
        if (key === navKey)
            return;
        navKey = key;
        glassHl.style.backgroundImage = 'url(' + cached('hl|' + key, () => buildHighlightMap(qw, qh, qr, P.hlWidth, P.hlAngle, P.hlFalloff)) + ')';
        if (navFilter) {
            const height = Math.min(P.refractHeight, Math.max(1, qr || P.refractHeight));
            const amount = P.refractAmount;
            const url = cached('lens|' + key + '|' + height + '|' + amount, () => buildLensMap(qw, qh, qr, height, amount));
            setLensImage(navFilter, url, qw, qh, amount);
            const bf = 'saturate(' + P.sat + '%) blur(' + P.blur + 'px) url(#nwLiquidGlassNav)';
            glassBlur.style.backdropFilter = bf;
            glassBlur.style['webkitBackdropFilter'] = bf;
        }
    }
    /* ---------- 移动端下拉菜单玻璃 ---------- */
    const navLinks = document.querySelector('.nav-links');
    let menuFilter = null;
    let menuKey = '';
    function applyMenu() {
        if (!navLinks)
            return;
        if (window.innerWidth > 768 || !nav.classList.contains('menu-open'))
            return;
        const rect = navLinks.getBoundingClientRect();
        const w = Math.round(rect.width), h = Math.round(rect.height);
        if (w < 8 || h < 8)
            return;
        const qw = Math.max(8, Math.round(w / 4) * 4);
        const qh = Math.max(8, Math.round(h / 4) * 4);
        const rawR = parseFloat(getComputedStyle(navLinks).borderTopLeftRadius) || 18;
        const qr = Math.round(Math.min(rawR, Math.min(qw, qh) / 2) / 2) * 2;
        const key = qw + 'x' + qh + 'r' + qr;
        if (key === menuKey)
            return;
        menuKey = key;
        navLinks.style.setProperty('--lg-menu-hl', 'url(' + cached('mhl|' + key, () => buildHighlightMap(qw, qh, qr, P.menuHlWidth, P.hlAngle, P.hlFalloff)) + ')');
        let bf = 'saturate(' + P.menuSat + '%) blur(' + P.menuBlur + 'px)';
        if (svgBackdropOk) {
            if (!menuFilter)
                menuFilter = ensureFilter('nwLiquidGlassMenu');
            const height = Math.min(P.menuRefractHeight, Math.max(1, qr));
            const amount = P.menuRefractAmount;
            const url = cached('mlens|' + key + '|' + height + '|' + amount, () => buildLensMap(qw, qh, qr, height, amount));
            setLensImage(menuFilter, url, qw, qh, amount);
            bf += ' url(#nwLiquidGlassMenu)';
        }
        navLinks.style.setProperty('--lg-menu-bf', bf);
    }
    /* ---------- 变化跟踪 ---------- */
    let trackUntil = 0;
    let rafId = 0;
    function tick() {
        applyNav();
        applyMenu();
        if (performance.now() < trackUntil) {
            rafId = requestAnimationFrame(tick);
        }
        else {
            rafId = 0;
        }
    }
    function track(ms) {
        trackUntil = Math.max(trackUntil, performance.now() + ms);
        if (!rafId)
            rafId = requestAnimationFrame(tick);
    }
    applyNav();
    applyMenu();
    if (window.MutationObserver) {
        new MutationObserver(() => {
            menuKey = '';
            track(700);
        }).observe(nav, { attributes: true, attributeFilter: ['class'] });
    }
    window.addEventListener('resize', () => {
        navKey = '';
        menuKey = '';
        track(400);
    }, { passive: true });
    if (window.ResizeObserver) {
        new ResizeObserver(() => track(200)).observe(nav);
    }
}
/* 模块脚本默认 defer，此时 DOM 已就绪，直接初始化 */
initNavigation();
