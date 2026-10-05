  /* =============== CAMÉRA « RÉALISATEUR » ===============
     Suivi anticipé du jeu, zoom selon la densité de l'action, plans cinématiques courts
     (ultimes, K.O. brutaux, buts, fin de match) et plan d'ouverture pendant le compte à rebours.
     Règle d'or : le joueur que tu contrôles ne sort jamais du cadre. */
  const DIRC = { shot: null, intro: 0, lx: 0, ly: 0, dz: 1, rotT: 0 };
  // plan cinématique : kind (ult | ko | goal | end), point (ou suivi du ballon), zoom, durée, priorité
  function camShot(kind, x, y, zoom, dur, prio) {
    const s = DIRC.shot;
    if (s && s.t < s.dur && (s.prio || 0) > (prio || 0)) return;
    DIRC.shot = { kind, x, y, zoom, dur, prio: prio || 0, t: 0 };
  }
  function camIntro() { DIRC.intro = 3.1; DIRC.shot = null; }
  const easeIO = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

  function updCam(V, dt) {
    const b = V.ball, inGame = app.mode !== 'menu' && !app.drafting;
    const me = inGame ? V.players[app.myTeam * 4 + V.ctrl[app.myTeam]] : null;
    // 1. cadrage de base : le ballon, un peu de toi, et de l'avance dans le sens du jeu
    let tx = b.x, ty = b.y;
    if (me) { tx = b.x * 0.78 + me.x * 0.22; ty = b.y * 0.78 + me.y * 0.22; }
    const bv = b.owner >= 0 ? 0.12 : 0.2;
    const lxT = clamp((b.vx || 0) * bv, -150, 150), lyT = clamp((b.vy || 0) * bv * 0.6, -80, 80);
    const kl = 1 - Math.exp(-dt * 2.2);
    DIRC.lx += (lxT - DIRC.lx) * kl; DIRC.ly += (lyT - DIRC.ly) * kl;
    tx += DIRC.lx; ty += DIRC.ly;
    if (me && b.owner >= 0 && (b.owner >> 2) === app.myTeam) tx += (app.myTeam === 0 ? 1 : -1) * 70;
    // 2. zoom de fond : serré quand ça se bat autour du ballon, large quand le jeu s'ouvre
    let near = 0;
    for (let i = 0; i < 8; i++) { const p = V.players[i]; if ((i & 3) !== 3 && len(p.x - b.x, p.y - b.y) < 230) near++; }
    const fast = clamp((len(b.vx || 0, b.vy || 0) - 500) / 900, 0, 1);
    const dzT = clamp(0.97 + near * 0.022 - fast * 0.07, 0.93, 1.08);
    DIRC.dz += (dzT - DIRC.dz) * (1 - Math.exp(-dt * 1.4));
    let zt = DIRC.dz * (1 + (1 - (V.ts || 1)) * 0.16);
    // 3. plans cinématiques
    let rotT = 0;
    const s = DIRC.shot;
    if (s) {
      s.t += dt;
      const live = s.kind === 'ult' ? b.sup > 0 && s.t < s.dur : s.t < s.dur;
      if (!live && s.t >= s.dur + 0.4) DIRC.shot = null;
      else {
        const inn = clamp(s.t / 0.22, 0, 1), out = live ? 1 : clamp(1 - (s.t - s.dur) / 0.4, 0, 1), w = easeIO(Math.min(inn, out));
        const fx = s.kind === 'ult' ? b.x + (b.vx || 0) * 0.15 : s.x, fy = s.kind === 'ult' ? b.y : s.y;
        tx += (fx - tx) * w * (s.kind === 'ult' ? 0.65 : 0.8); ty += (fy - ty) * w * (s.kind === 'ult' ? 0.65 : 0.8);
        zt += (s.zoom - zt) * w;
        if (s.kind === 'ult') rotT = 0.01 * w * (cam.flip * ((b.vx || 0) >= 0 ? 1 : -1));
      }
    }
    // 4. plan d'ouverture : on survole la tribune puis on plonge sur le terrain
    if (DIRC.intro > 0) {
      DIRC.intro -= dt;
      const u = easeIO(clamp(1 - DIRC.intro / 3.1, 0, 1));
      tx += (1 - u) * -320 * cam.flip; ty += (1 - u) * -260; zt = lerp(0.78, zt, u); rotT += (1 - u) * 0.012;
    }
    // 5. ton joueur reste dans le cadre (marge de 22 % autour du centre)
    if (me && DIRC.intro <= 0) {
      const hw = CW / 2 / (S * zt) * 0.78, hh = CH / 2 / (S * zt * TILT) * 0.7;
      tx = clamp(tx, me.x - hw, me.x + hw); ty = clamp(ty, me.y - hh, me.y + hh);
    }
    const k = 1 - Math.exp(-dt * (s && s.kind === 'ko' ? 6 : 4.2));
    cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    cam.zoom += (zt - cam.zoom) * (1 - Math.exp(-dt * (DIRC.intro > 0 ? 3 : 5)));
    // ressort de recul (direction du coup), roulis (vers l'angle voulu) et zoom d'impact
    const kd = Math.min(dt, 0.033);
    DIRC.rotT += (rotT - DIRC.rotT) * (1 - Math.exp(-dt * 3));
    cam.kvx += (-260 * cam.kx - 17 * cam.kvx) * kd; cam.kvy += (-260 * cam.ky - 17 * cam.kvy) * kd;
    cam.kx += cam.kvx * kd; cam.ky += cam.kvy * kd;
    cam.rv += (-300 * (cam.rot - DIRC.rotT) - 16 * cam.rv) * kd; cam.rot = clamp(cam.rot + cam.rv * kd, -0.024, 0.024);
    if (Math.abs(cam.rot) < 1e-4 && Math.abs(cam.rv) < 1e-3 && !DIRC.rotT) { cam.rot = 0; cam.rv = 0; }
    cam.zp *= Math.exp(-dt * 7); if (cam.zp < 0.002) cam.zp = 0;
    K = S * cam.zoom * (1 + cam.zp);
    const hw = CW / 2 / K, hh = CH / 2 / (K * TILT);
    const ax = -150 + hw, bxm = W + 150 - hw;
    cam.x = ax < bxm ? clamp(cam.x, ax, bxm) : W / 2;
    const ay = -150 + hh - (DIRC.intro > 0 ? 160 : 0), bym = H + 85 - hh;
    cam.y = ay < bym ? clamp(cam.y, ay, bym) : H / 2;
    cam.shake *= Math.exp(-dt * 8);
    if (cam.shake < 0.3) cam.shake = 0;
    const sk = OPT.shake ? 1 : 0.35;
    cam.sx = ((R() * 2 - 1) * cam.shake + cam.kx) * sk; cam.sy = ((R() * 2 - 1) * cam.shake + cam.ky) * sk;
  }

