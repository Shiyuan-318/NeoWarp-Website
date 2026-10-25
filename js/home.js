import * as THREE from './vendor/three.module.min.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Subtle depth interaction for feature cards. The demo windows are intentionally excluded. */
function initFeatureDepth() {
    if (reduceMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    document.querySelectorAll('[data-tilt]').forEach((card) => {
        card.addEventListener('pointermove', (event) => {
            const rect = card.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / rect.height;
            card.style.setProperty('--ry', `${(x - 0.5) * 3.2}deg`);
            card.style.setProperty('--rx', `${(0.5 - y) * 3.2}deg`);
            card.style.setProperty('--glow-x', `${x * 100}%`);
            card.style.setProperty('--glow-y', `${y * 100}%`);
        });

        card.addEventListener('pointerleave', () => {
            card.style.setProperty('--ry', '0deg');
            card.style.setProperty('--rx', '0deg');
            card.style.setProperty('--glow-x', '50%');
            card.style.setProperty('--glow-y', '50%');
        });
    });
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

function initHeroScene() {
    const canvas = document.getElementById('heroCanvas');
    const container = document.getElementById('heroVisual');
    if (!(canvas instanceof HTMLCanvasElement) || !container) return;

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
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 100);
        camera.position.set(0, 0.1, 8.6);

        const world = new THREE.Group();
        world.rotation.set(-0.08, -0.18, -0.04);
        scene.add(world);

        scene.add(new THREE.AmbientLight(0x9dbbe4, 1.25));
        const blueLight = new THREE.PointLight(0x398fff, 42, 16, 2);
        blueLight.position.set(-3.5, 2.8, 4);
        scene.add(blueLight);
        const orangeLight = new THREE.PointLight(0xff9d4d, 36, 14, 2);
        orangeLight.position.set(3.5, -1.8, 3);
        scene.add(orangeLight);
        const rimLight = new THREE.DirectionalLight(0xd9edff, 2.2);
        rimLight.position.set(0, 4, -2);
        scene.add(rimLight);

        const glowTexture = createGlowTexture();
        if (glowTexture) {
            const blueGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0x2277ee,
                transparent: true,
                opacity: 0.25,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            blueGlow.scale.set(7.5, 7.5, 1);
            blueGlow.position.set(-0.6, 0.25, -1.8);
            scene.add(blueGlow);

            const orangeGlow = new THREE.Sprite(new THREE.SpriteMaterial({
                map: glowTexture,
                color: 0xff8738,
                transparent: true,
                opacity: 0.11,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }));
            orangeGlow.scale.set(4.5, 4.5, 1);
            orangeGlow.position.set(1.5, -0.9, -0.6);
            scene.add(orangeGlow);
        }

        const core = new THREE.Group();
        world.add(core);

        const shell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.55, 3),
            new THREE.MeshPhysicalMaterial({
                color: 0x5a9bd4,
                metalness: 0.12,
                roughness: 0.16,
                transparent: true,
                opacity: 0.13,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
                side: THREE.DoubleSide,
                depthWrite: false
            })
        );
        core.add(shell);

        const innerShell = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.34, 1),
            new THREE.MeshStandardMaterial({
                color: 0x07101d,
                metalness: 0.75,
                roughness: 0.24,
                transparent: true,
                opacity: 0.82
            })
        );
        core.add(innerShell);

        const wireframe = new THREE.LineSegments(
            new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.59, 1), 12),
            new THREE.LineBasicMaterial({
                color: 0x72b8f7,
                transparent: true,
                opacity: 0.2,
                blending: THREE.AdditiveBlending
            })
        );
        core.add(wireframe);

        const textureLoader = new THREE.TextureLoader();
        const logoTexture = textureLoader.load('assets/Logo.png', () => {
            renderer.render(scene, camera);
        });
        logoTexture.colorSpace = THREE.SRGBColorSpace;
        const logo = new THREE.Sprite(new THREE.SpriteMaterial({
            map: logoTexture,
            transparent: true,
            depthTest: false,
            depthWrite: false
        }));
        logo.scale.set(2.22, 2.22, 1);
        logo.renderOrder = 5;
        world.add(logo);

        const rings = new THREE.Group();
        world.add(rings);
        const ringSettings = [
            { radius: 2.18, color: 0x5db3ff, opacity: 0.34, rotation: [1.12, 0.1, 0.3] },
            { radius: 2.58, color: 0xffac62, opacity: 0.23, rotation: [0.35, 1.04, -0.28] },
            { radius: 2.92, color: 0x7797ff, opacity: 0.13, rotation: [1.45, 0.42, 0.85] }
        ];
        ringSettings.forEach((setting) => {
            const ring = new THREE.Mesh(
                new THREE.TorusGeometry(setting.radius, 0.009, 6, 180),
                new THREE.MeshBasicMaterial({
                    color: setting.color,
                    transparent: true,
                    opacity: setting.opacity,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false
                })
            );
            ring.rotation.set(...setting.rotation);
            rings.add(ring);
        });

        const nodes = [];
        const nodeColors = [0x4ba5f7, 0xffa558, 0x7b8ff2, 0x4ba5f7, 0xffa558, 0x68c5a5];
        for (let index = 0; index < 6; index += 1) {
            const angle = (index / 6) * Math.PI * 2 + 0.25;
            const radius = index % 2 === 0 ? 2.55 : 2.85;
            const node = new THREE.Group();
            const block = new THREE.Mesh(
                new THREE.BoxGeometry(0.48, 0.3, 0.2),
                new THREE.MeshStandardMaterial({
                    color: nodeColors[index],
                    metalness: 0.38,
                    roughness: 0.3,
                    emissive: nodeColors[index],
                    emissiveIntensity: 0.08
                })
            );
            block.rotation.set(0.2, -0.2, angle * 0.12);
            node.add(block);

            const edges = new THREE.LineSegments(
                new THREE.EdgesGeometry(block.geometry),
                new THREE.LineBasicMaterial({ color: 0xe4f2ff, transparent: true, opacity: 0.24 })
            );
            edges.rotation.copy(block.rotation);
            node.add(edges);

            const socket = new THREE.Mesh(
                new THREE.CylinderGeometry(0.07, 0.07, 0.07, 16),
                new THREE.MeshStandardMaterial({ color: nodeColors[index], metalness: 0.3, roughness: 0.28 })
            );
            socket.rotation.x = Math.PI / 2;
            socket.position.set(-0.12, 0.18, 0);
            node.add(socket);

            node.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius * 0.7,
                Math.sin(angle * 1.7) * 1.05
            );
            node.userData.baseY = node.position.y;
            node.userData.phase = angle;
            world.add(node);
            nodes.push(node);
        }

        const particleCount = 620;
        const positions = new Float32Array(particleCount * 3);
        for (let index = 0; index < particleCount; index += 1) {
            const radius = 3.1 + Math.random() * 3.2;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[index * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
            positions[index * 3 + 2] = radius * Math.cos(phi);
        }
        const particleGeometry = new THREE.BufferGeometry();
        particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particles = new THREE.Points(
            particleGeometry,
            new THREE.PointsMaterial({
                color: 0x89b9e8,
                size: 0.022,
                transparent: true,
                opacity: 0.5,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            })
        );
        world.add(particles);

        const pointer = new THREE.Vector2(0, 0);
        const pointerTarget = new THREE.Vector2(0, 0);
        container.addEventListener('pointermove', (event) => {
            if (reduceMotion) return;
            const rect = container.getBoundingClientRect();
            pointerTarget.set(
                ((event.clientX - rect.left) / rect.width - 0.5) * 2,
                ((event.clientY - rect.top) / rect.height - 0.5) * 2
            );
        });
        container.addEventListener('pointerleave', () => pointerTarget.set(0, 0));

        let width = 0;
        let height = 0;
        const resize = () => {
            const rect = container.getBoundingClientRect();
            const nextWidth = Math.max(1, Math.round(rect.width));
            const nextHeight = Math.max(1, Math.round(rect.height));
            if (nextWidth === width && nextHeight === height) return;
            width = nextWidth;
            height = nextHeight;
            renderer.setSize(width, height, false);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
        };
        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        let inView = true;
        const visibilityObserver = new IntersectionObserver((entries) => {
            inView = entries[0]?.isIntersecting ?? true;
        }, { rootMargin: '100px' });
        visibilityObserver.observe(container);

        const clock = new THREE.Clock();
        let animationFrame = 0;
        const render = () => {
            animationFrame = requestAnimationFrame(render);
            if (!inView || document.hidden) return;

            const time = clock.getElapsedTime();
            pointer.lerp(pointerTarget, 0.045);
            world.rotation.y = -0.18 + pointer.x * 0.15;
            world.rotation.x = -0.08 + pointer.y * 0.1;
            camera.position.x = pointer.x * 0.12;
            camera.position.y = 0.1 - pointer.y * 0.08;
            camera.lookAt(0, 0, 0);

            if (!reduceMotion) {
                core.rotation.y = time * 0.085;
                core.rotation.x = Math.sin(time * 0.32) * 0.055;
                wireframe.rotation.y = -time * 0.11;
                rings.rotation.y = time * 0.045;
                rings.rotation.z = Math.sin(time * 0.18) * 0.08;
                particles.rotation.y = -time * 0.012;
                logo.position.y = Math.sin(time * 0.85) * 0.045;
                nodes.forEach((node, index) => {
                    node.position.y = node.userData.baseY + Math.sin(time * 0.7 + node.userData.phase) * 0.12;
                    node.rotation.y = time * (0.16 + index * 0.012);
                    node.rotation.z = Math.sin(time * 0.4 + index) * 0.12;
                });
            }
            renderer.render(scene, camera);
        };

        renderer.render(scene, camera);
        container.classList.add('webgl-ready');
        render();

        window.addEventListener('pagehide', () => {
            cancelAnimationFrame(animationFrame);
            resizeObserver.disconnect();
            visibilityObserver.disconnect();
            renderer.dispose();
            logoTexture.dispose();
            glowTexture?.dispose();
        }, { once: true });
    } catch (error) {
        container.classList.add('webgl-unavailable');
        console.warn('NeoWarp 3D scene is unavailable; using the static logo fallback.', error);
    }
}

initFeatureDepth();
initHeroScene();
