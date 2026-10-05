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
  function render(V, dt) {
    setLooks(V.pk);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.fillStyle = '#050506'; ctx.fillRect(0, 0, CW, CH);
    if (bgFlip !== cam.flip) buildBG();
    const rot = cam.rot;
    if (rot) { ctx.translate(CW / 2, CH / 2); ctx.rotate(rot); ctx.translate(-CW / 2, -CH / 2); }
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
    stadiumFx(V, dt);
    // vitesse & cycle de course, traces, images rémanentes
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
      if (dt > 0) {
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
      if (dt > 0 && V.ts > 0.5) {
        if (p.st === ST.slide && R() < 0.8) turf(p.x + rnd2(-6, 6), p.y + rnd2(-4, 4), 1, 90);
        else if ((p.st === ST.slide || p.st === ST.dash) && R() < 0.5) spawn({ x: p.x, y: p.y, z: 2, vx: rnd2(-20, 20), vy: rnd2(-20, 20), vz: 20, g: 0, life: 0.5, max: 0.5, size: 5, col: '#5a4a36', type: 'puff', rot: 0, vr: 0 });
        else if (spd[i] > 300 && R() < 0.12) spawn({ x: p.x, y: p.y, z: 1, vx: 0, vy: 0, vz: 10, g: 0, life: 0.35, max: 0.35, size: 3, col: '#4a4034', type: 'puff', rot: 0, vr: 0 });
      }
    }
    const b = V.ball, bd = len(b.x - pbx, b.y - pby);
    if (bd < 200) ballSpin += bd * 0.09 * cam.flip;
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
    updMarks(dt); updGore(dt);

    curBar = V.bar; animDt = Math.min(0.05, dt * (V.ts || 1));
    if (gore.length) drawGore();
    drawShadows(V);
    if (marks.length) drawMarks();
    const items = [];
    for (let i = 0; i < 8; i++) items.push([V.players[i].y, 0, i]);
    items.push([b.y + 0.5, 1, 0]);
    for (let k = 0; k < V.proj.length; k++) items.push([V.proj[k][1] + 1, 3, k]);
    items.push([MB + 0.2, 2, 0], [MB + 0.2, 2, 1]);
    items.sort((a, c) => a[0] - c[0]);
    for (const it of items) {
      if (it[1] === 0) drawPlayer(V.players[it[2]], it[2], V);
      else if (it[1] === 1) drawBall(b);
      else if (it[1] === 3) drawKi(V.proj[it[2]]);
      else drawGoal(it[2]);
    }
    for (const bm of V.beams) drawBeam(bm);
    drawUlt(V);
    drawParts();
    drawFloats();
    if (rot) ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (ZB) { // flou de zoom radial depuis le point d'impact
      const a = (ZB.end - performance.now()) / ZB.dur;
      if (a <= 0) ZB = null;
      else {
        const px = sx(ZB.x), py = sy(ZB.y, 30);
        for (const z of [1.03, 1.07]) { ctx.globalAlpha = 0.24 * a; ctx.drawImage(cv, 0, 0, cv.width, cv.height, px - px * z, py - py * z, CW * z, CH * z); }
        ctx.globalAlpha = 1;
      }
    }
    if (SPL.length) drawSplats(dt > 0 ? dt : 0);
    // ambiance : vignette sombre permanente, rouge au ralenti / quand le spécial est prêt
    // (calques CSS composités par le GPU : bien moins coûteux qu'un dessin plein écran)
    const ready = app.mode !== 'menu' && !app.drafting && V.bar[app.myTeam] >= 1;
    const rs = V.ts < 0.95 ? 's' + Math.round(clamp((1 - V.ts) * 1.1, 0, 1) * 10) : ready ? 'on' : '';
    if (rs !== rageS) { rageS = rs; rageEl.classList.toggle('on', rs === 'on'); rageEl.style.opacity = rs[0] === 's' ? (+rs.slice(1) / 10) : ''; }
    if (flash > 0) { ctx.fillStyle = `rgba(${flashCol},${clamp(flash, 0, 1) * 0.5})`; ctx.fillRect(0, 0, CW, CH); }
    if (app.mode !== 'menu' && !app.drafting) { drawHUD(V); drawFeed(); drawCombo(); drawOverText(V); }
  }

  function updCam(V, dt) {
    const b = V.ball;
    let tx = b.x, ty = b.y;
    if (app.mode !== 'menu') {
      const me = V.players[app.myTeam * 4 + V.ctrl[app.myTeam]];
      tx = b.x * 0.78 + me.x * 0.22; ty = b.y * 0.78 + me.y * 0.22;
      if (b.owner >= 0 && (b.owner >> 2) === app.myTeam) tx += (app.myTeam === 0 ? 1 : -1) * 70;
    }
    const k = 1 - Math.exp(-dt * 4.2);
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    const zt = 1 + (1 - (V.ts || 1)) * 0.16;
    cam.zoom += (zt - cam.zoom) * (1 - Math.exp(-dt * 6));
    // ressort de recul (direction du coup), roulis et zoom d'impact
    const kd = Math.min(dt, 0.033);
    cam.kvx += (-260 * cam.kx - 17 * cam.kvx) * kd; cam.kvy += (-260 * cam.ky - 17 * cam.kvy) * kd;
    cam.kx += cam.kvx * kd; cam.ky += cam.kvy * kd;
    cam.rv += (-300 * cam.rot - 16 * cam.rv) * kd; cam.rot = clamp(cam.rot + cam.rv * kd, -0.022, 0.022);
    if (Math.abs(cam.rot) < 1e-4 && Math.abs(cam.rv) < 1e-3) { cam.rot = 0; cam.rv = 0; }
    cam.zp *= Math.exp(-dt * 7); if (cam.zp < 0.002) cam.zp = 0;
    K = S * cam.zoom * (1 + cam.zp);
    const hw = CW / 2 / K, hh = CH / 2 / (K * TILT);
    const ax = -150 + hw, bxm = W + 150 - hw;
    cam.x = ax < bxm ? clamp(cam.x, ax, bxm) : W / 2;
    const ay = -150 + hh, bym = H + 85 - hh;
    cam.y = ay < bym ? clamp(cam.y, ay, bym) : H / 2;
    cam.shake *= Math.exp(-dt * 8);
    if (cam.shake < 0.3) cam.shake = 0;
    cam.sx = (R() * 2 - 1) * cam.shake + cam.kx; cam.sy = (R() * 2 - 1) * cam.shake + cam.ky;
  }

