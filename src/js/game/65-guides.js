  /* =============== AIDES DE JEU : ce que tu peux faire, et ce qui va se passer ===============
     couche 0 (au sol, sous les joueurs) : cône de tir, ligne de passe, portée du tacle
     couche 1 (au-dessus) : réticule dans la cage, cible de la frappe, coup de grâce possible, danger */
  const GHW = TF.GHW;
  function ctrlInfo(V) {
    if (app.mode === 'menu' || app.drafting || V.phase !== 'play') return null;
    const me = app.myTeam, ci = me * 4 + V.ctrl[me], p = V.players[ci];
    if (!p || p.st === ST.down) return null;
    const am = len(LI.mx, LI.my);
    return { me, ci, p, own: V.ball.owner === ci, gk: (ci & 3) === 3, am, ux: am > 0.3 ? LI.mx / am : p.fx, uy: am > 0.3 ? LI.my / am : p.fy };
  }
  function laneBlockV(V, team, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, L2 = dx * dx + dy * dy || 1; let n = 0;
    for (let j = 0; j < 4; j++) {
      const o = V.players[(1 - team) * 4 + j]; if (o.st === ST.down) continue;
      const t = clamp(((o.x - ax) * dx + (o.y - ay) * dy) / L2, 0, 1);
      if (t > 0.08 && len(ax + dx * t - o.x, ay + dy * t - o.y) < 34) n++;
    }
    return n;
  }
  // même logique que la simulation : à qui partirait une passe maintenant ?
  function passTarget(V, c) {
    let best = null, bs = -1e9;
    for (let i = 0; i < 4; i++) {
      const m = V.players[c.me * 4 + i]; if (m === c.p || m.st === ST.down) continue;
      const vx = m.x - c.p.x, vy = m.y - c.p.y, d = len(vx, vy); if (d < 40) continue;
      const cos = (vx * c.ux + vy * c.uy) / d; if (cos < -0.15) continue;
      if ((i & 3) === 3 && (c.am <= 0.3 || cos < 0.82)) continue;
      const s = cos * 1.3 - d / 1500 - laneBlockV(V, c.me, c.p.x, c.p.y, m.x, m.y) * 0.35 + ((i & 3) === 3 && cos > 0.9 ? 0.4 : 0);
      if (s > bs) { bs = s; best = m; }
    }
    return best;
  }
  // la cible de la frappe (même portée et même préférence que la simulation)
  function strikeTarget(V, c) {
    let tg = null, bs = -1e9; const reach = LK[c.ci].tr.tentacules ? 150 : 125;
    for (let j = 0; j < 4; j++) {
      const o = V.players[(1 - c.me) * 4 + j]; if (o.st === ST.down) continue;
      const vx = o.x - c.p.x, vy = o.y - c.p.y, d = len(vx, vy); if (d > reach || d < 1) continue;
      const cos = (vx * c.ux + vy * c.uy) / d; if (cos < 0.15) continue;
      const s = cos * 1.2 - d / reach + (V.ball.owner === (1 - c.me) * 4 + j ? 0.4 : 0) - (j === 3 ? 0.3 : 0);
      if (s > bs) { bs = s; tg = o; }
    }
    return tg;
  }
  function shotAim(V, c) { // point visé dans la cage (ou direction hors cage)
    const gx = c.me === 0 ? W : 0, sg = c.me === 0 ? 1 : -1, k = V.players[(1 - c.me) * 4 + 3];
    if (c.am > 0.35) {
      const gdx = gx - c.p.x, gdy = H / 2 - c.p.y, gd = len(gdx, gdy) || 1;
      if ((c.ux * gdx + c.uy * gdy) / gd > 0.17) return { x: gx + sg * 12, y: H / 2 + clamp(c.uy * 1.6, -1, 1) * GHW * 0.78, goal: true, rnd: false };
      return { x: c.p.x + c.ux * 600, y: c.p.y + c.uy * 600, goal: false };
    }
    return { x: gx + sg * 12, y: H / 2 + (k.y <= H / 2 ? 1 : -1) * GHW * 0.62, goal: true, rnd: true };
  }
  function groundLine(x0, y0, x1, y1) { ctx.moveTo(sx(x0), sy(y0, 0)); ctx.lineTo(sx(x1), sy(y1, 0)); }
  function brackets(X, Y, w, h, col, lw) {
    const c = Math.min(w, h) * 0.35; ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath();
    for (const [sx2, sy2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = X + sx2 * w / 2, y = Y + sy2 * h / 2; ctx.moveTo(x - sx2 * c, y); ctx.lineTo(x, y); ctx.lineTo(x, y - sy2 * c); }
    ctx.stroke();
  }
  function drawGuides(V, layer) {
    const c = ctrlInfo(V); if (!c) return;
    const p = c.p, t = performance.now() / 1000, sK = Math.min(K, 1.6);
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (c.own && !c.gk && p.chg > 0) { // ---- VISÉE DU TIR ----
      const ch = Math.min(1, p.chg), sup = ch >= 0.97, a = shotAim(V, c), b = V.ball;
      const col = sup ? ((t * 12 | 0) % 2 ? '#ffffff' : '#ff2a1e') : ch < 0.5 ? '#ffd23a' : '#ff8a1a';
      const dx = a.x - b.x, dy = a.y - b.y, d = len(dx, dy) || 1, an = Math.atan2(dy, dx), spr = sup ? 0.02 : 0.025 + 0.06 * ch;
      if (layer === 0) {
        const L = Math.min(d, 900), x1 = b.x + Math.cos(an - spr) * L, y1 = b.y + Math.sin(an - spr) * L, x2 = b.x + Math.cos(an + spr) * L, y2 = b.y + Math.sin(an + spr) * L;
        ctx.globalAlpha = 0.16 + 0.14 * ch; ctx.fillStyle = col;
        ctx.beginPath(); ctx.moveTo(sx(b.x), sy(b.y, 0)); ctx.lineTo(sx(x1), sy(y1, 0)); ctx.lineTo(sx(x2), sy(y2, 0)); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.75; ctx.strokeStyle = col; ctx.lineWidth = 1.6 * sK; ctx.setLineDash([7 * sK, 7 * sK]); ctx.lineDashOffset = -t * 40;
        ctx.beginPath(); groundLine(b.x, b.y, b.x + Math.cos(an) * L, b.y + Math.sin(an) * L); ctx.stroke(); ctx.setLineDash([]);
      } else if (a.goal) {
        const X = sx(a.x), Y = sy(a.y, 40), r = (10 + 16 * (sup ? 0.3 : ch)) * sK, pr = 1 + 0.12 * Math.sin(t * 14);
        ctx.globalAlpha = 0.95; ctx.strokeStyle = INK; ctx.lineWidth = 5 * sK; ctx.beginPath(); ctx.arc(X, Y, r * pr, 0, 7); ctx.stroke();
        ctx.strokeStyle = col; ctx.lineWidth = 2.6 * sK; ctx.beginPath(); ctx.arc(X, Y, r * pr, 0, 7); ctx.stroke();
        ctx.beginPath(); for (const [ux, uy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { ctx.moveTo(X + ux * r * 0.45, Y + uy * r * 0.45); ctx.lineTo(X + ux * r * 1.5, Y + uy * r * 1.5); } ctx.stroke();
        ctx.font = `italic 800 ${Math.max(10, 11 * sK) | 0}px ${UIF}`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = INK;
        const lab = sup ? 'SUPER TIR' : a.rnd ? 'LOIN DU GARDIEN' : Math.round(ch * 100) + ' %';
        ctx.strokeText(lab, X, Y - r * 1.7); ctx.fillStyle = col; ctx.fillText(lab, X, Y - r * 1.7);
      }
    } else if (c.own && !c.gk && layer === 0) { // ---- RECEVEUR DE LA PASSE ----
      const m = passTarget(V, c);
      if (m) {
        const al = c.am > 0.3 ? 0.85 : 0.35, X = sx(m.x), Y = sy(m.y, 0);
        ctx.globalAlpha = al * 0.55; ctx.strokeStyle = TEAMS[c.me].c1; ctx.lineWidth = 2 * sK; ctx.setLineDash([3 * sK, 9 * sK]); ctx.lineDashOffset = -t * 30;
        ctx.beginPath(); groundLine(p.x, p.y, m.x, m.y); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = al; ctx.lineWidth = 2.4 * sK; ctx.beginPath(); ctx.ellipse(X, Y, 20 * K, 8 * K, 0, 0, 7); ctx.stroke();
      }
    } else if (!c.own && p.chg < 0 && layer === 0) { // ---- PORTÉE DU TACLE ----
      const ch = Math.min(1, -p.chg), as = LK[c.ci].tr.assassin, v0 = (470 + 300 * ch) * (as ? 1.12 : 1), T = (0.3 + 0.2 * ch) * (as ? 1.1 : 1);
      const L = v0 * (1 - Math.pow(0.18, T)) / 1.7148, ex = p.x + c.ux * L, ey = p.y + c.uy * L, nx = -c.uy, ny = c.ux, wd = 14;
      const g = ctx.createLinearGradient(sx(p.x), sy(p.y, 0), sx(ex), sy(ey, 0)); g.addColorStop(0, 'rgba(255,122,0,0)'); g.addColorStop(1, `rgba(255,122,0,${0.35 + 0.35 * ch})`);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(sx(p.x + nx * wd * 0.5), sy(p.y + ny * wd * 0.5, 0)); ctx.lineTo(sx(ex + nx * wd), sy(ey + ny * wd, 0));
      ctx.lineTo(sx(ex + c.ux * 26), sy(ey + c.uy * 26, 0)); ctx.lineTo(sx(ex - nx * wd), sy(ey - ny * wd, 0)); ctx.lineTo(sx(p.x - nx * wd * 0.5), sy(p.y - ny * wd * 0.5, 0)); ctx.closePath(); ctx.fill();
    }
    if (layer === 1 && !c.own) { // ---- CIBLE DE LA FRAPPE / COUP DE GRÂCE ----
      const tg = p.chg < 0 ? null : strikeTarget(V, c);
      if (tg) { const X = sx(tg.x), Y = sy(tg.y, 30), pr = 1 + 0.08 * Math.sin(t * 16); ctx.globalAlpha = 0.9; brackets(X, Y, 46 * K * pr, 70 * K * pr, '#ff3b30', 2.4 * sK); }
      else {
        for (let j = 0; j < 4; j++) {
          const o = V.players[(1 - c.me) * 4 + j];
          if (o.st === ST.down && o.z < 8 && len(o.x - p.x, o.y - p.y) < 76) {
            const X = sx(o.x), Y = sy(o.y, 26) - Math.abs(Math.sin(t * 6)) * 4 * K;
            ctx.globalAlpha = 0.95; ctx.font = `${Math.max(12, 15 * sK) | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 4; ctx.strokeStyle = INK;
            ctx.strokeText('ACHÈVE !', X, Y - 18 * K); ctx.fillStyle = '#ff2a1e'; ctx.fillText('ACHÈVE !', X, Y - 18 * K);
            brackets(X, sy(o.y, 6), 60 * K, 26 * K, '#ff2a1e', 2.2 * sK);
            break;
          }
        }
      }
    }
    if (layer === 1) { // ---- DANGER : un tacle, un coup de pied sauté ou une boule de ki arrive sur toi ----
      let dz = 0;
      for (let j = 0; j < 4; j++) {
        const o = V.players[(1 - c.me) * 4 + j], vx = p.x - o.x, vy = p.y - o.y, d = len(vx, vy);
        if ((o.st === ST.slide || o.st === ST.fly) && d < 230) { const ov = len(SVX[(1 - c.me) * 4 + j], SVY[(1 - c.me) * 4 + j]) || 1; if ((SVX[(1 - c.me) * 4 + j] * vx + SVY[(1 - c.me) * 4 + j] * vy) / (ov * (d || 1)) > 0.6) dz = Math.max(dz, 1 - d / 230); }
        else if (STRIKEV(o.st) && d < 80) dz = Math.max(dz, 0.6);
      }
      for (const k of V.proj) if (k[4] !== c.me) { const vx = p.x - k[0], vy = p.y - k[1], d = len(vx, vy), kv = len(k[2], k[3]) || 1; if (d < 320 && (k[2] * vx + k[3] * vy) / (kv * (d || 1)) > 0.8) dz = Math.max(dz, 1 - d / 320); }
      if (dz > 0) {
        const X = sx(p.x), Y = sy(p.y, 0), fl = 0.55 + 0.45 * Math.abs(Math.sin(t * 22));
        ctx.globalAlpha = (0.35 + 0.5 * dz) * fl; ctx.strokeStyle = '#ff2a1e'; ctx.lineWidth = 3 * sK;
        ctx.beginPath(); ctx.ellipse(X, Y, 30 * K, 12 * K, 0, 0, 7); ctx.stroke();
        const Yh = sy(p.y, p.z) - 98 * K; ctx.globalAlpha = Math.min(1, 0.5 + dz) * fl;
        ctx.font = `${Math.max(18, 24 * sK) | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.strokeText('!', X, Yh); ctx.fillStyle = '#ff2a1e'; ctx.fillText('!', X, Yh);
      }
    }
    ctx.restore();
  }
  const STRIKEV = s => s === ST.punch || s === ST.punch2 || s === ST.hkick || s === ST.stomp;
  // ballon hors de l'écran : une flèche au bord, qui donne aussi la distance
  function drawOffscreen(V) {
    const b = V.ball, X = sx(b.x), Y = sy(b.y, b.z), m = 34;
    if (X > -10 && X < CW + 10 && Y > -10 && Y < CH + 10) return;
    const cx = CW / 2, cy = CH / 2, dx = X - cx, dy = Y - cy, s = Math.min((cx - m) / Math.abs(dx || 1e-3), (cy - m) / Math.abs(dy || 1e-3));
    const ax = cx + dx * s, ay = cy + dy * s, an = Math.atan2(dy, dx);
    ctx.save(); ctx.translate(ax, ay); ctx.rotate(an);
    ctx.fillStyle = 'rgba(8,8,10,.8)'; ctx.beginPath(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(4, -7); ctx.lineTo(4, 7); ctx.closePath(); ctx.fill();
    ctx.rotate(-an); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, 0, 5, 0, 7); ctx.fill();
    ctx.restore();
  }

