  /* ---------- rendu principal ---------- */
  const FLASH = [];
  function stadiumFx(V, dt) {
    const now = performance.now() / 1000;
    // reflet lumineux qui balaie les panneaux LED
    const xa = -GD - 16, xb = W + GD + 16, u = (now * 0.22) % 1.5 - 0.25, xm = xa + (xb - xa) * u;
    const y0 = sy(-10, 26), y1 = sy(-10, 0);
    if (y1 > 0 && y0 < CH) {
      const X1s = sx(xm - 70), X2s = sx(xm + 70), lo = Math.min(X1s, X2s), hi = Math.max(X1s, X2s);
      if (hi > 0 && lo < CW) {
        const lg = ctx.createLinearGradient(lo, 0, hi, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, 'rgba(255,255,255,.16)'); lg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = lg; ctx.fillRect(lo, y0, hi - lo, y1 - y0); ctx.globalCompositeOperation = 'source-over';
      }
    }
    // flashs d'appareils photo dans les tribunes (bien plus nombreux après un but)
    const party = V.phase === 'goal' || V.phase === 'end' || performance.now() < hypeT; // la tribune mitraille aussi les K.O. brutaux
    if (dt > 0 && R() < (party ? 0.9 : 0.22)) {
      const n = party ? 3 : 1;
      for (let k = 0; k < n; k++) {
        const r = (R() * 13) | 0;
        FLASH.push({ x: rnd2(-180, W + 180), y: -20 - r * 12.5, z: 16 + r * 9.5 + 9, t: 0.09 + R() * 0.05 });
      }
    }
    ctx.globalCompositeOperation = 'lighter';
    for (let k = FLASH.length - 1; k >= 0; k--) {
      const f = FLASH[k]; f.t -= dt;
      if (f.t <= 0) { FLASH.splice(k, 1); continue; }
      const X = sx(f.x), Y = sy(f.y, f.z), rr = 9 * K;
      if (X < -20 || X > CW + 20 || Y < -20 || Y > CH) continue;
      ctx.globalAlpha = Math.min(1, f.t * 12); ctx.drawImage(GLOW('#dfe8ff'), X - rr, Y - rr, rr * 2, rr * 2);
    }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
  /* ---------- état d'animation par joueur : vitesse lissée, cycle de course, traces au sol ---------- */
  function updAnimState(V, dt) {
    const gdt = dt * (V.ts || 1), igd = 1 / Math.max(gdt, 1e-3);
    for (let i = 0; i < 8; i++) {
      const p = V.players[i], dx = p.x - prevX[i], dy = p.y - prevY[i], d = len(dx, dy);
      if (d < 60 && gdt > 0) {
        // vitesse et accélération lissées (en temps de jeu : le ralenti ralentit aussi les foulées)
        const k = Math.min(1, gdt * 14), ox = SVX[i], oy = SVY[i];
        SVX[i] += (dx * igd - ox) * k; SVY[i] += (dy * igd - oy) * k;
        const ka = Math.min(1, gdt * 7);
        SAX[i] += ((SVX[i] - ox) * igd - SAX[i]) * ka; SAY[i] += ((SVY[i] - oy) * igd - SAY[i]) * ka;
        spd[i] = len(SVX[i], SVY[i]);
        // cadence réaliste : on allonge la foulée plus qu'on n'accélère le pas
        if (spd[i] > 6) animPh[i] += gdt * 6.283 * (1.25 + 0.0058 * Math.min(spd[i], 380)) * (LK[i].pe ? LK[i].pe.g.cad : 1);
        // pivot sur place : petits pas d'appui
        const fa = Math.atan2(p.fy, p.fx); let da = fa - FPV[i];
        if (da !== da) da = 0; while (da > Math.PI) da -= 6.283; while (da < -Math.PI) da += 6.283;
        FPV[i] = fa;
        SHF[i] += (Math.min(1, Math.abs(da) * igd / 5) - SHF[i]) * Math.min(1, gdt * 6);
        if (spd[i] < 40 && SHF[i] > 0.05) animPh[i] += gdt * 6.283 * 1.7 * SHF[i];
      } else if (d >= 60) { SVX[i] = SVY[i] = SAX[i] = SAY[i] = 0; spd[i] = 0; FPV[i] = NaN; }
      prevX[i] = p.x; prevY[i] = p.y;
      if (p.st !== stPrev[i]) { stPrev[i] = p.st; stT[i] = 0; AHIT[i] = 0; } else stT[i] += dt * (V.ts || 1);
      if ((p.st === ST.charge || p.st === ST.blast) && dt > 0 && R() < 0.7) { const T = TEAMS[i >> 2], full = V.bar[i >> 2] >= 1; spawn({ x: p.x + rnd2(-16, 16), y: p.y + rnd2(-6, 6), z: rnd2(0, 30), vx: 0, vy: 0, vz: rnd2(90, 170), g: -60, life: 0.55, max: 0.55, size: rnd2(2.5, 5), col: full ? pick(['#ffd23a', '#fff6c0']) : pick([T.acc, '#ffffff']), type: 'fire', rot: 0, vr: 0 }); }
      const gh = ghosts[i];
      if (p.st === ST.dash || p.st === ST.fly || (p.st === ST.down && p.z > 8)) { gh.push([p.x, p.y, p.z]); if (gh.length > 7) gh.shift(); }
      else if (gh.length) gh.length = 0;
      if (SQ[i]) { SQ[i] *= Math.exp(-dt * 9); if (Math.abs(SQ[i]) < 0.004) SQ[i] = 0; }
      if (dt > 0) groundFx(p, i, dt);
      if (dt > 0 && V.ts > 0.5) {
        if (p.st === ST.slide && R() < 0.8) turf(p.x + rnd2(-6, 6), p.y + rnd2(-4, 4), 1, 90);
        else if ((p.st === ST.slide || p.st === ST.dash) && R() < 0.5) spawn({ x: p.x, y: p.y, z: 2, vx: rnd2(-20, 20), vy: rnd2(-20, 20), vz: 20, g: 0, life: 0.5, max: 0.5, size: 5, col: '#5a4a36', type: 'puff', rot: 0, vr: 0 });
        else if (spd[i] > 300 && R() < 0.12) spawn({ x: p.x, y: p.y, z: 1, vx: 0, vy: 0, vz: 10, g: 0, life: 0.35, max: 0.35, size: 3, col: '#4a4034', type: 'puff', rot: 0, vr: 0 });
      }
    }
  }
  function groundFx(p, i, dt) { // sang des blessés, sillon des corps qui glissent, saleté
    const lv = BLV(p.dmg);
    if (GORE && lv >= 2 && p.st !== ST.down && R() < dt * (lv === 3 ? 5 : 2.4)) // il pisse le sang : il en sème partout
      spawn({ x: p.x + rnd2(-4, 4), y: p.y + rnd2(-3, 3), z: rnd2(32, 46), vx: SVX[i] * 0.3, vy: SVY[i] * 0.3, vz: rnd2(-20, 50), g: 900, life: 1.2, max: 1.2, size: rnd2(1.1, 2.1), col: '#8a070b', type: 'blood', rot: 0, vr: 0 });
    if (p.st === ST.down && p.z < 2 && spd[i] > 110) { // le corps laboure la pelouse
      if (SKX[i] === SKX[i] && len(p.x - SKX[i], p.y - SKY[i]) > 12) {
        goreMark('k', SKX[i], SKY[i], 7, p.x, p.y, 9);
        if (GORE && lv >= 2) goreMark('s', SKX[i] + rnd2(-2, 2), SKY[i], 3.2, p.x, p.y, 15);
        SKX[i] = p.x; SKY[i] = p.y;
      } else if (SKX[i] !== SKX[i]) { SKX[i] = p.x; SKY[i] = p.y; }
      if (R() < 0.5) turf(p.x, p.y, 1, 70);
      if (R() < 0.35) spawn({ x: p.x, y: p.y, z: 2, vx: rnd2(-20, 20), vy: rnd2(-20, 20), vz: 24, g: 0, life: 0.6, max: 0.6, size: 6, col: '#5a4a36', type: 'puff', rot: 0, vr: 0 });
      DIRT[i] = Math.min(1, DIRT[i] + dt * 0.25);
    } else SKX[i] = NaN;
    if (p.st === ST.slide) DIRT[i] = Math.min(1, DIRT[i] + dt * 0.35);
  }
  /* ---------- ballon : rotation, traînées de feu, trace des tirs ---------- */
  function updBallFx(V, dt) {
    const b = V.ball, bd = len(b.x - pbx, b.y - pby);
    if (bd < 200) ballSpin += bd * 0.09 * cam.flip;
    // rebond au sol : le ballon s'écrase (squash)
    if (b.owner < 0 && pbz > 6 && b.z <= 1.5 && bvz < -60) BSQ = Math.min(0.4, -bvz / 1400);
    bvz = dt > 0 ? (b.z - pbz) / Math.max(dt * (V.ts || 1), 1e-3) : bvz; pbz = b.z;
    if (BSQ) { BSQ *= Math.exp(-dt * 10); if (BSQ < 0.01) BSQ = 0; }
    pbx = b.x; pby = b.y;
    const ukk = b.uk ? ULK[b.uk - 1] : '';
    if (b.sup) {
      trail.push([b.x, b.y, b.z]); if (trail.length > 18) trail.shift();
      const invis = ukk === 'abra' && b.gu > 0.18 && b.gu < 0.7;
      if (invis) trail.length = 0;
      else {
        const cols = ukk ? UCOL[ukk] : b.sup === 2 ? ['#ff1e2e', '#ffffff', '#ff4060'] : ['#ffd23a', '#ff6a00', '#ff1e1e', '#fff'];
        for (let k = 0; k < 2; k++) spawn({ x: b.x + rnd2(-4, 4), y: b.y + rnd2(-4, 4), z: b.z + rnd2(0, 8), vx: rnd2(-40, 40), vy: rnd2(-40, 40), vz: rnd2(20, 90), g: 0, life: 0.35, max: 0.35, size: rnd2(4, 8), col: pick(cols), type: 'fire', rot: 0, vr: 0 });
        if (R() < 0.6 && ukk !== 'fil' && ukk !== 'couronne' && ukk !== 'crescendo') spawn({ x: b.x, y: b.y, z: b.z, vx: rnd2(-15, 15), vy: rnd2(-15, 15), vz: rnd2(10, 40), g: 0, life: 0.7, max: 0.7, size: rnd2(4, 7), col: '#1c1a1a', type: 'smoke', rot: 0, vr: 0 });
      }
      ultFlight(V, b, dt);
    } else trail.length = 0;
    // trace des tirs normaux, à la couleur du tireur
    const bsp = len(b.vx || 0, b.vy || 0);
    if (!b.sup && b.owner < 0 && b.kb >= 0 && (b.kb & 3) !== 3 && (bsp > 480 || (strail.length && bsp > 250))) {
      if (!strail.length) strailCol = LK[b.kb].pe.fx;
      strail.push([b.x, b.y, b.z]); if (strail.length > 16) strail.shift();
    } else if (strail.length) strail.shift();
  }
  /* ---------- le monde : décor, ombres, joueurs triés en profondeur, effets ---------- */
  function drawBackdrop() {
    ctx.save();
    ctx.translate(CW / 2 + cam.sx, CH / 2 + cam.sy);
    ctx.scale(cam.flip * K / bgRes, K / bgRes);
    { // on ne copie que la partie visible du décor
      const mx = (CW / 2 + 24) / K, my = (CH / 2 + 24) / K;
      const u0 = clamp((cam.x - mx - X0) * bgRes, 0, bg.width), u1 = clamp((cam.x + mx - X0) * bgRes, 0, bg.width);
      const vc = BGOFF + (cam.y - Y0) * TILT;
      const v0 = clamp((vc - my) * bgRes, 0, bg.height), v1 = clamp((vc + my) * bgRes, 0, bg.height);
      if (u1 > u0 && v1 > v0) ctx.drawImage(bg, u0, v0, u1 - u0, v1 - v0, (X0 - cam.x) * bgRes + u0, ((Y0 - cam.y) * TILT - BGOFF) * bgRes + v0, u1 - u0, v1 - v0);
    }
    ctx.restore();
  }
  const ITEMS = [];
  function drawWorld(V) {
    const b = V.ball;
    if (gore.length) drawGore();
    drawShadows(V);
    if (marks.length) drawMarks();
    drawGuides(V, 0); // aides de jeu au sol (sous les joueurs)
    ITEMS.length = 0;
    for (let i = 0; i < 8; i++) ITEMS.push([V.players[i].y, 0, i]);
    ITEMS.push([b.y + 0.5, 1, 0]);
    for (let k = 0; k < V.proj.length; k++) ITEMS.push([V.proj[k][1] + 1, 3, k]);
    ITEMS.push([MB + 0.2, 2, 0], [MB + 0.2, 2, 1]);
    ITEMS.sort((a, c) => a[0] - c[0]);
    for (const it of ITEMS) {
      if (it[1] === 0) drawPlayer(V.players[it[2]], it[2], V);
      else if (it[1] === 1) drawBall(b);
      else if (it[1] === 3) drawKi(V.proj[it[2]]);
      else drawGoal(it[2]);
    }
    for (const bm of V.beams) drawBeam(bm);
    drawUlt(V);
    drawParts();
    drawGuides(V, 1); // marqueurs au-dessus des joueurs
    drawFloats();
  }
  function render(V, dt) {
    setLooks(V.pk);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, CW, CH);
    if (bgFlip !== cam.flip) buildBG();
    const rot = cam.rot;
    if (rot) { ctx.translate(CW / 2, CH / 2); ctx.rotate(rot); ctx.translate(-CW / 2, -CH / 2); }
    drawBackdrop();
    stadiumFx(V, dt);
    updAnimState(V, dt);
    updBallFx(V, dt);
    updMarks(dt); updGore(dt);
    curBar = V.bar; animDt = Math.min(0.05, dt * (V.ts || 1));
    drawWorld(V);
    if (rot) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    composite(V, dt);
    drawUI(V, dt);
  }
  /* ---------- composition : pipeline WebGL, ou repli 2D ---------- */
  const PP = { w: 0, h: 0, time: 0, dt: 0, bloom: 0, thr: 0.6, sat: 1.1, con: 1.05, tone: 1, vig: 1, grain: 0, chroma: 0, slow: 0, gray: 0, persp: 0, heat: null, flash: [0, 0, 0, 0], zoom: null, lights: [] };
  let grayT = 0;
  function composite(V, dt) {
    const now = performance.now(), rdt = animRealDt;
    // vignette rouge : spécial prêt, ralenti (calque CSS composité par le GPU)
    const ready = app.mode !== 'menu' && !app.drafting && V.bar[app.myTeam] >= 1;
    const rs = V.ts < 0.95 ? 's' + Math.round(clamp((1 - V.ts) * 1.1, 0, 1) * 10) : ready ? 'on' : '';
    if (rs !== rageS) { rageS = rs; rageEl.classList.toggle('on', rs === 'on'); rageEl.style.opacity = rs[0] === 's' ? (+rs.slice(1) / 10) : ''; }
    const lose = V.phase === 'end' && app.mode !== 'menu' && !app.drafting && V.winner >= 0 && V.winner !== app.myTeam;
    grayT += ((lose ? 0.6 : 0) - grayT) * Math.min(1, rdt * 1.5);
    const zb = ZB ? (ZB.end - now) / ZB.dur : 0; if (zb <= 0) ZB = null;
    if (!usePost) { // repli 2D : flou radial et flash dessinés à la main
      if (ZB) {
        const px = sx(ZB.x), py = sy(ZB.y, 30);
        for (const z of [1.03, 1.07]) { ctx.globalAlpha = 0.24 * zb; ctx.drawImage(cv, 0, 0, cv.width, cv.height, px - px * z, py - py * z, CW * z, CH * z); }
        ctx.globalAlpha = 1;
      }
      if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${clamp(flash, 0, 1) * 0.5})`; ctx.fillRect(0, 0, CW, CH); }
      return;
    }
    const t = GFX(), fc = flashCol.split(',');
    PP.w = CW; PP.h = CH; PP.time = now / 1000; PP.dt = rdt;
    PP.bloom = t.bloom * (1 + 0.5 * clamp(1 - V.ts, 0, 1)); PP.thr = 0.6;
    PP.sat = 1.1; PP.con = 1.06; PP.tone = 1; PP.vig = t.vig * (app.mode === 'menu' ? 1.25 : 1); PP.grain = t.grain;
    PP.chroma = Math.min(0.018, chromaP * 0.012 + clamp(1 - V.ts, 0, 1) * 0.005);
    PP.slow = clamp((1 - V.ts) * 1.4, 0, 1); PP.gray = grayT; PP.persp = t.persp;
    const bm0 = V.beams[0];
    PP.heat = V.ball.uk ? [sx(V.ball.x), sy(V.ball.y, V.ball.z), 1] : bm0 ? [sx(bm0[0] + bm0[2] * bm0[4] * 0.5), sy(bm0[1] + bm0[3] * bm0[4] * 0.5, 30), 0.8] : null;
    PP.flash[0] = +fc[0] / 255; PP.flash[1] = +fc[1] / 255; PP.flash[2] = +fc[2] / 255; PP.flash[3] = flash > 0 ? clamp(flash, 0, 1) * 0.55 : 0;
    PP.zoom = ZB ? [sx(ZB.x), sy(ZB.y, 30), 0.075 * zb] : null;
    PP.lights = t.lights ? collectLights(V) : [];
    POST.render(PP);
  }
  /* ---------- lumières dynamiques : tout ce qui brûle, brille ou explose éclaire la scène ---------- */
  const LTS = [];
  const rgb = h => { h = hx(h, '#ffffff'); const n = parseInt(h.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const RGB = {}; const rgbc = h => RGB[h] || (RGB[h] = rgb(h));
  function collectLights(V) {
    LTS.length = 0;
    const b = V.ball, H0 = CH;
    if (b.sup && !(b.uk && ULK[b.uk - 1] === 'abra' && b.gu > 0.18 && b.gu < 0.7)) {
      const c = b.uk ? UCOL[ULK[b.uk - 1]][0] : b.sup === 2 ? '#ff2a3a' : '#ff8a1a';
      LTS.push({ x: sx(b.x), y: sy(b.y, b.z), r: H0 * (b.uk ? 0.36 : 0.28), c: rgbc(c), i: b.uk ? 0.85 : 0.6 });
    }
    for (const k of V.proj) LTS.push({ x: sx(k[0]), y: sy(k[1], 30), r: H0 * 0.2, c: rgbc(KICOL[k[4]][1]), i: 0.7 });
    for (const bm of V.beams) { const c = rgbc(KICOL[bm[6]][1]), a = clamp(bm[5] / 0.2, 0, 1); for (const u of [0.15, 0.5, 0.85]) LTS.push({ x: sx(bm[0] + bm[2] * bm[4] * u), y: sy(bm[1] + bm[3] * bm[4] * u, 30), r: H0 * 0.26, c, i: 0.8 * a }); }
    for (let i = 0; i < 8; i++) { const p = V.players[i]; if (p.st === ST.charge || p.st === ST.blast) { const full = V.bar[i >> 2] >= 1; LTS.push({ x: sx(p.x), y: sy(p.y, 30), r: H0 * 0.17, c: rgbc(full ? '#ffd23a' : KICOL[i >> 2][1]), i: full ? 0.7 : 0.45 }); } }
    return LTS;
  }
  function flashLight(x, y, z, col, r, i, life) { if (usePost && GFX().lights) POST.light(sx(x), sy(y, z || 20), CH * r, rgbc(col), i, life); }
  function shockAt(x, y, z, amp, dur, rmax) { if (usePost) POST.shock(sx(x), sy(y, z || 0), amp * (OPT.shake ? 1 : 0.4), dur, rmax); }
  /* ---------- l'interface, sur sa propre couche ---------- */
  function drawUI(V, dt) {
    const wctx = ctx; ctx = uictx;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, CW, CH);
    if (SPL.length) drawSplats(dt > 0 ? dt : 0);
    if (app.mode !== 'menu' && !app.drafting) { drawHUD(V); drawFeed(); drawCombo(); drawOffscreen(V); drawOverText(V); }
    ctx = wctx;
  }

