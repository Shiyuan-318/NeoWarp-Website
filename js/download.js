import * as THREE from "./vendor/three.module.min.js";

(() => {
    "use strict";

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    /* Navigation */

    const nav = document.getElementById("siteNav");
    const navToggle = document.getElementById("navToggle");
    const navLinks = document.getElementById("navLinks");

    const syncNavState = () => {
        if (nav) nav.classList.toggle("scrolled", window.scrollY > 12);
    };

    if (navToggle && nav && navLinks) {
        navToggle.addEventListener("click", () => {
            const open = nav.classList.toggle("open");
            navToggle.setAttribute("aria-expanded", open ? "true" : "false");
            navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
        });

        navLinks.addEventListener("click", (event) => {
            if (event.target instanceof Element && event.target.closest("a")) {
                nav.classList.remove("open");
                navToggle.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("click", (event) => {
            if (!nav.contains(event.target)) {
                nav.classList.remove("open");
                navToggle.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                nav.classList.remove("open");
                navToggle.setAttribute("aria-expanded", "false");
            }
        });
    }

    syncNavState();
    window.addEventListener("scroll", syncNavState, { passive: true });

    /* Reveal on scroll */

    const revealItems = document.querySelectorAll(".reveal");
    if ("IntersectionObserver" in window && !reduceMotion) {
        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, {
            threshold: 0.16,
            rootMargin: "0px 0px -8% 0px"
        });
        revealItems.forEach((item) => revealObserver.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    /* Pointer tilt */

    if (finePointer && !reduceMotion) {
        document.querySelectorAll("[data-tilt]").forEach((element) => {
            const reset = () => {
                element.style.setProperty("--rx", "0deg");
                element.style.setProperty("--ry", "0deg");
                element.style.setProperty("--mx", "50%");
                element.style.setProperty("--my", "0%");
            };

            element.addEventListener("pointermove", (event) => {
                const rect = element.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const px = (event.clientX - rect.left) / rect.width;
                const py = (event.clientY - rect.top) / rect.height;
                element.style.setProperty("--mx", `${(px * 100).toFixed(2)}%`);
                element.style.setProperty("--my", `${(py * 100).toFixed(2)}%`);
                element.style.setProperty("--ry", `${((px - 0.5) * 7).toFixed(2)}deg`);
                element.style.setProperty("--rx", `${((0.5 - py) * 5.5).toFixed(2)}deg`);
            });

            element.addEventListener("pointerleave", reset);
        });
    }

    /* Current platform badge */

    const userAgent = navigator.userAgent.toLowerCase();
    let currentPlatform = "";
    if (userAgent.includes("mac")) currentPlatform = "macos";
    else if (userAgent.includes("win")) currentPlatform = "windows";
    else if (userAgent.includes("linux") || userAgent.includes("x11")) currentPlatform = "linux";

    if (currentPlatform) {
        const card = document.querySelector(`[data-platform="${currentPlatform}"]`);
        const badge = card ? card.querySelector("[data-current]") : null;
        if (badge) badge.hidden = false;
    }

    /* Footer year */

    const footerYear = document.getElementById("footerYear");
    if (footerYear) footerYear.textContent = String(new Date().getFullYear());

    /* Hero scene */

    const canvas = document.getElementById("heroCanvas");
    if (!canvas || !window.WebGLRenderingContext) return;

    let renderer;
    try {
        renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: true,
            powerPreference: "high-performance"
        });
    } catch (error) {
        return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
    camera.position.set(0, 0.15, 9.4);

    const root = new THREE.Group();
    scene.add(root);

    /* Core */

    const coreGeometry = new THREE.IcosahedronGeometry(2.05, 1);
    const core = new THREE.Mesh(
        coreGeometry,
        new THREE.MeshStandardMaterial({
            color: 0x151f3d,
            metalness: 0.88,
            roughness: 0.24,
            transparent: true,
            opacity: 0.94
        })
    );
    root.add(core);

    const shellEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(coreGeometry),
        new THREE.LineBasicMaterial({
            color: 0x8fd6ff,
            transparent: true,
            opacity: 0.62
        })
    );
    shellEdges.scale.setScalar(1.018);
    root.add(shellEdges);

    /* Orbit rings */

    const ringSpecs = [
        { radius: 3.18, tube: 0.012, color: 0x6f96ff, opacity: 0.45, tiltX: 1.06, tiltZ: 0.32, speed: 0.10 },
        { radius: 3.82, tube: 0.008, color: 0x68e9ff, opacity: 0.30, tiltX: -0.72, tiltZ: -0.42, speed: -0.075 },
        { radius: 4.42, tube: 0.006, color: 0xb39aff, opacity: 0.22, tiltX: 0.52, tiltZ: 0.86, speed: 0.055 }
    ];
    const rings = ringSpecs.map((spec) => {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(spec.radius, spec.tube, 2, 180),
            new THREE.MeshBasicMaterial({
                color: spec.color,
                transparent: true,
                opacity: spec.opacity
            })
        );
        ring.rotation.x = spec.tiltX;
        ring.rotation.z = spec.tiltZ;
        ring.userData.speed = spec.speed;
        root.add(ring);
        return ring;
    });

    /* Particles */

    const createParticles = (count, radiusMin, radiusMax, size, color, opacity) => {
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i += 1) {
            const radius = radiusMin + Math.random() * (radiusMax - radiusMin);
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi) * 0.72;
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        const points = new THREE.Points(geometry, new THREE.PointsMaterial({
            color,
            size,
            transparent: true,
            opacity,
            depthWrite: false,
            sizeAttenuation: true
        }));
        return points;
    };

    const particlesA = createParticles(180, 4.5, 7.2, 0.045, 0x8fb4ff, 0.52);
    const particlesB = createParticles(90, 3.9, 6.6, 0.03, 0x9df3ff, 0.42);
    root.add(particlesA, particlesB);

    /* Soft glow sprite */

    const glowCanvas = document.createElement("canvas");
    glowCanvas.width = 256;
    glowCanvas.height = 256;
    const glowContext = glowCanvas.getContext("2d");
    if (glowContext) {
        const gradient = glowContext.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, "rgba(140, 170, 255, 0.80)");
        gradient.addColorStop(0.35, "rgba(100, 130, 255, 0.24)");
        gradient.addColorStop(1, "rgba(90, 120, 255, 0)");
        glowContext.fillStyle = gradient;
        glowContext.fillRect(0, 0, 256, 256);

        const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
            map: new THREE.CanvasTexture(glowCanvas),
            transparent: true,
            opacity: 0.17,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        }));
        glowSprite.scale.set(11.5, 11.5, 1);
        root.add(glowSprite);
    }

    /* Lights */

    scene.add(new THREE.AmbientLight(0x7f92ff, 0.72));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.15);
    keyLight.position.set(4.4, 6.2, 7.0);
    scene.add(keyLight);
    const rimLightA = new THREE.PointLight(0x5d87ff, 26, 24);
    rimLightA.position.set(-5.2, -3.1, 4.4);
    scene.add(rimLightA);
    const rimLightB = new THREE.PointLight(0x68e9ff, 16, 20);
    rimLightB.position.set(5.4, 4.2, -3.2);
    scene.add(rimLightB);

    /* Pointer parallax */

    const pointer = { x: 0, y: 0 };
    const smoothed = { x: 0, y: 0 };

    if (finePointer && !reduceMotion) {
        window.addEventListener("pointermove", (event) => {
            pointer.x = (event.clientX / window.innerWidth - 0.5) * 2;
            pointer.y = (event.clientY / window.innerHeight - 0.5) * 2;
        }, { passive: true });
    }

    /* Sizing */

    const resizeScene = () => {
        const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 1;
        const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 1;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    resizeScene();
    if (typeof ResizeObserver === "function") {
        new ResizeObserver(resizeScene).observe(canvas);
    } else {
        window.addEventListener("resize", resizeScene);
    }

    /* Render loop */

    const clock = new THREE.Clock();
    let elapsed = 0;
    let animationId = 0;
    let running = false;

    const renderFrame = (elapsed) => {
        smoothed.x += (pointer.x - smoothed.x) * 0.045;
        smoothed.y += (pointer.y - smoothed.y) * 0.045;

        root.rotation.y = -0.32 + elapsed * 0.10 + smoothed.x * 0.32;
        root.rotation.x = 0.18 + smoothed.y * 0.18;
        root.rotation.z = smoothed.x * -0.045;
        root.position.y = Math.sin(elapsed * 0.42) * 0.12;

        core.rotation.y = elapsed * 0.06;
        core.rotation.x = Math.sin(elapsed * 0.22) * 0.14;
        shellEdges.rotation.copy(core.rotation);

        rings.forEach((ring) => {
            ring.rotation.z += ring.userData.speed * 0.0045;
        });

        particlesA.rotation.y = elapsed * 0.028;
        particlesB.rotation.y = -elapsed * 0.042;

        renderer.render(scene, camera);
    };

    const startLoop = () => {
        if (running) return;
        running = true;
        const tick = () => {
            renderFrame(elapsed);
            elapsed += clock.getDelta();
            animationId = requestAnimationFrame(tick);
        };
        tick();
    };

    const stopLoop = () => {
        if (!running) return;
        running = false;
        cancelAnimationFrame(animationId);
    };

    if (reduceMotion) {
        renderFrame(elapsed);
    } else {
        startLoop();
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) stopLoop();
            else startLoop();
        });
    }
})();
