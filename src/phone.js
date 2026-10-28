import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PHONE = Object.freeze({ width: 3.36, height: 6.72, thickness: 0.27, radius: 0.43 });

export const FINISHES = Object.freeze({
  graphite: { frame: 0x62676b, back: 0x252a2d, label: '钛黑' },
  silver: { frame: 0xd2d4d1, back: 0xaeb2af, label: '星银' },
  blue: { frame: 0x627783, back: 0x2c424e, label: '深空蓝' },
});

function roundedRect(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const r = Math.min(radius, width / 2, height / 2);
  const shape = new THREE.Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.absarc(x + width - r, y + r, r, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - r);
  shape.absarc(x + width - r, y + height - r, r, 0, Math.PI / 2, false);
  shape.lineTo(x + r, y + height);
  shape.absarc(x + r, y + height - r, r, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + r);
  shape.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return shape;
}

function roundedSolid(width, height, radius, depth, bevel = 0.015) {
  const geometry = new THREE.ExtrudeGeometry(roundedRect(width, height, radius), {
    depth,
    steps: 1,
    curveSegments: 18,
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    bevelSize: bevel,
    bevelThickness: bevel,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function roundedFace(width, height, radius) {
  const geometry = new THREE.ShapeGeometry(roundedRect(width, height, radius), 24);
  const position = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < position.count; i += 1) {
    uv.setXY(i, position.getX(i) / width + 0.5, position.getY(i) / height + 0.5);
  }
  uv.needsUpdate = true;
  return geometry;
}

function makeMesh(geometry, material, position = [0, 0, 0], shadow = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  return mesh;
}

function seededRandom(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createWallpaper() {
  const canvas = document.createElement('canvas');
  canvas.width = 1536;
  canvas.height = 1536;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#496a82');
  sky.addColorStop(0.38, '#9da8a4');
  sky.addColorStop(0.63, '#d4b997');
  sky.addColorStop(1, '#7c624d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.7, h * 0.37, 10, w * 0.7, h * 0.37, w * 0.58);
  glow.addColorStop(0, 'rgba(255,231,190,.48)');
  glow.addColorStop(1, 'rgba(255,231,190,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  const layers = [
    { base: 0.51, amp: 0.085, color: '#69716d', freq: 0.006 },
    { base: 0.57, amp: 0.072, color: '#4e5754', freq: 0.008 },
    { base: 0.64, amp: 0.055, color: '#343d3b', freq: 0.011 },
  ];
  layers.forEach((layer, index) => {
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 8) {
      const ridge = Math.sin(x * layer.freq + index * 2.1) * 0.62
        + Math.sin(x * layer.freq * 2.43 + 1.7) * 0.27
        + Math.sin(x * layer.freq * 5.1) * 0.11;
      ctx.lineTo(x, h * (layer.base + ridge * layer.amp));
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  });

  const dune = ctx.createLinearGradient(0, h * 0.58, 0, h);
  dune.addColorStop(0, '#d9c3a1');
  dune.addColorStop(0.55, '#b49a79');
  dune.addColorStop(1, '#7e6651');
  ctx.fillStyle = dune;
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.bezierCurveTo(w * 0.22, h * 0.61, w * 0.37, h * 0.79, w * 0.58, h * 0.68);
  ctx.bezierCurveTo(w * 0.75, h * 0.6, w * 0.9, h * 0.62, w, h * 0.57);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(71,52,38,.12)';
  ctx.lineWidth = 1;
  for (let y = Math.floor(h * 0.73); y < h; y += 9) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 16) {
      const yy = y + Math.sin(x * 0.012 + y * 0.005) * 5;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }

  const rand = seededRandom(941);
  ctx.fillStyle = 'rgba(255,255,255,.045)';
  for (let i = 0; i < 2800; i += 1) {
    const x = rand() * w;
    const y = rand() * h;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(248,248,242,.92)';
  ctx.font = '500 34px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('WED, OCT 28', w / 2, 112);
  ctx.font = '200 284px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillText('9:41', w / 2, 390);
  ctx.font = '600 24px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('DUO', 92, 76);
  ctx.letterSpacing = '0px';

  ctx.strokeStyle = 'rgba(255,255,255,.85)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(w - 94, 69, 20, Math.PI, 0);
  ctx.arc(w - 94, 69, 32, Math.PI * 1.12, Math.PI * 1.88);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.85)';
  ctx.beginPath();
  ctx.arc(w - 94, 77, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,.82)';
  ctx.beginPath();
  ctx.roundRect(w / 2 - 116, h - 48, 232, 10, 5);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createLogoTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(130, 83);
  ctx.bezierCurveTo(111, 62, 74, 68, 56, 99);
  ctx.bezierCurveTo(30, 143, 47, 218, 80, 263);
  ctx.bezierCurveTo(96, 285, 112, 282, 132, 272);
  ctx.bezierCurveTo(151, 282, 169, 285, 185, 261);
  ctx.bezierCurveTo(205, 232, 216, 203, 218, 181);
  ctx.bezierCurveTo(180, 168, 174, 119, 204, 98);
  ctx.bezierCurveTo(184, 70, 151, 67, 130, 83);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(134, 62);
  ctx.bezierCurveTo(137, 30, 159, 10, 188, 8);
  ctx.bezierCurveTo(188, 37, 166, 63, 134, 62);
  ctx.fill();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(222, 132, 24, 0, Math.PI * 2);
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createMaterials() {
  return {
    frame: new THREE.MeshPhysicalMaterial({
      color: FINISHES.graphite.frame,
      metalness: 0.92,
      roughness: 0.23,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
    }),
    back: new THREE.MeshPhysicalMaterial({
      color: FINISHES.graphite.back,
      metalness: 0.28,
      roughness: 0.32,
      clearcoat: 0.75,
      clearcoatRoughness: 0.24,
    }),
    bezel: new THREE.MeshPhysicalMaterial({
      color: 0x080a0b,
      metalness: 0.28,
      roughness: 0.2,
      clearcoat: 1,
    }),
    dark: new THREE.MeshStandardMaterial({ color: 0x080a0c, metalness: 0.5, roughness: 0.28 }),
    lens: new THREE.MeshPhysicalMaterial({
      color: 0x101a24,
      metalness: 0.25,
      roughness: 0.08,
      clearcoat: 1,
      iridescence: 0.35,
      iridescenceIOR: 1.5,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xdce9ef,
      transparent: true,
      opacity: 0.075,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      depthWrite: false,
    }),
    screw: new THREE.MeshStandardMaterial({ color: 0x24292c, metalness: 0.85, roughness: 0.3 }),
  };
}

function addCameraCluster(panel, materials) {
  const bump = makeMesh(
    new RoundedBoxGeometry(1.42, 1.62, 0.14, 5, 0.2),
    materials.back,
    [0.47, 2.26, -0.205],
  );
  panel.add(bump);

  const ringGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 48).rotateX(Math.PI / 2);
  const lensGeometry = new THREE.CylinderGeometry(0.275, 0.275, 0.135, 48).rotateX(Math.PI / 2);
  const innerGeometry = new THREE.CircleGeometry(0.16, 40).rotateY(Math.PI);
  [-0.02, 0.82].forEach((x, index) => {
    panel.add(makeMesh(ringGeometry, materials.frame, [x, 2.43, -0.34]));
    panel.add(makeMesh(lensGeometry, materials.lens, [x, 2.43, -0.39]));
    const inner = makeMesh(innerGeometry, materials.dark, [x, 2.43, -0.462], false);
    panel.add(inner);
    const glint = makeMesh(
      new THREE.CircleGeometry(0.045, 24).rotateY(Math.PI),
      new THREE.MeshBasicMaterial({ color: index ? 0x66879e : 0x8ca3b5, transparent: true, opacity: 0.72 }),
      [x - 0.07, 2.51, -0.466],
      false,
    );
    panel.add(glint);
  });

  const flash = makeMesh(
    new THREE.CircleGeometry(0.115, 32).rotateY(Math.PI),
    new THREE.MeshPhysicalMaterial({ color: 0xf2e7c9, roughness: 0.3, clearcoat: 0.8 }),
    [0.83, 1.87, -0.285],
    false,
  );
  panel.add(flash);
  panel.add(makeMesh(
    new THREE.CircleGeometry(0.075, 24).rotateY(Math.PI),
    materials.dark,
    [0.18, 1.87, -0.285],
    false,
  ));
}

function addEdgeDetails(panel, side, materials) {
  const { width: w, height: h, thickness: t } = PHONE;
  const outerX = side * (w / 2 + 0.025);
  const buttonGeometry = new RoundedBoxGeometry(0.065, 0.74, 0.115, 3, 0.028);
  const smallButtonGeometry = new RoundedBoxGeometry(0.065, 0.47, 0.115, 3, 0.028);

  if (side === 1) {
    panel.add(makeMesh(buttonGeometry, materials.frame, [outerX, 1.12, 0]));
  } else {
    panel.add(makeMesh(smallButtonGeometry, materials.frame, [outerX, 1.56, 0]));
    panel.add(makeMesh(smallButtonGeometry, materials.frame, [outerX, 0.88, 0]));
    panel.add(makeMesh(new RoundedBoxGeometry(0.065, 0.28, 0.1, 3, 0.025), materials.frame, [outerX, 2.15, 0]));
  }

  const holeGeometry = new THREE.CylinderGeometry(0.033, 0.033, 0.022, 16);
  for (let i = 0; i < 6; i += 1) {
    const x = side * (0.57 + i * 0.13);
    panel.add(makeMesh(holeGeometry, materials.dark, [x, -h / 2 - 0.012, 0], false));
  }
  panel.add(makeMesh(
    new RoundedBoxGeometry(0.54, 0.035, 0.13, 3, 0.017),
    materials.dark,
    [0, -h / 2 - 0.018, 0],
    false,
  ));

  const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x9a9c98, roughness: 0.55, metalness: 0.25 });
  [-1, 1].forEach((ySign) => {
    panel.add(makeMesh(
      new RoundedBoxGeometry(0.075, 0.022, t + 0.025, 2, 0.008),
      antennaMaterial,
      [side * (w / 2 - 0.37), ySign * (h / 2 + 0.012), 0],
      false,
    ));
  });
}

function createPanel(side, materials, wallpaper, logoTexture) {
  const { width: w, height: h, thickness: t, radius: r } = PHONE;
  const panel = new THREE.Group();
  panel.name = side < 0 ? 'left-panel' : 'right-panel';

  panel.add(makeMesh(roundedSolid(w, h, r, t, 0.035), materials.frame));
  panel.add(makeMesh(
    roundedSolid(w - 0.105, h - 0.105, r - 0.035, 0.027, 0.008),
    materials.back,
    [0, 0, -t / 2 - 0.04],
  ));
  panel.add(makeMesh(
    roundedSolid(w - 0.095, h - 0.095, r - 0.035, 0.025, 0.006),
    materials.bezel,
    [0, 0, t / 2 + 0.04],
  ));

  const screenTexture = wallpaper.clone();
  screenTexture.needsUpdate = true;
  screenTexture.repeat.set(0.5, 1);
  screenTexture.offset.set(side < 0 ? 0 : 0.5, 0);
  const screenMaterial = new THREE.MeshBasicMaterial({ map: screenTexture, toneMapped: false });
  const screen = makeMesh(roundedFace(w - 0.225, h - 0.225, r - 0.065), screenMaterial, [0, 0, t / 2 + 0.06], false);
  screen.name = side < 0 ? 'screen-left' : 'screen-right';
  panel.add(screen);
  panel.add(makeMesh(
    roundedFace(w - 0.225, h - 0.225, r - 0.065),
    materials.glass,
    [0, 0, t / 2 + 0.064],
    false,
  ));

  const cameraX = side * (w / 2 - 0.37);
  panel.add(makeMesh(new THREE.CircleGeometry(0.075, 28), materials.dark, [cameraX, h / 2 - 0.37, t / 2 + 0.069], false));
  panel.add(makeMesh(
    new THREE.CircleGeometry(0.032, 24),
    new THREE.MeshBasicMaterial({ color: 0x182b38 }),
    [cameraX, h / 2 - 0.37, t / 2 + 0.071],
    false,
  ));
  panel.add(makeMesh(
    new RoundedBoxGeometry(0.38, 0.025, 0.018, 2, 0.01),
    materials.dark,
    [0, h / 2 - 0.105, t / 2 + 0.072],
    false,
  ));

  const logo = makeMesh(
    new THREE.PlaneGeometry(0.52, 0.65),
    new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, opacity: 0.3, depthWrite: false }),
    [0, -0.1, -t / 2 - 0.073],
    false,
  );
  logo.rotation.y = Math.PI;
  panel.add(logo);

  if (side === 1) addCameraCluster(panel, materials);
  addEdgeDetails(panel, side, materials);
  return panel;
}

export function createIPhoneDuo() {
  const root = new THREE.Group();
  root.name = 'iphone-duo';
  root.position.y = 3.75;

  const materials = createMaterials();
  const wallpaper = createWallpaper();
  const logoTexture = createLogoTexture();
  const leftPivot = new THREE.Group();
  const rightPivot = new THREE.Group();
  leftPivot.name = 'left-hinge-pivot';
  rightPivot.name = 'right-hinge-pivot';

  const leftPanel = createPanel(-1, materials, wallpaper, logoTexture);
  const rightPanel = createPanel(1, materials, wallpaper, logoTexture);
  leftPanel.position.x = -PHONE.width / 2 - 0.06;
  rightPanel.position.x = PHONE.width / 2 + 0.06;
  leftPivot.add(leftPanel);
  rightPivot.add(rightPanel);
  root.add(leftPivot, rightPivot);

  const hinge = new THREE.Group();
  hinge.name = 'segmented-hinge';
  hinge.add(makeMesh(
    new THREE.CylinderGeometry(0.102, 0.102, PHONE.height - 0.42, 32),
    materials.dark,
  ));
  const barrelGeometry = new THREE.CylinderGeometry(0.132, 0.132, 0.77, 40);
  for (let i = 0; i < 7; i += 1) {
    const barrel = makeMesh(barrelGeometry, materials.frame, [0, (i - 3) * 0.88, 0]);
    barrel.name = `hinge-knuckle-${i + 1}`;
    hinge.add(barrel);
  }
  [-1, 1].forEach((sign) => {
    hinge.add(makeMesh(
      new THREE.CylinderGeometry(0.145, 0.145, 0.12, 40),
      materials.frame,
      [0, sign * (PHONE.height / 2 - 0.22), 0],
    ));
  });
  root.add(hinge);

  let currentAngle = 180;
  function setAngle(degrees) {
    currentAngle = THREE.MathUtils.clamp(Number(degrees) || 0, 0, 180);
    const fold = THREE.MathUtils.degToRad(180 - currentAngle);
    const closure = 1 - currentAngle / 180;
    rightPivot.rotation.y = -fold;
    rightPivot.position.z = closure * 0.32;
    hinge.position.z = closure * 0.16;
    root.updateMatrixWorld(true);
  }

  function setFinish(name) {
    const finish = FINISHES[name] || FINISHES.graphite;
    materials.frame.color.setHex(finish.frame);
    materials.back.color.setHex(finish.back);
  }

  setAngle(180);
  return {
    root,
    leftPivot,
    rightPivot,
    leftPanel,
    rightPanel,
    hinge,
    materials,
    setAngle,
    setFinish,
    get angle() { return currentAngle; },
  };
}
