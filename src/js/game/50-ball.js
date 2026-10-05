  function drawBall(b) {
    const uk = b.uk ? ULK[b.uk - 1] : '';
    if (uk === 'abra' && b.gu > 0.18 && b.gu < 0.7) return; // ABRACADABRA : invisible
    const gs = uk === 'rouleau' ? 2.4 : uk === 'bordee' ? 1.25 : 1;
    const X = sx(b.x), Y = sy(b.y, b.z) - (gs - 1) * BR * K * 0.9, r = BR * K * gs;
    if (!b.sup && strail.length > 2) { // trace du tir, à la couleur du tireur : on voit l'effet (enroulée, flottante…)
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = strailCol; ctx.globalAlpha = 0.5;
      for (let k = 1; k < strail.length; k++) {
        const a = strail[k - 1], c = strail[k], f = k / strail.length;
        ctx.globalAlpha = 0.55 * f; ctx.lineWidth = r * (0.25 + 1.2 * f);
        ctx.beginPath(); ctx.moveTo(sx(a[0]), sy(a[1], a[2])); ctx.lineTo(sx(c[0]), sy(c[1], c[2])); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    if (uk === 'couronne' && b.gu < 0.97) { // deux ballons dorés leurres de part et d'autre du vrai
      const sp = len(b.vx, b.vy) || 1, nx = -b.vy / sp, ny = b.vx / sp, off = 115 * Math.sin(Math.PI * clamp(b.gu, 0, 1));
      for (const s2 of [1, -1]) {
        const X2 = sx(b.x + nx * off * s2), Y2 = sy(b.y + ny * off * s2, b.z + 6 * s2);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.drawImage(GLOW('#ffd23a'), X2 - r * 2.6, Y2 - r * 2.6, r * 5.2, r * 5.2); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.85; ctx.fillStyle = '#ffd23a'; circ(X2, Y2, r); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, K); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    if (b.sup && trail.length > 1) {
      ctx.globalCompositeOperation = 'lighter';
      const cols = uk ? UCOL[uk] : b.sup === 2 ? ['#ff1e2e', '#ffffff', '#ff4060'] : ['#ffd23a', '#ff6a00', '#ff1e1e'];
      for (let i = 0; i < trail.length; i++) {
        const t = trail[i], a = i / trail.length;
        ctx.fillStyle = cols[i % 3]; ctx.globalAlpha = a * 0.6;
        circ(sx(t[0]), sy(t[1], t[2]), r * (0.35 + a * 1.4)); ctx.fill();
      }
      ctx.globalAlpha = 0.55; ctx.fillStyle = b.sup === 2 ? (uk ? UCOL[uk][0] : '#ff1e2e') : '#ff8a1a'; circ(X, Y, r * 2.4); ctx.fill();
      if (uk) { ctx.globalAlpha = 0.8; ctx.drawImage(GLOW(hx(UCOL[uk][0], '#ff1e2e')), X - r * 4, Y - r * 4, r * 8, r * 8); }
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (uk === 'fauche' || uk === 'stampede') { // lame de faux / cornes du buffle, orientées dans le sens du vol
        const sp = len(b.vx, b.vy) || 1, ax = b.vx / sp * cam.flip, ay = b.vy / sp * TILT, al = len(ax, ay) || 1, an = Math.atan2(ay / al, ax / al);
        ctx.lineCap = 'round';
        if (uk === 'fauche') {
          for (const [w2, col] of [[7, INK], [4.5, '#e8dcff'], [1.6, '#ffffff']]) { ctx.strokeStyle = col; ctx.lineWidth = w2 * Math.min(K, 1.6); ctx.beginPath(); ctx.arc(X, Y, r * 2.3, an + 0.5, an + 2.7); ctx.stroke(); }
        } else for (const s2 of [1, -1]) {
          const bx2 = X + Math.cos(an + s2 * 0.9) * r * 1.1, by2 = Y + Math.sin(an + s2 * 0.9) * r * 1.1;
          const mx2 = X + Math.cos(an + s2 * 1.2) * r * 2.6, my2 = Y + Math.sin(an + s2 * 1.2) * r * 2.6;
          const tx2 = X + Math.cos(an + s2 * 0.35) * r * 3.2, ty2 = Y + Math.sin(an + s2 * 0.35) * r * 3.2 - r * 0.6;
          for (const [w2, col] of [[6, INK], [3.8, '#e2d6b8']]) { ctx.strokeStyle = col; ctx.lineWidth = w2 * Math.min(K, 1.6); ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.quadraticCurveTo(mx2, my2, tx2, ty2); ctx.stroke(); }
        }
      }
      if (b.sup === 2 && (!uk || uk === 'thor')) { // arcs électriques
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * Math.min(K, 1.5);
        for (let k = 0; k < 2; k++) {
          ctx.beginPath(); let px = X, py = Y; ctx.moveTo(px, py);
          for (let j = 0; j < 4; j++) { px += (R() - 0.5) * 22 * K; py += (R() - 0.5) * 22 * K; ctx.lineTo(px, py); }
          ctx.stroke();
        }
      }
    }
    const spd2 = len(b.vx || 0, b.vy || 0);
    if (!b.sup && spd2 > 520 && b.owner < 0) { // traînée de vitesse
      const ux = (b.vx || 0) * cam.flip / spd2, uy = (b.vy || 0) * TILT / spd2, L2 = Math.min(1, (spd2 - 520) / 700);
      for (let k = 3; k >= 1; k--) { ctx.globalAlpha = 0.16 * L2 * (4 - k) / 3; ctx.fillStyle = '#e8ecf2'; circ(X - ux * r * 1.6 * k, Y - uy * r * 1.6 * k, r * (1 - k * 0.12)); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const tn = performance.now();
    if (tn < HYPT && b.owner < 0) { // MAUVAIS ŒIL : spirales violettes autour du ballon
      ctx.strokeStyle = '#a66bff'; ctx.lineWidth = Math.max(1, 1.6 * K); ctx.globalAlpha = Math.min(1, (HYPT - tn) / 400);
      for (let k = 0; k < 2; k++) { ctx.beginPath(); const a0 = tn / 140 + k * 3.14; for (let j = 0; j <= 18; j++) { const a = a0 + j * 0.42, rr = r * (1.4 + j * 0.09); ctx.lineTo(X + Math.cos(a) * rr, Y + Math.sin(a) * rr * 0.8); } ctx.stroke(); }
      ctx.globalAlpha = 1;
    }
    if (tn < OBT && b.owner < 0 && len(b.vx, b.vy) > 300) { // DÉGAGEMENT OBUS : traînée de feu
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.75; ctx.drawImage(GLOW('#c6ff1a'), X - r * 3, Y - r * 3, r * 6, r * 6); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      if (R() < 0.8) spawn({ x: b.x, y: b.y, z: b.z, vx: rnd2(-30, 30), vy: rnd2(-30, 30), vz: rnd2(0, 40), g: 0, life: 0.35, max: 0.35, size: rnd2(4, 7), col: pick(['#c6ff1a', '#ffd23a', '#fff']), type: 'fire', rot: 0, vr: 0 });
    }
    // squash & stretch : étiré dans le sens de la vitesse, écrasé au rebond
    const vxs = (b.vx || 0) * cam.flip, vys = (b.vy || 0) * TILT - bvz * ZK, vs = len(vxs, vys), st2 = b.owner < 0 ? Math.min(0.3, Math.max(0, vs - 300) / 3200) : 0;
    ctx.save();
    if (st2 > 0.01 || BSQ) {
      const an = Math.atan2(vys, vxs);
      ctx.translate(X, Y + r * BSQ * 0.8);
      if (st2 > 0.01) { ctx.rotate(an); ctx.scale(1 + st2, 1 - st2 * 0.55); ctx.rotate(-an); }
      if (BSQ) ctx.scale(1 + BSQ * 0.7, 1 - BSQ);
      ctx.translate(-X, -Y);
    }
    const iron = uk === 'bordee'; // BORDÉE : un vrai boulet de fonte
    const gr = ctx.createRadialGradient(X - r * 0.35, Y - r * 0.4, r * 0.1, X, Y, r * 1.05);
    if (iron) { gr.addColorStop(0, '#9aa0a8'); gr.addColorStop(0.5, '#3a3d44'); gr.addColorStop(1, '#101114'); }
    else { gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, '#e4e7ec'); gr.addColorStop(1, '#8c929c'); }
    ctx.fillStyle = gr; circ(X, Y, r); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.arc(X, Y, r, 0, 7); ctx.clip();
    // panneaux du ballon (pentagones) qui tournent avec lui
    ctx.fillStyle = iron ? 'rgba(0,0,0,0)' : '#17181d'; ctx.strokeStyle = 'rgba(60,64,72,.55)'; ctx.lineWidth = Math.max(0.6, K * 0.5);
    const pent = (px, py, rr, a) => { ctx.beginPath(); for (let j = 0; j < 5; j++) { const aa = a + j * 1.2566; ctx.lineTo(px + Math.cos(aa) * rr, py + Math.sin(aa) * rr); } ctx.closePath(); ctx.fill(); };
    const cx2 = X + Math.cos(ballSpin) * r * 0.25, cy2 = Y + Math.sin(ballSpin * 0.7) * r * 0.2;
    pent(cx2, cy2, r * 0.33, ballSpin);
    for (let k = 0; k < 5; k++) { const a = ballSpin + k * 1.2566 + 0.63; pent(cx2 + Math.cos(a) * r * 0.82, cy2 + Math.sin(a) * r * 0.82, r * 0.26, a); }
    // relief : bord assombri + reflet des projecteurs
    const sh2 = ctx.createRadialGradient(X - r * 0.2, Y - r * 0.3, r * 0.5, X, Y, r * 1.1);
    sh2.addColorStop(0, 'rgba(0,0,0,0)'); sh2.addColorStop(1, 'rgba(0,0,0,.4)'); ctx.fillStyle = sh2; ctx.fillRect(X - r, Y - r, r * 2, r * 2);
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(X - r * 0.38, Y - r * 0.42, r * 0.28, r * 0.16, -0.6, 0, 7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, K * 1.2); circ(X, Y, r); ctx.stroke();
    ctx.restore();
  }

  function drawGoal(side) {
    const gx = side ? W : 0, bxx = side ? W + GD : -GD;
    const P = (x, y, z) => [sx(x), sy(y, z)];
    const line = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); };
    ctx.strokeStyle = 'rgba(210,214,222,.26)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = MT; y <= MB + 0.1; y += 10) line(P(gx, y, BARZ), P(bxx, y, BARZ));
    for (let k = 1; k < 6; k++) { const x = lerp(gx, bxx, k / 6); line(P(x, MT, BARZ), P(x, MB, BARZ)); }
    for (let k = 0; k <= 6; k++) { const x = lerp(gx, bxx, k / 6); line(P(x, MB, 0), P(x, MB, BARZ)); }
    for (let z = 10; z < BARZ; z += 10) line(P(gx, MB, z), P(bxx, MB, z));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(230,232,236,.55)'; ctx.lineWidth = Math.max(1, 1.6 * K);
    ctx.beginPath(); line(P(gx, MT, BARZ), P(bxx, MT, BARZ)); line(P(gx, MB, BARZ), P(bxx, MB, BARZ)); line(P(bxx, MB, 0), P(bxx, MB, BARZ)); ctx.stroke();
    const frame = () => { ctx.beginPath(); const a = P(gx, MT, 0), b = P(gx, MT, BARZ), c = P(gx, MB, BARZ), d = P(gx, MB, 0); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); };
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = INK; ctx.lineWidth = 7 * K; frame();
    ctx.strokeStyle = '#d9dde3'; ctx.lineWidth = 4.2 * K; frame();
    ctx.save(); ctx.translate(-1 * K, -0.6 * K); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.6 * K; frame(); ctx.restore(); // reflet métallique
    ctx.save(); ctx.translate(1.3 * K, 0.8 * K); ctx.strokeStyle = 'rgba(70,76,88,.55)'; ctx.lineWidth = 1.2 * K; frame(); ctx.restore();
  }

