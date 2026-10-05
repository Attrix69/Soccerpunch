  /* =============== RENDU =============== */
  let CW = innerWidth, CH = innerHeight, DPR = 1, S = 1, K = 1, dprCap = 2;
  const SAFE = { t: 0, r: 0, b: 0, l: 0 };
  const TILT = 0.62, ZK = 0.92, BGOFF = 110;
  const X0 = -175, X1 = W + 175, Y0 = -205, Y1 = H + 125;
  const cam = { x: W / 2, y: H / 2, flip: 1, sx: 0, sy: 0, shake: 0, zoom: 1, kx: 0, ky: 0, kvx: 0, kvy: 0, rot: 0, rv: 0, zp: 0 };
  let bg = null, bgRes = 1, bgFlip = 0;
  const LIGHTS_SCR = []; // projecteurs (coordonnées du décor)
  const SKIN = ['#d9a982', '#6e4126', '#c48a5e', '#9a6038', '#e8bf98', '#53301b', '#8a5532', '#cf9a70'];
  const HAIR = ['#141414', '#2b1d12', '#0c0c0c', '#4a3524', '#161616', '#0a0a0a', '#9a948a', '#22170e'];
  const sx = x => CW / 2 + cam.flip * (x - cam.x) * K + cam.sx;
  const sy = (y, z) => CH / 2 + ((y - cam.y) * TILT - (z || 0) * ZK) * K + cam.sy;

  // trois couches : le monde (2D, encré) → composé par le GPU (WebGL) → l'interface par-dessus, jamais déformée
  const glcv = $('gl'), uicv = $('ui'), uictx = uicv.getContext('2d');
  const GPU = POST.init(glcv, cv);
  let usePost = false;
  function applyGfx() {
    const t = GFX();
    usePost = GPU && t.post;
    POST.levels = t.levels || 1;
    glcv.style.display = usePost ? 'block' : 'none';
    cv.style.display = usePost ? 'none' : 'block';
    $('vig').style.display = usePost ? 'none' : ''; // la vignette passe dans le shader
    resize();
  }
  function resize() {
    DPR = Math.min(dprCap, GFX().dpr, window.devicePixelRatio || 1);
    CW = window.innerWidth; CH = window.innerHeight;
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    uicv.width = cv.width; uicv.height = cv.height;
    if (usePost) POST.resize(cv.width, cv.height);
    S = Math.max(0.36, Math.min(CW / 1030, CH / (660 * TILT))); // caméra reculée : on voit plus de terrain
    const cs = getComputedStyle($('sa'));
    SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0;
    SAFE.b = parseFloat(cs.paddingBottom) || 0; SAFE.l = parseFloat(cs.paddingLeft) || 0;
    buildBG();
    requestAnimationFrame(layoutButtons);
  }

  function buildBG() {
    bgFlip = cam.flip;
    let res = Math.min(2.4, S * DPR);
    const wu = X1 - X0, hu = (Y1 - Y0) * TILT + BGOFF;
    while (wu * res * hu * res > 9e6) res *= 0.9;
    bgRes = res;
    const c = bg || document.createElement('canvas');
    c.width = Math.ceil(wu * res); c.height = Math.ceil(hu * res);
    const g = c.getContext('2d');
    g.setTransform(res, 0, 0, res, 0, 0);
    const bx = x => x - X0, by = (y, z) => (y - Y0) * TILT - (z || 0) * ZK + BGOFF;
    // graine fixe : le décor est identique à chaque reconstruction
    let seed = 1337; const rnd0 = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const rnd = (a, b) => a + rnd0() * (b - a), pk = a => a[(rnd0() * a.length) | 0];
    const glow = (x, y, r, col) => { const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, col); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); };
    const txt = (s, x, y, size, col, font) => { g.save(); g.translate(x, y); if (bgFlip < 0) g.scale(-1, 1); g.font = (font || '') + size + 'px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(s, 0, 0); g.restore(); };
    const TM = TEAMS, sideT = x => (x < W / 2 ? 0 : 1); // supporters derrière leur but
    const SKN = ['#7a5a44', '#5a3e2c', '#8e6c52', '#3e2a1e', '#a07a5c'];
    const fan = (X, Y, t, sc, lit) => { // un supporter : maillot aux couleurs de son équipe, tête, parfois écharpe tendue
      const T = TM[t], r = rnd0();
      const shirt = r < 0.42 ? T.c1 : r < 0.58 ? T.c2 : r < 0.66 ? T.acc : pk(['#1b1c20', '#222328', '#17181b', '#2a2b30']);
      g.fillStyle = shirt; g.fillRect(X - 2.8 * sc, Y + 1.6 * sc, 5.6 * sc, 5.4 * sc);
      g.fillStyle = pk(SKN); g.beginPath(); g.arc(X, Y, 2.3 * sc, 0, 7); g.fill();
      if (r > 0.9) { // écharpe brandie à deux mains
        g.strokeStyle = '#1a1a1d'; g.lineWidth = 1.2 * sc; g.beginPath(); g.moveTo(X - 2 * sc, Y + 2 * sc); g.lineTo(X - 4 * sc, Y - 5 * sc); g.moveTo(X + 2 * sc, Y + 2 * sc); g.lineTo(X + 4 * sc, Y - 5 * sc); g.stroke();
        g.fillStyle = T.c1; g.fillRect(X - 5 * sc, Y - 7 * sc, 10 * sc, 2.4 * sc); g.fillStyle = T.c2; g.fillRect(X - 1.5 * sc, Y - 7 * sc, 3 * sc, 2.4 * sc);
      } else if (r > 0.86) { g.strokeStyle = '#1a1a1d'; g.lineWidth = 1.5 * sc; g.beginPath(); g.moveTo(X + 2 * sc, Y + 2 * sc); g.lineTo(X + 3.5 * sc, Y - 6 * sc); g.stroke(); g.fillStyle = pk(SKN); g.fillRect(X + 2 * sc, Y - 8.5 * sc, 3 * sc, 3 * sc); } // poing levé
    };
    // ciel de nuit
    let gr = g.createLinearGradient(0, 0, 0, hu);
    gr.addColorStop(0, '#05060a'); gr.addColorStop(0.35, '#0a0b10'); gr.addColorStop(1, '#040405');
    g.fillStyle = gr; g.fillRect(0, 0, wu, hu);
    // ----- tribune du fond : gradins + supporters aux couleurs de leur équipe -----
    const rows = 14;
    for (let r = rows - 1; r >= 0; r--) {
      const y = -20 - r * 12.5, z = 16 + r * 9.5;
      const top = by(y - 6, z + 10), bot = by(y + 6, z);
      g.fillStyle = r % 2 ? '#111216' : '#15161b'; g.fillRect(0, top, wu, bot - top + 1);
      g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(0, top, wu, 1);
      for (let x = X0 + 3 + (r % 2) * 3; x < X1; x += rnd(5.6, 7.4)) {
        if (rnd0() < 0.06) continue;
        fan(bx(x), by(y, z + 8), sideT(x), 1, 1);
      }
    }
    // drapeaux géants qui flottent au-dessus des virages
    for (let k = 0; k < 10; k++) {
      const x = rnd(X0 + 30, X1 - 30); if (Math.abs(x - W / 2) < 260) continue;
      const r = 2 + ((rnd0() * 9) | 0), T = TM[sideT(x)], X = bx(x), Y = by(-20 - r * 12.5, 16 + r * 9.5 + 8);
      g.strokeStyle = '#2a2a2e'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(X, Y + 4); g.lineTo(X, Y - 30); g.stroke();
      g.fillStyle = T.c1; g.beginPath(); g.moveTo(X, Y - 30); g.quadraticCurveTo(X + 14, Y - 34, X + 28, Y - 28); g.lineTo(X + 28, Y - 14); g.quadraticCurveTo(X + 14, Y - 20, X, Y - 16); g.closePath(); g.fill();
      g.fillStyle = T.c2; g.beginPath(); g.moveTo(X, Y - 25); g.quadraticCurveTo(X + 14, Y - 29, X + 28, Y - 23); g.lineTo(X + 28, Y - 19); g.quadraticCurveTo(X + 14, Y - 25, X, Y - 21); g.closePath(); g.fill();
    }
    // tifo géant au centre de la tribune
    {
      const tx0 = W / 2 - 230, tx1 = W / 2 + 230, ty0 = by(-20 - 12 * 12.5, 16 + 12 * 9.5 + 8), ty1 = by(-20 - 4 * 12.5, 16 + 4 * 9.5);
      const tw = tx1 - tx0;
      for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#111113' : '#a10f14'; g.fillRect(bx(tx0) + k * tw / 12, ty0, tw / 12 + 0.5, ty1 - ty0); }
      const sh = g.createLinearGradient(0, ty0, 0, ty1); sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,.1)');
      g.fillStyle = sh; g.fillRect(bx(tx0), ty0, tw, ty1 - ty0);
      g.globalAlpha = 0.55; txt('SANS PITIÉ', bx(W / 2) + 3, (ty0 + ty1) / 2 + 5, 46, '#000'); g.globalAlpha = 1;
      txt('SANS PITIÉ', bx(W / 2), (ty0 + ty1) / 2 + 2, 46, '#f1eee8');
    }
    // fumigènes aux couleurs des virages
    for (let k = 0; k < 8; k++) {
      const fx0 = rnd(X0 + 40, X1 - 40), r = (rnd0() * 8) | 0, fy0 = by(-20 - r * 12.5, 16 + r * 9.5 + 10);
      if (Math.abs(fx0 - W / 2) < 260) continue;
      const blue = sideT(fx0) === 0;
      g.globalCompositeOperation = 'lighter';
      glow(bx(fx0), fy0, 75, blue ? 'rgba(80,180,255,.26)' : 'rgba(255,50,20,.32)'); glow(bx(fx0), fy0, 16, blue ? 'rgba(210,240,255,.9)' : 'rgba(255,210,160,.9)');
      g.globalCompositeOperation = 'source-over';
      for (let q = 0; q < 6; q++) glow(bx(fx0) + rnd(-30, 50), fy0 - 20 - q * 14, 34 + q * 6, 'rgba(80,72,76,.10)');
    }
    // profondeur : le haut de la tribune s'enfonce dans la nuit
    const roofY = by(-20 - rows * 12.5, 16 + rows * 9.5 + 14), standBot = by(-20, 16);
    gr = g.createLinearGradient(0, roofY, 0, standBot); gr.addColorStop(0, 'rgba(3,3,5,.75)'); gr.addColorStop(0.55, 'rgba(3,3,5,.25)'); gr.addColorStop(1, 'rgba(3,3,5,0)');
    g.fillStyle = gr; g.fillRect(0, roofY, wu, standBot - roofY);
    // toit + rampes de projecteurs
    g.fillStyle = '#030304'; g.fillRect(0, 0, wu, Math.max(0, roofY));
    g.fillStyle = '#16171c'; g.fillRect(0, roofY - 3, wu, 3);
    const LIGHTS = [];
    for (let i = 0; i < 4; i++) {
      const x = bx(-40 + i * (W + 80) / 3), y = Math.max(10, roofY - 8); LIGHTS.push([x, y]);
      g.globalCompositeOperation = 'lighter';
      glow(x, y, 140, 'rgba(255,248,230,.24)'); glow(x, y, 34, 'rgba(255,255,255,.8)');
      g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(x - 90, y - 0.8, 180, 1.6); // reflet horizontal (flare)
      g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 0.6, y - 40, 1.2, 80);
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = '#1b1c21'; g.fillRect(x - 24, y - 7, 48, 13);
      g.fillStyle = '#fff';
      for (let k = -3; k <= 3; k++) for (let l = 0; l < 2; l++) g.fillRect(x + k * 6.4 - 2.2, y - 5 + l * 5.6, 4.4, 4);
    }
    // tribunes latérales (supporters de chaque camp)
    for (const side of [0, 1]) {
      for (let cI = 0; cI < 9; cI++) {
        const x = side ? W + GD + 22 + cI * 12 : -GD - 22 - cI * 12, z = 10 + cI * 8;
        g.fillStyle = cI % 2 ? '#111216' : '#15161b';
        g.fillRect(bx(x) - 6, by(-14, z + 8), 12, by(H + 40, z) - by(-14, z + 8));
        for (let y = -8; y < H + 40; y += rnd(5.5, 7.5)) {
          if (rnd0() < 0.08) continue;
          fan(bx(x) + rnd(-2, 2), by(y, z + 8), side, 0.95, 1);
        }
      }
    }
    // les virages latéraux plongent dans l'ombre (moins de bruit visuel)
    for (const side of [0, 1]) {
      const xin = bx(side ? W + GD + 16 : -GD - 16), xout = bx(side ? W + GD + 22 + 9 * 12 : -GD - 22 - 9 * 12);
      const lg = g.createLinearGradient(xin, 0, xout, 0); lg.addColorStop(0, 'rgba(4,4,6,.28)'); lg.addColorStop(1, 'rgba(4,4,6,.62)');
      g.fillStyle = lg; g.fillRect(Math.min(xin, xout), by(-30, 90), Math.abs(xout - xin), by(H + 60) - by(-30, 90));
    }
    // abords : piste sombre
    g.fillStyle = '#0e100f';
    g.fillRect(bx(-GD - 16), by(-16), (W + 2 * GD + 32), by(H + 18) - by(-16));
    // ----- PELOUSE : vert profond sous les projecteurs, tonte en damier -----
    const NS = 14, NY = 8, py0 = by(0), py1 = by(H);
    for (let i = 0; i < NS; i++) { g.fillStyle = i % 2 ? '#2a6a30' : '#245d2a'; g.fillRect(bx(i * W / NS), py0, W / NS + 0.5, py1 - py0); }
    for (let j = 0; j < NY; j++) if (j % 2) { g.fillStyle = 'rgba(255,255,255,.035)'; g.fillRect(bx(0), by(j * H / NY), W, by((j + 1) * H / NY) - by(j * H / NY)); }
    // brins d'herbe
    for (let k = 0; k < 16000; k++) {
      const x = rnd(0, W), y = rnd(0, H);
      g.fillStyle = rnd0() < 0.55 ? 'rgba(6,34,10,.2)' : 'rgba(170,235,150,.08)';
      g.fillRect(bx(x), by(y), rnd(0.6, 1.3), rnd(1.4, 3));
    }
    // usure naturelle : devant les buts, au point de penalty, au rond central
    const dirt = (x, y, rx, ry, a) => {
      g.save(); g.translate(bx(x), by(y)); g.scale(1, TILT);
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, rx); rg.addColorStop(0, `rgba(92,70,40,${a})`); rg.addColorStop(0.6, `rgba(80,62,36,${a * 0.5})`); rg.addColorStop(1, 'rgba(80,62,36,0)');
      g.fillStyle = rg; g.scale(1, ry / rx); g.beginPath(); g.arc(0, 0, rx, 0, 7); g.fill(); g.restore();
    };
    dirt(36, H / 2, 110, 150, 0.5); dirt(W - 36, H / 2, 110, 150, 0.5); dirt(W / 2, H / 2, 120, 90, 0.18);
    dirt(155, H / 2, 26, 22, 0.35); dirt(W - 155, H / 2, 26, 22, 0.35);
    for (let k = 0; k < 14; k++) dirt(rnd(160, W - 160), rnd(80, H - 80), rnd(24, 50), rnd(16, 36), 0.14);
    // traces de tacles (quelques griffures seulement)
    for (let k = 0; k < 18; k++) {
      const x = rnd(60, W - 60), y = rnd(40, H - 40), a = rnd(-0.6, 0.6) + (rnd0() < 0.5 ? 0 : Math.PI), L = rnd(40, 85);
      const x2 = x + Math.cos(a) * L, y2 = y + Math.sin(a) * L;
      g.lineCap = 'round';
      g.strokeStyle = 'rgba(70,52,30,.42)'; g.lineWidth = rnd(2.5, 4.5);
      g.beginPath(); g.moveTo(bx(x), by(y)); g.lineTo(bx(x2), by(y2)); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(bx(x), by(y) + 1); g.lineTo(bx(x2), by(y2) + 1); g.stroke();
    }
    // lumière des projecteurs : flaques chaudes depuis les 4 coins, bords dans l'ombre
    g.globalCompositeOperation = 'lighter';
    for (const [lx, ly] of [[-80, -120], [W + 80, -120], [-80, H + 140], [W + 80, H + 140], [W / 2, -200]]) {
      const rg = g.createRadialGradient(bx(lx), by(ly), 20, bx(lx), by(ly), 900);
      rg.addColorStop(0, 'rgba(255,248,220,.12)'); rg.addColorStop(0.55, 'rgba(255,248,220,.045)'); rg.addColorStop(1, 'rgba(255,248,220,0)');
      g.fillStyle = rg; g.fillRect(bx(0), py0, W, py1 - py0);
    }
    { const rg = g.createRadialGradient(bx(W / 2), by(H / 2), 40, bx(W / 2), by(H / 2), 700); rg.addColorStop(0, 'rgba(210,255,200,.07)'); rg.addColorStop(1, 'rgba(210,255,200,0)'); g.fillStyle = rg; g.fillRect(bx(0), py0, W, py1 - py0); }
    g.globalCompositeOperation = 'source-over';
    const edge = (x0, y0, x1, y1, w0, h0) => { const lg = g.createLinearGradient(x0, y0, x1, y1); lg.addColorStop(0, 'rgba(0,8,2,.38)'); lg.addColorStop(1, 'rgba(0,8,2,0)'); g.fillStyle = lg; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), w0, h0); };
    edge(bx(0), py0, bx(0), py0 + 70, W, 70); edge(bx(0), py1, bx(0), py1 - 70, W, 70);
    edge(bx(0), py0, bx(110), py0, 110, py1 - py0); edge(bx(W), py0, bx(W - 110), py0, 110, py1 - py0);
    // fonds de cages
    for (const side of [0, 1]) { const x0 = side ? W : -GD; g.fillStyle = '#0b130d'; g.fillRect(bx(x0), by(MT), GD, by(MB) - by(MT)); }
    // lignes à la craie : nettes, avec un léger halo
    const lines = (lw, col) => {
      g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'miter';
      g.strokeRect(bx(3), by(3), W - 6, by(H - 3) - by(3));
      g.beginPath(); g.moveTo(bx(W / 2), by(3)); g.lineTo(bx(W / 2), by(H - 3)); g.stroke();
      const ell = (x, y, r, a0, a1) => { g.save(); g.translate(bx(x), by(y)); g.scale(1, TILT); g.beginPath(); g.arc(0, 0, r, a0 || 0, a1 || Math.PI * 2); g.restore(); g.stroke(); };
      ell(W / 2, H / 2, 118);
      for (const sd of [0, 1]) {
        const gx = sd ? W : 0, d = sd ? -1 : 1;
        g.beginPath(); g.moveTo(bx(gx), by(H / 2 - 275)); g.lineTo(bx(gx + d * 225), by(H / 2 - 275)); g.lineTo(bx(gx + d * 225), by(H / 2 + 275)); g.lineTo(bx(gx), by(H / 2 + 275)); g.stroke();
        g.beginPath(); g.moveTo(bx(gx), by(H / 2 - 150)); g.lineTo(bx(gx + d * 78), by(H / 2 - 150)); g.lineTo(bx(gx + d * 78), by(H / 2 + 150)); g.lineTo(bx(gx), by(H / 2 + 150)); g.stroke();
        const a = Math.acos(70 / 100);
        if (sd) ell(gx - 155, H / 2, 100, Math.PI - a, Math.PI + a); else ell(gx + 155, H / 2, 100, -a, a);
        for (const cy of [3, H - 3]) {
          const st = sd ? (cy < H / 2 ? Math.PI / 2 : Math.PI) : (cy < H / 2 ? 0 : -Math.PI / 2);
          ell(sd ? W - 3 : 3, cy, 14, st, st + Math.PI / 2);
        }
      }
    };
    lines(8, 'rgba(255,255,255,.05)');
    lines(2.7, 'rgba(246,246,240,.9)');
    g.fillStyle = 'rgba(246,246,240,.92)';
    for (const x of [W / 2, 155, W - 155]) { g.save(); g.translate(bx(x), by(H / 2)); g.scale(1, TILT); g.beginPath(); g.arc(0, 0, 4, 0, 7); g.fill(); g.restore(); }
    // emblème central : trois griffures rouges, discrètes
    g.save(); g.translate(bx(W / 2), by(H / 2)); g.scale(1, TILT); g.rotate(-0.5); g.scale(1.3, 1.3);
    for (let k = -1; k <= 1; k++) {
      g.fillStyle = 'rgba(210,20,26,.26)'; g.beginPath();
      g.moveTo(k * 22 - 4, -78); g.quadraticCurveTo(k * 22 + 9, 0, k * 22 - 2, 80); g.quadraticCurveTo(k * 22 + 2, 0, k * 22 - 4, -78); g.fill();
    }
    g.restore();
    // filets (fond + côté éloigné)
    for (const side of [0, 1]) {
      const gx = side ? W : 0, bxx = side ? W + GD : -GD;
      g.strokeStyle = 'rgba(215,220,228,.24)'; g.lineWidth = 1;
      for (let y = MT; y <= MB + 0.1; y += 10) { g.beginPath(); g.moveTo(bx(bxx), by(y, 0)); g.lineTo(bx(bxx), by(y, BARZ)); g.stroke(); }
      for (let z = 0; z <= BARZ; z += 10) { g.beginPath(); g.moveTo(bx(bxx), by(MT, z)); g.lineTo(bx(bxx), by(MB, z)); g.stroke(); }
      for (let i = 0; i <= 6; i++) { const x = lerp(gx, bxx, i / 6); g.beginPath(); g.moveTo(bx(x), by(MT, 0)); g.lineTo(bx(x), by(MT, BARZ)); g.stroke(); }
      for (let z = 0; z <= BARZ; z += 10) { g.beginPath(); g.moveTo(bx(gx), by(MT, z)); g.lineTo(bx(bxx), by(MT, z)); g.stroke(); }
      g.strokeStyle = 'rgba(235,237,240,.55)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(bx(bxx), by(MT, 0)); g.lineTo(bx(bxx), by(MT, BARZ)); g.lineTo(bx(bxx), by(MB, BARZ)); g.lineTo(bx(bxx), by(MB, 0)); g.stroke();
    }
    // panneaux LED du fond : lumineux, aux couleurs du jeu et des équipes
    const wz = 26, wy = -10, wx0 = -GD - 16, wx1 = W + GD + 16;
    g.fillStyle = '#050506'; g.fillRect(bx(wx0), by(wy, wz), wx1 - wx0, by(wy, 0) - by(wy, wz));
    const ADS = [['TACLE FURY', '#ffffff', '#3a0507'], ['LOUPS', TM[0].c1, '#06121c'], ['AUCUNE RÈGLE', '#ff3b2e', '#160404'], ['FULL CONTACT', '#ffb000', '#161004'], ['TAUREAUX', '#ff3b2e', '#1a0405'], ['TACLE FURY', '#ffffff', '#3a0507']];
    const segW = (wx1 - wx0) / ADS.length;
    ADS.forEach((a, i) => {
      const x0 = bx(wx0 + segW * i), y0 = by(wy, wz), hh = by(wy, 0) - by(wy, wz);
      const pg = g.createLinearGradient(0, y0, 0, y0 + hh); pg.addColorStop(0, a[2]); pg.addColorStop(1, '#050506');
      g.fillStyle = pg; g.fillRect(x0 + 1.5, y0 + 1.5, segW - 3, hh - 3);
      g.globalCompositeOperation = 'lighter';
      glow(x0 + segW / 2, y0 + hh / 2, 70, a[1] === '#ffffff' ? 'rgba(255,255,255,.08)' : 'rgba(255,90,40,.12)');
      g.globalCompositeOperation = 'source-over';
      txt(a[0], x0 + segW / 2, y0 + hh / 2 + 1, 17, a[1]);
      g.fillStyle = 'rgba(0,0,0,.32)'; for (let yy = y0 + 2; yy < y0 + hh - 2; yy += 2) g.fillRect(x0 + 1.5, yy, segW - 3, 0.7); // trame LED
    });
    g.fillStyle = '#c81016'; g.fillRect(bx(wx0), by(wy, wz) - 1.5, wx1 - wx0, 1.8);
    g.globalCompositeOperation = 'lighter'; g.fillStyle = 'rgba(255,30,20,.2)'; g.fillRect(bx(wx0), by(wy, wz) - 5, wx1 - wx0, 7); g.globalCompositeOperation = 'source-over';
    // reflet des panneaux sur la piste
    { const y0 = by(wy, 0), lg = g.createLinearGradient(0, y0, 0, y0 + 14); lg.addColorStop(0, 'rgba(255,60,40,.12)'); lg.addColorStop(1, 'rgba(255,60,40,0)'); g.fillStyle = lg; g.fillRect(bx(wx0), y0, wx1 - wx0, 14); }
    // murets latéraux en béton + bande LED rouge
    for (const side of [0, 1]) {
      const x = side ? W + 2 : -2;
      for (const sg of [[-10, MT - 4], [MB + 4, H + 10]]) {
        g.fillStyle = '#17181c';
        g.beginPath(); g.moveTo(bx(x), by(sg[0], 0)); g.lineTo(bx(x), by(sg[0], 18)); g.lineTo(bx(x), by(sg[1], 18)); g.lineTo(bx(x), by(sg[1], 0)); g.closePath(); g.fill();
        g.strokeStyle = '#c81016'; g.lineWidth = 2; g.beginPath(); g.moveTo(bx(x), by(sg[0], 18)); g.lineTo(bx(x), by(sg[1], 18)); g.stroke();
        g.strokeStyle = 'rgba(255,30,20,.22)'; g.lineWidth = 7; g.stroke();
      }
    }
    // muret du bas
    g.fillStyle = '#0b0b0d'; g.fillRect(bx(wx0), by(H + 12, 0), wx1 - wx0, by(H + 40) - by(H + 12));
    g.fillStyle = '#c81016'; g.fillRect(bx(wx0), by(H + 12, 0) - 1, wx1 - wx0, 2);
    // public du bas (de dos), aux couleurs de son camp
    for (let r = 0; r < 4; r++) {
      const y = H + 52 + r * 16;
      for (let x = X0 + 6; x < X1; x += rnd(6.5, 9)) {
        if (rnd0() < 0.1) continue;
        fan(bx(x), by(y), sideT(x), 1.45, 1);
      }
    }
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(bx(wx0), by(H + 44), wx1 - wx0, by(H + 140) - by(H + 44));
    for (let k = 0; k < 4; k++) {
      const x = bx(rnd(X0 + 60, X1 - 60)), y = by(H + 70 + rnd(0, 30));
      g.globalCompositeOperation = 'lighter'; glow(x, y, 60, 'rgba(255,40,20,.3)'); glow(x, y, 12, 'rgba(255,210,170,.9)'); g.globalCompositeOperation = 'source-over';
    }
    // faisceaux des projecteurs dans la brume (lumière volumétrique)
    g.globalCompositeOperation = 'lighter';
    for (const [lx, ly] of LIGHTS) {
      const tx = lx + (bx(W / 2) - lx) * 0.35, ty = by(H * 0.55);
      const lg = g.createLinearGradient(lx, ly, tx, ty); lg.addColorStop(0, 'rgba(255,250,235,.10)'); lg.addColorStop(1, 'rgba(255,250,235,0)');
      g.fillStyle = lg; g.beginPath(); g.moveTo(lx - 14, ly); g.lineTo(lx + 14, ly); g.lineTo(tx + 230, ty); g.lineTo(tx - 230, ty); g.closePath(); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    LIGHTS_SCR.length = 0; for (const L2 of LIGHTS) LIGHTS_SCR.push(L2);
    bg = c;
    for (const s of stains) paintStain(s);
  }

