import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createIPhoneDuo, FINISHES } from './phone.js';

const DURATION = 12;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;
const viewport = document.getElementById('viewport');
const stage = document.getElementById('stage');
const loading = document.getElementById('loading');

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createContactTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
  gradient.addColorStop(0, 'rgba(0,0,0,.7)');
  gradient.addColorStop(0.4, 'rgba(0,0,0,.35)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(canvas);
}

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.setAttribute('aria-label', '可拖拽旋转的 iPhone Duo 双屏折叠模型');
  renderer.domElement.setAttribute('role', 'img');
  viewport.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const sky = new THREE.Color(0x101419);
  scene.fog = new THREE.Fog(sky, 24, 78);

  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 220);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.065;
  controls.enablePan = false;
  controls.minDistance = 7;
  controls.maxDistance = 34;
  controls.minPolarAngle = 0.28;
  controls.maxPolarAngle = Math.PI * 0.54;
  controls.autoRotateSpeed = 0.72;
  controls.target.set(0, 3.45, 0);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.035);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();

  scene.add(new THREE.HemisphereLight(0xc6daea, 0x241c16, 1.35));
  const key = new THREE.DirectionalLight(0xffead5, 3.1);
  key.position.set(7, 12, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -4;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 34;
  key.shadow.normalBias = 0.025;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x91b9d8, 1.55);
  fill.position.set(-8, 5, 7);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xd8e9f4, 2.25);
  rim.position.set(2, 7, -9);
  scene.add(rim);
  const bounce = new THREE.PointLight(0xc99770, 0.75, 20, 2);
  bounce.position.set(0, 1.2, 4);
  scene.add(bounce);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(180, 80).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x11151a, roughness: 0.98, metalness: 0.02 }),
  );
  ground.receiveShadow = true;
  scene.add(ground);

  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(4.55, 4.62, 0.12, 96),
    new THREE.MeshStandardMaterial({ color: 0x171c21, roughness: 0.67, metalness: 0.3 }),
  );
  plinth.position.y = 0.06;
  plinth.receiveShadow = true;
  scene.add(plinth);

  const rimRing = new THREE.Mesh(
    new THREE.TorusGeometry(4.58, 0.009, 8, 128).rotateX(Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x4b565c, transparent: true, opacity: 0.55 }),
  );
  rimRing.position.y = 0.122;
  scene.add(rimRing);

  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(8.2, 4.4).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: createContactTexture(), transparent: true, opacity: 0.56, depthWrite: false }),
  );
  contact.position.y = 0.126;
  scene.add(contact);

  const farField = new THREE.Group();
  const rand = seededRandom(20261028);
  const farMaterial = new THREE.MeshStandardMaterial({ color: 0x11161c, roughness: 1 });
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 34 + rand() * 20;
    const height = 3 + rand() * 8;
    const mass = new THREE.Mesh(new THREE.BoxGeometry(3 + rand() * 5, height, 3 + rand() * 5), farMaterial);
    mass.position.set(Math.cos(angle) * radius, height / 2, Math.sin(angle) * radius);
    mass.rotation.y = rand() * Math.PI;
    farField.add(mass);
  }
  scene.add(farField);

  const phone = createIPhoneDuo();
  phone.root.position.y = 3.48;
  scene.add(phone.root);

  const state = {
    angle: 180,
    targetAngle: 180,
    autoRotate: false,
    view: 'hero',
    finish: 'graphite',
    paused: false,
    cameraAnimating: false,
  };
  const cameraGoal = new THREE.Vector3();
  const targetGoal = new THREE.Vector3();
  const goalSpherical = new THREE.Spherical();
  const currentSpherical = new THREE.Spherical();
  const transitionOffset = new THREE.Vector3();
  const clock = new THREE.Clock();
  let fpsFrames = 0;
  let fpsElapsed = 0;

  function viewConfiguration(name) {
    const mobile = viewport.clientWidth / Math.max(viewport.clientHeight, 1) < 0.82;
    const compact = viewport.clientWidth <= 800 && viewport.clientHeight < 520;
    const targetY = mobile ? 3.28 : 3.45;
    const scale = compact ? 1.35 : mobile ? 1.34 : 1;
    const configurations = {
      hero: { direction: new THREE.Vector3(9, 4.7, 13), distance: 17.1 * scale, target: new THREE.Vector3(0, targetY, 0) },
      front: { direction: new THREE.Vector3(0, 0.35, 1), distance: 15.7 * scale, target: new THREE.Vector3(0, targetY, 0) },
      back: { direction: new THREE.Vector3(0, 0.65, -1), distance: 15.7 * scale, target: new THREE.Vector3(0, targetY, 0) },
      hinge: { direction: new THREE.Vector3(0.32, 0.13, 1), distance: 9.3 * (compact ? 1.35 : mobile ? 1.15 : 1), target: new THREE.Vector3(0, 3.5, 0) },
    };
    return configurations[name] || configurations.hero;
  }

  function setView(name, immediate = false) {
    const configuration = viewConfiguration(name);
    targetGoal.copy(configuration.target);
    cameraGoal.copy(configuration.direction).normalize().multiplyScalar(configuration.distance).add(targetGoal);
    goalSpherical.setFromVector3(transitionOffset.copy(cameraGoal).sub(targetGoal));
    state.view = name;
    state.cameraAnimating = !immediate;
    if (immediate || REDUCED_MOTION) {
      camera.position.copy(cameraGoal);
      controls.target.copy(targetGoal);
      controls.update();
      state.cameraAnimating = false;
    }
    document.querySelectorAll('[data-view]').forEach((button) => {
      const active = button.dataset.view === name;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function updateAngleUI() {
    const rounded = Math.round(state.angle);
    const output = document.getElementById('angle-output');
    const slider = document.getElementById('angle-slider');
    if (output.value !== `${rounded}°`) output.value = `${rounded}°`;
    if (document.activeElement !== slider && Number(slider.value) !== rounded) slider.value = String(rounded);
    const label = document.querySelector('#fold-toggle span');
    const nextLabel = state.targetAngle > 90 ? '合拢' : '展开';
    if (label.textContent !== nextLabel) label.textContent = nextLabel;
  }

  function applyAngle(value) {
    state.angle = THREE.MathUtils.clamp(value, 0, 180);
    phone.setAngle(state.angle);
    updateAngleUI();
  }

  document.getElementById('fold-toggle').addEventListener('click', () => {
    state.paused = false;
    state.targetAngle = state.targetAngle > 90 ? 0 : 180;
    if (REDUCED_MOTION) applyAngle(state.targetAngle);
    updateAngleUI();
  });

  document.getElementById('angle-slider').addEventListener('input', (event) => {
    state.paused = false;
    const value = Number(event.currentTarget.value);
    state.targetAngle = value;
    applyAngle(value);
  });

  document.getElementById('rotate-toggle').addEventListener('click', (event) => {
    state.paused = false;
    state.autoRotate = !state.autoRotate;
    controls.autoRotate = state.autoRotate;
    event.currentTarget.setAttribute('aria-pressed', String(state.autoRotate));
  });

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.paused = false;
      setView(button.dataset.view);
    });
  });

  document.querySelectorAll('[data-finish]').forEach((button) => {
    button.addEventListener('click', () => {
      state.finish = button.dataset.finish;
      phone.setFinish(state.finish);
      document.getElementById('finish-name').textContent = FINISHES[state.finish].label;
      document.querySelectorAll('[data-finish]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
    });
  });

  document.getElementById('reset-view').addEventListener('click', () => {
    state.paused = false;
    setView('hero');
  });

  const fullscreenButton = document.getElementById('fullscreen');
  if (!stage.requestFullscreen) fullscreenButton.hidden = true;
  fullscreenButton.addEventListener('click', async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    const active = Boolean(document.fullscreenElement);
    fullscreenButton.setAttribute('aria-label', active ? '退出全屏' : '进入全屏');
    fullscreenButton.setAttribute('title', active ? '退出全屏' : '全屏');
  });

  controls.addEventListener('start', () => {
    state.cameraAnimating = false;
    state.view = 'custom';
    document.querySelectorAll('[data-view]').forEach((button) => {
      button.classList.remove('is-active');
      button.setAttribute('aria-pressed', 'false');
    });
  });

  function resize() {
    const width = Math.max(viewport.clientWidth, 1);
    const height = Math.max(viewport.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (state.view !== 'custom') setView(state.view, true);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(viewport);

  function updateStats(dt) {
    fpsFrames += 1;
    fpsElapsed += dt;
    if (fpsElapsed >= 0.5) {
      window.__SCENE_STATS__.fps = Math.round(fpsFrames / fpsElapsed);
      fpsFrames = 0;
      fpsElapsed = 0;
    }
    window.__SCENE_STATS__.drawCalls = renderer.info.render.calls;
    window.__SCENE_STATS__.triangles = renderer.info.render.triangles;
  }

  window.__SCENE_STATS__ = { fps: 0, drawCalls: 0, triangles: 0 };
  window.__DUO_STATE__ = {
    get angle() { return state.angle; },
    get targetAngle() { return state.targetAngle; },
    get autoRotate() { return state.autoRotate; },
    get view() { return state.view; },
    get transitioning() { return state.cameraAnimating; },
    get finish() { return state.finish; },
    get cameraPosition() { return camera.position.toArray(); },
  };

  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.06);
    if (state.paused) return;

    const difference = state.targetAngle - state.angle;
    if (Math.abs(difference) > 0.015) {
      const blend = REDUCED_MOTION ? 1 : 1 - Math.exp(-dt * 7.5);
      applyAngle(state.angle + difference * blend);
    } else if (state.angle !== state.targetAngle) {
      applyAngle(state.targetAngle);
    }

    if (state.cameraAnimating) {
      const blend = 1 - Math.exp(-dt * 9);
      transitionOffset.copy(camera.position).sub(controls.target);
      currentSpherical.setFromVector3(transitionOffset);
      const thetaDelta = Math.atan2(
        Math.sin(goalSpherical.theta - currentSpherical.theta),
        Math.cos(goalSpherical.theta - currentSpherical.theta),
      );
      const phiDelta = goalSpherical.phi - currentSpherical.phi;
      const radiusDelta = goalSpherical.radius - currentSpherical.radius;
      currentSpherical.theta += thetaDelta * blend;
      currentSpherical.phi += phiDelta * blend;
      currentSpherical.radius += radiusDelta * blend;
      controls.target.lerp(targetGoal, blend);
      transitionOffset.setFromSpherical(currentSpherical);
      camera.position.copy(controls.target).add(transitionOffset);
      if (Math.abs(thetaDelta) < 0.01 && Math.abs(phiDelta) < 0.01 && Math.abs(radiusDelta) < 0.02 && controls.target.distanceTo(targetGoal) < 0.02) {
        camera.position.copy(cameraGoal);
        controls.target.copy(targetGoal);
        state.cameraAnimating = false;
      }
    }
    controls.autoRotate = state.autoRotate && !state.cameraAnimating;
    controls.update();
    renderer.render(scene, camera);
    updateStats(dt);
  });

  window.__seek = (time) => {
    loading.hidden = true;
    const value = Number(time);
    const t = Number.isFinite(value) && value > 0 ? value : 0;
    state.paused = true;
    state.autoRotate = false;
    controls.autoRotate = false;
    document.getElementById('rotate-toggle').setAttribute('aria-pressed', 'false');
    const damping = controls.enableDamping;
    controls.enableDamping = false;
    setView('hero', true);
    controls.enableDamping = damping;
    const wrappedTime = ((t % DURATION) + DURATION) % DURATION;
    const phase = (wrappedTime / DURATION) * Math.PI * 2;
    const angle = 90 + 90 * Math.cos(phase);
    state.targetAngle = angle;
    applyAngle(angle);
    renderer.render(scene, camera);
    updateStats(0);
  };
  window.__play = () => {
    state.paused = false;
    clock.getDelta();
  };

  setView('hero', true);
  applyAngle(180);
  resize();
  renderer.render(scene, camera);

  const timeParameter = new URLSearchParams(location.search).get('t');
  if (timeParameter !== null) window.__seek(timeParameter);

  requestAnimationFrame(() => {
    loading.classList.add('is-ready');
    window.__SCENE_READY__ = true;
    setTimeout(() => { loading.hidden = true; }, 300);
  });
}

try {
  init();
} catch (error) {
  loading.hidden = true;
  document.getElementById('load-error').hidden = false;
  console.error('Unable to initialize the 3D scene:', error);
}
