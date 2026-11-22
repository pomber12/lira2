// =========================================================
// ЛИРА – изглед „Стая“
// ---------------------------------------------------------
// Уютен тъмен апартамент: голям прозорец към нощния град,
// диван, масичка, лампа, рафт с книги, растение, килим и
// неонови ленти. Тя стои на проектора в средата.
// Рисува се на отделен canvas (#room) зад холограмата.
// Мерките са в метри (тя е висока около 1.6 м).
// =========================================================

const Room = (() => {
  if (!window.LIRA3D) return null;
  const { THREE } = window.LIRA3D;

  const canvas = document.getElementById("room");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0812);
  scene.fog = new THREE.Fog(0x0a0812, 8, 16);

  let seed = 11;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  // Помощни функции
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...extra });
  const glowMat = (color) => new THREE.MeshBasicMaterial({ color });
  function box(w, h, d, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    scene.add(m);
    return m;
  }
  // отбелязва всичко, добавено в сцената от fn, като част от занимание (за щракане)
  function activity(name, fn) {
    const before = scene.children.length;
    fn();
    for (const o of scene.children.slice(before)) o.traverse((c) => { c.userData.activity = name; });
  }
  function canvasTexture(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---------- Светлини ----------
  scene.add(new THREE.AmbientLight(0x7a6a9a, 0.95));
  const lampLight = new THREE.PointLight(0xffb36b, 6, 6, 1.6);      // топла лампа
  lampLight.position.set(2.45, 1.55, -1.4);
  scene.add(lampLight);
  const windowLight = new THREE.PointLight(0x5fa8ff, 4, 7, 1.4);    // студена светлина от града
  windowLight.position.set(0, 1.8, -2.2);
  scene.add(windowLight);
  const neonLight = new THREE.PointLight(0xff4fb8, 3, 6, 1.5);      // розов неон
  neonLight.position.set(-2.9, 2.5, 0.5);
  scene.add(neonLight);
  const holoLight = new THREE.PointLight(0x6fe8ff, 2.5, 3, 1.5);    // сиянието от нея
  holoLight.position.set(0, 0.9, 0.3);
  scene.add(holoLight);

  // ---------- Под, стени, таван ----------
  const floorTex = canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = "#241a22"; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {                  // дъски
      const shift = (y / 32) % 2 ? 0 : 128;
      for (let x = -shift; x < w; x += 256) {
        const v = 30 + rand() * 18;
        g.fillStyle = `rgb(${v + 8},${v - 4},${v})`;
        g.fillRect(x + 1, y + 1, 254, 30);
      }
    }
  });
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(3, 3);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(7, 7), mat(0xffffff, { map: floorTex, roughness: 0.6 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 0.6;
  scene.add(floor);

  const wallMat = mat(0x2a2338);
  const W = 7, H = 3, back = -2.6;
  // задна стена с голям прозорец (x от -2 до 2, y от 0.7 до 2.5)
  box(1.5, H, 0.1, wallMat, -2.75, H / 2, back);
  box(1.5, H, 0.1, wallMat, 2.75, H / 2, back);
  box(4, 0.7, 0.1, wallMat, 0, 0.35, back);
  box(4, 0.5, 0.1, wallMat, 0, 2.75, back);
  // странични стени и таван
  box(0.1, H, 7, wallMat, -3.5, H / 2, 0.9);
  box(0.1, H, 7, wallMat, 3.5, H / 2, 0.9);
  box(W, 0.1, 7, mat(0x17121f), 0, H, 0.9);

  // ---------- Прозорецът: нощният град навън ----------
  // Морето през прозореца: нощно небе със звезди, луна и лунна пътека по водата
  const cityTex = canvasTexture(1024, 460, (g, w, h) => {
    const horizon = h * 0.52;
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#0a0a2a"); sky.addColorStop(0.7, "#2a1e54"); sky.addColorStop(1, "#5a3a7a");
    g.fillStyle = sky; g.fillRect(0, 0, w, horizon);
    for (let i = 0; i < 260; i++) {                    // звезди
      g.fillStyle = `rgba(255,255,255,${0.2 + rand() * 0.8})`;
      const r = rand() < 0.08 ? 1.6 : 0.8;
      g.beginPath(); g.arc(rand() * w, rand() * horizon * 0.92, r, 0, 7); g.fill();
    }
    const mx = w * 0.62, my = horizon * 0.34;          // луна с ореол
    const halo = g.createRadialGradient(mx, my, 10, mx, my, 120);
    halo.addColorStop(0, "rgba(255,240,210,.45)"); halo.addColorStop(1, "rgba(255,240,210,0)");
    g.fillStyle = halo; g.fillRect(mx - 120, my - 120, 240, 240);
    g.fillStyle = "#fff6e0"; g.beginPath(); g.arc(mx, my, 30, 0, 7); g.fill();
    g.fillStyle = "rgba(200,190,170,.35)"; g.beginPath(); g.arc(mx - 8, my - 6, 7, 0, 7); g.arc(mx + 10, my + 8, 5, 0, 7); g.fill();
    // далечни хълмове на хоризонта
    g.fillStyle = "#1a1230";
    g.beginPath(); g.moveTo(0, horizon);
    for (let x = 0; x <= w * 0.3; x += 20) g.lineTo(x, horizon - 18 - Math.sin(x / 60) * 10 - rand() * 4);
    g.lineTo(w * 0.3, horizon); g.closePath(); g.fill();
    // морето
    const sea = g.createLinearGradient(0, horizon, 0, h);
    sea.addColorStop(0, "#2a2350"); sea.addColorStop(1, "#090a1c");
    g.fillStyle = sea; g.fillRect(0, horizon, w, h - horizon);
    for (let y = horizon + 3; y < h; y += 3 + (y - horizon) / 18) {   // вълнички – по-дълги към брега
      for (let k = 0; k < 18; k++) {
        const x = rand() * w, len = 6 + (y - horizon) * 0.25 * rand();
        const nearMoon = Math.max(0, 1 - Math.abs(x - mx) / (40 + (y - horizon) * 1.3));
        g.strokeStyle = `rgba(${200 + 55 * nearMoon},${200 + 40 * nearMoon},${255 - 40 * nearMoon},${0.08 + nearMoon * 0.75})`;
        g.lineWidth = 1 + (y - horizon) / 90;
        g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2, y); g.stroke();
      }
    }
    g.fillStyle = "rgba(255,90,200,.5)"; g.fillRect(w * 0.12, horizon - 2, 3, 3);   // далечен фар
  });
  const windowView = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.8), new THREE.MeshBasicMaterial({ map: cityTex }));
  windowView.position.set(0, 1.6, back - 0.04);
  scene.add(windowView);
  // рамка и кръстачка на прозореца
  const frameMat = mat(0x0c0a12, { roughness: 0.4 });
  box(4.05, 0.05, 0.08, frameMat, 0, 0.72, back + 0.02);
  box(4.05, 0.05, 0.08, frameMat, 0, 2.48, back + 0.02);
  box(0.05, 1.8, 0.08, frameMat, 0, 1.6, back + 0.02);
  box(0.05, 1.8, 0.08, frameMat, -2, 1.6, back + 0.02);
  box(0.05, 1.8, 0.08, frameMat, 2, 1.6, back + 0.02);
  // перваз
  box(4.2, 0.05, 0.3, mat(0x1c1626), 0, 0.7, back + 0.15);

  // ---------- Неонови ленти ----------
  box(6.9, 0.03, 0.03, glowMat(0xff4fb8), 0, 2.93, back + 0.08);        // по тавана отзад
  box(0.03, 0.03, 6.9, glowMat(0xff4fb8), -3.43, 2.93, 0.9);           // по тавана вляво
  box(4, 0.02, 0.02, glowMat(0x4fe6ff), 0, 0.69, back + 0.31);          // под перваза

  // ---------- Лампа (вдясно отзад) ----------
  box(0.3, 0.03, 0.3, mat(0x111111), 2.45, 0.015, -1.4);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.5, 8), mat(0x222222, { metalness: 0.6 }));
  pole.position.set(2.45, 0.77, -1.4);
  scene.add(pole);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.3, 24, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffd9a8, emissive: 0xffa060, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
  shade.position.set(2.45, 1.6, -1.4);
  scene.add(shade);

  // ---------- Рафт с книги (дясната стена) ----------
  const shelfMat = mat(0x2a1f1a, { roughness: 0.6 });
  for (const y of [0.9, 1.35, 1.8]) {
    box(0.3, 0.03, 1.6, shelfMat, 3.3, y, 0.6);
    let z = -0.15;
    while (z < 1.3) {
      const t = 0.03 + rand() * 0.05, hgt = 0.2 + rand() * 0.12;
      const colors = [0x6b3a5a, 0x2f4a6b, 0x8a6a3a, 0x3a6b5a, 0x5a3a7a, 0xa04a5a];
      box(0.2, hgt, t, mat(colors[Math.floor(rand() * colors.length)]), 3.3, y + 0.015 + hgt / 2, z);
      z += t + 0.005;
      if (rand() < 0.12) z += 0.15;
    }
  }

  activity("shelf", () => {
  // ---------- Висока библиотека отзад вляво (тя понякога я разглежда) ----------
  const BOOKCASE = { x: -2.7, z: -2.38, w: 1.0, d: 0.32, h: 2.1 };
  {
    const caseMat = mat(0x2a1f1a, { roughness: 0.6 });
    const { x, z, w, d, h } = BOOKCASE;
    box(w, h, 0.03, caseMat, x, h / 2, z - d / 2);            // гръб
    box(0.04, h, d, caseMat, x - w / 2, h / 2, z);            // страни
    box(0.04, h, d, caseMat, x + w / 2, h / 2, z);
    const colors = [0x6b3a5a, 0x2f4a6b, 0x8a6a3a, 0x3a6b5a, 0x5a3a7a, 0xa04a5a, 0x7a5a3a, 0x3a3a6b];
    for (let level = 0; level < 5; level++) {
      const y = 0.06 + level * 0.42;
      box(w, 0.03, d, caseMat, x, y, z);                       // рафт
      if (level === 4) break;
      let bx = x - w / 2 + 0.05;
      while (bx < x + w / 2 - 0.05) {
        const t = 0.03 + rand() * 0.045, bh = 0.24 + rand() * 0.1;
        if (bx + t > x + w / 2 - 0.04) break;
        const book = box(t, bh, 0.22, mat(colors[Math.floor(rand() * colors.length)]), bx + t / 2, y + 0.015 + bh / 2, z + 0.02);
        if (rand() < 0.08) book.rotation.z = 0.25;             // някоя наклонена книга
        bx += t + 0.004;
        if (rand() < 0.06) bx += 0.12;                          // празно място
      }
    }
  }
  });

  let record, hornMouth;
  activity("gramo", () => {
  // ---------- Грамофон на шкафче пред прозореца (вдясно) ----------
  const GR = { x: 1.45, z: -2.2 };
  const brass = new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.85, roughness: 0.3, emissive: 0x2a1a04 });
  box(0.62, 0.6, 0.42, mat(0x3a2a24, { roughness: 0.5 }), GR.x, 0.3, GR.z);              // шкафче
  box(0.36, 0.09, 0.32, mat(0x5a3a26, { roughness: 0.45 }), GR.x, 0.645, GR.z);          // кутия на грамофона
  record = new THREE.Group();
  const vinylTex = canvasTexture(256, 256, (g, w) => {
    g.fillStyle = "#111"; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
    g.strokeStyle = "rgba(255,255,255,.07)"; g.lineWidth = 1;
    for (let r = 30; r < w / 2 - 4; r += 4) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); }
    g.fillStyle = "#c8304a"; g.beginPath(); g.arc(w / 2, w / 2, 26, 0, 7); g.fill();
    g.fillStyle = "#fff"; g.fillRect(w / 2 - 14, w / 2 - 3, 28, 6);
  });
  const vinyl = new THREE.Mesh(new THREE.CircleGeometry(0.13, 40), new THREE.MeshStandardMaterial({ map: vinylTex, roughness: 0.35 }));
  vinyl.rotation.x = -Math.PI / 2;
  record.add(vinyl);
  record.position.set(GR.x - 0.02, 0.692, GR.z + 0.01);
  scene.add(record);
  // рамото с иглата
  const tonearm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.18), brass);
  tonearm.position.set(GR.x + 0.13, 0.705, GR.z + 0.02); tonearm.rotation.y = 0.5; scene.add(tonearm);
  // фуния – разширява се нагоре и напред
  const hornPts = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; hornPts.push(new THREE.Vector2(0.012 + Math.pow(t, 2.4) * 0.17, t * 0.34)); }
  const horn = new THREE.Mesh(new THREE.LatheGeometry(hornPts, 32), new THREE.MeshStandardMaterial({ color: 0xd8a84a, metalness: 0.85, roughness: 0.3, emissive: 0x2a1a04, side: THREE.DoubleSide }));
  horn.position.set(GR.x + 0.1, 0.69, GR.z - 0.08);
  horn.rotation.x = 0.85;                                   // наклонена напред към стаята
  scene.add(horn);
  hornMouth = new THREE.Vector3(GR.x + 0.1, 0.69 + Math.cos(0.85) * 0.34, GR.z - 0.08 + Math.sin(0.85) * 0.34);
  });

  // Нотки: светещи ♪ ♫, които излизат от фунията и се издигат
  const noteTex = ["♪", "♫", "♩", "♬"].map((ch) => canvasTexture(64, 64, (g, w) => {
    g.shadowColor = "#fff"; g.shadowBlur = 8; g.fillStyle = "#fff"; g.font = "bold 52px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, w / 2, w / 2 + 2);
  }));
  const notes = [];
  const NOTE_COLORS = [0xff7ad6, 0x6fe8ff, 0xffd98a, 0xb79cff];
  for (let i = 0; i < 14; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex[i % noteTex.length], color: NOTE_COLORS[i % 4], transparent: true, opacity: 0, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
    sp.scale.setScalar(0.17);
    sp.userData = { life: -1, vx: 0, vz: 0, phase: Math.random() * 6 };
    scene.add(sp);
    notes.push(sp);
  }
  let playing = 0, noteTimer = 0;

  // ---------- Платно за рисуване (статив) в средата на стаята ----------
  const EASEL = { x: -0.35, z: -1.6, angle: -Math.PI / 3 };   // в средата отзад, леко обърнато към стаята
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = 256; paintCanvas.height = 192;
  const pctx = paintCanvas.getContext("2d");
  pctx.fillStyle = "#f6f1e7"; pctx.fillRect(0, 0, 256, 192);           // чисто бяло платно
  const paintTex = new THREE.CanvasTexture(paintCanvas);
  paintTex.colorSpace = THREE.SRGBColorSpace;
  activity("easel", () => {
    const wood = mat(0x7a5232, { roughness: 0.6 });
    const g = new THREE.Group();
    const leg = (x, z, rx, rz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), wood); m.position.set(x, 0.78, z); m.rotation.set(rx, 0, rz); g.add(m); };
    leg(0, -0.22, 0, 0.12); leg(0, 0.22, 0, 0.12); leg(-0.28, 0, 0, -0.18);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 0.66), wood); tray.position.set(0.05, 0.93, 0); g.add(tray);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.45), new THREE.MeshStandardMaterial({ map: paintTex, roughness: 0.9 }));
    board.position.set(0.045, 1.2, 0); board.rotation.set(0, Math.PI / 2, 0.12); g.add(board);      // гледа към стаята, леко наклонено назад
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.47, 0.62), wood); back.position.set(0.025, 1.2, 0); back.rotation.z = 0.12; g.add(back);
    // палитра на табличката
    const pal = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.008, 16), mat(0xe8d8b8)); pal.position.set(0.06, 0.95, 0.2); g.add(pal);
    ["#e8455a", "#4fb6ff", "#ffd24a", "#7ad67a"].forEach((c, k) => {
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), mat(c)); dot.position.set(0.06 + Math.cos(k * 1.5) * 0.035, 0.957, 0.2 + Math.sin(k * 1.5) * 0.035); g.add(dot);
    });
    g.position.set(EASEL.x, 0, EASEL.z);
    g.rotation.y = EASEL.angle;
    scene.add(g);
  });
  // Рисуване: всеки кадър нанася кратки щрихи – постепенно се получава нощен град с луна
  let painting = 0, paintStep = 0;
  const PAINT = [
    () => { const y = Math.random() * 110; pctx.fillStyle = `hsla(${255 + Math.random() * 40},55%,${22 + y / 6}%,.35)`; pctx.fillRect(Math.random() * 236, y, 30 + Math.random() * 40, 10); },          // небе
    () => { pctx.fillStyle = "rgba(255,240,200,.5)"; pctx.beginPath(); pctx.arc(190, 40, 4 + Math.random() * 14, 0, 7); pctx.fill(); },                                                              // луна
    () => { const x = Math.random() * 240, w = 14 + Math.random() * 22, h = 40 + Math.random() * 80; pctx.fillStyle = `rgba(${30 + Math.random() * 30},${20 + Math.random() * 20},${50 + Math.random() * 40},.5)`; pctx.fillRect(x, 192 - h, w, h); }, // сгради
    () => { pctx.fillStyle = ["#ffd98a", "#ff7ad6", "#6fe8ff"][Math.floor(Math.random() * 3)]; pctx.fillRect(Math.random() * 250, 90 + Math.random() * 100, 3, 4); },                                  // прозорчета
  ];

  // ---------- Растение в саксия (вдясно напред) ----------
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.13, 0.35, 20), mat(0xd8cfe8));
  pot.position.set(2.6, 0.175, 1.2);
  scene.add(pot);
  const leafMat = mat(0x2f6b4a, { roughness: 0.7, side: THREE.DoubleSide });
  for (let i = 0; i < 14; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.6 + rand() * 0.35, 6), leafMat);
    const a = rand() * Math.PI * 2, tilt = 0.2 + rand() * 0.5;
    leaf.position.set(2.6 + Math.cos(a) * 0.05, 0.62, 1.2 + Math.sin(a) * 0.05);
    leaf.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt);
    scene.add(leaf);
  }

  // ---------- Кръгъл килим под нея ----------
  const rugTex = canvasTexture(256, 256, (g, w) => {
    g.fillStyle = "#3a2448"; g.beginPath(); g.arc(w / 2, w / 2, w / 2, 0, 7); g.fill();
    g.strokeStyle = "#5a3a6a"; g.lineWidth = 6;
    for (const r of [110, 80, 50]) { g.beginPath(); g.arc(w / 2, w / 2, r, 0, 7); g.stroke(); }
  });
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.1, 48), mat(0xffffff, { map: rugTex, transparent: true }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.004;
  scene.add(rug);

  // ---------- Стол в средата (показва се, когато тя седне) ----------
  const chair = new THREE.Group();
  const chairMat = mat(0x2b2236, { roughness: 0.7 });
  const cushion = mat(0x5a3a7a, { roughness: 0.95 });
  const addPart = (w, h, d, m, x, y, z) => {
    const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    part.position.set(x, y, z);
    chair.add(part);
  };
  addPart(0.5, 0.06, 0.48, cushion, 0, 0.42, 0.05);        // седалка
  addPart(0.5, 0.55, 0.06, cushion, 0, 0.72, -0.2);        // облегалка
  for (const [x, z] of [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.26], [0.22, 0.26]]) {
    addPart(0.04, 0.4, 0.04, chairMat, x, 0.2, z);         // крака
  }
  chair.visible = false;
  scene.add(chair);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
  }
  addEventListener("resize", resize);
  resize();

  let on = false;
  return {
    get on() { return on; },
    setChair(value) { chair.visible = value; },
    // къде да застане, за да разглежда книгите, и къде е книгата, която докосва
    shelfSpot: new THREE.Vector3(-2.55, 0, -1.92),
    shelfBook: new THREE.Vector3(-2.5, 1.25, -2.22),
    chairYaw(angle) { chair.rotation.y = angle; },   // столът се върти заедно с нея
    set(value) {
      on = value;
      canvas.hidden = !on;
      document.body.classList.toggle("room", on);
    },
    // glow: цветът на настроението ѝ – с него свети стаята около нея
    // грамофонът: къде застава тя, къде посяга и пускане на плоча за няколко секунди
    gramoSpot: new THREE.Vector3(1.12, 0, -1.72),
    gramoArm: new THREE.Vector3(1.4, 0.74, -2.12),
    gramoPlay(seconds) { playing = Math.max(playing, seconds); },
    // платното: къде застава тя, накъде гледа, къде рисува
    // посоката, в която гледа платното: (cos, 0, -sin) на ъгъла
    get easelDir() { return new THREE.Vector3(Math.cos(EASEL.angle), 0, -Math.sin(EASEL.angle)); },
    get easelSpot() { return new THREE.Vector3(EASEL.x, 0, EASEL.z).addScaledVector(this.easelDir, 0.5); },
    get easelYaw() { const d = this.easelDir; return Math.atan2(-d.x, -d.z); },
    get easelPaint() { return new THREE.Vector3(EASEL.x, 1.2, EASEL.z).addScaledVector(this.easelDir, 0.06); },
    get easelSide() { const d = this.easelDir; return new THREE.Vector3(-d.z, 0, d.x); },
    paint(seconds) { painting = Math.max(painting, seconds); },
    // щракване върху занимание: връща "shelf", "gramo", "easel" или null
    pick(clientX, clientY, camera) {
      if (!on) return null;
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((clientX / innerWidth) * 2 - 1, -(clientY / innerHeight) * 2 + 1), camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.userData.activity);
      return hit ? hit.object.userData.activity : null;
    },
    render(camera, time, glow) {
      if (!on) return;
      holoLight.color.copy(glow);
      lampLight.intensity = 6 + Math.sin(time * 7) * 0.08;   // съвсем леко трепкане
      // грамофон: плочата се върти и излизат нотки
      const dt = Math.min(0.05, time - (this._t ?? time)); this._t = time;
      if (playing > 0) {
        playing -= dt;
        record.rotation.y -= dt * 3.5;
        noteTimer -= dt;
        if (noteTimer <= 0) {
          noteTimer = 0.3 + Math.random() * 0.3;
          const n = notes.find((x) => x.userData.life < 0);
          if (n) {
            n.position.copy(hornMouth);
            n.userData.life = 0; n.userData.vx = (Math.random() - 0.5) * 0.15; n.userData.vz = 0.08 + Math.random() * 0.1;
          }
        }
      }
      if (painting > 0) {                                // рисува – нанася щрихи
        painting -= dt;
        paintStep += dt;
        while (paintStep > 0.05) { paintStep -= 0.05; PAINT[Math.floor(Math.random() * PAINT.length)](); }
        paintTex.needsUpdate = true;
      }
      for (const n of notes) {
        const d = n.userData;
        if (d.life < 0) { n.material.opacity = 0; continue; }
        d.life += dt;
        n.position.y += dt * 0.22;
        n.position.x += (d.vx + Math.sin(time * 2 + d.phase) * 0.06) * dt;
        n.position.z += d.vz * dt;
        n.material.opacity = Math.min(1, d.life * 3) * Math.max(0, 1 - d.life / 3.2);
        if (d.life > 3.2) d.life = -1;
      }
      renderer.render(scene, camera);
    },
  };
})();
