  /* ---------- HUD ---------- */
  function fmtClock(s) { s = Math.max(0, Math.ceil(s)); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); }
  const UIF = '"Barlow Condensed", "Arial Narrow", sans-serif';

  function drawHUD(V) {
    const L = cam.flip === 1 ? 0 : 1, Rt = 1 - L, now = performance.now();
    const w = Math.min(400, CW * 0.56), h = 34, y = 6 + SAFE.t, cx = CW / 2, cw = 66, pw = (w - cw) / 2;
    ctx.textBaseline = 'middle';
    for (const [t, side] of [[L, 0], [Rt, 1]]) {
      const T = TEAMS[t], x0 = side ? cx + cw / 2 - 4 : cx - cw / 2 - pw + 4;
      ctx.fillStyle = 'rgba(8,8,10,.9)';
      ctx.beginPath();
      if (!side) { ctx.moveTo(x0 + 14, y); ctx.lineTo(x0 + pw, y); ctx.lineTo(x0 + pw, y + h); ctx.lineTo(x0, y + h); }
      else { ctx.moveTo(x0, y); ctx.lineTo(x0 + pw - 14, y); ctx.lineTo(x0 + pw, y + h); ctx.lineTo(x0, y + h); }
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = T.c1; // liseré couleur d'équipe
      ctx.beginPath();
      if (!side) { ctx.moveTo(x0 + 1.3, y + h - 3); ctx.lineTo(x0 + pw, y + h - 3); ctx.lineTo(x0 + pw, y + h); ctx.lineTo(x0, y + h); }
      else { ctx.moveTo(x0, y + h - 3); ctx.lineTo(x0 + pw - 1.3, y + h - 3); ctx.lineTo(x0 + pw, y + h); ctx.lineTo(x0, y + h); }
      ctx.fill();
      // nom
      ctx.font = `italic 800 13px ${UIF}`; ctx.fillStyle = '#e9e7e2'; ctx.textAlign = side ? 'right' : 'left';
      const nx = side ? x0 + pw - 16 : x0 + 16;
      ctx.fillText(t === app.myTeam && app.mode !== 'menu' ? (side ? 'TOI · ' + T.name : T.name + ' · TOI') : T.name, nx, y + 11);
      // barre spéciale : 10 segments inclinés
      const v = clamp(V.bar[t], 0, 1), N = 9, sw = Math.min(9, (pw - 80) / N - 2), sx0 = side ? x0 + pw - 16 - N * (sw + 2) - 8 : x0 + 14;
      const full = v >= 1, blink = (now / 110 | 0) % 2;
      for (let k = 0; k < N; k++) {
        const kk = side ? N - 1 - k : k, on = v * N > kk + 0.05;
        ctx.fillStyle = !on ? 'rgba(255,255,255,.12)' : full ? (blink ? '#ffffff' : '#ffb400') : T.acc;
        para(sx0 + k * (sw + 2) + ((k / 3) | 0) * 4, y + 20, sw, 6, 2.5); ctx.fill();
      }
      // score
      ctx.font = `30px ${FONT}`; ctx.textAlign = 'center';
      const sxp = side ? cx + cw / 2 + 22 : cx - cw / 2 - 22;
      ctx.fillStyle = '#000'; ctx.fillText(String(V.score[t]), sxp + 1.5, y + h / 2 + 2.5);
      ctx.fillStyle = T.c1; ctx.fillText(String(V.score[t]), sxp, y + h / 2 + 1);
    }
    // bloc horloge
    ctx.fillStyle = '#0b0b0d'; ctx.fillRect(cx - cw / 2, y - 2, cw, h + 6);
    ctx.fillStyle = '#d4111a'; ctx.fillRect(cx - cw / 2, y + h + 1, cw, 3);
    ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 1; ctx.strokeRect(cx - cw / 2 + 0.5, y - 1.5, cw - 1, h + 5);
    ctx.textAlign = 'center';
    if (V.golden) {
      ctx.font = `13px ${FONT}`; ctx.fillStyle = (now / 250 | 0) % 2 ? '#ffb400' : '#ff2a1e';
      ctx.fillText('BUT', cx, y + 10); ctx.fillText('EN OR', cx, y + 25);
    } else {
      const hot = V.clock < 15 && V.phase === 'play';
      ctx.font = `22px ${FONT}`; ctx.fillStyle = hot ? ((now / 300 | 0) % 2 ? '#ff2a1e' : '#fff') : '#f1efe9';
      ctx.fillText(fmtClock(V.clock), cx, y + h / 2 + 1);
    }
    // ping
    if ((app.mode === 'host' || app.mode === 'guest') && NET.rtt) {
      const ms = Math.round(NET.rtt);
      ctx.font = `italic 800 13px ${UIF}`; ctx.textAlign = 'right';
      ctx.fillStyle = ms < 90 ? '#7dff9a' : ms < 180 ? '#ffb400' : '#ff2a1e';
      ctx.fillText('● ' + ms + ' ms', CW - 12 - SAFE.r, y + 12);
    }
    // minimap
    const mw = Math.min(150, CW * 0.19), mh = mw * 0.6, mx0 = CW / 2 - mw / 2, my0 = CH - mh - 8 - SAFE.b;
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = 'rgba(6,8,7,.82)'; ctx.fillRect(mx0 - 3, my0 - 3, mw + 6, mh + 6);
    ctx.fillStyle = '#d4111a'; ctx.fillRect(mx0 - 3, my0 - 3, mw + 6, 2);
    ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.lineWidth = 1; ctx.strokeRect(mx0, my0, mw, mh);
    ctx.beginPath(); ctx.moveTo(mx0 + mw / 2, my0); ctx.lineTo(mx0 + mw / 2, my0 + mh); ctx.stroke();
    const mxp = xx => mx0 + (cam.flip === 1 ? xx : W - xx) / W * mw, myp = yy => my0 + yy / H * mh;
    ctx.fillStyle = '#fff'; ctx.fillRect(mxp(0) - 2, myp(MT), 2, myp(MB) - myp(MT)); ctx.fillRect(mxp(W), myp(MT), 2, myp(MB) - myp(MT));
    for (let i = 0; i < 8; i++) {
      const p = V.players[i], t = i >> 2;
      ctx.fillStyle = (i & 3) === 3 ? TEAMS[t].gkc : TEAMS[t].c1;
      circ(mxp(p.x), myp(p.y), 3); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
      if (t === app.myTeam && (i & 3) === V.ctrl[t] && app.mode !== 'menu') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; circ(mxp(p.x), myp(p.y), 5.5); ctx.stroke(); }
    }
    ctx.fillStyle = '#ffb400'; circ(mxp(V.ball.x), myp(V.ball.y), 2.4); ctx.fill();
    ctx.globalAlpha = 1;
  }

  function bigText(txt, sub, col, scale, alpha, yy) {
    const s = Math.min(CW * 0.13, CH * 0.22, 100) * scale;
    ctx.save(); ctx.globalAlpha = alpha; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.translate(CW / 2, CH * (yy || 0.4)); ctx.rotate(-0.035); ctx.transform(1, 0, -0.2, 1, 0, 0);
    ctx.font = `${s | 0}px ${FONT}`; ctx.lineJoin = 'round';
    // bande noire derrière le texte
    const tw = ctx.measureText(txt).width;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(-tw / 2 - s * 0.5, -s * 0.5, tw + s, s * 0.95);
    ctx.fillStyle = shade(col, 0.4); ctx.fillText(txt, s * 0.07, s * 0.08);   // extrusion
    ctx.lineWidth = s * 0.12; ctx.strokeStyle = '#000'; ctx.strokeText(txt, 0, 0);
    ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
    ctx.save(); ctx.beginPath(); ctx.rect(-tw, -s, tw * 2, s * 0.92); ctx.clip(); // reflet métallique haut
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillText(txt, 0, 0); ctx.restore();
    if (sub) {
      ctx.font = `italic 800 ${Math.max(14, s * 0.28) | 0}px ${UIF}`;
      ctx.lineWidth = 5; ctx.strokeStyle = '#000'; ctx.strokeText(sub.toUpperCase(), 0, s * 0.74); ctx.fillStyle = '#f1efe9'; ctx.fillText(sub.toUpperCase(), 0, s * 0.74);
    }
    ctx.restore();
  }

  function drawOverText(V) {
    if (banner) {
      const t = 1 - banner.life / banner.max, el = t * banner.max;
      const sc = el < 0.1 ? 2.2 - el / 0.1 * 1.2 : el < 0.2 ? 1 + Math.sin((el - 0.1) / 0.1 * Math.PI) * 0.06 : 1; // arrive en s'écrasant
      bigText(banner.txt, banner.sub, banner.col, sc * banner.sc, clamp(Math.min(banner.life / 0.25, el / 0.06), 0, 1), banner.yy);
    }
    if (V.phase === 'countdown' && V.phaseT > 0.25) {
      const n = Math.ceil(V.phaseT - 0.2), f = (V.phaseT - 0.2) % 1;
      if (n >= 1 && n <= 3) bigText(String(n), n === 3 ? 'serre les crampons' : n === 1 ? 'pas de quartier' : '', '#f1efe9', 0.8 + f * 0.7, 1);
    } else if (V.phase === 'kickoff' && !banner) {
      bigText('PRÊTS ?', '', '#f1efe9', 0.6, 0.85);
    }
    if (V.rs > 0) bigText('REPRISE', String(Math.ceil(V.rs)), '#f1efe9', 0.7, 1);
    if (V.paused && app.mode === 'guest') bigText('PAUSE', 'Ton pote revient…', '#ffb400', 0.6, 1);
  }

  const rageEl = $('rage'); let rageS = '';

