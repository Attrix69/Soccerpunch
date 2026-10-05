  /* ---------- ULTIMES : effets visuels propres à chacun ---------- */
  const ULK = TF.ROSTER.map(r => (r.ult ? r.ult[0] : ''));
  const UCOL = { upper: ['#ff9a3c', '#fff1d6', '#ff5a1e'], rouleau: ['#ffc21a', '#ff8a00', '#fff2b0'], fauche: ['#a66bff', '#e8dcff', '#5a2aa8'],
    seisme: ['#d9b27a', '#fff1d6', '#a0703a'], thor: ['#6fb8ff', '#ffffff', '#b8e4ff'], faucon: ['#7fd8ff', '#ffffff', '#c8f2ff'],
    abra: ['#e05cff', '#ffffff', '#ff9af0'], encre: ['#8a5cff', '#c7a6ff', '#3a1d6a'], fil: ['#ffd23a', '#fff6c0', '#ffb000'],
    crescendo: ['#f4f1ea', '#ffd23a', '#ffffff'], couronne: ['#ffd23a', '#fff6c0', '#ff9a00'], bond: ['#ff9000', '#ffd08a', '#ff5a00'],
    stampede: ['#ff2d55', '#ffd0d8', '#ff7a00'], ruse: ['#ff8a3d', '#ffffff', '#c6ff4a'], bordee: ['#ff6a00', '#ffd23a', '#ff2a00'] };
  let UL = null;          // ultime en cours (départ, cible, tireur)
  let HYPT = 0, OBT = 0;  // ballon hypnotisé / dégagement obus en vol (jusqu'à)
  const marks = [];       // marques au sol : griffures, fissures, encre, cratères
  let lastClaw = null, ulInv = false;
  function mark(o) { marks.push(o); if (marks.length > 60) marks.shift(); }
  const gore = []; // traces qui restent un moment sur la pelouse
  function goreMark(t, x, y, r, x2, y2, life, rot) { gore.push({ t, x, y, r, x2, y2, life, max: life, rot: rot || 0 }); if (gore.length > 280) gore.shift(); }
  function updGore(dt) { for (let k = gore.length - 1; k >= 0; k--) { gore[k].life -= dt; if (gore[k].life <= 0) gore.splice(k, 1); } }
  function drawGore() {
    ctx.lineCap = 'round';
    for (const m of gore) {
      const a = clamp(m.life / m.max * 3, 0, 1);
      if (m.t === 'd') { ctx.globalAlpha = 0.78 * a; ctx.fillStyle = '#6e0609'; ctx.beginPath(); ctx.ellipse(sx(m.x), sy(m.y, 0), m.r * K, m.r * K * TILT, 0, 0, 7); ctx.fill(); }
      else if (m.t === 'k' || m.t === 's') {
        ctx.globalAlpha = (m.t === 's' ? 0.62 : 0.5) * a; ctx.strokeStyle = m.t === 's' ? '#6a0609' : '#3a2a16'; ctx.lineWidth = Math.max(1, m.r * K);
        ctx.beginPath(); ctx.moveTo(sx(m.x), sy(m.y, 0)); ctx.lineTo(sx(m.x2), sy(m.y2, 0)); ctx.stroke();
      } else if (m.t === 't') {
        const X = sx(m.x), Y = sy(m.y, 0), s2 = Math.max(1.4, m.r * K);
        ctx.globalAlpha = a; ctx.save(); ctx.translate(X, Y); ctx.rotate(m.rot); ctx.fillStyle = INK; ctx.fillRect(-s2 - 0.8, -s2 * 0.7 - 0.8, s2 * 2 + 1.6, s2 * 1.4 + 1.6); ctx.fillStyle = '#efeadc'; ctx.fillRect(-s2, -s2 * 0.7, s2 * 2, s2 * 1.4); ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
  }
  function crackMark(x, y, r, col) {
    const ln = [];
    for (let k = 0; k < 9; k++) { const a = k * 0.7 + R() * 0.5, pts = [[x, y]]; let px = x, py = y; for (let j = 0; j < 4; j++) { const rr = r * (0.18 + R() * 0.16); px += Math.cos(a + rnd2(-0.4, 0.4)) * rr; py += Math.sin(a + rnd2(-0.4, 0.4)) * rr; pts.push([px, py]); } ln.push(pts); }
    mark({ t: 'crack', x, y, ln, life: 2.6, max: 2.6, col: col || '#20160c', r });
  }
  function boltPts(x, y) { const pts = []; let px = x + rnd2(-60, 60), pz = 560; while (pz > 0) { pts.push([px, y, pz]); pz -= rnd2(40, 80); px += rnd2(-26, 26); } pts.push([x, y, 0]); return pts; }
  function updMarks(dt) { for (let k = marks.length - 1; k >= 0; k--) { marks[k].life -= dt; if (marks[k].life <= 0) marks.splice(k, 1); } }
  function drawMarks() {
    for (const m of marks) {
      const a = clamp(m.life / m.max * 1.6, 0, 1);
      ctx.globalAlpha = a;
      if (m.t === 'crack') {
        ctx.strokeStyle = m.col; ctx.lineWidth = Math.max(1, 2.4 * K); ctx.beginPath();
        for (const pts of m.ln) { ctx.moveTo(sx(pts[0][0]), sy(pts[0][1], 0)); for (const q of pts) ctx.lineTo(sx(q[0]), sy(q[1], 0)); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(20,14,8,.45)'; ctx.beginPath(); ctx.ellipse(sx(m.x), sy(m.y, 0), m.r * 0.32 * K, m.r * 0.32 * K * TILT, 0, 0, 7); ctx.fill();
      } else if (m.t === 'claw') { // trois griffures parallèles
        ctx.lineCap = 'round';
        for (const [w2, col] of [[4.2, 'rgba(255,120,0,.45)'], [2.2, '#1a0d04']]) {
          ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, w2 * K); ctx.beginPath();
          for (const o of [-9, 0, 9]) { ctx.moveTo(sx(m.x + m.nx * o), sy(m.y + m.ny * o, 0)); ctx.lineTo(sx(m.x2 + m.nx * o), sy(m.y2 + m.ny * o, 0)); }
          ctx.stroke();
        }
      } else if (m.t === 'ink') {
        ctx.fillStyle = '#120a1c'; ctx.beginPath(); ctx.ellipse(sx(m.x), sy(m.y, 0), m.r * K, m.r * K * TILT, m.rot, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(138,92,255,.35)'; ctx.beginPath(); ctx.ellipse(sx(m.x) - m.r * 0.3 * K, sy(m.y, 0) - m.r * 0.2 * K, m.r * 0.3 * K, m.r * 0.18 * K, 0, 0, 7); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function ultStart(e, loud) { // départ d'un ULTIME
    const k = e.uk, c = UCOL[k] || UCOL.upper, R2 = TF.ROSTER.find(r => r.ult && r.ult[0] === k);
    UL = { k, sx: e.sx, sy: e.sy, tx: e.tx, ty: e.ty, by: e.i, t0: performance.now() / 1000, g0: 0 };
    lastClaw = null; ulInv = false;
    if (loud) { AU.ult(k); showBanner(R2 ? R2.ult[1].toUpperCase() : 'ULTIME', e.n, c[0], 1.5, 0.66, 0.26); }
    flashCol = { thor: '170,215,255', abra: '240,140,255', encre: '60,30,90', fil: '255,225,120', crescendo: '255,250,230', couronne: '255,220,90', faucon: '170,235,255', fauche: '170,120,255' }[k] || '255,120,40';
    burst(e.x, e.y, 10, 22, { sp: 320, vz: 220, col: c, type: 'fire', size: 7, life: 0.55, g: 200 });
    ring(e.x, e.y, c[0], 90); ring(e.x, e.y, c[1], 60); impact(e.x, e.y, 14, 80);
    switch (k) {
      case 'bordee': // le coup de canon : flamme de bouche, nuage de poudre
        burst(e.x, e.y, 20, 30, { sp: 420, vz: 160, col: ['#ff6a00', '#ffd23a', '#fff'], type: 'fire', size: 9, life: 0.4, g: 0 });
        burst(e.x, e.y, 18, 18, { sp: 160, vz: 70, col: ['#8a8f99', '#5a5e66', '#c9ccd2'], type: 'smoke', size: 12, life: 1.6, g: -30 });
        shake(28); break;
      case 'upper': burst(e.x, e.y, 30, 20, { sp: 120, vz: 700, col: ['#ff9a3c', '#fff', '#c96a2a'], type: 'spark', size: 3, life: 0.5, g: 600 }); break;
      case 'rouleau': case 'stampede': burst(e.x, e.y, 2, 16, { sp: 260, vz: 80, col: ['#7a6248', '#5a4a36', '#9a8466'], type: 'puff', size: 9, life: 0.9, g: 0 }); turf(e.x, e.y, 14, 260); break;
      case 'abra': burst(e.x, e.y, 30, 18, { sp: 220, vz: 200, col: ['#e05cff', '#fff', '#ff9af0', '#7a5cff'], type: 'conf', size: 3, life: 1.2, g: 180 }); break;
      case 'encre': burst(e.x, e.y, 10, 12, { sp: 180, vz: 90, col: '#140c1e', type: 'smoke', size: 10, life: 1.2, g: -20 }); break;
      case 'couronne': burst(e.x, e.y, 30, 24, { sp: 260, vz: 300, col: ['#ffd23a', '#fff6c0', '#ff9a00'], type: 'conf', size: 3.5, life: 1.4, g: 300 }); break;
      case 'crescendo': for (let n = 0; n < 6; n++) spawn({ x: e.x + rnd2(-20, 20), y: e.y + rnd2(-10, 10), z: 50, vx: rnd2(-60, 60), vy: rnd2(-30, 30), vz: rnd2(60, 140), g: 0, life: 1.2, max: 1.2, size: 18, col: pick(['#fff', '#ffd23a']), type: 'note', txt: pick(['♪', '♫']), rot: rnd2(-0.3, 0.3), vr: 0 }); break;
      case 'faucon': burst(e.x, e.y, 20, 14, { sp: 200, vz: 260, col: ['#fff', '#e8f6ff'], type: 'conf', size: 3, life: 1.3, g: 120 }); break;
    }
  }
  function ultFlight(V, b, dt) { // pendant le vol : traînées et particules de chaque ultime
    if (!UL || !b.uk || dt <= 0) return;
    const k = ULK[b.uk - 1]; if (k !== UL.k) return;
    const c = UCOL[k], sp = len(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    const P = (o) => spawn(o);
    switch (k) {
      case 'upper': if (b.z > 60) for (let n = 0; n < 3; n++) P({ x: b.x + rnd2(-6, 6), y: b.y + rnd2(-6, 6), z: b.z + rnd2(-4, 10), vx: rnd2(-30, 30), vy: rnd2(-30, 30), vz: rnd2(60, 160), g: 0, life: 0.5, max: 0.5, size: rnd2(8, 14), col: pick(c), type: 'fire', rot: 0, vr: 0 }); break;
      case 'rouleau': case 'stampede':
        if (R() < 0.8) P({ x: b.x - ux * 20 + rnd2(-20, 20), y: b.y - uy * 20 + rnd2(-14, 14), z: 2, vx: -ux * 60 + rnd2(-60, 60), vy: -uy * 60 + rnd2(-60, 60), vz: rnd2(20, 60), g: 0, life: 0.9, max: 0.9, size: rnd2(8, 14), col: pick(['#7a6248', '#5a4a36', '#9a8466']), type: 'puff', rot: 0, vr: 0 });
        if (R() < 0.5) turf(b.x, b.y, 2, 200);
        break;
      case 'fauche': P({ x: b.x + rnd2(-8, 8), y: b.y + rnd2(-8, 8), z: b.z + rnd2(0, 10), vx: rnd2(-20, 20), vy: rnd2(-20, 20), vz: rnd2(10, 50), g: 0, life: 0.7, max: 0.7, size: rnd2(5, 9), col: pick(['#a66bff', '#5a2aa8', '#e8dcff']), type: 'fire', rot: 0, vr: 0 });
        if (R() < 0.5) P({ x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, vz: 15, g: 0, life: 0.9, max: 0.9, size: 8, col: '#140a24', type: 'smoke', rot: 0, vr: 0 }); break;
      case 'seisme': if (b.z < 12 && R() < 0.6) P({ x: b.x + rnd2(-16, 16), y: b.y + rnd2(-10, 10), z: 2, vx: rnd2(-80, 80), vy: rnd2(-50, 50), vz: rnd2(30, 80), g: 0, life: 0.8, max: 0.8, size: rnd2(7, 12), col: pick(['#7a6248', '#9a8466']), type: 'puff', rot: 0, vr: 0 }); break;
      case 'thor': if (R() < 0.7) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-260, 260), vy: rnd2(-260, 260), vz: rnd2(-100, 200), g: 0, life: 0.15, max: 0.15, size: 3, col: pick(['#fff', '#6fb8ff', '#b8e4ff']), type: 'spark', rot: 0, vr: 0 }); break;
      case 'faucon': { const a = performance.now() / 60;
        for (const s2 of [1, -1]) P({ x: b.x - uy * Math.cos(a) * 14 * s2, y: b.y + ux * Math.cos(a) * 14 * s2, z: b.z + Math.sin(a) * 14 * s2, vx: 0, vy: 0, vz: 0, g: 0, life: 0.35, max: 0.35, size: 4, col: s2 > 0 ? '#ffffff' : '#7fd8ff', type: 'fire', rot: 0, vr: 0 });
        if (R() < 0.25) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-60, 60), vy: rnd2(-60, 60), vz: rnd2(-20, 60), g: 90, life: 1.1, max: 1.1, size: 3, col: '#f4f8ff', type: 'conf', rot: R() * 6, vr: rnd2(-6, 6) }); break; }
      case 'abra': { const inv = b.gu > 0.18 && b.gu < 0.7;
        if (inv !== ulInv) { ulInv = inv; burst(b.x, b.y, b.z, 16, { sp: 180, vz: 120, col: ['#e05cff', '#fff', '#7a5cff'], type: 'conf', size: 3, life: 0.8, g: 0 }); burst(b.x, b.y, b.z, 6, { sp: 60, vz: 40, col: '#c7a6ff', type: 'smoke', size: 10, life: 0.6, g: 0 }); floatTxt(b.x, b.y, b.z + 40, inv ? 'POUF !' : 'TA-DAA !', '#ff9af0', 24); AU.swish(0.8); }
        if (!inv) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-40, 40), vy: rnd2(-40, 40), vz: rnd2(-20, 40), g: 0, life: 0.5, max: 0.5, size: 2.5, col: pick(c), type: 'conf', rot: R() * 6, vr: 8 });
        else if (R() < 0.15) P({ x: b.x, y: b.y, z: b.z, vx: 0, vy: 0, vz: 0, g: 0, life: 0.3, max: 0.3, size: 2, col: '#ff9af0', type: 'spark', rot: 0, vr: 0 });
        break; }
      case 'encre':
        P({ x: b.x + rnd2(-6, 6), y: b.y + rnd2(-6, 6), z: b.z + rnd2(-2, 6), vx: rnd2(-25, 25), vy: rnd2(-25, 25), vz: rnd2(0, 25), g: 0, life: 1.3, max: 1.3, size: rnd2(9, 15), col: pick(['#140c1e', '#1e1030', '#2a1640']), type: 'smoke', rot: 0, vr: 0 });
        if (R() < 0.12) mark({ t: 'ink', x: b.x + rnd2(-30, 30), y: b.y + rnd2(-20, 20), r: rnd2(8, 18), rot: R() * 3, life: 3, max: 3 }); break;
      case 'fil': if (R() < 0.6) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-30, 30), vy: rnd2(-30, 30), vz: rnd2(-10, 30), g: 40, life: 0.6, max: 0.6, size: 2.5, col: pick(c), type: 'spark', rot: 0, vr: 0 }); break;
      case 'crescendo': if (R() < 0.12 + sp / 6000) P({ x: b.x, y: b.y, z: b.z + 10, vx: rnd2(-40, 40), vy: rnd2(-40, 40), vz: rnd2(50, 120), g: 0, life: 1, max: 1, size: 12 + sp / 160, col: pick(['#fff', '#ffd23a', '#f4f1ea']), type: 'note', txt: pick(['♪', '♫', '♩']), rot: rnd2(-0.4, 0.4), vr: 0 }); break;
      case 'couronne': if (R() < 0.7) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-30, 30), vy: rnd2(-30, 30), vz: rnd2(0, 40), g: 0, life: 0.5, max: 0.5, size: 2.5, col: pick(c), type: 'spark', rot: 0, vr: 0 }); break;
      case 'bond':
        if (b.z < 14) { // griffures dans la pelouse
          if (!lastClaw) lastClaw = [b.x, b.y];
          const d = len(b.x - lastClaw[0], b.y - lastClaw[1]);
          if (d > 46) { mark({ t: 'claw', x: lastClaw[0], y: lastClaw[1], x2: b.x, y2: b.y, nx: -uy, ny: ux, life: 2.2, max: 2.2 }); lastClaw = [b.x, b.y]; turf(b.x, b.y, 2, 160); }
        } else lastClaw = null;
        if (R() < 0.6) P({ x: b.x, y: b.y, z: b.z + 4, vx: rnd2(-40, 40), vy: rnd2(-40, 40), vz: rnd2(0, 40), g: 0, life: 0.4, max: 0.4, size: rnd2(5, 8), col: pick(['#ff9000', '#111', '#ffb000']), type: 'fire', rot: 0, vr: 0 });
        break;
      case 'ruse': if (R() < 0.5) P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-30, 30), vy: rnd2(-30, 30), vz: rnd2(0, 30), g: 0, life: 0.4, max: 0.4, size: 5, col: pick(['#ff8a3d', '#fff']), type: 'fire', rot: 0, vr: 0 }); break;
      case 'bordee': P({ x: b.x, y: b.y, z: b.z, vx: rnd2(-15, 15), vy: rnd2(-15, 15), vz: rnd2(10, 30), g: 0, life: 1.1, max: 1.1, size: rnd2(6, 10), col: pick(['#8a8f99', '#5a5e66']), type: 'smoke', rot: 0, vr: 0 }); break;
    }
  }
  function drawUlt(V) { // éléments d'un ultime dessinés par-dessus le terrain
    const b = V.ball;
    if (!UL) return;
    const k = UL.k, act = b.uk && ULK[b.uk - 1] === k;
    if (!act && performance.now() / 1000 - UL.t0 > 0.4) { if (!b.uk) UL = null; return; }
    if (k === 'upper' && act && b.z > 70 && b.gu < 0.77) { // UPPERCUT : la cible où la météorite va s'écraser
      const u = 0.7765, ix = UL.sx + (UL.tx - UL.sx) * u, iy = UL.sy + (UL.ty - UL.sy) * u, X = sx(ix), Y = sy(iy, 0), t = performance.now() / 1000, pr = 0.75 + 0.25 * Math.sin(t * 18);
      ctx.strokeStyle = '#ff5a1e'; ctx.lineWidth = Math.max(1.5, 2.6 * K); ctx.globalAlpha = 0.9;
      for (const rr of [34, 20]) { ctx.beginPath(); ctx.ellipse(X, Y, rr * K * pr, rr * K * pr * TILT, 0, 0, 7); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(X - 44 * K, Y); ctx.lineTo(X - 26 * K, Y); ctx.moveTo(X + 26 * K, Y); ctx.lineTo(X + 44 * K, Y);
      ctx.moveTo(X, Y - 44 * K * TILT); ctx.lineTo(X, Y - 26 * K * TILT); ctx.moveTo(X, Y + 26 * K * TILT); ctx.lineTo(X, Y + 44 * K * TILT); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (k === 'fil' && act) { // le fil d'or tendu jusqu'au but
      ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
      const a0x = sx(UL.sx), a0y = sy(UL.sy, 58), a1x = sx(UL.tx), a1y = sy(UL.ty, 40), sh = Math.sin(performance.now() / 50) * 0.15;
      for (const [w2, al] of [[7, 0.18], [3, 0.45], [1.2, 0.95]]) { ctx.strokeStyle = '#ffd23a'; ctx.globalAlpha = al + sh * al; ctx.lineWidth = w2 * Math.min(K, 1.6); ctx.beginPath(); ctx.moveTo(a0x, a0y); ctx.lineTo(a1x, a1y); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }

