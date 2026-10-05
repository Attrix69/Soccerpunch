  /* ---------- sang ---------- */
  // niveau de gore : 2 = MAX, 1 = NORMAL, 0 = sans sang (réglable dans le menu)
  let GORE = 2; try { const g = localStorage.getItem('tf_gore'); if (g !== null && g !== '') GORE = clamp(+g | 0, 0, 2); } catch (e) { /* rien */ }
  const stains = [];
  function paintStain(s) { // tache de sang imprimée dans la pelouse
    if (!bg) return;
    const g = bg.getContext('2d');
    g.setTransform(bgRes, 0, 0, bgRes, 0, 0);
    const X = s.x - X0, Y = (s.y - Y0) * TILT + BGOFF;
    let sd = s.seed; const r0 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    g.fillStyle = 'rgba(92,6,8,.62)';
    g.beginPath(); g.ellipse(X, Y, s.r, s.r * TILT, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(120,8,10,.55)';
    for (let k = 0; k < 5 + s.r / 2; k++) { // gouttes projetées dans le sens du coup
      const d = s.r * (0.8 + r0() * 2.4), a = Math.atan2(s.dy, s.dx) + (r0() - 0.5) * 1.3, rr = 0.8 + r0() * s.r * 0.35;
      g.beginPath(); g.ellipse(X + Math.cos(a) * d, Y + Math.sin(a) * d * TILT, rr, rr * TILT, 0, 0, 7); g.fill();
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  function bleed(e, mul) { // e.d = blessures cumulées de la victime
    if (!GORE) return;
    const d = e.d || 0; if (d < 1.2) return;
    const n = Math.min(GORE > 1 ? 44 : 26, (d * (GORE > 1 ? 3.4 : 2.6) * (mul || 1)) | 0), dx = (e.dx || 0), dy = (e.dy || 0);
    for (let k = 0; k < n; k++) {
      const a = Math.atan2(dy, dx) + rnd2(-0.9, 0.9), s = rnd2(80, 260 + d * 22);
      spawn({ x: e.x, y: e.y, z: rnd2(30, 50), vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: rnd2(60, 280), g: 1000, life: 1.2, max: 1.2, size: rnd2(1.4, 2.8) * (k < 4 && GORE > 1 ? 1.6 : 1), col: pick(['#b10d12', '#8a070b', '#d4141c']), type: 'blood', rot: 0, vr: 0 });
    }
    if (e.a >= 0) VIO.blood[e.a] += n * 0.012;
    if (d >= 2.5) {
      const s = { x: e.x + dx * 18, y: e.y + dy * 18, r: Math.min(16, 3 + d * 1.2), dx: dx || 1, dy, seed: ((R() * 2e9) | 0) + 1 };
      stains.push(s); if (stains.length > 90) stains.shift();
      paintStain(s);
    }
  }

  /* ---------- particules & textes ---------- */
  const parts = [], floats = [];
  let banner = null, flash = 0, flashCol = '255,255,255', hitStop = 0, lastStop = 0;
  // impacts : silhouette blanche de la victime, saleté accumulée, traces de glissade, ralenti du zoom
  const HITT = new Float64Array(8), DIRT = new Float32Array(8), SKX = new Float32Array(8).fill(NaN), SKY = new Float32Array(8);
  let ghostCol = null, ZB = null, myCtrl = -1, chromaP = 0; // chromaP : aberration chromatique des gros chocs
  // statistiques de violence (affichées en fin de match)
  const VIO = { blood: [0, 0], bones: [0, 0], ko: [0, 0, 0, 0, 0, 0, 0, 0], gr: [0, 0] };
  function vioReset() { VIO.blood = [0, 0]; VIO.bones = [0, 0]; VIO.ko = [0, 0, 0, 0, 0, 0, 0, 0]; VIO.gr = [0, 0]; DIRT.fill(0); SKX.fill(NaN); gore.length = 0; SPL.length = 0; FEED.length = 0; CMB.n = 0; CMB.t = 0; KOW.length = 0; }
  function hitFlash(id, d) { if (id >= 0 && id < 8) HITT[id] = Math.max(HITT[id], performance.now() + d * 1000); }
  function zblur(x, y, d) { const now = performance.now(); if (!ZB || ZB.end < now + d * 500) ZB = { x, y, end: now + d * 1000, dur: d * 1000 }; }
  function kick(dx, dy, m) { // la caméra encaisse le coup dans sa direction, puis revient
    const ux = (dx || 0) * cam.flip, uy = (dy || 0) * TILT, l = len(ux, uy);
    if (l > 0.01) { cam.kvx += ux / l * m * 26; cam.kvy += uy / l * m * 26; }
    cam.rv += (R() < 0.5 ? -1 : 1) * m * 0.012;
    cam.zp = Math.min(0.09, Math.max(cam.zp, m * 0.0035));
  }
  function teeth(e, n) { // dents qui sautent
    if (!GORE) return;
    for (let k = 0; k < n; k++) spawn({ x: e.x, y: e.y, z: 44, vx: (e.dx || 0) * rnd2(130, 280) + rnd2(-90, 90), vy: (e.dy || 0) * rnd2(130, 280) + rnd2(-90, 90), vz: rnd2(200, 340), g: 1150, life: 1.7, max: 1.7, size: 2.1, col: '#f4f1e6', type: 'tooth', rot: R() * 6, vr: rnd2(-20, 20) });
  }
  function spit(e, n) { // postillons et sueur arrachés par le coup
    for (let k = 0; k < n; k++) { const a = Math.atan2(e.dy || 0, e.dx || 1) + rnd2(-0.7, 0.7), sp = rnd2(120, 320); spawn({ x: e.x, y: e.y, z: rnd2(38, 50), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, vz: rnd2(40, 200), g: 900, life: 0.7, max: 0.7, size: rnd2(0.8, 1.6), col: pick(['#e8f0f6', '#ffffff', '#c9d6e2']), type: 'drop', rot: 0, vr: 0 }); }
  }
  function dirty(id, v) { if (id >= 0 && id < 8) DIRT[id] = Math.min(1, DIRT[id] + v); }
  /* ---------- sang sur l'objectif ---------- */
  const SPL = [];
  const SPLAT = k => sprite('splat' + k, 200, (g, s) => {
    let sd = 977 * (k + 1) + 13; const r0 = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    const c = s / 2;
    g.fillStyle = '#7e070b';
    g.beginPath(); for (let a = 0; a <= 36; a++) { const an = a / 36 * Math.PI * 2, rr2 = s * 0.2 * (0.72 + r0() * 0.55); if (a) g.lineTo(c + Math.cos(an) * rr2, c + Math.sin(an) * rr2); else g.moveTo(c + Math.cos(an) * rr2, c + Math.sin(an) * rr2); } g.closePath(); g.fill();
    for (let q = 0; q < 18; q++) { const an = r0() * 6.283, d = s * (0.2 + r0() * 0.26), rr2 = s * (0.008 + r0() * 0.035); g.beginPath(); g.arc(c + Math.cos(an) * d, c + Math.sin(an) * d, rr2, 0, 7); g.fill(); }
    for (let q = 0; q < 4; q++) { const x = c + (r0() - 0.5) * s * 0.3, w2 = s * (0.012 + r0() * 0.02), h2 = s * (0.12 + r0() * 0.26); g.fillRect(x - w2, c, w2 * 2, h2); g.beginPath(); g.arc(x, c + h2, w2 * 1.6, 0, 7); g.fill(); }
    g.globalCompositeOperation = 'source-atop';
    const rg = g.createRadialGradient(c - s * 0.05, c - s * 0.05, 0, c, c, s * 0.5); rg.addColorStop(0, '#b3121a'); rg.addColorStop(0.5, '#8a080d'); rg.addColorStop(1, '#4a0305');
    g.fillStyle = rg; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.ellipse(c - s * 0.07, c - s * 0.08, s * 0.06, s * 0.03, -0.6, 0, 7); g.fill();
  });
  function screenBlood(n, a) {
    if (GORE < 2 || app.mode === 'menu' || app.drafting) return;
    for (let k = 0; k < n; k++) {
      const side = R() < 0.5, x = side ? rnd2(0.02, 0.3) : rnd2(0.7, 0.98), y = rnd2(0.12, 0.85);
      SPL.push({ x: x * CW, y: y * CH, r: rnd2(110, 200) * Math.min(1.4, CH / 600), rot: rnd2(-0.5, 0.5), k: (R() * 4) | 0, life: 2.6, max: 2.6, a: a || 1, dy: 0 });
    }
    while (SPL.length > 7) SPL.shift();
    AU.splat();
  }
  function drawSplats(dt) {
    for (let k = SPL.length - 1; k >= 0; k--) {
      const s2 = SPL[k]; s2.life -= dt; s2.dy += dt * 16;
      if (s2.life <= 0) { SPL.splice(k, 1); continue; }
      const t = 1 - s2.life / s2.max, sc = t < 0.04 ? 0.6 + t / 0.04 * 0.4 : 1;
      ctx.globalAlpha = Math.min(1, s2.life / 0.9) * 0.88 * s2.a;
      ctx.save(); ctx.translate(s2.x, s2.y + s2.dy); ctx.rotate(s2.rot); ctx.drawImage(SPLAT(s2.k), -s2.r * sc / 2, -s2.r * sc / 2, s2.r * sc, s2.r * sc); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function spawn(o) { if (parts.length < 900) parts.push(o); }
  function burst(x, y, z, n, o) {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, s = (o.sp || 200) * (0.3 + R() * 0.9);
      spawn({ x, y, z, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: (o.vz || 150) * (0.4 + R()), g: o.g == null ? 900 : o.g,
        life: (o.life || 0.6) * (0.6 + R() * 0.6), max: o.life || 0.6, size: (o.size || 3) * (0.6 + R() * 0.8),
        col: Array.isArray(o.col) ? pick(o.col) : o.col, type: o.type || 'spark', rot: R() * 6, vr: rnd2(-10, 10) });
    }
  }
  function rnd2(a, b) { return a + R() * (b - a); }
  function ring(x, y, col, size) { spawn({ x, y, z: 0, vx: 0, vy: 0, vz: 0, g: 0, life: 0.4, max: 0.4, size: size || 40, col, type: 'ring' }); }
  function impact(x, y, z, size) { spawn({ x, y, z, vx: 0, vy: 0, vz: 0, g: 0, life: 0.2, max: 0.2, size, col: '#fff', type: 'lines', rot: R() * 6, vr: 0 }); }
  function turf(x, y, n, sp) { burst(x, y, 2, n, { sp: sp || 160, vz: 260, col: ['#3a2a16', '#4a3720', '#24401f', '#2d5226'], type: 'turf', size: 2.6, life: 0.7, g: 1100 }); }
  function floatTxt(x, y, z, txt, col, sz) {
    for (const f of floats) if (f.life > 0.45 && Math.abs(f.x - x) < 90 && Math.abs(f.y - y) < 90 && Math.abs(f.z - z) < 34) z = f.z + 34;
    floats.push({ x, y, z, txt, col, sz: sz || 22, life: 1.1, max: 1.1, rot: rnd2(-0.12, 0.08) }); if (floats.length > 12) floats.shift();
  }
  function showBanner(txt, sub, col, life, sc, yy) { banner = { txt, sub: sub || '', col: col || '#ffffff', life: life || 1.6, max: life || 1.6, sc: sc || 1, yy: yy || 0.4 }; }
  function shake(a) { cam.shake = Math.max(cam.shake, a); }
  function stop(s) { // arrêt sur image à l'impact (solo / hôte)
    const t = performance.now();
    if (app.mode === 'guest' || t - lastStop < 260) return;
    hitStop = Math.max(hitStop, s); lastStop = t;
  }

  function updFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.life -= dt;
      if (p.life <= 0) { if (p.type === 'tooth') goreMark('t', p.x, p.y, 1.6, 0, 0, 12, p.rot); parts[i] = parts[parts.length - 1]; parts.pop(); continue; }
      p.vz -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.z < 0) {
        if (p.type === 'blood' || p.type === 'drop') { // la goutte s'écrase dans l'herbe et y reste
          if (p.type === 'blood') goreMark('d', p.x, p.y, p.size * rnd2(0.7, 1.15), 0, 0, 16);
          parts[i] = parts[parts.length - 1]; parts.pop(); continue;
        }
        p.z = 0; p.vz *= -0.3; p.vx *= 0.5; p.vy *= 0.5;
        if (p.type === 'tooth') { p.vr *= 0.5; p.vz *= 1.3; }
      }
      p.rot += p.vr * dt;
    }
    for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.life -= dt; f.z += 40 * dt; if (f.life <= 0) floats.splice(i, 1); }
    if (banner) { banner.life -= dt; if (banner.life <= 0) banner = null; }
    if (flash > 0) flash -= dt * 3.5;
    if (chromaP > 0) chromaP = Math.max(0, chromaP - animRealDt * 3);
  }

  const ADD = { spark: 1, fire: 1, bolt: 1 };
  function drawParts() {
    // deux passes : les particules opaques, puis toutes les lumineuses d'un coup en mode additif
    // (un seul changement d'état de composition par image au lieu d'un par particule)
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalCompositeOperation = pass ? 'lighter' : 'source-over';
      for (const p of parts) if (!ADD[p.type] === !pass) drawPart(p);
    }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }
  function drawPart(p) {
    {
      const X = sx(p.x), Y = sy(p.y, p.z), a = clamp(p.life / p.max, 0, 1);
      if (p.type !== 'bolt' && (X < -60 || X > CW + 60 || Y < -60 || Y > CH + 60)) return; // hors écran : rien à dessiner
      switch (p.type) {
        case 'spark': {
          ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = Math.max(1, p.size * K * 0.6);
          ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - p.vx * 0.035 * K * cam.flip, Y - (p.vy * TILT - p.vz * ZK) * 0.035 * K); ctx.stroke();
          const rs = p.size * K * 2.2; ctx.globalAlpha = a * 0.7; ctx.drawImage(GLOW(hx(p.col, '#ffd23a')), X - rs, Y - rs, rs * 2, rs * 2);
          break;
        }
        case 'puff': {
          ctx.fillStyle = p.col; ctx.globalAlpha = a * 0.4;
          ctx.beginPath(); ctx.arc(X, Y, p.size * K * (1 + (1 - a) * 2.2), 0, 7); ctx.fill(); break;
        }
        case 'smoke': {
          ctx.fillStyle = p.col; ctx.globalAlpha = a * 0.35;
          ctx.beginPath(); ctx.arc(X, Y, p.size * K * (1 + (1 - a) * 3), 0, 7); ctx.fill(); break;
        }
        case 'fire': { // flamme lumineuse : halo précalculé en mode additif (effet « bloom »)
          ctx.globalAlpha = a * 0.9;
          const rf = p.size * K * (0.4 + a * 0.8) * 2.1, col = hx(p.col, '#ff8a1a');
          ctx.drawImage(GLOW(col), X - rf, Y - rf, rf * 2, rf * 2);
          break;
        }
        case 'blood': {
          ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, a * 2);
          const vx = p.vx * cam.flip, vy = p.vy * TILT - p.vz * ZK, vm = len(vx, vy) || 1;
          ctx.beginPath(); ctx.ellipse(X, Y, p.size * K * (1 + Math.min(1.5, vm / 400)), p.size * K * 0.7, Math.atan2(vy, vx), 0, 7); ctx.fill(); break;
        }
        case 'tooth': { // une dent qui vole
          ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, a * 3);
          const s2 = Math.max(1.6, p.size * K); ctx.fillStyle = INK; rr(-s2 - 1, -s2 * 0.75 - 1, s2 * 2 + 2, s2 * 1.5 + 2, s2 * 0.6); ctx.fill();
          ctx.fillStyle = p.col; rr(-s2, -s2 * 0.75, s2 * 2, s2 * 1.5, s2 * 0.55); ctx.fill(); ctx.fillStyle = '#b3101a'; ctx.fillRect(-s2 * 0.3, s2 * 0.35, s2 * 0.6, s2 * 0.4); ctx.restore(); break;
        }
        case 'drop': { // postillons et sueur
          ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(0.8, a * 1.6);
          const vx = p.vx * cam.flip, vy = p.vy * TILT - p.vz * ZK, vm = len(vx, vy) || 1;
          ctx.beginPath(); ctx.ellipse(X, Y, p.size * K * (1 + Math.min(1.4, vm / 380)), p.size * K * 0.6, Math.atan2(vy, vx), 0, 7); ctx.fill(); break;
        }
        case 'turf': {
          ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, a * 2.5);
          ctx.fillRect(-p.size * K, -p.size * K * 0.6, p.size * K * 2, p.size * K * 1.2); ctx.restore(); break;
        }
        case 'conf': {
          ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.globalAlpha = Math.min(1, a * 2);
          ctx.fillRect(-p.size * K, -p.size * K * 0.4, p.size * K * 2, p.size * K * 0.8); ctx.restore(); break;
        }
        case 'ring': {
          ctx.strokeStyle = p.col; ctx.globalAlpha = a * 0.9; ctx.lineWidth = 4 * K * a + 1;
          const r = p.size * K * (1.2 - a);
          ctx.beginPath(); ctx.ellipse(X, Y, r, r * TILT, 0, 0, 7); ctx.stroke(); break;
        }
        case 'bolt': { // éclair qui tombe du ciel (MARTEAU DE THOR)
          ctx.lineJoin = 'round';
          for (const [w2, col, al] of [[9, '#6fb8ff', 0.35], [4, '#b8e4ff', 0.7], [1.6, '#ffffff', 1]]) {
            ctx.strokeStyle = col; ctx.globalAlpha = a * al; ctx.lineWidth = w2 * Math.min(K, 1.6); ctx.beginPath();
            for (let k = 0; k < p.pts.length; k++) { const q = p.pts[k]; if (k) ctx.lineTo(sx(q[0]), sy(q[1], q[2])); else ctx.moveTo(sx(q[0]), sy(q[1], q[2])); }
            ctx.stroke();
          }
          break;
        }
        case 'note': { // notes de musique (CRESCENDO)
          ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot); ctx.globalAlpha = Math.min(1, a * 1.6);
          ctx.font = `${Math.max(10, p.size * Math.min(K, 1.6)) | 0}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(p.txt || '♪', 0, 0); ctx.fillStyle = p.col; ctx.fillText(p.txt || '♪', 0, 0); ctx.restore(); break;
        }
        case 'fake': { // le leurre de la RUSE DU RENARD continue tout droit… et s'efface
          ctx.globalAlpha = a * 0.75; ctx.fillStyle = '#e8ecf2'; circ(X, Y, BR * K); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, K); ctx.stroke();
          ctx.globalAlpha = a * 0.4; ctx.fillStyle = '#ff8a3d'; circ(X, Y, BR * K * 1.8); ctx.fill(); break;
        }
        case 'lines': { // traits d'impact façon manga
          const t = 1 - a, r0 = p.size * K * (0.35 + t * 0.6), r1 = p.size * K * (0.8 + t * 0.9);
          ctx.strokeStyle = p.col; ctx.globalAlpha = a; ctx.lineWidth = Math.max(1.5, 3 * K * a);
          ctx.beginPath();
          for (let k = 0; k < 14; k++) { const an = p.rot + k * 0.449 + (k % 2) * 0.12, rr2 = k % 3 ? r1 : r1 * 1.25; ctx.moveTo(X + Math.cos(an) * r0, Y + Math.sin(an) * r0 * 0.8); ctx.lineTo(X + Math.cos(an) * rr2, Y + Math.sin(an) * rr2 * 0.8); }
          ctx.stroke(); break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function drawFloats() {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const f of floats) {
      const t = 1 - f.life / f.max, sc = t < 0.1 ? t / 0.1 * 1.45 : t < 0.2 ? 1.45 - (t - 0.1) * 4.5 : 1;
      const X = sx(f.x), Y = sy(f.y, f.z), s = Math.max(14, f.sz * Math.min(K, 1.6)) * sc;
      ctx.globalAlpha = clamp(f.life / 0.3, 0, 1);
      ctx.save(); ctx.translate(X, Y); ctx.rotate(f.rot); ctx.transform(1, 0, -0.2, 1, 0, 0);
      ctx.font = `${s | 0}px ${FONT}`;
      ctx.fillStyle = '#000'; ctx.fillText(f.txt, s * 0.06, s * 0.07);
      ctx.lineWidth = s * 0.2; ctx.strokeStyle = '#000'; ctx.strokeText(f.txt, 0, 0);
      ctx.fillStyle = f.col; ctx.fillText(f.txt, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

