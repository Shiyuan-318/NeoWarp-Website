import * as THREE from './vendor/three.module.min.js';

"use strict";

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/* --------------------------------------------------------------------------
   当前系统标识
   -------------------------------------------------------------------------- */
(function markCurrentPlatform() {
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

/* --------------------------------------------------------------------------
   平台卡片：鼠标 3D 倾斜 + 聚光灯
   入场动画（main.js 的 IntersectionObserver 添加 .animated）结束后再启用倾斜，
   通过 .tilt-ready 切换到快速过渡，避免倾斜迟滞
   -------------------------------------------------------------------------- */
(function initCardTilt() {
    const cards = document.querySelectorAll('.stair-card');
    if (!cards.length) return;

    const pending = new Set(cards);
    const entranceObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const card = mutation.target;
            if (card.classList.contains('animated') && pending.has(card)) {
                pending.delete(card);
                window.setTimeout(() => card.classList.add('tilt-ready'), 880);
                if (pending.size === 0) entranceObserver.disconnect();
            }
        });
    });
    cards.forEach((card) => entranceObserver.observe(card, { attributes: true, attributeFilter: ['class'] }));

    if (reduceMotion || !finePointer) return;

    cards.forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            card.style.setProperty('--glow-x', `${x * 100}%`);
            card.style.setProperty('--glow-y', `${y * 100}%`);
            if (!card.classList.contains('tilt-ready')) return;
            card.style.setProperty('--tilt-ry', `${(x - 0.5) * 7}deg`);
            card.style.setProperty('--tilt-rx', `${(0.5 - y) * 7}deg`);
        });

        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--tilt-ry', '0deg');
            card.style.setProperty('--tilt-rx', '0deg');
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
        });
    });
})();

/* --------------------------------------------------------------------------
   WebGL 粒子背景：星尘 + 漂浮微粒 + 线框几何体 + 辉光
   鼠标视差随动，失败时回退为纯 CSS 极光背景
   -------------------------------------------------------------------------- */
function createSoftDotTexture() {
    const dotCanvas = document.createElement('canvas');
    dotCanvas.width = 64;
    dotCanvas.height = 64;
    const context = dotCanvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(dotCanvas);
}

function createGlowTexture() {
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const context = glowCanvas.getContext('2d');
    if (!context) return null;
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
    gradient.addColorStop(0.16, 'rgba(255,255,255,0.38)');
    gradient.addColorStop(0.48, 'rgba(255,255,255,0.09)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(glowCanvas);
}

function initParticleBackground() {
    const canvas = document.getElementById('downloadBg');
    if (!(canvas instanceof HTMLCanvasElement)) return;

    try {
        const renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 120);
        camera.position.set(0, 0, 26);

        const world = new THREE.Group();
        scene.add(world);

        const dotTexture = createSoftDotTexture();
        const glowTexture = createGlowTexture();

        /* 品牌色板 */
        const palette = [
            new THREE.Color(0x8fc3ff),
            new THREE.Color(0x0a84ff),
            new THREE.Color(0xffffff),
            new THREE.Color(0xff9f0a),
            new THREE.Color(0xffb340),
            new THREE.Color(0x8f7bff)
        ];
        const paletteWeights = [0.3, 0.24, 0.2, 0.12, 0.08, 0.06];
        const pickColor = () => {
            let roll = Math.random();
            for (let index = 0; index < paletteWeights.length; index += 1) {
                roll -= paletteWeights[index];
                if (roll <= 0) return palette[index];
            }
            return palette[0];
        };

        /* 远景星尘 */
        const starCount = 1300;
        const starPositions = new Float32Array(starCount * 3);
        const starColors = new Float32Array(starCount * 3);
        for (let index = 0; index < starCount; index += 1) {
            starPositions[index * 3] = (Math.random() - 0.5) * 92;
            starPositions[index * 3 + 1] = (Math.random() - 0.5) * 56;
            starPositions[index * 3 + 2] = -34 + Math.random() * 38;
            const color = pickColor();
            starColors[index * 3] = color.r;
            starColors[index * 3 + 1] = color.g;
            starColors[index * 3 + 2] = color.b;
        }
        const starGeometry = new THREE.BufferGeometry();
        starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
        starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
        const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
            size: 0.16,
            map: dotTexture || null,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        }));
        world.add(stars);

        /* 前景漂浮微粒（带独立浮动动画） */
        const dustCount = 90;
        const dustPositions = new Float32Array(dustCount * 3);
        const dustColors = new Float32Array(dustCount * 3);
        const dustBaseY = new Float32Array(dustCount);
        const dustPhase = new Float32Array(dustCount);
        for (let index = 0; index < dustCount; index += 1) {
            dustPositions[index * 3] = (Math.random() - 0.5) * 60;
            dustPositions[index * 3 + 1] = (Math.random() - 0.5) * 36;
            dustPositions[index * 3 + 2] = -10 + Math.random() * 14;
            dustBaseY[index] = dustPositions[index * 3 + 1];
            dustPhase[index] = Math.random() * Math.PI * 2;
            const color = Math.random() > 0.5 ? palette[1] : palette[3];
            dustColors[index * 3] = color.r;
            dustColors[index * 3 + 1] = color.g;
            dustColors[index * 3 + 2] = color.b;
        }
        const dustGeometry = new THREE.BufferGeometry();
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(dustColors, 3));
        const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({
            size: 0.42,
            map: dotTexture || null,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true
        }));
        world.add(dust);

        /* 线框几何体（3D 结构感） */
        const wireframes = new THREE.Group();
        world.add(wireframes);

        const icosahedron = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(7.5, 1)),
            new THREE.LineBasicMaterial({
                color: 0x4da3ff,
                transparent: true,
                opacity: 0.1,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        icosahedron.position.set(17, 6, -14);
        wireframes.add(icosahedron);

        const torus = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.TorusGeometry(6, 1.7, 10, 42)),
            new THREE.LineBasicMaterial({
                color: 0xff9f0a,
                transparent: true,
                opacity: 0.07,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        torus.position.set(-19, -9, -12);
        torus.rotation.set(0.9, 0.3, 0.2);
        wireframes.add(torus);

        const ringGeo = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.TorusGeometry(11, 0.04, 4, 120)),
            new THREE.LineBasicMaterial({
                color: 0x8f7bff,
                transparent: true,
                opacity: 0.14,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            })
        );
        ringGeo.position.set(0, 1, -18);
        ringGeo.rotation.set(1.25, 0.15, 0);
        wireframes.add(ringGeo);

        /* 辉光氛围 */
        if (glowTexture) {
            const blueGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0x1c6fe0,
                transparent: true,
                opacity: 0.22,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            blueGlow.scale.set(46, 46, 1);
            blueGlow.position.set(-16, 10, -20);
            world.add(blueGlow);

            const orangeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xff8a2a,
                transparent: true,
                opacity: 0.12,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            orangeGlow.scale.set(34, 34, 1);
            orangeGlow.position.set(20, -8, -16);
            world.add(orangeGlow);
        }

        /* 鼠标视差 */
        const pointer = new THREE.Vector2(0, 0);
        const pointerTarget = new THREE.Vector2(0, 0);
        if (!reduceMotion && finePointer) {
            window.addEventListener('pointermove', (event) => {
                pointerTarget.set(
                    (event.clientX / window.innerWidth - 0.5) * 2,
                    (event.clientY / window.innerHeight - 0.5) * 2
                );
            }, { passive: true });
        }

        /* 尺寸自适应 */
        let width = 0;
        let height = 0;
        const resize = () => {
            const nextWidth = window.innerWidth;
            const nextHeight = window.innerHeight;
            if (nextWidth === width && nextHeight === height) return;
            width = nextWidth;
            height = nextHeight;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', resize, { passive: true });
        resize();

        const clock = new THREE.Clock();
        let animationFrame = 0;
        const render = () => {
            animationFrame = requestAnimationFrame(render);
            if (document.hidden) return;

            const time = clock.getElapsedTime();
            pointer.lerp(pointerTarget, 0.04);
            camera.position.x = pointer.x * 1.6;
            camera.position.y = -pointer.y * 1.1;
            camera.lookAt(0, 0, 0);

            if (!reduceMotion) {
                stars.rotation.y = time * 0.008;
                stars.rotation.x = Math.sin(time * 0.05) * 0.02;
                const positionAttr = dustGeometry.getAttribute('position');
                for (let index = 0; index < dustCount; index += 1) {
                    positionAttr.setY(index, dustBaseY[index] + Math.sin(time * 0.45 + dustPhase[index]) * 1.4);
                }
                positionAttr.needsUpdate = true;
                dust.rotation.y = -time * 0.014;
                icosahedron.rotation.y = time * 0.05;
                icosahedron.rotation.x = Math.sin(time * 0.1) * 0.16;
                torus.rotation.z = time * 0.04;
                ringGeo.rotation.z = time * 0.02;
            }
            renderer.render(scene, camera);
        };

        renderer.render(scene, camera);
        canvas.classList.add('webgl-ready');
        render();

        window.addEventListener('pagehide', () => {
            cancelAnimationFrame(animationFrame);
            window.removeEventListener('resize', resize);
            renderer.dispose();
            dotTexture?.dispose();
            glowTexture?.dispose();
        }, { once: true });
    } catch (error) {
        canvas.classList.add('webgl-unavailable');
        console.warn('NeoWarp 下载页粒子背景不可用，已回退为纯 CSS 背景。', error);
    }
}

initParticleBackground();
