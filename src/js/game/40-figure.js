  /* ---------- joueurs (squelette pseudo-3D, style « encré ») ---------- */
  const animPh = new Float32Array(8), prevX = new Float32Array(8), prevY = new Float32Array(8), spd = new Float32Array(8);
  // cinématique lissée par joueur (vitesse, accélération, rotation) pour animer le corps
  const SVX = new Float32Array(8), SVY = new Float32Array(8), SAX = new Float32Array(8), SAY = new Float32Array(8);
  const SHF = new Float32Array(8), FPV = new Float32Array(8).fill(NaN), BRL = new Uint8Array(8), DGR = new Uint8Array(8);
  const sm01 = x => (x = x < 0 ? 0 : x > 1 ? 1 : x, x * x * (3 - 2 * x));
  const stPrev = new Int8Array(8).fill(-1), stT = new Float32Array(8);
  let curBar = [0, 0];
  const ghosts = [[], [], [], [], [], [], [], []];
  let ballSpin = 0, pbx = 0, pby = 0, pbz = 0, bvz = 0, BSQ = 0; // BSQ : écrasement du ballon au rebond
  const SQ = new Float32Array(8); // squash (>0 : tassé) / stretch (<0 : étiré) de chaque joueur
  const trail = [], strail = [];
  let strailCol = '#e8ecf2';
  const STY = [0, 1, 4, 2, 5, 6, 3, 2]; // coiffure par joueur
  const INK = '#060608', DEP = 0.42;
  const DKC = {};
  const dkc = c => DKC[c] || (DKC[c] = c[0] === '#' ? shade(c, 0.62) : c); // version sombre (membre du fond), mémorisée
  function shade(hex, f) { // assombrit (f<1) ou éclaircit (f>1)
    const n = parseInt(hex.slice(1, 7), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    if (f < 1) { r *= f; g *= f; b *= f; } else { const k = f - 1; r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  const PAL = TEAMS.map(T => ({ jl: shade(T.c1, 1.22), jm: shade(T.c1, 0.8), gl: shade(T.gkc, 1.22), gm: shade(T.gkc, 0.8), j: T.c1, jd: shade(T.c1, 0.6), s: T.c2, sd: shade(T.c2, 0.6), a: T.acc, ad: shade(T.acc, 0.6), g: T.gkc, gd: shade(T.gkc, 0.6) }));
  const SKD = SKIN.map(c => shade(c, 0.7));
  const HAIRD = HAIR.map(c => shade(c, 0.7));

  function rr(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function para(x, y, w, h, sk) { ctx.beginPath(); ctx.moveTo(x + sk, y); ctx.lineTo(x + w + sk, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }

  // sprites précalculés (ombres douces, halos lumineux) : beaux et peu coûteux
  const SPR = {};
  function sprite(key, size, draw) { if (SPR[key]) return SPR[key]; const c = document.createElement('canvas'); c.width = c.height = size; draw(c.getContext('2d'), size); return (SPR[key] = c); }
  const SOFT = () => sprite('soft', 64, (g, s) => { const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, 'rgba(0,0,0,.7)'); rg.addColorStop(0.5, 'rgba(0,0,0,.42)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, s, s); });
  const hx = (c, d) => (typeof c !== 'string' || c[0] !== '#' ? d : c.length === 4 ? '#' + c[1] + c[1] + c[2] + c[2] + c[3] + c[3] : c.slice(0, 7));
  const GLOW = col => sprite('g' + col, 64, (g, s) => { const rg = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.18, col); rg.addColorStop(0.5, col + '55'); rg.addColorStop(1, col + '00'); g.fillStyle = rg; g.fillRect(0, 0, s, s); });
  function drawShadows(V) {
    for (let i = 0; i < 8; i++) {
      const p = V.players[i], f = 1 - Math.min(p.z, 150) / 260, X = sx(p.x), Y = sy(p.y, 0);
      const lying = p.st === ST.slide || (p.st === ST.down && p.z < 3) || p.st === ST.dive;
      const ew = (lying ? 24 : 13) * K * f * LK[i].b[0];
      // ombres douces : celle des projecteurs (allongée) + l'ombre de contact
      const sh = SOFT();
      ctx.globalAlpha = 0.32 * f; ctx.drawImage(sh, X + 14 * K - ew * 1.9, Y + 2 * K - 6 * K * f, ew * 3.8, 12 * K * f);
      ctx.globalAlpha = 0.3 * f; ctx.drawImage(sh, X - 12 * K - ew * 1.5, Y + 1 * K - 5 * K * f, ew * 3, 10 * K * f);
      ctx.globalAlpha = 1; ctx.drawImage(sh, X - ew * 1.35, Y - 6.8 * K * f, ew * 2.7, 13.6 * K * f);
      if (!lying) { // repère d'équipe : chaque tenue est unique, le cercle dit qui est qui
        ctx.strokeStyle = TEAMS[i >> 2].c1; ctx.globalAlpha = 0.5 * f; ctx.lineWidth = 1.6 * Math.min(K, 1.4);
        ctx.beginPath(); ctx.ellipse(X, Y, ew * 1.25, 6.2 * K * f, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
      }
    }
    const b = V.ball, f = 1 - Math.min(b.z, 200) / 300, gs = b.uk && ULK[b.uk - 1] === 'rouleau' ? 2.4 : 1;
    if (!(b.uk && ULK[b.uk - 1] === 'abra' && b.gu > 0.18 && b.gu < 0.7)) { ctx.globalAlpha = f; ctx.drawImage(SOFT(), sx(b.x) - 12 * K * f * gs, sy(b.y, 0) - 5 * K * f * gs, 24 * K * f * gs, 10 * K * f * gs); ctx.globalAlpha = 1; }
    // repère au sol du joueur contrôlé : anneau à crans qui tourne
    const t = performance.now() / 1000;
    for (let tm = 0; tm < 2; tm++) {
      const human = !app.drafting && (app.mode === 'host' || app.mode === 'guest' || (app.mode === 'solo' && tm === 0));
      if (!human) continue;
      const p = V.players[tm * 4 + V.ctrl[tm]], mine = tm === app.myTeam;
      const X = sx(p.x), Y = sy(p.y, 0), col = TEAMS[tm].c1, r = 22 * K;
      ctx.strokeStyle = col; ctx.globalAlpha = mine ? 0.95 : 0.55; ctx.lineWidth = (mine ? 3 : 2) * Math.min(K, 1.5);
      ctx.beginPath(); ctx.ellipse(X, Y, r, r * 0.4, 0, 0, 7); ctx.stroke();
      if (mine) {
        ctx.lineWidth = 4 * Math.min(K, 1.5);
        for (let k = 0; k < 3; k++) { const a = t * 2.4 + k * 2.094; ctx.beginPath(); ctx.ellipse(X, Y, r * 1.22, r * 0.49, 0, a, a + 0.55); ctx.stroke(); }
      }
      ctx.globalAlpha = 1;
    }
  }

  // segment de membre : contour encré puis couleur
  function seg(a, b, w, col, ghost, hl) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    if (!ghost) { ctx.strokeStyle = INK; ctx.lineWidth = w + 2.6; ctx.stroke(); }
    ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
    if (hl && !ghost) { // reflet : la lumière des projecteurs vient d'en haut à gauche
      const o = w * 0.22;
      ctx.beginPath(); ctx.moveTo(a[0] - o, a[1] - o); ctx.lineTo(b[0] - o, b[1] - o);
      ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = w * 0.3; ctx.stroke();
    }
  }
  // état d'animation par joueur : fondu entre les poses, orientation lissée, traînées des coups
  const PSB = [], FA = new Float32Array(8).fill(NaN), TRL = [];
  for (let i = 0; i < 8; i++) { PSB.push({ init: false, key: -1, t: 1, dur: 0.15, from: null, cur: null }); TRL.push([]); }
  let animDt = 0.016;
  const isStrike = s => s === ST.punch || s === ST.punch2 || s === ST.hkick || s === ST.volley || s === ST.head || s === ST.stomp;
  const AHIT = new Uint8Array(8); // le geste aérien a touché le ballon (pour enchaîner sur la pose de frappe)
  const mix = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
  // enveloppe convexe (chaîne monotone) — pour le torse
  function hull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }
  const J = []; for (let k = 0; k < 420; k++) J.push([0, 0, 0]);
  // gabarit par poste : [échelle, épaisseur des membres, largeur d'épaules, largeur de bassin]
  const BUILD = [[1.0, 1.0, 10.6, 7.4], [0.95, 0.86, 9.6, 6.8], [1.1, 1.24, 12.8, 8.6], [1.0, 1.0, 11, 7.4]];
  const ROLE_TAG = ['ATTAQUANT', 'MILIEU', 'DÉFENSEUR', 'GARDIEN'];
  // LOOK de chaque joueur de l'effectif (même ordre que TF.ROSTER)
  // hair : short, shaved, bald, crest, mohawk, spiky, slick, long, dreads, afro, hood, hardhat, scrum
  const LOOKS = [
    { sk: '#e2b08a', hc: '#3a2614', hair: 'shaved', face: ['moustache'], body: ['leather'], b: [1.12, 1.25, 13, 8.6] },        // Le Fistinier
    { sk: '#8a5532', hc: '#0d0d0d', hair: 'hardhat', face: ['beard'], body: [], b: [1.18, 1.38, 14.2, 9.6] },                 // Le Bulldozer
    { sk: '#d8c7b8', hc: '#111111', hair: 'hood', face: ['skull'], body: [], b: [1.07, 1.0, 11.4, 7.4] },                      // La Faucheuse
    { sk: '#6e4126', hc: '#111111', hair: 'scrum', face: ['tape'], body: [], b: [1.13, 1.3, 13.6, 9] },                        // Le Rempart
    { sk: '#efc6a4', hc: '#c4471c', hair: 'long', face: ['braidbeard', 'warpaint'], body: [], b: [1.1, 1.2, 12.8, 8.4] },      // Le Viking
    { sk: '#e8c39c', hc: '#151515', hair: 'spiky', face: [], band: 'a', body: [], b: [0.96, 0.9, 10, 7] },                    // Le Prodige
    { sk: '#c48a5e', hc: '#2b1d12', hair: 'long', face: ['goatee'], body: [], b: [0.97, 0.88, 9.8, 6.9] },                    // Le Magicien
    { sk: '#53301b', hc: '#1b120a', hair: 'dreads', face: [], body: [], b: [1.0, 0.95, 10.6, 7.2] },                          // La Pieuvre
    { sk: '#d9a982', hc: '#33e0ff', hair: 'short', face: [], body: [], b: [0.88, 0.8, 9, 6.4] },                             // Le Funambule
    { sk: '#cf9a70', hc: '#ececec', hair: 'slick', face: ['shades'], body: [], b: [0.98, 0.92, 10.2, 7.2] },                  // Le Chef d'Orchestre
    { sk: '#f0cfae', hc: '#e2b14a', hair: 'slick', face: ['crown'], body: [], b: [0.98, 0.92, 10.2, 7] },                     // Le Petit Prince
    { sk: '#9a6038', hc: '#ff7a00', hair: 'crest', face: ['stripes'], body: [], b: [1.02, 1.02, 10.8, 7.4] },                 // Le Tigre
    { sk: '#5e3a22', hc: '#0c0c0c', hair: 'afro', face: ['nosering', 'beard'], body: [], b: [1.15, 1.28, 13.2, 9] },          // Le Buffle
    { sk: '#f2cfb0', hc: '#d4561e', hair: 'short', face: ['sideburns'], body: [], b: [0.93, 0.88, 9.8, 6.8] },                // Le Renard
    { sk: '#b07650', hc: '#111111', hair: 'bald', face: ['beard', 'patch'], body: ['tattoo'], b: [1.1, 1.25, 12.4, 8.2] },             // Le Canonnier
    { sk: '#7a4a2c', hc: '#151515', hair: 'shaved', face: ['beard'], body: [], b: [1.2, 1.38, 14.6, 9.8] },                     // Le Bunker
    { sk: '#e8c39c', hc: '#101010', hair: 'short', face: ['eyemask', 'whiskers'], body: [], b: [0.96, 0.86, 10.2, 7] },         // Le Chat
    { sk: '#d9a07a', hc: '#2b1d12', hair: 'shaved', face: ['moustache', 'scar'], body: [], b: [1.14, 1.3, 13.4, 9.2] },         // Le Boucher
    { sk: '#c9a27e', hc: '#1a1220', hair: 'bald', face: ['goatee', 'spiral'], body: [], b: [1.02, 0.9, 10.4, 7] },             // L'Hypnotiseur
    { sk: '#b98055', hc: '#120c08', hair: 'long', face: ['moustache'], band: 'a', body: [], b: [0.98, 0.95, 10.4, 7.2] }        // El Loco
  ];
  // TENUE de chaque joueur (même ordre) — 'c1' couleur d'équipe, 'c2' couleur secondaire, 'acc' accent
  // slv : manches (≤1 part du bras, >1 jusqu'à l'avant-bras) · sl : short (≤1 part de la cuisse, >1 pantalon jusqu'au tibia)
  const OUTFITS = [
    { torso: 'c1', sleeve: '#241c18', slv: 0.85, shorts: '#1c1c22', sl: 1.6, socks: null, boots: '#111111', bootW: 1.15, hand: '#1a1a1a', sash: false, ov: ['leather'], ex: ['chain'], num: 4 },          // Fistinier : gilet de biker
    { sleeve: 'c1', slv: 0.5, shorts: '#34404f', sl: 1.6, socks: null, boots: '#6b4423', bootW: 1.25, sash: false, ov: ['hivis'], ex: [], num: 5 },                                                  // Bulldozer : gilet de chantier
    { torso: '#141318', sleeve: '#141318', slv: 1.7, shorts: '#141318', sl: 0.52, socks: '#141318', boots: '#0c0c0f', hand: '#e9e4dc', sash: false, ov: ['ropebelt'], ex: ['robe'], num: 13 }, // Faucheuse : robe noire
    { sleeve: 'c1', slv: 0.35, shorts: 'c2', sl: 0.45, socks: 'c1', boots: '#1f1f22', sash: false, ov: ['hoops'], ex: ['pads'], num: 3 },                                                            // Rempart : maillot de rugby
    { sleeve: null, slv: 0, shorts: '#4a3424', sl: 1.6, socks: null, boots: '#7a5c3e', bootW: 1.3, sash: false, ov: ['xstraps'], ex: ['fur', 'rings'], num: 2 },                                   // Viking : fourrure et sangles
    { sleeve: 'c1', slv: 0.5, shorts: 'c2', sl: 0.5, socks: 'c1', boots: 'acc', wrist: 'acc', sash: false, ov: ['vcollar', 'num10'], ex: ['captain'], num: 10 },                                    // Prodige : le n°10, brassard
    { sleeve: 'c1', slv: 1.8, shorts: 'c2', sl: 0.5, socks: 'c2', boots: '#111111', hand: '#f4f1ea', sash: false, ov: ['bowtie'], ex: ['cape'], num: 7 },                                           // Magicien : cape et gants blancs
    { torso: '#0f3d47', sleeve: '#0f3d47', slv: 2, shorts: '#0f3d47', sl: 2, legs: '#0f3d47', socks: null, boots: '#0a1f24', hand: '#0f3d47', sash: false, ov: ['chestband'], ex: ['suckers'], num: 8 }, // Pieuvre : combinaison
    { sleeve: 'c1', slv: 2, shorts: 'c1', sl: 0.4, legs: 'c2', socks: null, boots: '#f4f1ea', bootW: 0.85, sash: false, ov: ['diamonds'], ex: ['ruff'], num: 11 },                                  // Funambule : arlequin
    { torso: '#121216', sleeve: '#121216', slv: 2, shorts: '#121216', sl: 2, socks: null, boots: '#050506', sash: false, ov: ['tux'], ex: ['coattails'], num: 6 },                                   // Chef d'Orchestre : smoking
    { sleeve: 'c1', slv: 0.6, shorts: '#f1efe9', sl: 0.5, socks: 'c1', boots: '#d9a441', hand: '#f4f1ea', sash: true, sashC: '#d9a441', ov: ['goldtrim'], ex: ['epaulettes'], num: 1 },          // Petit Prince : dorures royales
    { sleeve: 'c1', slv: 0.5, shorts: '#111111', sl: 0.5, socks: '#ff7a00', boots: '#111111', wrist: '#ff7a00', sash: false, ov: ['tiger'], ex: ['tigertail'], num: 9 },                          // Tigre : rayures et queue
    { sleeve: null, slv: 0, shorts: 'c2', sl: 0.55, socks: 'c2', boots: '#2a1a10', bootW: 1.15, hand: '#e9e4dc', sash: false, ov: ['belt', 'torn'], ex: [], num: 14 },                             // Buffle : débardeur déchiré, ceinturon
    { sleeve: 'c1', slv: 0.5, shorts: 'c2', sl: 0.5, socks: '#d4561e', boots: 'acc', sash: false, ov: ['bib'], ex: ['foxtail'], num: 17 },                                                          // Renard : plastron blanc et queue
    { sleeve: null, slv: 0, shorts: '#2c2c34', sl: 1.6, socks: null, boots: '#222222', bootW: 1.15, sash: false, ov: ['bandolier'], ex: [], num: 99 },                                               // Canonnier : cartouchière
    { sleeve: 'c1', slv: 1.8, shorts: '#26262c', sl: 1.6, socks: null, boots: '#2a2a2e', bootW: 1.3, glove: '#24242a', sash: false, ov: ['padded'], ex: ['pads'], num: 1 },                         // Bunker : gilet matelassé, épaulières
    { sleeve: '#121216', slv: 2, shorts: '#121216', sl: 2, legs: '#121216', socks: null, boots: '#0c0c0f', glove: '#121216', sash: false, ov: ['catcollar'], ex: ['cattail'], num: 16 },           // Chat : combinaison noire et queue
    { sleeve: 'c1', slv: 0.5, shorts: '#3a3a42', sl: 0.55, socks: 'c2', boots: '#1b1b1f', bootW: 1.15, glove: '#e2ddd2', sash: false, ov: ['apron'], ex: [], num: 30 },                         // Boucher : tablier taché
    { sleeve: '#3a1a5a', slv: 2, shorts: '#2a1240', sl: 1.6, socks: null, boots: '#1a0c28', glove: '#7a3cff', sash: false, ov: ['spiral'], ex: ['cape'], num: 13 },                              // Hypnotiseur : cape et spirale
    { sleeve: 'c1', slv: 0.5, shorts: '#ff2fa0', sl: 0.5, socks: '#33e0ff', boots: '#ff2fa0', glove: '#ff2fa0', sash: false, ov: ['zigzag'], ex: [], num: 9 }                                     // El Loco : maillot fluo
  ];
  // PERSONNALITÉ (même ordre) : démarche g, posture d'attente, geste de frappe, célébration, couleur de ses frappes, couvre-chef / accessoire
  // g : cad cadence · st foulée · kn montée de genou · arm balancier · ab pli du coude · ln buste penché · gl glisse · bob rebond
  //     wd écart des pieds · sw roulis · tw rotation des épaules · ao bras écartés (rad) · flop bras mous · cond baguette
  const PERSO = [
    { g: { cad: 1, st: 0.95, kn: 0.9, arm: 0.4, ab: 0.95, ln: 0.1, sw: 0.05, wd: 1, tw: 1.4 }, idle: 'boxer', kick: 'toe', cele: 'flex', fx: '#ff9a3c', hat: 'bikercap' },
    { g: { cad: 0.8, st: 1.05, kn: 0.65, arm: 0.7, ab: 0.4, ln: 0.26, sw: 0.14, wd: 3.6, tw: 0.6, ao: 0.3 }, idle: 'heavy', kick: 'stomp', cele: 'chest', fx: '#ffc21a' },
    { g: { cad: 0.88, st: 1.15, kn: 0.35, arm: 0.1, ab: -1.15, ln: 0.12, gl: 0.9, tw: 0.25, ao: 0.1 }, idle: 'reaper', kick: 'scythe', cele: 'reaper', fx: '#a66bff', prop: 'scythe' },
    { g: { cad: 0.9, st: 1, kn: 1.05, arm: 1.1, ab: 0.25, ln: 0.34, wd: 2, sw: 0.06, tw: 1, ao: 0.2 }, idle: 'cross', kick: 'boot', cele: 'haka', fx: '#d9b27a' },
    { g: { cad: 0.88, st: 1.1, kn: 1.1, arm: 1.25, ab: -0.5, ln: -0.02, sw: 0.14, wd: 2.6, tw: 1.3, ao: 0.35 }, idle: 'swagger', kick: 'axe', cele: 'roar', fx: '#6fb8ff', hat: 'horns' },
    { g: { cad: 1.08, st: 1.12, kn: 1.18, arm: 1.05, ln: 0.12, tw: 1 }, idle: 'ready', kick: 'drive', cele: 'pump', fx: '#7fd8ff' },
    { g: { cad: 1.05, st: 0.9, kn: 0.85, arm: 0.55, ab: 0.35, ln: 0.05, tw: 1.7, sw: 0.04 }, idle: 'magic', kick: 'trivela', cele: 'bow', fx: '#e05cff', hat: 'tophat' },
    { g: { cad: 1, st: 0.95, kn: 0.9, arm: 1.5, ab: -0.4, ln: 0.1, flop: 1, tw: 0.8, ao: 0.25 }, idle: 'tentacle', kick: 'whip', cele: 'wave', fx: '#8a5cff', hat: 'goggles' },
    { g: { cad: 1.3, st: 0.75, kn: 1.4, arm: 0.2, ab: -1.25, ln: 0.02, bob: 4, sw: 0.06, tw: 0.3, ao: 1.3 }, idle: 'balance', kick: 'chip', cele: 'flip', fx: '#33e0ff', hat: 'jester' },
    { g: { cad: 0.95, st: 0.9, kn: 0.7, arm: 0.25, ab: 0.6, ln: -0.04, tw: 0.4, cond: 1 }, idle: 'conduct', kick: 'sidefoot', cele: 'conduct', fx: '#f4f1ea', prop: 'baton' },
    { g: { cad: 1, st: 1, kn: 1.35, arm: 0.5, ab: 0.15, ln: -0.07, tw: 0.5 }, idle: 'royal', kick: 'curl', cele: 'royal', fx: '#ffd23a', prop: 'mantle' },
    { g: { cad: 1.12, st: 1.3, kn: 1.1, arm: 1.2, ab: -0.2, ln: 0.46, bob: 3, tw: 1.2, ao: 0.2 }, idle: 'prowl', kick: 'pounce', cele: 'tiger', fx: '#ff9000', hat: 'catears' },
    { g: { cad: 0.9, st: 1, kn: 0.9, arm: 0.9, ab: 0.3, ln: 0.42, wd: 2.6, sw: 0.09, ao: 0.35 }, idle: 'bull', kick: 'butt', cele: 'stomp', fx: '#ff2d55', hat: 'bullhorns' },
    { g: { cad: 1.15, st: 1.05, kn: 1, arm: 0.8, ab: 0.45, ln: 0.25, tw: 0.9, sw: 0.03 }, idle: 'sly', kick: 'poke', cele: 'shh', fx: '#c6ff4a', hat: 'foxears' },
    { g: { cad: 0.92, st: 1, kn: 0.9, arm: 1, ab: 0.5, ln: 0.12, wd: 2, sw: 0.09, tw: 0.9, ao: 0.3 }, idle: 'pound', kick: 'cannon', cele: 'cannon', fx: '#ff6a00', hat: 'bandana' },
    // GARDIENS
    { g: { cad: 0.82, st: 1, kn: 0.6, arm: 0.6, ab: 0.5, ln: 0.2, sw: 0.13, wd: 3.6, tw: 0.6, ao: 0.4 }, idle: 'gkwall', kick: 'boot', cele: 'chest', fx: '#c6ff1a', hat: 'army' },
    { g: { cad: 1.15, st: 1.15, kn: 1.1, arm: 0.9, ab: 0.2, ln: 0.35, bob: 2.5, tw: 1.1 }, idle: 'gkcat', kick: 'drive', cele: 'flip', fx: '#e8ecf2', hat: 'blackcat' },
    { g: { cad: 0.95, st: 1.05, kn: 0.9, arm: 1, ab: 0.4, ln: 0.38, wd: 2.4, sw: 0.08, tw: 1.1, ao: 0.3 }, idle: 'gkbutcher', kick: 'stomp', cele: 'roar', fx: '#ff2a1e' },
    { g: { cad: 0.9, st: 0.95, kn: 0.6, arm: 0.3, ab: 0.5, ln: -0.02, gl: 0.6, tw: 0.4 }, idle: 'gkhypno', kick: 'sidefoot', cele: 'bow', fx: '#a66bff', hat: 'turban', prop: 'pendulum' },
    { g: { cad: 1.2, st: 1.05, kn: 1.3, arm: 1.3, ab: -0.1, ln: 0.12, bob: 3, sw: 0.05, tw: 1.3, ao: 0.25 }, idle: 'gkloco', kick: 'drive', cele: 'pump', fx: '#ff2fa0' }
  ];
  const PE0 = { g: { cad: 1, st: 1, kn: 1, arm: 1 }, idle: '', kick: '', cele: '', fx: '#e8ecf2' };
  // poses d'ULTIME propres (sinon le joueur garde son geste de frappe)
  const UPOSE_K = { upper: 1, stampede: 1, bordee: 1, fil: 1, crescendo: 1, abra: 1, couronne: 1 };
  const UPK = ['', '', '', '', '', '', '', ''], KSHOT = new Float32Array(8).fill(-9);
  const GKP = [null, null, null, null, null, null, null, null]; // geste spécial du gardien en cours : [type, instant]
  const GKPD = { scorpion: 0.55, poing: 0.4, kamikaze: 1.1, blinde: 0.45 };
  const GK_O = { sleeve: 'c1', slv: 0.45, shorts: 'c2', sl: 0.52, socks: 'c2', boots: 'acc', sash: true, ov: [], ex: [], num: 1 };
  const GKLOOK = t => ({ sk: SKIN[t * 4 + 3], hc: HAIR[t * 4 + 3], hair: 'bald', face: [], band: 's', body: [], b: [1, 1, 11, 7.4] });
  const LK = [], LKD = [];
  let lkKey = '';
  let lkRef = null;
  function setLooks(picks) { // looks des 8 joueurs du match
    if (picks === lkRef && LK.length === 8 && lkKey !== '') return; lkRef = picks;
    const key = picks ? picks.join('|') : '-';
    if (key === lkKey && LK.length === 8) return;
    for (let i = 0; i < 8; i++) { const t = i >> 2, r = i & 3, v = picks && picks[t] ? picks[t][r] : null; LK[i] = makeLook(v == null || v < 0 || !LOOKS[v] ? -1 : v, t); }
    lkKey = key;
  }
  function makeLook(rid, t) {
    const L = rid < 0 ? GKLOOK(t) : Object.assign({}, LOOKS[rid]);
    L.f = {}; for (const k of L.face) L.f[k] = 1; L.bd = {}; for (const k of L.body) L.bd[k] = 1;
    L.rid = rid;
    L.o = rid < 0 ? GK_O : OUTFITS[rid]; L.of = {}; for (const k of L.o.ov.concat(L.o.ex)) L.of[k] = 1;
    const R2 = rid >= 0 ? TF.ROSTER[rid] : null;
    L.tr = R2 ? { [R2.atk[0]]: 1, [R2.def[0]]: 1 } : {};
    L.name = R2 ? R2.name.toUpperCase() : 'GARDIEN';
    L.skD = shade(L.sk, 0.7);
    L.pe = rid >= 0 ? PERSO[rid] : PE0;
    return L;
  }
  setLooks(null);

  function figure(p, i, X, Y, ghost) {
    const team = i >> 2, gk = (i & 3) === 3, C = PAL[team], st = p.st, now = performance.now() / 1000;
    let fx = p.fx * cam.flip, fy = p.fy;
    let roll = 0, srot = 0;
    if (st === ST.dive) { // plongeon du gardien : face au terrain, corps couché vers le ballon
      const sg = fx >= 0 ? 1 : -1; srot = 1.25 * (p.fy >= 0 ? 1 : -1) * sg; roll = 0.35 * (p.fy >= 0 ? 1 : -1) * sg; fx = sg; fy = 0;
    }
    const fl = len(fx, fy) || 1; fx /= fl; fy /= fl;
    if (!ghost && st !== ST.dive) { // le corps pivote au lieu de se retourner d'un coup
      const ta = Math.atan2(fy, fx); let ca = FA[i];
      if (ca !== ca) ca = ta;
      let d = ta - ca; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const rate = isStrike(st) || st === ST.dash || st === ST.slide || st === ST.fly || st === ST.blast ? 38 : 13;
      ca += d * (1 - Math.exp(-animDt * rate)); FA[i] = ca; fx = Math.cos(ca); fy = Math.sin(ca);
    } else if (!ghost) FA[i] = Math.atan2(fy, fx);
    else if (ghostCol && st !== ST.dive && FA[i] === FA[i]) { fx = Math.cos(FA[i]); fy = Math.sin(FA[i]); }
    const amp = clamp(spd[i] / 250, 0, 1.3), ph = animPh[i];
    const loco = st === ST.run || st === ST.hold || st === ST.dash;
    // poids de la course : passage progressif arrêt → marche → course (plus de bascule sèche)
    const wr = st === ST.dash ? 1 : loco ? sm01((amp - 0.03) / 0.3) : 0;
    let lean = 0.08, hipD = null, mouth = 0, eyes = 1, spread = 0, tw = 0, lift = 0, glide = 0;
    // bras : a angle avant/arrière, b pli du coude, o écartement du bras (rad), p écartement de l'avant-bras par rapport au bras
    const L0 = { a: 0.1, b: 0.25 }, L1 = { a: -0.1, b: 0.25 }, A0 = { a: 0.2, b: 0.5, o: 0, p: 0 }, A1 = { a: 0.15, b: 0.5, o: 0, p: 0 };
    const PE = LK[i].pe || PE0, G = PE.g;
    if (st === ST.run || st === ST.hold) { // garde : genoux fléchis, poings serrés, appuis vivants
      const br = Math.sin(now * 3.2 + i * 1.7), sway = Math.sin(now * 1.15 + i * 2.3);
      lean = gk ? 0.32 : 0.14 + br * 0.02; spread = gk ? 3 : 1.5;
      L0.a = 0.3 + sway * 0.05; L0.b = (gk ? 0.95 : 0.6) + sway * 0.08; L1.a = -0.05 - sway * 0.04; L1.b = (gk ? 0.6 : 0.35) - sway * 0.06;
      A0.a = gk ? 0.85 : 0.3; A0.b = gk ? 0.8 : 2.35 + br * 0.08; A1.a = gk ? 0.85 : 0.12; A1.b = gk ? 0.8 : 2.2;
      roll = sway * 0.03 * (1 - wr); // transfert du poids d'une jambe à l'autre
      if (gk && PE.idle && !ghost && st === ST.run) { // posture d'attente propre à chaque gardien
        const t = now + i * 0.37;
        switch (PE.idle) {
          case 'gkwall': lean = 0.22; spread = 5; L0.b = 0.75; L1.b = 0.75; A0.a = 0.35; A0.b = 0.3; A0.o = 1.2; A1.a = 0.35; A1.b = 0.3; A1.o = 1.2; break; // le mur : bras en croix
          case 'gkcat': { const f2 = Math.sin(t * 2.2); lean = 0.55; L0.a = 0.65; L0.b = 1.5; L1.a = 0.25; L1.b = 1.4; roll = 0.06 * f2; lift = 1.2 * Math.abs(Math.sin(t * 5));
            A0.a = 1.25 + 0.1 * f2; A0.b = 1.3; A0.o = 0.25; A1.a = 1.15 - 0.1 * f2; A1.b = 1.35; A1.o = 0.25; break; } // ramassé, griffes sorties
          case 'gkbutcher': { const ph2 = (t * 1.4) % 1, hit = ph2 < 0.12 ? 1 - ph2 / 0.12 : 0; lean = 0.42; spread = 3.4;
            A0.a = 1.05; A0.b = 1.65 - 0.5 * hit; A0.p = -0.7; A1.a = 1.0; A1.b = 1.7 - 0.5 * hit; A1.p = -0.7; mouth = hit > 0.4 ? 1 : 0; break; } // tape ses gants l'un contre l'autre
          case 'gkhypno': lean = 0.02; spread = 1; A0.a = 1.45; A0.b = 0.1; A0.o = 0.12; A1.a = 0.45; A1.b = 2.0; A1.p = -0.9; break; // le pendule tendu
          case 'gkloco': { const f2 = Math.sin(t * 3); lean = 0.15; spread = 2.6; lift = 2.5 * Math.abs(Math.sin(t * 6));
            A0.a = 1.4 + 1.3 * f2; A0.b = 0.3; A0.o = 0.5; A1.a = 1.4 - 1.3 * f2; A1.b = 0.3; A1.o = 0.5; mouth = 1; break; } // moulinets de bras
        }
      }
      if (!gk && PE.idle && !ghost) { // posture d'attente propre à chaque joueur
        const t = now + i * 0.37;
        switch (PE.idle) {
          case 'boxer': { const bb = Math.sin(t * 7); lean = 0.2; lift = 1 + 1.3 * Math.abs(bb); spread = 2.5;
            A0.a = 0.45; A0.b = 2.25; A0.o = 0.15; A0.p = -0.5; A1.a = 0.7 + 0.08 * bb; A1.b = 2.1; A1.o = 0.15; A1.p = -0.5; break; } // garde de boxeur, sautille
          case 'heavy': lean = 0.27 + 0.03 * Math.sin(t * 1.6); spread = 4.2; A0.a = 0.15; A0.b = 0.35; A0.o = 0.34; A1.a = 0.12; A1.b = 0.35; A1.o = 0.34; L0.b += 0.2; L1.b += 0.2; break; // voûté, bras ballants
          case 'reaper': lean = 0.02; spread = 0; lift = 3 + 1.5 * Math.sin(t * 2.1); roll = 0; // elle lévite
            L0.a = 0.12; L0.b = 0.25; L1.a = 0.02; L1.b = 0.3; A0.a = 0.2; A0.b = 0.15; A0.o = 0.08; A1.a = 0.15; A1.b = 0.12; A1.o = 0.08; break;
          case 'cross': lean = -0.02; spread = 3.2; A0.a = 0.55; A0.b = -0.53; A0.o = 0.2; A0.p = -1.75; A1.a = 0.68; A1.b = -0.66; A1.o = 0.15; A1.p = -1.65; break; // bras croisés
          case 'swagger': lean = -0.1; spread = 3.8; A0.a = 0; A0.b = 0.25; A0.o = 0.75; A0.p = -1.55; A1.a = 0; A1.b = 0.25; A1.o = 0.75; A1.p = -1.55; break; // poings sur les hanches
          case 'ready': { const bb = Math.abs(Math.sin(t * 6)); lean = 0.2; lift = bb * 2.2; L0.b += 0.15; L1.b += 0.15; break; } // sautille sur place
          case 'magic': { const f2 = Math.sin(t * 5); lean = 0.04; A0.a = 0.8; A0.b = 1.3 + 0.15 * f2; A0.o = 0.1; A0.p = -0.65; A1.a = 0.8; A1.b = 1.3 - 0.15 * f2; A1.o = 0.1; A1.p = -0.65; break; } // doigts qui pianotent
          case 'tentacle': { const f2 = Math.sin(t * 3.2); A0.a = 0.6 + 0.35 * f2; A0.b = 1.0 + 0.7 * Math.sin(t * 3.2 + 1.2); A0.o = 0.35;
            A1.a = 0.6 - 0.35 * f2; A1.b = 1.0 + 0.7 * Math.sin(t * 3.2 + 2.6); A1.o = 0.35; break; } // bras qui ondulent
          case 'balance': { const f2 = Math.sin(t * 2.4); lean = 0.04; roll = 0.07 * f2; L1.a = 0.25; L1.b = 1.7; L0.a = 0.02; L0.b = 0.1;
            A0.a = -lean; A0.b = 0.05; A0.o = 1.4 + 0.15 * f2; A1.a = -lean; A1.b = 0.05; A1.o = 1.4 - 0.15 * f2; break; } // sur un pied, bras en balancier
          case 'conduct': { const f2 = Math.sin(t * 4.5); lean = -0.03; A0.a = 1.9 + 0.45 * f2; A0.b = 0.5 + 0.35 * Math.sin(t * 4.5 + 1); A0.o = 0.25;
            A1.a = -0.55; A1.b = 1.5; A1.o = 0.2; A1.p = -1.1; break; } // il dirige, l'autre main dans le dos
          case 'royal': lean = -0.07; spread = 0.5; A0.a = -0.55; A0.b = 1.1; A0.o = 0.2; A0.p = -1.1; A1.a = -0.55; A1.b = 1.1; A1.o = 0.2; A1.p = -1.1; break; // mains dans le dos
          case 'prowl': { const f2 = Math.sin(t * 2); lean = 0.55; spread = 3; L0.a = 0.55; L0.b = 1.25; L1.a = 0.05; L1.b = 1.1; roll = 0.05 * f2;
            A0.a = 1.05 + 0.1 * f2; A0.b = 0.9; A0.o = 0.25; A1.a = 0.95 - 0.1 * f2; A1.b = 1.0; A1.o = 0.25; break; } // à l'affût, griffes sorties
          case 'bull': { const f2 = Math.sin(t * 6); lean = 0.42; spread = 3; L0.a = -0.25 + 0.3 * f2; L0.b = 0.5 + 0.3 * Math.max(0, -f2);
            A0.a = 0.35; A0.b = 1.2; A0.o = 0.35; A1.a = 0.3; A1.b = 1.25; A1.o = 0.35; break; } // gratte le sol
          case 'sly': { const f2 = Math.sin(t * 9); lean = 0.24; roll = 0.04 * Math.sin(t * 1.3);
            A0.a = 0.85; A0.b = 1.55 + 0.12 * f2; A0.o = 0.05; A0.p = -0.75; A1.a = 0.85; A1.b = 1.55 - 0.12 * f2; A1.o = 0.05; A1.p = -0.75; break; } // se frotte les mains
          case 'pound': { const ph2 = (t * 1.6) % 1, hit = ph2 < 0.15 ? 1 - ph2 / 0.15 : 0; lean = 0.12; spread = 2.5;
            A0.a = 0.85; A0.b = 1.4 - 0.5 * hit; A0.o = 0.1; A0.p = -0.7; A1.a = 0.7; A1.b = 1.5; A1.o = 0.05; A1.p = -0.65; break; } // poing dans la paume
        }
      }
      const sh = SHF[i] * (1 - wr);
      if (sh > 0.02) { // pivote sur place : petits pas
        const s2 = Math.sin(ph), c2 = Math.cos(ph);
        L0.a += 0.32 * s2 * sh; L0.b += 0.75 * Math.max(0, c2) * sh; L1.a -= 0.32 * s2 * sh; L1.b += 0.75 * Math.max(0, -c2) * sh;
      }
    }
    if (wr > 0) { // cycle de course (démarche propre à chaque joueur)
      const s1 = Math.sin(ph), c1 = Math.cos(ph), am = Math.min(1, amp);
      const sa = (0.8 + 0.16 * sm01((amp - 0.75) / 0.45)) * G.st; // foulée plus longue au sprint
      const kl = (1.05 + 0.5 * am) * G.kn;                         // le genou monte plus en courant vite
      const as = 0.95 * G.arm, ab = G.ab || 0, fl = G.flop ? 0.75 * Math.sin(ph * 2 + 1) * am : 0;
      const r = [0.1 + 0.15 * am + (amp > 1.05 ? 0.06 : 0) + (G.ln || 0) * Math.min(1, am * 1.6),
        sa * s1 * am, 0.2 + kl * Math.max(0, c1) * am, -sa * s1 * am, 0.2 + kl * Math.max(0, -c1) * am,
        -as * s1 * am, Math.max(0.05, 1.35 + 0.3 * am + ab + fl), as * s1 * am, Math.max(0.05, 1.35 + 0.3 * am + ab - fl), G.ao || 0, 0, G.ao || 0, 0];
      if (G.cond) { r[5] = 1.85 + 0.45 * Math.sin(ph * 2); r[6] = 0.5; r[9] = 0.25; } // la baguette bat la mesure
      const cur = [lean, L0.a, L0.b, L1.a, L1.b, A0.a, A0.b, A1.a, A1.b, A0.o, A0.p, A1.o, A1.p];
      for (let k = 0; k < 13; k++) cur[k] += (r[k] - cur[k]) * wr;
      [lean, L0.a, L0.b, L1.a, L1.b, A0.a, A0.b, A1.a, A1.b, A0.o, A0.p, A1.o, A1.p] = cur;
      spread = spread * (1 - wr) + (G.wd || 0) * wr;
      tw = 0.2 * s1 * am * wr * (G.tw == null ? 1 : G.tw); // les épaules tournent à l'inverse des hanches
      roll += (G.sw || 0) * s1 * am * wr;                  // roulis : il se dandine
      lift = lift * (1 - wr) + (G.bob || 0) * Math.max(0, Math.sin(ph * 2)) * am * wr;
      glide = (G.gl || 0) * wr;
      const blv = BLV(p.dmg);
      if (blv >= 2) { // salement amoché : il boite (foulée raccourcie, la hanche plonge sur la jambe blessée)
        const k = blv === 3 ? 1 : 0.6;
        L1.a *= 1 - 0.4 * k; L1.b *= 1 - 0.35 * k; roll += 0.1 * k * Math.sin(ph) * am * wr; lean += 0.05 * k * wr;
      }
    }
    if (loco && st !== ST.dash && !ghost) { // le corps réagit aux forces : accélère, freine, vire
      const ax = SAX[i], ay = SAY[i];
      const aF = ax * p.fx + ay * p.fy, aL = cam.flip * (ay * p.fx - ax * p.fy);
      lean += clamp(aF / 1150 * 0.24, -0.32, 0.26) * Math.max(wr, 0.35);
      roll += clamp(aL / 1900 * 0.3, -0.22, 0.22) * wr;
      const brk = sm01((-aF - 450) / 900) * clamp(spd[i] / 130, 0, 1);
      if (brk > 0.02) { // freinage : jambe d'appui plantée devant, buste en arrière
        if (!BRL[i]) BRL[i] = L0.a >= L1.a ? 1 : 2;
        const F = BRL[i] === 1 ? L0 : L1, B = BRL[i] === 1 ? L1 : L0;
        F.a += (0.72 - F.a) * brk; F.b += (0.12 - F.b) * brk; B.a += (-0.3 - B.a) * brk; B.b += (0.95 - B.b) * brk;
        A0.a += (0.75 - A0.a) * brk * 0.6; A1.a += (1.0 - A1.a) * brk * 0.6; tw *= 1 - brk; spread += 1.4 * brk;
      } else BRL[i] = 0;
    }
    if (p.chg > 0 && (st === ST.run || st === ST.hold)) { // armé du tir
      const v = Math.min(1, p.chg);
      L0.a = -0.3 - 0.85 * v; L0.b = 0.5 + 1.5 * v; L1.a = 0.15; L1.b = 0.4;
      A0.a = 0.3 + 0.8 * v; A0.b = 0.3; A1.a = -0.3 - 0.9 * v; A1.b = 0.4; lean = 0.2 - 0.12 * v; mouth = v > 0.85 ? 1 : 0;
      switch (PE.kick) { // l'armé dépend de la manière de frapper
        case 'axe': A0.a = 0.3 + 2.5 * v; A0.b = 0.5; A1.a = 0.3 + 2.4 * v; A1.b = 0.6; lean = 0.1 - 0.3 * v; break;          // hache levée à deux mains
        case 'cannon': case 'boot': L0.a = -0.4 - 1.0 * v; L0.b = 0.4 + 1.8 * v; lean = 0.15 - 0.3 * v; break;               // énorme armé
        case 'toe': case 'poke': L0.a = -0.2 - 0.45 * v; L0.b = 0.5 + 0.9 * v; A0.a = 0.45; A0.b = 2.2; A0.p = -0.5; A1.a = 0.7; A1.b = 2.1; A1.p = -0.5; break; // armé court, garde haute
        case 'chip': A0.a = -lean; A0.b = 0.05; A0.o = 1.3; A1.a = -lean; A1.b = 0.05; A1.o = 1.3; break;                     // bras en balancier
        case 'scythe': A0.a = -0.6 - 0.8 * v; A0.b = 0.1; A0.o = 0.6; tw = 0.5 * v; roll = -0.2 * v; break;                  // faux armée
        case 'sidefoot': A0.a = 1.8; A0.b = 0.4; A0.o = 0.25; L0.a = -0.2 - 0.5 * v; tw = 0.3 * v; break;                     // baguette levée
        case 'pounce': lean = 0.45 + 0.1 * v; L1.b = 0.9; A0.a = 0.8; A0.b = 1.0; A0.o = 0.25; A1.a = 0.7; A1.b = 1.0; A1.o = 0.25; break;
        case 'butt': case 'stomp': lean = 0.35 + 0.1 * v; break;
        case 'trivela': case 'curl': tw = 0.45 * v; A1.o = 0.6 * v; break;
      }
    } else if (p.chg < 0) { // charge du tacle : on se ramasse
      const v = -p.chg; lean = 0.4 + 0.35 * v; L0.a += 0.35 * v; L0.b += 0.6 * v; L1.a += 0.35 * v; L1.b += 0.6 * v;
      A0.a = 0.9; A0.b = 1.1; A1.a = 0.5; A1.b = 1.3; mouth = v > 0.7 ? 1 : 0;
    }
    switch (st) {
      case ST.kick: { // geste de frappe propre à chaque joueur (et pose d'ULTIME)
        const shot = now - KSHOT[i] < 0.6, ks = UPK[i] && shot ? UPK[i] : shot ? PE.kick : 'pass', e = Math.min(1, stT[i] / 0.06);
        L0.a = 1.4; L0.b = 0.08; L1.a = -0.25; L1.b = 0.4; A0.a = -1.1; A0.b = 0.3; A1.a = 1.3; A1.b = 0.3; lean = -0.25; mouth = 1;
        switch (ks) {
          case 'pass': L0.a = 0.95; L0.b = 0.25; L1.a = -0.15; L1.b = 0.35; A0.a = -0.6; A0.b = 0.4; A1.a = 0.8; A1.b = 0.4; lean = -0.05; mouth = 0; break;
          // ULTIMES
          case 'upper': lift = 7 * e; lean = -0.25; tw = -0.4; A0.a = 3.0; A0.b = 0.05; A0.o = 0.1; A1.a = 0.45; A1.b = 2.3; A1.p = -0.4; L0.a = 0.35; L0.b = 0.7; L1.a = -0.2; L1.b = 0.3; break; // uppercut vers le ciel
          case 'stampede': lean = 0.95; lift = 2; A0.a = -1.3; A0.b = 0.3; A0.o = 0.3; A1.a = -1.2; A1.b = 0.35; A1.o = 0.3; L0.a = 0.6; L0.b = 0.9; L1.a = -0.8; L1.b = 0.3; break; // coup de tête plongeant
          case 'bordee': lean = -0.6; spread = 3; A0.a = -2.0; A0.b = 0.2; A0.o = 0.4; A1.a = 2.5; A1.b = 0.3; A1.o = 0.4; L0.a = 1.7; L0.b = 0.05; L1.a = -0.3; L1.b = 0.6; break; // le recul
          case 'fil': lean = 0.75; lift = 1; L0.a = 0.05; L0.b = 0.05; L1.a = -1.45; L1.b = 0.1; A0.a = -lean; A0.b = 0.05; A0.o = 1.45; A1.a = -lean; A1.b = 0.05; A1.o = 1.45; mouth = 0; break; // arabesque
          case 'crescendo': lean = -0.22; A0.a = 2.8; A0.b = 0.3; A0.o = 0.35; A1.a = 2.7; A1.b = 0.35; A1.o = 0.35; L0.a = 0.9; L0.b = 0.2; L1.a = -0.2; L1.b = 0.3; break; // fortissimo
          case 'abra': lean = -0.12; A0.a = 2.3; A0.b = 0.1; A0.o = 0.7; A1.a = 2.3; A1.b = 0.1; A1.o = 0.7; L0.a = 1.0; L0.b = 0.3; L1.a = -0.2; L1.b = 0.3; break; // « ta-da ! »
          case 'couronne': lean = -0.1; tw = -0.4; A0.a = 1.3; A0.b = 0.15; A0.o = 0.9; A1.a = 1.3; A1.b = 0.15; A1.o = 0.9; L0.a = 1.7; L0.b = 0.15; L1.a = -0.25; L1.b = 0.35; break;
          // FRAPPES
          case 'toe': lean = 0.14; L0.a = 1.05; L0.b = 0.04; L1.a = -0.12; L1.b = 0.35; A0.a = 0.45; A0.b = 2.25; A0.p = -0.5; A1.a = 0.7; A1.b = 2.1; A1.p = -0.5; break; // pointu sec, garde haute
          case 'poke': lean = 0.26; L0.a = 1.0; L0.b = 0.05; L1.a = -0.25; L1.b = 0.6; A0.a = -0.7; A0.b = 0.3; A1.a = 1.0; A1.b = 0.3; A1.o = 0.5; break;
          case 'stomp': lean = 0.4; spread = 3; L0.a = 0.85; L0.b = 0.55; L1.a = -0.3; L1.b = 0.8; A0.a = -1.0; A0.b = 0.4; A0.o = 0.3; A1.a = -0.9; A1.b = 0.4; A1.o = 0.3; break; // écrase la balle
          case 'scythe': lean = -0.12; roll = 0.38; tw = -0.7; L0.a = 1.6; L0.b = 0.1; L1.a = -0.15; L1.b = 0.4; A0.a = 2.1; A0.b = 0.1; A0.o = 0.6; A1.a = -0.6; A1.b = 0.3; A1.o = 0.3; break; // fauche en arc
          case 'boot': lean = -0.5; L0.a = 2.4; L0.b = 0.02; L1.a = -0.1; L1.b = 0.2; A0.a = 1.3; A0.b = 0.3; A1.a = 1.1; A1.b = 0.3; break; // coup de pied de rugby
          case 'axe': lean = -0.22; spread = 2; L0.a = 1.5; L0.b = 0.1; L1.a = -0.25; L1.b = 0.4; A0.a = 2.9; A0.b = 0.4; A0.o = 0.15; A1.a = 2.85; A1.b = 0.45; A1.o = 0.15; break; // hache à deux mains
          case 'drive': lean = -0.32; lift = 4 * e; L0.a = 1.95; L0.b = 0.05; L1.a = -0.3; L1.b = 0.6; A0.a = -1.3; A0.b = 0.3; A0.o = 0.3; A1.a = 1.6; A1.b = 0.3; A1.o = 0.5; break; // accompagne haut, décolle
          case 'trivela': roll = -0.38; tw = 0.55; spread = -1.5; lean = 0; L0.a = 1.1; L0.b = 0.35; L1.a = -0.1; L1.b = 0.3; A0.a = 1.2; A0.b = 0.15; A0.o = 0.8; A1.a = 1.2; A1.b = 0.15; A1.o = 0.8; break; // extérieur du pied
          case 'whip': lean = -0.15; L0.a = 1.5; L0.b = 0.65; L1.a = -0.2; L1.b = 0.35; A0.a = 2.4; A0.b = 1.2; A0.o = 0.4; A1.a = -1.2; A1.b = 1.0; A1.o = 0.4; break; // fouetté
          case 'chip': lean = -0.08; lift = 2; L0.a = 0.75; L0.b = 0.2; L1.a = 0; L1.b = 0.1; A0.a = 0.08; A0.b = 0.05; A0.o = 1.35; A1.a = 0.08; A1.b = 0.05; A1.o = 1.35; break; // piqué sur la pointe
          case 'sidefoot': lean = 0.04; roll = 0.28; tw = -0.3; L0.a = 0.9; L0.b = 0.25; L1.a = -0.1; L1.b = 0.3; A0.a = 2.5; A0.b = 0.3; A0.o = 0.3; A1.a = -0.55; A1.b = 1.5; A1.o = 0.2; A1.p = -1.1; mouth = 0; break; // plat du pied, baguette en l'air
          case 'curl': lean = -0.05; tw = -0.5; roll = 0.2; L0.a = 1.75; L0.b = 0.15; L1.a = -0.25; L1.b = 0.35; A0.a = 2.0; A0.b = 0.4; A0.o = 0.55; A1.a = -0.3; A1.b = 0.2; A1.o = 0.4; mouth = 0; break; // enroulé élégant
          case 'pounce': lean = 0.45; lift = 3 * e; L0.a = 1.35; L0.b = 0.1; L1.a = -0.65; L1.b = 0.5; A0.a = 1.6; A0.b = 0.8; A0.o = 0.2; A1.a = 1.3; A1.b = 0.9; A1.o = 0.2; break; // bondit, griffes en avant
          case 'butt': lean = 0.6; L0.a = 1.2; L0.b = 0.2; L1.a = -0.3; L1.b = 0.5; A0.a = -1.2; A0.b = 0.4; A0.o = 0.25; A1.a = -1.1; A1.b = 0.4; A1.o = 0.25; break; // tête baissée
          case 'cannon': lean = -0.45; spread = 3; L0.a = 1.6; L0.b = 0.05; L1.a = -0.3; L1.b = 0.5; A0.a = -1.8; A0.b = 0.2; A0.o = 0.35; A1.a = 2.4; A1.b = 0.3; A1.o = 0.35; break; // recul du canon
        }
        break;
      }
      case ST.slide: hipD = -5; lean = -1.0; L0.a = 1.48; L0.b = 0.04; L1.a = 1.2; L1.b = 2.6; A0.a = 3.0; A0.b = 0.8; A1.a = 0.55; A1.b = 0.1; mouth = 1; break;
      case ST.fly: hipD = -22; lean = -1.2; L0.a = 1.6; L0.b = 0; L1.a = 0.55; L1.b = 2.4; A0.a = 0.6; A0.b = 0.3; A1.a = 3.6; A1.b = 0.5; mouth = 1; break;
      case ST.dash: lean = 0.62; A0.a = -1.6 - 0.62; A0.b = 0.2; A1.a = -1.4 - 0.62; A1.b = 0.25; break;
      case ST.dive: hipD = -14; lean = 0.05; L0.a = 0.05; L0.b = 0.1; L1.a = -0.2; L1.b = 0.3; A0.a = 3.0; A0.b = 0.05; A1.a = 2.85; A1.b = 0.1; mouth = 1; break;
      case ST.cele: { // chacun sa célébration
        const t = now + i * 0.5;
        lean = -0.18; spread = 3; L0.a = 0.15; L0.b = 0.25; L1.a = -0.15; L1.b = 0.25; mouth = 1;
        A0.a = 2.75 + 0.35 * Math.sin(now * 13) + 0.18; A0.b = 0.55; A1.a = 2.9 + 0.18; A1.b = 0.45;
        switch (PE.cele) {
          case 'flex': { const f = 0.25 * Math.max(0, Math.sin(t * 4)); lean = -0.06; spread = 3.5; A0.a = -lean; A0.b = 2.85 + f; A0.o = 1.45; A0.p = -1.45; A1.a = -lean; A1.b = 2.85 + f; A1.o = 1.45; A1.p = -1.45; break; } // double biceps
          case 'chest': { const f = Math.sin(t * 10); lean = -0.14; spread = 4; A0.a = 1.0 + 0.35 * Math.max(0, f); A0.b = 1.9; A0.p = -0.9; A1.a = 1.0 + 0.35 * Math.max(0, -f); A1.b = 1.9; A1.p = -0.9; break; } // se frappe le torse
          case 'reaper': lean = 0.04; spread = 0; lift = 7 + 3 * Math.sin(t * 2); mouth = 0; L0.a = 0.1; L0.b = 0.3; L1.a = 0; L1.b = 0.35;
            A0.a = 2.3; A0.b = 0.5; A0.o = 0.25; A1.a = 1.2; A1.b = 1.5; A1.o = 0.1; A1.p = -1.0; break; // lévite, faux brandie
          case 'haka': { const f = Math.sin(t * 9); lean = 0.15; spread = 5; L0.a = 0.45; L0.b = 1.0; L1.a = 0.35; L1.b = 1.05; A0.a = 0.5 + 0.45 * f; A0.b = 1.6; A0.o = 0.5; A1.a = 0.5 + 0.45 * f; A1.b = 1.6; A1.o = 0.5; break; }
          case 'roar': { const f = Math.sin(t * 13) * 0.12; lean = -0.35; spread = 4; A0.a = 2.2 + f; A0.b = 1.1; A0.o = 0.55; A1.a = 2.2 - f; A1.b = 1.1; A1.o = 0.55; break; } // rugit vers le ciel
          case 'pump': { const f = Math.max(0, Math.sin(t * 7)); lean = -0.08; L0.a = 0.6; L0.b = 1.6; L1.a = -0.1; L1.b = 0.3; A0.a = 2.4 + 0.5 * f; A0.b = 0.9 - 0.7 * f; A1.a = 0.4; A1.b = 2.0; A1.p = -0.4; break; } // genou levé, poing qui pompe
          case 'bow': { const f = Math.sin(t * 1.4); lean = 0.75 + 0.15 * f; spread = 1; mouth = 0; A0.a = 0.6; A0.b = 1.6; A0.p = -1.0; A1.a = 0.2; A1.b = 0.2; A1.o = 1.1; L0.a = 0.25; L0.b = 0.1; L1.a = -0.2; L1.b = 0.15; break; } // la révérence
          case 'wave': A0.a = 1.6 + 0.6 * Math.sin(t * 6); A0.b = 1.0 + 0.8 * Math.sin(t * 6 + 1.3); A0.o = 0.8; A1.a = 1.6 + 0.6 * Math.sin(t * 6 + 2); A1.b = 1.0 + 0.8 * Math.sin(t * 6 + 3.3); A1.o = 0.8; lean = -0.1; break; // tentacules au vent
          case 'flip': { const f = (t * 1.1) % 1, fl2 = f < 0.45 ? f / 0.45 : 0; srot = fl2 * Math.PI * 2; lift = Math.sin(fl2 * Math.PI) * 20;
            L0.a = 0.4 + 0.5 * Math.sin(fl2 * Math.PI); L0.b = 0.3 + 1.5 * Math.sin(fl2 * Math.PI); L1.a = L0.a; L1.b = L0.b; A0.a = -lean; A0.b = 0.05; A0.o = 1.4; A1.a = -lean; A1.b = 0.05; A1.o = 1.4; break; } // saltos
          case 'conduct': { const f = Math.sin(t * 5); lean = -0.1; A0.a = 2.4 + 0.5 * f; A0.b = 0.4 + 0.4 * Math.sin(t * 5 + 1); A0.o = 0.4; A1.a = 2.2 - 0.5 * f; A1.b = 0.5; A1.o = 0.5; break; } // dirige le stade
          case 'royal': { const f = Math.sin(t * 4); lean = -0.1; spread = 0.5; mouth = 0; A0.a = 2.2; A0.b = 0.9 + 0.3 * f; A0.o = 0.35 + 0.15 * f; A1.a = 0; A1.b = 0.25; A1.o = 0.75; A1.p = -1.55; break; } // salut royal
          case 'tiger': { const f = Math.sin(t * 3); lean = 0.5; spread = 4; L0.a = 0.6; L0.b = 1.3; L1.a = -0.1; L1.b = 1.0; A0.a = 1.9 + 0.3 * f; A0.b = 1.0; A0.o = 0.3; A1.a = 1.6 - 0.3 * f; A1.b = 1.1; A1.o = 0.3; break; } // griffes, rugissement
          case 'stomp': { const f = Math.sin(t * 7); lean = 0.45; spread = 3; L0.a = 0.3 + 0.5 * Math.max(0, f); L0.b = 0.4 + Math.max(0, f); L1.a = 0.3 + 0.5 * Math.max(0, -f); L1.b = 0.4 + Math.max(0, -f);
            A0.a = 2.6; A0.b = 1.6; A0.o = 0.6; A1.a = 2.6; A1.b = 1.6; A1.o = 0.6; break; } // cornes avec les doigts, piétine
          case 'shh': lean = 0; mouth = 0; A0.a = 1.3; A0.b = 2.3; A0.p = -0.6; A1.a = 0; A1.b = 0.25; A1.o = 0.75; A1.p = -1.55; L0.a = 0.4; L0.b = 0.2; break; // chut…
          case 'cannon': { const ph2 = (t * 1.5) % 1, k = ph2 < 0.1 ? ph2 / 0.1 : Math.max(0, 1 - (ph2 - 0.1) / 0.3); lean = 0.1 - 0.35 * k; spread = 3; A0.a = 1.5 - lean; A0.b = 0.05; A1.a = 1.45 - lean; A1.b = 0.1; break; } // tire au canon
        }
        break;
      }
      case ST.punch: case ST.punch2: { // direct : bras tendu puis rentré
        const t = stT[i], e = t < 0.06 ? t / 0.06 : t < 0.15 ? 1 : Math.max(0, 1 - (t - 0.15) / 0.05);
        const H = st === ST.punch ? A0 : A1, G = st === ST.punch ? A1 : A0;
        lean = 0.22 + 0.2 * e; H.a = 1.5 - lean; H.b = 2.3 * (1 - e) + 0.02; G.a = 0.35; G.b = 2.3;
        L0.a = st === ST.punch ? -0.35 : 0.45; L0.b = 0.45; L1.a = st === ST.punch ? 0.45 : -0.35; L1.b = 0.45; mouth = e > 0.5 ? 1 : 0; break;
      }
      case ST.hkick: if (LK[i].tr.boule) { // COUP DE BOULE : on recule la tête… et BAM
        const t = stT[i], wu = Math.min(1, t / 0.15), e = t < 0.15 ? 0 : Math.min(1, (t - 0.15) / 0.05), r = t > 0.27 ? Math.max(0, 1 - (t - 0.27) / 0.07) : 1;
        lean = ((-0.35 * wu) * (1 - e) + 0.85 * e) * r + 0.1 * (1 - r); A0.a = -0.9; A0.b = 0.6; A1.a = -0.8; A1.b = 0.7;
        L0.a = 0.5; L0.b = 0.6; L1.a = -0.4; L1.b = 0.4; spread = 2; mouth = 1; break;
      } else if (LK[i].tr.patate) { // PATATE DE FORAIN : il arme tout le bras et envoie un crochet monstrueux
        const t = stT[i], e = t < 0.13 ? 0 : Math.min(1, (t - 0.13) / 0.06), wu = Math.min(1, t / 0.13), r = t > 0.27 ? Math.max(0, 1 - (t - 0.27) / 0.07) : 1;
        lean = (0.05 - 0.15 * wu + 0.55 * e) * r + 0.1 * (1 - r); spread = 3;
        A0.a = (-1.5 * wu * (1 - e) + 1.75 * e) * r + 0.3 * (1 - r); A0.b = (1.6 * (1 - e) + 0.15 * e) * r + 2.2 * (1 - r);
        A1.a = 0.35; A1.b = 2.2; L0.a = 0.45; L0.b = 0.55; L1.a = -0.45; L1.b = 0.35; tw = (-0.35 * wu * (1 - e) + 0.45 * e) * r; mouth = 1; break;
      } else { // coup de pied haut
        const t = stT[i], e = Math.min(1, t / 0.13), r = t > 0.25 ? Math.max(0, 1 - (t - 0.25) / 0.09) : 1;
        L0.a = (0.9 + 1.25 * e) * r; L0.b = (1.9 - 1.85 * e) * r + 0.2 * (1 - r); L1.a = -0.25; L1.b = 0.35;
        lean = -0.4 * e * r; A0.a = -0.7; A0.b = 0.6; A1.a = 1.0; A1.b = 0.7; mouth = 1; break;
      }
      case ST.stomp: { // COUP DE GRÂCE : genou monté très haut… puis le talon s'écrase
        const t = stT[i];
        if (t < 0.2) {
          const wu = Math.min(1, t / 0.15);
          lean = 0.08 - 0.2 * wu; lift = 2.5 * wu; spread = 2;
          L0.a = 0.3 + 1.35 * wu; L0.b = 0.5 + 1.45 * wu; L1.a = -0.12; L1.b = 0.35;
          A0.a = 0.3 + 1.1 * wu; A0.b = 1.3; A0.o = 0.55; A1.a = 0.2 + 0.8 * wu; A1.b = 1.1; A1.o = 0.55; mouth = 1;
        } else {
          const e = Math.min(1, (t - 0.2) / 0.045);
          lean = -0.12 + 0.5 * e; spread = 2.6;
          L0.a = 1.65 * (1 - e) + 0.5 * e; L0.b = 1.95 * (1 - e) + 0.12 * e; L1.a = -0.3; L1.b = 0.55 + 0.3 * e;
          A0.a = -0.7; A0.b = 0.6; A0.o = 0.45; A1.a = -0.55; A1.b = 0.7; A1.o = 0.45; mouth = 1;
        }
        break;
      }
      case ST.charge: { // on concentre son ki
        const full = curBar[team] >= 1, sh = Math.sin(now * 40) * 0.03;
        spread = 4; lean = 0.08 + sh; L0.a = 0.5; L0.b = 1.05; L1.a = -0.35; L1.b = 0.7; mouth = 1;
        if (full) { A0.a = -1.0; A0.b = 1.5; A1.a = -0.8; A1.b = 1.7; } // mains jointes sur le côté
        else { A0.a = 0.45 + sh; A0.b = 1.1; A1.a = 0.35 - sh; A1.b = 1.2; }
        break;
      }
      case ST.blast: // bras tendus, paumes en avant
        spread = 3; lean = 0.18; L0.a = 0.5; L0.b = 0.55; L1.a = -0.45; L1.b = 0.3;
        A0.a = 1.5 - lean; A0.b = 0.05; A1.a = 1.45 - lean; A1.b = 0.1; mouth = 1; break;
      case ST.volley: { // reprise de volée : jambe armée, puis fouettée à hauteur de hanche, corps penché sur le côté
        const e = AHIT[i] ? 1 : 0, wu = Math.min(1, stT[i] / 0.1);
        if (p.z > 5) { // CISEAU ACROBATIQUE : en l'air, corps couché, jambes en ciseaux
          if (!e) { lean = -0.35 - 0.45 * wu; L0.a = 0.4 + 0.5 * wu; L0.b = 1.6; L1.a = 1.0 + 0.3 * wu; L1.b = 0.5; A0.a = -1.4; A0.b = 0.3; A1.a = 1.8; A1.b = 0.4; roll = 0.2 * wu; }
          else { lean = -1.05; L0.a = 2.45; L0.b = 0.05; L1.a = 0.35; L1.b = 1.2; A0.a = -1.9; A0.b = 0.2; A1.a = 2.4; A1.b = 0.3; roll = 0.38; spread = 2; }
          hipD = -16; mouth = 1; break;
        }
        if (!e) { lean = -0.15 - 0.2 * wu; L0.a = -0.25 - 0.4 * wu; L0.b = 0.9 + 0.6 * wu; L1.a = 0.2; L1.b = 0.45; A0.a = -0.6; A0.b = 0.4; A1.a = 1.3; A1.b = 0.3; roll = -0.12 * wu; }
        else { lean = -0.55; L0.a = 1.85; L0.b = 0.05; L1.a = -0.15; L1.b = 0.35; A0.a = -1.2; A0.b = 0.2; A1.a = 1.9; A1.b = 0.2; roll = 0.32; spread = 2; }
        mouth = 1; break;
      }
      case ST.head: { // tête : on s'arme en arrière en l'air, puis coup de nuque vers l'avant
        const e = AHIT[i] ? 1 : 0, wu = Math.min(1, stT[i] / 0.12);
        if (!e) { lean = 0.05 - 0.45 * wu; L0.a = 0.45; L0.b = 1.0 + 0.5 * wu; L1.a = -0.15; L1.b = 1.1 + 0.3 * wu; A0.a = -0.5 - 0.6 * wu; A0.b = 0.7; A1.a = -0.35 - 0.6 * wu; A1.b = 0.8; }
        else { lean = 0.6; L0.a = -0.35; L0.b = 0.5; L1.a = -0.1; L1.b = 0.9; A0.a = 0.6; A0.b = 0.5; A1.a = 0.45; A1.b = 0.6; }
        mouth = 1; break;
      }
      case ST.stag: { // sonné par le coup
        const w2 = Math.sin(stT[i] * 22) * 0.12;
        lean = -0.5 + w2; L0.a = -0.35; L0.b = 0.5; L1.a = 0.4; L1.b = 0.25; A0.a = -1.3 + w2; A0.b = 0.7; A1.a = 2.3; A1.b = 0.9; mouth = 1; break;
      }
      case ST.down: {
        // une fois retombé, on reste au sol (les petits rebonds ne refont pas « voler » le corps)
        if (!ghost) { if (stT[i] < 0.02) DGR[i] = 0; if (p.z <= 3) DGR[i] = 1; }
        if (p.z > 3 && !DGR[i]) { srot = p.spin; L0.a = 0.7; L0.b = 0.9; L1.a = -0.4; L1.b = 1.2; A0.a = 2.6; A0.b = 0.5; A1.a = -2.4; A1.b = 0.6; mouth = 1; }
        else { hipD = -3.5; lean = -1.52; L0.a = 1.9; L0.b = 0.7; L1.a = 1.5; L1.b = 0.05; A0.a = -0.35; A0.b = 0.35; A1.a = 2.85; A1.b = 0.2; eyes = 0; spread = 2; }
        break;
      }
    }
    // l'équipe qui vient d'encaisser (ou qui a perdu) baisse la tête : mains sur les genoux, sur la tête, bras ballants
    const dej = !ghost && st === ST.run && celeTeam >= 0 && team !== celeTeam && lastV && (lastV.phase === 'goal' || lastV.phase === 'end') && !app.drafting;
    if (dej) {
      const v = (i + (lastV.phase === 'end' ? 1 : 0)) % 3, br = Math.sin(now * 1.6 + i) * 0.04;
      if (v === 0) { lean = 0.72 + br; spread = 2.5; L0.a = 0.35; L0.b = 0.65; L1.a = 0.3; L1.b = 0.6; A0.a = 0.92; A0.b = 0.15; A0.o = 0.15; A1.a = 0.88; A1.b = 0.15; A1.o = 0.15; } // mains sur les genoux
      else if (v === 1) { lean = -0.04 + br; spread = 1.2; A0.a = 2.55; A0.b = 2.3; A0.o = 0.55; A1.a = 2.5; A1.b = 2.3; A1.o = 0.55; L0.a = 0.05; L0.b = 0.1; L1.a = -0.05; L1.b = 0.12; } // mains sur la tête
      else { lean = 0.3 + br; spread = 1; A0.a = -0.05; A0.b = 0.12; A0.o = 0.05; A1.a = -0.08; A1.b = 0.12; A1.o = 0.05; L0.a = 0.08; L0.b = 0.15; L1.a = -0.05; L1.b = 0.15; } // effondré
      mouth = 0;
    }
    // gestes spéciaux du gardien (scorpion, poing, sortie kamikaze, blindé)
    const gp = gk && GKP[i] && now - GKP[i][1] < GKPD[GKP[i][0]] && st !== ST.down ? GKP[i][0] : '';
    switch (gp) {
      case 'scorpion': lean = 1.3; lift = 10; L0.a = -2.4; L0.b = 1.7; L1.a = -2.0; L1.b = 1.3; A0.a = 1.8; A0.b = 0.1; A0.o = 0.3; A1.a = 1.8; A1.b = 0.1; A1.o = 0.3; mouth = 1; break;
      case 'poing': lean = -0.15; lift = 6; A0.a = 2.9; A0.b = 0.05; A0.o = 0.1; A1.a = 1.1; A1.b = 1.5; A1.p = -0.4; L0.a = 0.6; L0.b = 0.9; L1.a = -0.2; L1.b = 0.3; mouth = 1; break;
      case 'kamikaze': lean = 0.75; A0.a = 1.4; A0.b = 0.35; A0.o = 0.25; A1.a = 1.2; A1.b = 0.5; A1.o = 0.25; mouth = 1; break;
      case 'blinde': lean = -0.25; spread = 4; A0.a = 0.6; A0.b = 0.2; A0.o = 1.3; A1.a = 0.6; A1.b = 0.2; A1.o = 1.3; mouth = 1; break;
    }
    // hanche : posée sur la jambe la plus tendue
    const ext = l => 13 * Math.cos(l.a) + 13.5 * Math.cos(l.a - l.b);
    if (hipD === null) hipD = -Math.max(ext(L0), ext(L1), 15);
    if (glide > 0) hipD += (-26.4 - hipD) * glide;  // glisse : le bassin ne monte ni ne descend
    hipD -= lift;
    if (!ghost) { // fondu enchaîné entre l'ancienne pose et la nouvelle (easing doux)
      const S2 = PSB[i], key = st * 8 + (p.chg > 0 ? 2 : p.chg < 0 ? 4 : 0) + (st === ST.down && !DGR[i] && p.z > 3 ? 1 : 0) + ((st === ST.volley || st === ST.head) && AHIT[i] ? 1 : 0) + (st === ST.volley && p.z > 5 ? 2 : 0) + (gp ? 6000 + gp.length : 0) + (dej ? 3000 : 0);
      srot = Math.atan2(Math.sin(srot), Math.cos(srot)); // angle ramené dans [-π, π] pour un fondu au plus court
      const tv = [lean, hipD, spread, L0.a, L0.b, L1.a, L1.b, A0.a, A0.b, A1.a, A1.b, roll, tw, srot, A0.o, A0.p, A1.o, A1.p];
      if (!S2.init) { S2.init = true; S2.key = key; S2.cur = tv.slice(); S2.t = 1; S2.dur = 0.1; }
      if (key !== S2.key) {
        const was = (S2.key / 8) | 0; // on se relève d'une chute ou d'un tacle : le temps de se redresser
        S2.key = key; S2.from = S2.cur.slice(); S2.t = 0;
        S2.dur = isStrike(st) || st === ST.stag || st === ST.blast || st === ST.kick ? 0.065 : st === ST.down || st === ST.slide || st === ST.fly || st === ST.dive ? 0.09
          : (was === ST.down || was === ST.slide || was === ST.dive) && st === ST.run ? 0.3 : 0.17;
      }
      if (S2.t < S2.dur && S2.from) {
        S2.t += animDt; const u = Math.min(1, S2.t / S2.dur), e = u * u * (3 - 2 * u);
        for (let k = 0; k < tv.length; k++) tv[k] = S2.from[k] + (tv[k] - S2.from[k]) * e;
        [lean, hipD, spread, L0.a, L0.b, L1.a, L1.b, A0.a, A0.b, A1.a, A1.b, roll, tw, srot, A0.o, A0.p, A1.o, A1.p] = tv;
      }
      S2.cur = tv;
    } else if (ghostCol && PSB[i].cur) [lean, hipD, spread, L0.a, L0.b, L1.a, L1.b, A0.a, A0.b, A1.a, A1.b, roll, tw, srot, A0.o, A0.p, A1.o, A1.p] = PSB[i].cur;
    const cr = Math.cos(roll), sr = Math.sin(roll);
    const P = (f, d, l, o) => {
      if (roll) { const dd = d - hipD, l2 = l * cr - dd * sr; d = l * sr + dd * cr + hipD; l = l2; }
      const dep = f * fy + l * fx;
      o[0] = f * fx - l * fy; o[1] = d + dep * DEP; o[2] = dep; return o;
    };
    const Pr = (f, d, l, o) => { // vecteur relatif (sans pivot)
      if (roll) { const l2 = l * cr - d * sr; d = l * sr + d * cr; l = l2; }
      const dep = f * fy + l * fx;
      o[0] = f * fx - l * fy; o[1] = d + dep * DEP; o[2] = dep; return o;
    };
    const sl = Math.sin(lean), cl = Math.cos(lean), TL = 20.5;
    const scF = sl * TL, scD = hipD - cl * TL; // centre des épaules (corps)
    const tc = Math.cos(tw), ts = Math.sin(tw), hc2 = Math.cos(-0.45 * tw), hs2 = Math.sin(-0.45 * tw);
    const Pt = (f, d, l, o) => { const ff = f - scF; return P(scF + ff * tc - l * ts, d, ff * ts + l * tc, o); }; // haut du corps
    const Ph = (f, d, l, o) => P(f * hc2 - l * hs2, d, f * hs2 + l * hc2, o);                                        // bassin
    const LO = LK[i], BU = LO.b, bw = BU[1], O = LO.o, OF = LO.of;
    const shW = BU[2], hpW = 4.8 + spread + (BU[3] - 7.4) * 0.6;
    let n = 0; const nj = () => J[n++];
    // jambes
    const legs = [];
    for (const [l, s] of [[L0, 1], [L1, -1]]) {
      const hj = Ph(0, hipD, s * hpW, nj());
      const kf = 13 * Math.sin(l.a), kd = hipD + 13 * Math.cos(l.a);
      const kn = P(kf, kd, s * (hpW + 0.4), nj());
      const sa = l.a - l.b, ff = kf + 13.5 * Math.sin(sa), fd = kd + 13.5 * Math.cos(sa);
      const ft = P(ff, fd, s * (hpW + 0.6), nj());
      const to = P(ff + 5.2 * Math.sin(sa + 1.5), fd + 5.2 * Math.cos(sa + 1.5), s * (hpW + 0.6), nj());
      legs.push({ s, hj, kn, ft, to, dep: (hj[2] + ft[2]) * 0.5 });
    }
    // bras
    const arms = [];
    for (const [a, s] of [[A0, 1], [A1, -1]]) {
      const sj = Pt(scF + sl * -1.5, scD + cl * 1.5, s * shW, nj());
      const g = lean + a.a, cg = Math.cos(g), q = a.o + a.p; // o / q : bras et avant-bras écartés du corps
      const ef = scF - sl * 1.5 + 10.5 * Math.sin(g), ed = scD + cl * 1.5 + 10.5 * cg * Math.cos(a.o), eL = shW + 0.8 + 10.5 * Math.abs(cg) * Math.sin(a.o);
      const el = Pt(ef, ed, s * eL, nj());
      const g2 = g + a.b, cg2 = Math.cos(g2);
      const hd = Pt(ef + 10 * Math.sin(g2), ed + 10 * cg2 * Math.cos(q), s * (eL - 0.2 + 10 * Math.abs(cg2) * Math.sin(q)), nj());
      arms.push({ s, sj, el, hd, dep: (sj[2] + el[2] + hd[2]) / 3 });
    }
    // torse : enveloppe de 8 points (épaules larges, taille fine)
    const tp = [];
    for (const [cf, cd, w, dz, PP] of [[scF, scD, shW + 1.4, 5.0 * (bw > 1 ? 1.12 : 1), Pt], [0, hipD, BU[3] + spread * 0.5, 4.2, Ph]])
      for (const ff of [-1, 1]) for (const ll of [-1, 1]) {
        const o = PP(cf + ff * dz * cl, cd + ff * dz * sl, ll * w, nj()); tp.push(o);
      }
    const nk = P(scF + sl * 3.5, scD - cl * 3.5, 0, nj());
    const hc = P(scF + sl * 9.4, scD - cl * 9.4, 0, nj());
    const jer = gk ? C.g : C.j, jerD = gk ? C.gd : C.jd;
    const skin = LO.sk, skinD = LO.skD, tcol = gk ? C.g : C.j;
    const OC = (v, far) => { const c = v === 'c1' ? tcol : v === 'c2' ? C.s : v === 'acc' ? C.a : v; return far ? dkc(c) : c; };
    const GH = ghost ? (ghostCol || C.j) : null;

    const sq = i < 8 && !app.drafting ? SQ[i] : 0; // squash & stretch : le corps se tasse à l'impact, s'étire quand il est éjecté
    ctx.save(); ctx.translate(X, Y); ctx.scale(K * BU[0] * (1 + sq * 0.55), K * BU[0] * (1 - sq));
    if (srot) { ctx.translate(0, hipD); ctx.rotate(srot); ctx.translate(0, -hipD); }
    if (ghost) ctx.globalAlpha = ghost;
    else if (p.inv && ((performance.now() / 70) | 0) % 2) ctx.globalAlpha = 0.45;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const drawLeg = lg => {
      const far = lg.dep < -1.2, T = J[n++], U = J[n++];
      const sk = GH || (O.legs ? OC(O.legs, far) : far ? skinD : skin);
      seg(lg.hj, lg.kn, 8.2 * bw, sk, ghost, !far);            // cuisse
      seg(lg.kn, lg.ft, 6.2 * bw, sk, ghost, !far);            // tibia
      if (!ghost) {
        const sc = OC(O.shorts, far);
        seg(lg.hj, mix(lg.hj, lg.kn, Math.min(1, O.sl), T), 9.6 * bw, sc, 1);                  // short / pantalon
        if (O.sl > 1) seg(lg.kn, mix(lg.kn, lg.ft, Math.min(1, O.sl - 1), J[n++]), 7.6 * bw, sc, 1);
        if (O.socks) seg(mix(lg.kn, lg.ft, 0.3, U), lg.ft, 6.6 * bw, OC(O.socks, far), 1);    // chaussettes
        const dd = app.drafting ? 0 : DIRT[i] || 0;
        if (dd > 0.25) { const q = mix(lg.hj, lg.kn, 0.82, J[n++]); ctx.fillStyle = `rgba(70,52,28,${(0.2 + 0.45 * dd).toFixed(2)})`; circ(q[0], q[1], (2.2 + 2 * dd) * bw); ctx.fill(); }
      }
      seg(lg.ft, lg.to, 5.4 * Math.sqrt(bw) * (O.bootW || 1), GH || OC(O.boots, far), ghost, !far);  // chaussures
    };
    const drawArm = am => {
      const far = am.dep < -1.2, T = J[n++];
      const sk = GH || (far ? skinD : skin), sv = O.sleeve ? OC(O.sleeve, far) : sk;
      seg(am.sj, am.el, 6.4 * bw, sk, ghost, !far);
      seg(am.el, am.hd, 5.4 * bw, GH || (O.slv >= 2 ? sv : sk), ghost, !far);
      if (!ghost) {
        if (O.slv > 0) seg(am.sj, mix(am.sj, am.el, Math.min(1, O.slv), T), 7.8 * bw, sv, 1, !far);           // manche
        if (O.slv > 1 && O.slv < 2) seg(am.el, mix(am.el, am.hd, O.slv - 1, J[n++]), 6.6 * bw, sv, 1, !far); // manche longue
        if (O.wrist) seg(mix(am.el, am.hd, 0.74, J[n++]), mix(am.el, am.hd, 0.9, J[n++]), 6.8 * bw, OC(O.wrist, far), 1); // poignet
        if (OF.rings) { seg(mix(am.sj, am.el, 0.5, J[n++]), mix(am.sj, am.el, 0.62, J[n++]), 7.2 * bw, '#d9a441', 1); seg(mix(am.el, am.hd, 0.55, J[n++]), mix(am.el, am.hd, 0.66, J[n++]), 6.4 * bw, '#d9a441', 1); }
        if (OF.captain && am.s === 1) seg(mix(am.sj, am.el, 0.28, J[n++]), mix(am.sj, am.el, 0.42, J[n++]), 8.8 * bw, far ? C.ad : C.a, 1); // brassard
        if (OF.suckers) { ctx.fillStyle = far ? dkc(tcol) : tcol; for (const u of [0.3, 0.55, 0.8]) { const q = mix(am.el, am.hd, u, J[n++]); circ(q[0], q[1], 1.3 * bw); ctx.fill(); } }
        if (OF.pads) { ctx.fillStyle = INK; circ(am.sj[0], am.sj[1], 6.4 * bw); ctx.fill(); ctx.fillStyle = OC('c2', far); circ(am.sj[0], am.sj[1], 5.2 * bw); ctx.fill(); }
        if (OF.epaulettes) {
          ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 1.1;
          for (const k of [-3, 0, 3]) { ctx.beginPath(); ctx.moveTo(am.sj[0] + k, am.sj[1] + 2); ctx.lineTo(am.sj[0] + k * 1.15, am.sj[1] + 6.5); ctx.stroke(); }
          ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(am.sj[0], am.sj[1], 6.2, 3.6, 0, 0, 7); ctx.fill();
          ctx.fillStyle = far ? '#9c7530' : '#e8b84a'; ctx.beginPath(); ctx.ellipse(am.sj[0], am.sj[1], 5.2, 2.7, 0, 0, 7); ctx.fill();
        }
      }
      if (!ghost && LO.bd.tattoo) { // tatouages
        ctx.strokeStyle = 'rgba(20,30,60,.75)'; ctx.lineWidth = 1.3;
        for (const u of [0.35, 0.6, 0.82]) { const q = mix(am.el, am.hd, u, J[n++]); ctx.beginPath(); ctx.moveTo(q[0] - 2.2 * bw, q[1] - 0.8); ctx.lineTo(q[0] + 2.2 * bw, q[1] + 0.8); ctx.stroke(); }
        const q = mix(am.sj, am.el, 0.7, J[n++]); ctx.beginPath(); ctx.arc(q[0], q[1], 2.1 * bw, 0.3, 4); ctx.stroke();
      }
      if (!ghost && PE.prop === 'pendulum' && am.s === 1) { // le pendule de l'hypnotiseur
        const sw = Math.sin(now * 3.4 + i) * 0.7, T2 = J[n++]; T2[0] = am.hd[0] + Math.sin(sw) * 11; T2[1] = am.hd[1] + Math.cos(sw) * 11;
        ctx.strokeStyle = '#d9a441'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(am.hd[0], am.hd[1]); ctx.lineTo(T2[0], T2[1]); ctx.stroke();
        ctx.fillStyle = INK; circ(T2[0], T2[1], 2.6); ctx.fill(); ctx.fillStyle = '#ffd23a'; circ(T2[0], T2[1], 1.8); ctx.fill();
        ctx.strokeStyle = '#7a3cff'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(T2[0], T2[1], 1, 0, 4.5); ctx.stroke();
      }
      if (!ghost && PE.prop === 'baton' && am.s === 1) { // la baguette du chef
        const dx = am.hd[0] - am.el[0], dy = am.hd[1] - am.el[1], dl = len(dx, dy) || 1, T2 = J[n++]; T2[0] = am.hd[0] + dx / dl * 10; T2[1] = am.hd[1] + dy / dl * 10;
        seg(am.hd, T2, 1.3, '#f4f1ea', 0);
      }
      ctx.fillStyle = GH || (gk ? (O.glove ? OC(O.glove, far) : far ? C.ad : C.a) : O.hand ? OC(O.hand, far) : sk);
      circ(am.hd[0], am.hd[1], gk ? 4.2 : 3.3 * Math.sqrt(bw));
      if (!ghost) { ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke(); }
      ctx.fill();
    };
    const drawTorso = () => {
      const hp = hull(tp.slice());
      ctx.beginPath(); ctx.moveTo(hp[0][0], hp[0][1]); for (let k = 1; k < hp.length; k++) ctx.lineTo(hp[k][0], hp[k][1]); ctx.closePath();
      if (!ghost) { ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.stroke(); }
      if (ghost) { ctx.fillStyle = GH; ctx.fill(); return; }
      let y0 = 1e9, y1 = -1e9, x0 = 1e9; for (const q of hp) { if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; if (q[0] < x0) x0 = q[0]; }
      if (O.torso && O.torso !== 'c1') { ctx.fillStyle = OC(O.torso); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill(); }
      else {
        const tg = ctx.createLinearGradient(x0, y0, x0 + 8, y1);
        tg.addColorStop(0, gk ? C.gl : C.jl); tg.addColorStop(0.45, jer); tg.addColorStop(1, gk ? C.gm : C.jm);
        ctx.fillStyle = tg; ctx.fill();
      }
      // ombre basse du maillot (sans masque : enveloppe de la moitié basse)
      const lo = [tp[4], tp[5], tp[6], tp[7]];
      for (let k = 0; k < 4; k++) lo.push(mix(tp[k + 4], tp[k], 0.45, J[n++]));
      const lh = hull(lo);
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.moveTo(lh[0][0], lh[0][1]); for (let k = 1; k < lh.length; k++) ctx.lineTo(lh[k][0], lh[k][1]); ctx.closePath(); ctx.fill();
      // ----- motifs de la tenue, dessinés sur la face visible du torse -----
      const front = fy >= -0.15, sF = front ? 1 : -1, hw0 = shW + 1.4, hw1 = BU[3] + spread * 0.5;
      const face = (u, lr) => { const cf = scF * (1 - u), cd = scD + (hipD - scD) * u, dz = 5 * (1 - u) + 4.2 * u, w = hw0 * (1 - u) + hw1 * u;
        return (u < 0.5 ? Pt : Ph)(cf + sF * dz * cl, cd + sF * dz * sl, lr * w, J[n++]); };
      const line = (a, b, col, lw) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); };
      const poly = (pts, col) => { ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); };
      ctx.lineCap = 'butt';
      if (OF.hoops) for (const u of [0.12, 0.36, 0.6, 0.84]) line(face(u, -1), face(u, 1), C.s, 3.4);
      if (OF.hivis) {
        if (front) { poly([face(0.03, -1), face(0.03, -0.32), face(0.96, -0.28), face(0.96, -1)], '#ff7a00'); poly([face(0.03, 1), face(0.03, 0.32), face(0.96, 0.28), face(0.96, 1)], '#ff7a00'); }
        else poly([face(0.03, -1), face(0.03, 1), face(0.96, 1), face(0.96, -1)], '#ff7a00');
        for (const u of [0.5, 0.78]) { line(face(u, -1), face(u, front ? -0.3 : 1), '#dfe3e8', 2.2); if (front) line(face(u, 0.3), face(u, 1), '#dfe3e8', 2.2); }
      }
      if (OF.ropebelt) { line(face(0.88, -1), face(0.88, 1), tcol, 2.4); line(face(0.88, 0.3), face(1.12, 0.38), tcol, 1.6); }
      if (OF.xstraps) { line(face(0.02, -0.85), face(0.98, 0.75), '#5b3a1e', 2.8); line(face(0.02, 0.85), face(0.98, -0.75), '#5b3a1e', 2.8); const q = face(0.5, 0); ctx.fillStyle = '#d9a441'; circ(q[0], q[1], 1.8); ctx.fill(); }
      if (OF.chestband) { line(face(0.3, -1), face(0.3, 1), tcol, 4.6); line(face(0.4, -1), face(0.4, 1), C.a, 1.3); }
      if (OF.diamonds) for (let r = 0; r < 3; r++) for (let c2 = 0; c2 < 3; c2++) {
        const q = face(0.18 + r * 0.28, -0.62 + c2 * 0.62);
        poly([[q[0], q[1] - 4], [q[0] + 2.9, q[1]], [q[0], q[1] + 4], [q[0] - 2.9, q[1]]], (r + c2) % 2 ? '#f4f1ea' : C.s);
      }
      if (OF.tiger) for (const u of [0.1, 0.32, 0.54, 0.76]) for (const sd of [-1, 1]) line(face(u, sd), face(u + 0.13, sd * 0.3), '#111', 2);
      if (OF.padded) { for (const u of [0.2, 0.4, 0.6, 0.8]) line(face(u, -1), face(u, 1), 'rgba(0,0,0,.35)', 1.6); if (front) line(face(0.02, 0), face(0.98, 0), '#1c1c20', 2.2); } // gilet matelassé
      if (OF.zigzag) for (const [u, col] of [[0.22, '#ff2fa0'], [0.48, '#33e0ff'], [0.74, '#ffe14a']]) { // maillot fluo façon années 90
        ctx.strokeStyle = col; ctx.lineWidth = 2.6; ctx.beginPath(); for (let k = 0; k <= 6; k++) { const q = face(u + (k % 2 ? 0.08 : -0.04), -1 + k / 3); if (k) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); } ctx.stroke();
      }
      if (OF.apron && front) { // tablier de boucher (taché)
        poly([face(0.08, -0.62), face(0.08, 0.62), face(1.1, 0.8), face(1.1, -0.8)], '#ece8e0');
        ctx.fillStyle = 'rgba(150,10,14,.75)'; for (const [u, l, r] of [[0.35, -0.25, 1.6], [0.6, 0.3, 2.2], [0.82, -0.4, 1.3], [0.45, 0.45, 0.9]]) { const q = face(u, l); circ(q[0], q[1], r); ctx.fill(); }
        line(face(0.08, -0.62), face(-0.1, -0.2), '#ece8e0', 1.3); line(face(0.08, 0.62), face(-0.1, 0.2), '#ece8e0', 1.3);
      }
      if (OF.spiral && front) { // spirale hypnotique sur la poitrine
        const q = face(0.38, 0); ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 1.1; ctx.beginPath();
        const a0 = now * 4 + i; for (let k = 0; k <= 26; k++) { const a = a0 + k * 0.5, r = 0.25 * k * 0.2 + 0.3; ctx.lineTo(q[0] + Math.cos(a) * r * 2.4, q[1] + Math.sin(a) * r * 2.4); } ctx.stroke();
      }
      if (OF.catcollar && front) { const q = face(0.04, 0); line(face(0.04, -0.5), face(0.04, 0.5), '#b3121c', 2); ctx.fillStyle = '#ffd23a'; circ(q[0], q[1] + 1.6, 1.3); ctx.fill(); } // collier à grelot
      if (OF.belt) { line(face(0.92, -1), face(0.92, 1), '#3a2414', 3.6); if (front) { const q = face(0.92, 0); ctx.fillStyle = '#d9a441'; ctx.fillRect(q[0] - 2.2, q[1] - 1.8, 4.4, 3.6); } }
      if (OF.torn) for (const l of [-0.75, -0.25, 0.25, 0.75]) { const q = face(0.99, l); poly([[q[0] - 1.8, q[1] + 0.5], [q[0] + 1.8, q[1] + 0.5], [q[0], q[1] - 2.8]], 'rgba(0,0,0,.6)'); }
      if (OF.bandolier) { const a = face(0.02, -0.85), b = face(0.97, 0.8); line(a, b, '#4a3020', 3.4); ctx.fillStyle = '#d9a441'; for (let t = 0.12; t < 0.95; t += 0.13) { const q = mix(a, b, t, J[n++]); circ(q[0], q[1], 1.15); ctx.fill(); } }
      if (front) {
        if (OF.vcollar) { ctx.strokeStyle = C.a; ctx.lineWidth = 1.5; const a = face(0, -0.42), b = face(0.2, 0), c = face(0, 0.42); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
        if (OF.bib) poly([face(0.03, -0.55), face(0.03, 0.55), face(0.64, 0)], '#f4f1ea');
        if (OF.tux) {
          poly([face(0, -0.36), face(0, 0.36), face(0.74, 0)], '#f4f1ea');
          const q = face(0.06, 0); poly([[q[0], q[1]], [q[0] - 3.2, q[1] - 1.6], [q[0] - 3.2, q[1] + 1.6]], tcol); poly([[q[0], q[1]], [q[0] + 3.2, q[1] - 1.6], [q[0] + 3.2, q[1] + 1.6]], tcol);
          ctx.fillStyle = INK; for (const u of [0.3, 0.48]) { const b2 = face(u, 0); circ(b2[0], b2[1], 0.7); ctx.fill(); }
        }
        if (OF.bowtie) { const q = face(0.05, 0); poly([[q[0], q[1]], [q[0] - 3, q[1] - 1.5], [q[0] - 3, q[1] + 1.5]], '#d9a441'); poly([[q[0], q[1]], [q[0] + 3, q[1] - 1.5], [q[0] + 3, q[1] + 1.5]], '#d9a441'); }
        if (OF.goldtrim) { ctx.fillStyle = '#d9a441'; for (const u of [0.3, 0.5, 0.7]) { const b2 = face(u, 0.08); circ(b2[0], b2[1], 0.9); ctx.fill(); } }
        if (OF.num10) { const q = face(0.5, 0.05); ctx.font = '9px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = C.s; ctx.fillText('10', q[0], q[1]); }
      }
      if (OF.tux) line(face(0.86, -1), face(0.86, 1), tcol, 3.4); // ceinture de smoking aux couleurs de l'équipe
      if (OF.goldtrim) line(face(0.02, -0.55), face(0.02, 0.55), '#d9a441', 2.2);
      ctx.lineCap = 'round';
      if (OF.leather) { // gilet de cuir ouvert sur le maillot, clous sur les épaules
        ctx.fillStyle = '#211915'; ctx.beginPath(); ctx.moveTo(hp[0][0], hp[0][1]); for (let k = 1; k < hp.length; k++) ctx.lineTo(hp[k][0], hp[k][1]); ctx.closePath(); ctx.fill();
        const a1 = Pt(scF + 4 * cl, scD + 1 + 4 * sl, 2.6, J[n++]), a2 = Pt(scF + 4 * cl, scD + 1 + 4 * sl, -2.6, J[n++]);
        const b1 = Ph(3.5 * cl, hipD - 1 + 3.5 * sl, 3.2, J[n++]), b2 = Ph(3.5 * cl, hipD - 1 + 3.5 * sl, -3.2, J[n++]);
        if (fy >= -0.15) { ctx.fillStyle = tcol; ctx.beginPath(); ctx.moveTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b1[0], b1[1]); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = '#c9ccd2';
        for (const ll of [-1, 1]) for (const u of [0.25, 0.55, 0.85]) { const q = Pt(scF + 2 * cl, scD + 1.5 + 2 * sl, ll * (shW - 1.5) * u + ll * 1.2, J[n++]); if (q[2] > -2) { circ(q[0], q[1], 0.9); ctx.fill(); } }
      }
      if (O.sash !== false) { // bande diagonale (écharpe) sur la face visible
        const T = J[n++], U = J[n++];
        Pt(scF + sF * 4.6 * cl, scD + 1.5 + sF * 4.6 * sl, 7.5, T); Ph(sF * 3.9 * cl, hipD - 1.5 + sF * 3.9 * sl, -5, U);
        ctx.lineCap = 'butt';
        ctx.strokeStyle = O.sashC || C.s; ctx.lineWidth = 4.2; ctx.beginPath(); ctx.moveTo(T[0], T[1]); ctx.lineTo(U[0], U[1]); ctx.stroke();
        ctx.strokeStyle = O.sashC ? '#fff2c4' : C.a; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(T[0] + 2.1, T[1]); ctx.lineTo(U[0] + 2.1, U[1]); ctx.stroke();
        ctx.lineCap = 'round';
      }
      const dirt = app.drafting ? 0 : DIRT[i] || 0;
      if (dirt > 0.12) { // boue et herbe : chaque chute laisse sa trace
        const c1 = P(scF * 0.25 + 3.8 * cl * (front ? 1 : -1), scD * 0.25 + hipD * 0.75, -3.5, J[n++]), c2 = P(scF * 0.5 + 4 * cl * (front ? 1 : -1), scD * 0.5 + hipD * 0.5, 4.5, J[n++]);
        ctx.fillStyle = `rgba(78,58,32,${(0.25 + 0.4 * dirt).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(c1[0], c1[1], 3.4 + 2 * dirt, 2.2 + dirt, 0.4, 0, 7); ctx.fill();
        if (dirt > 0.4) { ctx.fillStyle = `rgba(52,82,34,${(0.2 + 0.35 * dirt).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(c2[0], c2[1], 2.6 + 1.5 * dirt, 1.6, -0.5, 0, 7); ctx.fill(); }
      }
      const lv = GORE ? BLV(p.dmg) : 0;
      if (lv >= 2) { // maillot taché de sang
        const c1 = P(scF * 0.55 + 4.4 * cl * (front ? 1 : -1), scD * 0.55 + hipD * 0.45, 2.5, J[n++]);
        ctx.fillStyle = 'rgba(120,6,8,.85)'; circ(c1[0], c1[1], 2.6 + lv * 0.6); ctx.fill();
        circ(c1[0] + 2.2, c1[1] + 3.2, 1.3); ctx.fill();
        if (lv >= 3) { const c2 = P(scF * 0.3, scD * 0.3 + hipD * 0.7, -5, J[n++]); circ(c2[0], c2[1], 3); ctx.fill(); circ(c2[0] - 1.5, c2[1] + 3.5, 1.4); ctx.fill(); }
      }
      if (fy < -0.3) { // numéro dans le dos
        const b = P(scF * 0.5 - 4.2 * cl, (scD + hipD) * 0.5 - 4 * sl, 0, J[n++]);
        ctx.save(); ctx.translate(b[0], b[1]); ctx.scale(-fy, 1);
        ctx.font = '11px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = OF.hivis ? '#111' : O.torso && O.torso !== 'c1' ? tcol : C.s; ctx.fillText(String(O.num || 1), 0, 0); ctx.restore();
      }
    };
    const drawHead = () => {
      const hr = 7, jw = Pr(2.4, 3.6, 0, J[n++]);
      const jx = hc[0] + jw[0], jy = hc[1] + jw[1] - 0;
      const H = (f, d, l) => { const o = Pr(f, d, l, J[n++]); o[0] += hc[0]; o[1] += hc[1]; return o; };
      const hs = LO.hair, hair = LO.hc, F = LO.f, away = fy < -0.15;
      // cou
      seg(nk, hc, 6.4, GH || skinD, ghost);
      if (ghost) { ctx.fillStyle = GH; circ(hc[0], hc[1], hr); ctx.fill(); return; }
      // ce qui pend derrière la tête : cheveux longs, dreads, afro, capuche (devant si on le voit de dos)
      const backHair = () => {
        if (hs === 'long') { for (const l of [-4, 0, 4]) seg(H(-3, -4, l), H(-7.5, 10, l * 1.15), 6, hair, 0); }
        else if (hs === 'dreads') { for (const l of [-5.5, -2.8, 0, 2.8, 5.5]) { const a = H(-2, -5, l), b = H(-6.5, 10.5, l * 1.25); seg(a, b, 2.8, hair, 0); ctx.fillStyle = '#c99a2e'; circ(b[0], b[1], 1.3); ctx.fill(); } }
        else if (hs === 'afro') { const c = H(-1.8, -4.6, 0); ctx.fillStyle = INK; circ(c[0], c[1], 11.6); ctx.fill(); ctx.fillStyle = hair; circ(c[0], c[1], 10.4); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.07)'; circ(c[0] - 3, c[1] - 3.5, 4.5); ctx.fill(); }
        else if (hs === 'hood') { const c = H(-2, -1, 0); ctx.fillStyle = INK; circ(c[0], c[1], 10.4); ctx.fill(); ctx.fillStyle = '#16151b'; circ(c[0], c[1], 9.2); ctx.fill(); seg(H(-5, 3, 0), H(-7, 11, 0), 9, '#16151b', 0); }
      };
      if (!away) backHair();
      // contour (crâne + mâchoire carrée) puis remplissage
      ctx.fillStyle = INK; circ(hc[0], hc[1], hr + 1.3); ctx.fill(); circ(jx, jy, 5 + 1.3); ctx.fill();
      ctx.fillStyle = skin; circ(hc[0], hc[1], hr); ctx.fill(); circ(jx, jy, 5); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.16)'; circ(hc[0] - 2.4, hc[1] - 2.8, 2.8); ctx.fill();
      ctx.save(); circ(hc[0], hc[1], hr + 0.2); ctx.moveTo(jx + 5, jy); ctx.arc(jx, jy, 5, 0, 7); ctx.clip();
      if (F.skull) { ctx.fillStyle = 'rgba(236,231,222,.93)'; circ(hc[0], hc[1], hr + 1); ctx.fill(); circ(jx, jy, 5.5); ctx.fill(); } // tête de mort peinte
      // ombre du visage (côté opposé aux projecteurs)
      ctx.fillStyle = 'rgba(0,0,0,.18)'; circ(hc[0] + 3, hc[1] + 4, hr); ctx.fill();
      const cap = (f, d, r, col, a) => { const c = Pr(f, d, 0, J[n++]); ctx.fillStyle = col; ctx.globalAlpha = a || 1; circ(hc[0] + c[0], hc[1] + c[1], r); ctx.fill(); ctx.globalAlpha = 1; };
      if (hs === 'short' || hs === 'spiky' || hs === 'long' || hs === 'dreads' || hs === 'afro') cap(-1.6, -2.1, 6.1, hair);
      else if (hs === 'shaved') cap(-1.6, -2.1, 6.1, hair, 0.45);
      else if (hs === 'slick') { cap(-1.2, -2.4, 6.3, hair); }
      else if (hs === 'crest' || hs === 'mohawk') cap(-1.6, -2.1, 5.4, hair, hs === 'mohawk' ? 0.35 : 0.5);
      else if (hs === 'hood') cap(-2.4, -3.6, 6.8, '#16151b');
      else if (hs === 'hardhat') cap(-0.6, -3.7, 6.5, '#ffc21a');
      else if (hs === 'scrum') cap(-1.2, -2.8, 6.6, '#26262c');
      const HT = PE.hat;
      if (HT === 'horns') cap(-0.4, -3.6, 7.2, '#8a8d96');            // casque viking
      else if (HT === 'bikercap') cap(-0.8, -3.9, 6.9, '#1e1714');    // casquette de biker
      else if (HT === 'bandana') cap(-1, -3.2, 6.9, '#b3121c');       // bandana de pirate
      else if (HT === 'jester') cap(-0.8, -3.8, 6.9, tcol);           // bonnet de bouffon
      else if (HT === 'army') cap(-0.4, -3.4, 7.3, '#4b5320');        // casque militaire
      else if (HT === 'turban') cap(-0.6, -3.4, 7.4, '#4a1d78');      // turban
      if (F.warpaint) { const a = Pr(5.5, -0.6, -6, J[n++]), b = Pr(5.5, -0.6, 6, J[n++]); ctx.strokeStyle = 'rgba(40,100,255,.75)'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(hc[0] + a[0], hc[1] + a[1]); ctx.lineTo(hc[0] + b[0], hc[1] + b[1]); ctx.stroke(); }
      if (F.sideburns) for (const l of [-1, 1]) { const c = Pr(1.5, 1.2, l * 6, J[n++]); if (c[2] > -2) { ctx.fillStyle = hair; circ(hc[0] + c[0], hc[1] + c[1], 1.8); ctx.fill(); } }
      if (F.beard || F.braidbeard) { const c = Pr(2.6, 4.4, 0, J[n++]); if (c[2] > -2) { ctx.fillStyle = hair; ctx.globalAlpha = 0.92; circ(hc[0] + c[0], hc[1] + c[1], 3.9); ctx.fill(); ctx.globalAlpha = 1; } }
      if (F.goatee) { const c = Pr(5.4, 5.6, 0, J[n++]); if (c[2] > -2) { ctx.fillStyle = hair; circ(hc[0] + c[0], hc[1] + c[1], 1.9); ctx.fill(); } }
      ctx.restore();
      if (away) backHair();
      // par-dessus : crêtes, piques, casques, bandeaux, couronne
      if (hs === 'crest' || hs === 'mohawk') {
        ctx.strokeStyle = INK; ctx.lineWidth = 4.6; ctx.beginPath();
        const pts = []; for (let k = 0; k <= 5; k++) { const a = -0.5 + k * 0.62; pts.push(H(Math.cos(a + 1.2) * 7.2, -Math.sin(a + 1.2) * 7.4 - 0.5, 0)); }
        ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.stroke();
        ctx.strokeStyle = hair; ctx.lineWidth = 2.6; ctx.stroke();
      }
      if (hs === 'spiky') { // coiffure de héros de manga
        ctx.fillStyle = hair; ctx.strokeStyle = INK; ctx.lineWidth = 1.2;
        for (const [bf, bd, bl, tf, td, tl] of [[-1, -6.4, 0, -2, -12.5, 0], [-4, -5, 3, -8, -9.5, 6], [-4, -5, -3, -8, -9.5, -6], [1.5, -6, 3, 3, -11, 6], [1.5, -6, -3, 3, -11, -6], [-6, -2, 0, -12, -4, 0], [3.5, -5, 0, 7.5, -9, 0]]) {
          const b1 = H(bf, bd, bl - 2.4), b2 = H(bf, bd, bl + 2.4), t = H(tf, td, tl);
          ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(t[0], t[1]); ctx.lineTo(b2[0], b2[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (hs === 'slick') { const a = H(2.5, -6, -2), b = H(-5, -5, 2.5); ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      const loop = (d, r, col, lw, front) => { // anneau autour de la tête (bandeau, bord de casque)
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); let on = false;
        for (let k = 0; k <= 16; k++) {
          const a = k / 16 * Math.PI * 2, q = H(Math.cos(a) * r, d, Math.sin(a) * r);
          if (q[2] >= (front ? 0 : -0.5)) { if (on) ctx.lineTo(q[0], q[1]); else { ctx.moveTo(q[0], q[1]); on = true; } } else on = false;
        }
        ctx.stroke();
      };
      if (hs === 'hardhat') { loop(-2.3, 8.2, INK, 3.4); loop(-2.3, 8.2, '#e0a300', 2); const a = H(-3, -7.6, 0), b = H(4, -6.6, 0); seg(a, b, 1.8, '#ffd84a', 0); }
      if (hs === 'scrum') { loop(-2.6, 7.2, '#3a3a42', 2.2); for (const l of [-1, 1]) { const q = H(0, 0.5, l * 6.8); if (q[2] > -1.5) { ctx.fillStyle = INK; circ(q[0], q[1], 3); ctx.fill(); ctx.fillStyle = '#3a3a42'; circ(q[0], q[1], 2.2); ctx.fill(); } } }
      if (LO.band) { loop(-2.8, 6.6, LO.band === 'a' ? C.a : C.s, 2.2); if (hs === 'spiky') { const a = H(-6, -2.5, 0), b = H(-10.5, 3, 0); seg(a, b, 2.2, LO.band === 'a' ? C.a : C.s, 0); } }
      if (F.crown) { // petite couronne dorée : la classe
        const p0 = H(-1, -6.6, -3.2), p1 = H(-1, -10.4, -3.4), p2 = H(-1, -8.2, -1.6), p3 = H(-1, -11.2, 0), p4 = H(-1, -8.2, 1.6), p5 = H(-1, -10.4, 3.4), p6 = H(-1, -6.6, 3.2);
        ctx.fillStyle = '#ffd23a'; ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath();
        for (const q of [p0, p1, p2, p3, p4, p5, p6]) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.fill(); ctx.stroke();
      }
      if (HT) { // couvre-chefs : chacun se reconnaît de loin
        const vis = q => q[2] > -1.2;
        const stk = (pts, w, col) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); if (pts.length === 3) ctx.quadraticCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1]); else ctx.lineTo(pts[1][0], pts[1][1]);
          ctx.strokeStyle = INK; ctx.lineWidth = w + 2; ctx.stroke(); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke(); };
        const tri = (a2, b2, c2, col) => { ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(c2[0], c2[1]); ctx.closePath(); ctx.fillStyle = col; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke(); };
        switch (HT) {
          case 'horns': {
            loop(-2.4, 7.5, INK, 3.2); loop(-2.4, 7.5, '#5d6068', 1.8);
            for (const l of [-1, 1]) { const a2 = H(-0.5, -4.2, l * 6.2), b2 = H(-0.2, -9, l * 11.5), c2 = H(-1.4, -15, l * 10); stk([a2, b2, c2], 2.9, '#efe6cf'); }
            const n1 = H(6.4, -4.2, 0), n2 = H(6.8, 1.2, 0); if (vis(n1)) seg(n1, n2, 1.6, '#5d6068', 0);
            break;
          }
          case 'bullhorns':
            for (const l of [-1, 1]) { const a2 = H(-0.5, -5.2, l * 6.5), b2 = H(0.6, -5.2, l * 14.5), c2 = H(2.2, -11, l * 16.5); stk([a2, b2, c2], 3.2, '#e2d6b8'); const t2 = H(2.1, -10, l * 16.4); seg(t2, c2, 2.2, '#3a3026', 0); }
            break;
          case 'tophat': {
            const c2 = H(-0.4, -6.2, 0), t2 = H(-0.6, -17.5, 0), hw2 = 5.6;
            ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(c2[0], c2[1], 10.4, 3.9, 0, 0, 7); ctx.fill();
            ctx.fillStyle = '#17171c'; ctx.beginPath(); ctx.ellipse(c2[0], c2[1], 9.4, 3.1, 0, 0, 7); ctx.fill();
            ctx.beginPath(); ctx.moveTo(c2[0] - hw2, c2[1]); ctx.lineTo(t2[0] - hw2, t2[1]); ctx.lineTo(t2[0] + hw2, t2[1]); ctx.lineTo(c2[0] + hw2, c2[1]); ctx.closePath();
            ctx.fillStyle = '#17171c'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
            ctx.fillStyle = tcol; ctx.fillRect(c2[0] - hw2, c2[1] - 3.6, hw2 * 2, 2.4);
            ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fillRect(t2[0] - hw2 + 1.2, t2[1] + 1, 1.4, c2[1] - t2[1] - 5);
            ctx.fillStyle = '#26262d'; ctx.beginPath(); ctx.ellipse(t2[0], t2[1], hw2, 1.8, 0, 0, 7); ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
            break;
          }
          case 'jester': {
            const tips = [[-4.5, -12.5, -9.5], [-2.2, -16, 0], [-4.5, -12.5, 9.5]], cols = [C.s, tcol, C.s];
            for (let k = 0; k < 3; k++) {
              const [tf, td, tl] = tips[k], a2 = H(-0.6, -6, tl * 0.35 - 3.4), b2 = H(-0.6, -6, tl * 0.35 + 3.4), m2 = H(tf * 0.5, td - 2.5, tl * 0.8), t2 = H(tf, td, tl);
              ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.quadraticCurveTo(m2[0] - 2, m2[1], t2[0], t2[1]); ctx.quadraticCurveTo(m2[0] + 2, m2[1], b2[0], b2[1]); ctx.closePath();
              ctx.fillStyle = cols[k]; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.stroke();
              ctx.fillStyle = '#ffd23a'; circ(t2[0], t2[1], 1.7); ctx.fill(); ctx.stroke();
            }
            loop(-3, 7.2, INK, 3); loop(-3, 7.2, '#ffd23a', 1.6);
            break;
          }
          case 'catears': // oreilles rondes de tigre, bout noir
            for (const l of [-1, 1]) {
              const b1 = H(-1.4, -5.6, l * 2.4), b2 = H(-1.4, -5, l * 6.8), t2 = H(-1.8, -11, l * 5.4), m2 = mix(b1, b2, 0.5, J[n++]);
              ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.quadraticCurveTo(t2[0] - 3.4 * l, t2[1] - 1.5, t2[0], t2[1]); ctx.quadraticCurveTo(t2[0] + 2.6 * l, t2[1] + 1, b2[0], b2[1]); ctx.closePath();
              ctx.fillStyle = '#ff7a00'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
              const i2 = mix(m2, t2, 0.55, J[n++]); ctx.fillStyle = '#ffe2c0'; ctx.beginPath(); ctx.ellipse(i2[0], i2[1] + 0.6, 1.3, 1.9, 0, 0, 7); ctx.fill();
              ctx.fillStyle = INK; circ(t2[0], t2[1] + 0.6, 1.2); ctx.fill();
            }
            break;
          case 'foxears':
            for (const l of [-1, 1]) {
              const b1 = H(-1, -5.6, l * 1.8), b2 = H(-1, -5.2, l * 6.4), t2 = H(-1.4, -13.2, l * 5.4);
              tri(b1, b2, t2, '#d4561e'); tri(mix(b1, t2, 0.15, J[n++]), mix(b2, t2, 0.15, J[n++]), mix(b1, t2, 0.7, J[n++]), '#f4e6d8');
              ctx.fillStyle = '#2a1a10'; circ(t2[0], t2[1] + 1.2, 1.3); ctx.fill();
            }
            break;
          case 'bikercap': {
            loop(-2.6, 7.1, '#3a2c22', 1.5);
            const a2 = H(5.4, -3.7, -4.6), b2 = H(5.4, -3.7, 4.6); if (vis(a2) || vis(b2)) seg(a2, b2, 2.4, '#100c0a', 0);
            const q = H(6.2, -5.4, 0); if (vis(q)) { ctx.fillStyle = '#d9a441'; circ(q[0], q[1], 1.3); ctx.fill(); }
            break;
          }
          case 'bandana': {
            const a2 = H(-6.4, -2.4, 0); seg(a2, H(-11, 2.8, -2.6), 2.6, '#b3121c', 0); seg(a2, H(-10.2, 4.4, 2.8), 2.4, '#b3121c', 0);
            ctx.fillStyle = '#f4f1ea'; for (const [f2, d2, l2] of [[2.5, -6, -2.2], [-1, -6.6, 2.6], [4.4, -4.4, 3.2], [-3.5, -5, -3.5]]) { const q = H(f2, d2, l2); if (vis(q)) { circ(q[0], q[1], 0.8); ctx.fill(); } }
            break;
          }
          case 'army': { // casque du Bunker : bord, filet, jugulaire
            loop(-2.2, 8.4, INK, 3.6); loop(-2.2, 8.4, '#3c4219', 2.2);
            ctx.strokeStyle = 'rgba(20,24,10,.55)'; ctx.lineWidth = 0.8; for (const l of [-4, 0, 4]) { const a2 = H(2, -6.4, l), b2 = H(-4, -5.6, l); if (vis(a2)) { ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke(); } }
            for (const l of [-1, 1]) { const a2 = H(0, -1.5, l * 7.2), b2 = H(3.6, 6.2, l * 4); if (vis(a2)) seg(a2, b2, 1, '#2a2e12', 0); }
            break;
          }
          case 'blackcat': // oreilles de chat noir
            for (const l of [-1, 1]) {
              const b1 = H(-1, -5.8, l * 2), b2 = H(-1, -5.2, l * 6.6), t2 = H(-1.6, -12.4, l * 5.8);
              tri(b1, b2, t2, '#121216'); tri(mix(b1, t2, 0.2, J[n++]), mix(b2, t2, 0.2, J[n++]), mix(b1, t2, 0.68, J[n++]), '#ff8fb0');
            }
            break;
          case 'turban': { // turban violet et sa pierre précieuse
            loop(-2.6, 7.6, INK, 3.4); loop(-2.6, 7.6, '#6a2fae', 2.2); loop(-4.8, 6.6, '#6a2fae', 1.6);
            const q = H(6.6, -4.6, 0); if (vis(q)) { ctx.fillStyle = INK; circ(q[0], q[1], 2.4); ctx.fill(); ctx.fillStyle = '#33e0ff'; circ(q[0], q[1], 1.7); ctx.fill(); }
            const p2 = H(4.6, -8.6, 0); if (vis(p2)) seg(q, p2, 1.4, '#f4f1ea', 0);
            break;
          }
          case 'goggles': {
            loop(-3.8, 7.15, '#1e1e24', 2.2);
            for (const l of [-1, 1]) { const q = H(5.2, -4.6, l * 2.7); if (q[2] > -0.6) { ctx.fillStyle = INK; circ(q[0], q[1], 2.6); ctx.fill(); ctx.fillStyle = '#53d0e6'; circ(q[0], q[1], 1.9); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.7)'; circ(q[0] - 0.6, q[1] - 0.6, 0.6); ctx.fill(); } }
            break;
          }
        }
      }
      if (F.eyemask) { const a = H(5.2, -0.7, -6.4), b = H(5.2, -0.7, 6.4); ctx.strokeStyle = INK; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } // loup noir
      // visage : yeux plissés, sourcils froncés
      const ko = eyes === 0, blv = BLV(p.dmg);
      for (const s of [-1, 1]) {
        const e = H(5.0, -0.5, s * 2.5);
        if (e[2] < -0.3) continue;
        if (blv >= 2 && (s === 1 || blv >= 3) && !F.shades && !F.skull) { // œil au beurre noir
          ctx.fillStyle = 'rgba(64,18,58,.62)'; ctx.beginPath(); ctx.ellipse(e[0], e[1] + 0.4, 2.7, 2.1, 0, 0, 7); ctx.fill();
          if (blv >= 3 && s === 1 && !ko) { ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(e[0] - 1.5, e[1] + 0.2); ctx.lineTo(e[0] + 1.5, e[1] + 0.4); ctx.stroke(); continue; } // fermé, gonflé
        }
        if (ko) {
          ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(e[0] - 1.4, e[1] - 1.2); ctx.lineTo(e[0] + 1.4, e[1] + 1.2); ctx.moveTo(e[0] + 1.4, e[1] - 1.2); ctx.lineTo(e[0] - 1.4, e[1] + 1.2); ctx.stroke();
          continue;
        }
        if (F.shades) continue;
        if (F.spiral) { // yeux hypnotiques
          ctx.fillStyle = '#f2ede4'; circ(e[0], e[1], 1.7); ctx.fill(); ctx.strokeStyle = '#7a3cff'; ctx.lineWidth = 0.6; ctx.beginPath();
          for (let k = 0; k <= 10; k++) { const a = now * 9 * s + k * 0.7, r = 0.15 * k; ctx.lineTo(e[0] + Math.cos(a) * r, e[1] + Math.sin(a) * r); } ctx.stroke();
          continue;
        }
        if (F.patch && s === 1) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(e[0], e[1] + 0.2, 2.3, 1.9, 0, 0, 7); ctx.fill(); const q = H(0, -5.5, 6.8); ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); continue; }
        if (F.skull) { ctx.fillStyle = INK; circ(e[0], e[1] + 0.2, 2.3); ctx.fill(); ctx.fillStyle = '#ff2a1e'; circ(e[0] + fx * 0.5, e[1] + 0.2, 0.75); ctx.fill(); continue; }
        ctx.fillStyle = '#f2ede4'; ctx.beginPath(); ctx.ellipse(e[0], e[1], 1.55, 0.95, 0, 0, 7); ctx.fill();
        ctx.fillStyle = INK; circ(e[0] + fx * 0.6, e[1] + 0.1, 0.75); ctx.fill();
        const b1 = H(5.7, -1.7, s * 0.8), b2 = H(4.6, -3.5, s * 4.1);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
      if (F.shades) { const a = H(5.4, -0.5, -2.6), b = H(5.4, -0.5, 2.6); for (const q of [a, b]) if (q[2] > -0.6) { ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(q[0], q[1], 2.2, 1.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; circ(q[0] - 0.7, q[1] - 0.5, 0.5); ctx.fill(); } if (a[2] > -0.6 && b[2] > -0.6) { ctx.strokeStyle = INK; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      if (F.skull) { const q = H(6.6, 1.4, 0); if (q[2] > -0.5) { ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(q[0] - 1, q[1] + 0.8); ctx.lineTo(q[0] + 1, q[1] + 0.8); ctx.lineTo(q[0], q[1] - 0.8); ctx.closePath(); ctx.fill(); } }
      if (F.stripes) for (const l of [-1, 1]) { ctx.strokeStyle = INK; ctx.lineWidth = 1.1; for (const dd of [0.6, 2.4]) { const a = H(5.2, dd, l * 3.4), b = H(4.4, dd + 0.6, l * 5.6); if (a[2] > -0.4) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } } }
      if (F.whiskers) for (const l of [-1, 1]) { ctx.strokeStyle = 'rgba(20,20,20,.8)'; ctx.lineWidth = 0.6; for (const dd of [-0.6, 0.6]) { const a = H(6.4, 2.6 + dd, l * 1.6), b = H(5, 2.2 + dd * 2.2, l * 7.4); if (a[2] > -0.4) { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } } }
      if (F.scar) { const a = H(5.6, -3.6, -3.6), b = H(5.5, 2.4, -1.6); if (a[2] > -0.4) { ctx.strokeStyle = '#7a2a22'; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      if (F.tape) { const a = H(6.7, 0.8, -1.8), b = H(6.7, 0.8, 1.8); if (a[2] > -0.5) { ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } }
      const m = H(5.8, 3.7, 0);
      if (F.moustache && m[2] > -0.5) { const a = H(6.2, 5.8, -2.8), b = H(6.3, 2.7, -2.4), c = H(6.3, 2.7, 2.4), d = H(6.2, 5.8, 2.8); ctx.strokeStyle = hair; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); }
      if (F.nosering) { const q = H(6.9, 2.3, 0); if (q[2] > -0.5) { ctx.strokeStyle = '#ffd23a'; ctx.lineWidth = 0.8; circ(q[0], q[1] + 0.6, 0.9); ctx.stroke(); } }
      if (F.braidbeard) { const a = H(5.2, 7.5, 0), b = H(5.8, 12.5, 0); seg(a, b, 2.4, hair, 0); ctx.fillStyle = '#c9a23a'; circ(b[0], b[1], 1.2); ctx.fill(); }
      if (m[2] > -0.5) {
        if (mouth) {
          ctx.fillStyle = '#2a0608'; ctx.beginPath(); ctx.ellipse(m[0], m[1] + 0.4, 1.9, 1.5, 0, 0, 7); ctx.fill();
          ctx.fillStyle = '#f2ede4'; ctx.fillRect(m[0] - 1.5, m[1] - 0.9, 3, 0.8);
        } else {
          const a = H(5.5, 3.6, -1.7), b = H(5.5, 3.6, 1.7);
          ctx.strokeStyle = INK; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      // bosses : pommette enflée, front tuméfié
      if (blv >= 2) {
        const q = H(5.2, -4.4, -2.6), c = H(5.3, 1.2, 3.6);
        if (q[2] > -0.6) { ctx.fillStyle = shade(LO.sk, 0.78); circ(q[0], q[1], 1.9 + 0.5 * (blv - 2)); ctx.fill(); ctx.fillStyle = 'rgba(90,30,70,.35)'; circ(q[0], q[1], 1.4); ctx.fill(); }
        if (blv >= 3 && c[2] > -0.6) { ctx.fillStyle = 'rgba(80,24,60,.45)'; ctx.beginPath(); ctx.ellipse(c[0], c[1], 2.2, 1.8, 0, 0, 7); ctx.fill(); }
      }
      // blessures au visage : nez qui saigne, arcade ouverte, visage en sang
      const lv = blv;
      if (lv >= 1 && !ghost && GORE) {
        ctx.strokeStyle = '#a30c10'; ctx.lineCap = 'round';
        const n1 = H(6.4, 1.6, 0.6), n2 = H(6.2, 4.6 + lv * 0.6, 0.6);
        if (n1[2] > -0.5) { ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(n1[0], n1[1]); ctx.lineTo(n2[0], n2[1]); ctx.stroke(); }
        if (lv >= 2) {
          const c1 = H(5.4, -2.6, 2.6), c2 = H(5.0, 0.4, 3.4);
          if (c1[2] > -0.5) { ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(c1[0] - 1.2, c1[1] - 0.6); ctx.lineTo(c1[0] + 1.2, c1[1] + 0.6); ctx.stroke(); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); }
        }
        if (lv >= 3) {
          const c3 = H(4.6, 2.2, -2.2);
          if (c3[2] > -1) { ctx.fillStyle = 'rgba(150,8,12,.75)'; circ(c3[0], c3[1], 2.3); ctx.fill(); }
          const c4 = H(-2, -4.5, 3);
          ctx.fillStyle = 'rgba(150,8,12,.6)'; circ(c4[0], c4[1], 1.8); ctx.fill();
        }
      }
    };
    if (!ghost) { // trajectoire de la main / du pied qui frappe (pour la traînée)
      const tr = TRL[i];
      let ef = null;
      if (st === ST.punch) ef = arms[0].s === 1 ? arms[0].hd : arms[1].hd;
      else if (st === ST.punch2) ef = arms[0].s === -1 ? arms[0].hd : arms[1].hd;
      else if (st === ST.hkick && LK[i].tr.patate) ef = arms[0].s === 1 ? arms[0].hd : arms[1].hd;
      else if (st === ST.hkick && LK[i].tr.boule) ef = hc;
      else if (st === ST.hkick || st === ST.fly || st === ST.kick || st === ST.volley || st === ST.stomp) ef = legs[0].s === 1 ? legs[0].to : legs[1].to;
      else if (st === ST.head && AHIT[i]) ef = hc;
      if (ef && !srot) { tr.push([X + ef[0] * K * BU[0], Y + ef[1] * K * BU[0]]); if (tr.length > 7) tr.shift(); } else if (tr.length) tr.length = 0;
    }
    // ----- accessoires de tenue -----
    const flow = Math.min(1, amp), wag = Math.sin(now * 9 + i * 1.3);
    const drawBehind = () => { // ce qui pend dans le dos : cape, queue-de-pie, queues d'animal
      if (OF.cape) {
        const a = Pt(scF - 3.5 * cl, scD + 1 - 3.5 * sl, shW + 0.5, J[n++]), b = Pt(scF - 3.5 * cl, scD + 1 - 3.5 * sl, -(shW + 0.5), J[n++]);
        const wv = Math.sin(now * 7 + i) * 1.6 * flow;
        const c = P(-7 - 12 * flow, hipD + 21 - 6 * flow + wv, -(shW + 4), J[n++]), d = P(-7 - 12 * flow, hipD + 21 - 6 * flow - wv, shW + 4, J[n++]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); ctx.fillStyle = '#24163a'; ctx.fill();
        ctx.strokeStyle = tcol; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); // doublure aux couleurs de l'équipe
      }
      if (PE.prop === 'mantle') { // manteau royal pourpre bordé d'hermine
        const a = Pt(scF - 3.5 * cl, scD + 1 - 3.5 * sl, shW + 0.5, J[n++]), b = Pt(scF - 3.5 * cl, scD + 1 - 3.5 * sl, -(shW + 0.5), J[n++]);
        const wv = Math.sin(now * 6 + i) * 1.4 * flow;
        const c = P(-6 - 14 * flow, hipD + 14 - 7 * flow + wv, -(shW + 3), J[n++]), d = P(-6 - 14 * flow, hipD + 14 - 7 * flow - wv, shW + 3, J[n++]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath();
        ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); ctx.fillStyle = '#8e0f22'; ctx.fill();
        ctx.lineCap = 'butt'; ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke(); ctx.lineCap = 'round';
        ctx.fillStyle = INK; for (const u of [0.2, 0.45, 0.7, 0.92]) { const q = mix(c, d, u, J[n++]); circ(q[0], q[1], 0.8); ctx.fill(); }
      }
      if (PE.prop === 'scythe') { // la faux, portée dans le dos
        const lo = Pt(scF - 5.5 * cl, hipD + 3, 6.5, J[n++]), hi = Pt(scF - 5.5 * cl - 2, scD - 21, -5.5, J[n++]);
        seg(lo, hi, 2.3, '#4a3424', 0);
        const b1 = Pt(scF - 5.5 * cl - 2, scD - 27.5, 3, J[n++]), b2 = Pt(scF - 5.5 * cl - 2, scD - 19, 13.5, J[n++]), b3 = Pt(scF - 5.5 * cl - 2, scD - 22.5, 2, J[n++]);
        ctx.beginPath(); ctx.moveTo(hi[0], hi[1]); ctx.quadraticCurveTo(b1[0], b1[1], b2[0], b2[1]); ctx.quadraticCurveTo(b3[0], b3[1], hi[0], hi[1]); ctx.closePath();
        ctx.fillStyle = '#cfd3da'; ctx.fill(); ctx.strokeStyle = INK; ctx.lineWidth = 1.3; ctx.stroke();
      }
      if (OF.coattails) for (const l of [-3, 3]) seg(Ph(-4 * cl, hipD - 3, l, J[n++]), P(-7 - 7 * flow, hipD + 12 - 3 * flow, l * 1.5, J[n++]), 4.6, '#121216', 0);
      if (OF.foxtail) {
        // queue touffue qui pend puis remonte (elle se soulève quand il court)
        const b0 = Ph(-4 * cl, hipD + 1, 0, J[n++]), m = P(-9 - 5 * flow, hipD + 8 - 2 * flow + wag * 0.6, wag * 1.5, J[n++]), t = P(-15 - 7 * flow, hipD + 5 - 5 * flow + wag, wag * 2.5, J[n++]);
        seg(b0, m, 5, '#d4561e', 0); seg(m, t, 7.5, '#d4561e', 0);
        ctx.fillStyle = INK; circ(t[0], t[1], 4.4); ctx.fill(); ctx.fillStyle = '#f4f1ea'; circ(t[0], t[1], 3.3); ctx.fill();
      }
      if (OF.cattail) { // queue de chat noire, dressée en point d'interrogation
        const b0 = Ph(-4 * cl, hipD + 1, 0, J[n++]), m1 = P(-10 - 3 * flow, hipD - 2, wag * 1.2, J[n++]), m2 = P(-12 - 4 * flow, hipD - 13 + wag, wag * 2, J[n++]), t = P(-8 - 5 * flow, hipD - 18 + wag * 1.4, wag * 2.5, J[n++]);
        seg(b0, m1, 3.2, '#121216', 0); seg(m1, m2, 3.2, '#121216', 0); seg(m2, t, 3, '#121216', 0);
      }
      if (OF.tigertail) {
        // longue queue qui pend et dont le bout se recourbe
        const b0 = Ph(-4 * cl, hipD + 1, 0, J[n++]), m1 = P(-9 - 3 * flow, hipD + 10, wag * 1.5, J[n++]), m2 = P(-15 - 5 * flow, hipD + 9 - 2 * flow + wag * 0.6, wag * 2.5, J[n++]), t = P(-18 - 6 * flow, hipD + 2 - 3 * flow + wag * 1.4, wag * 3, J[n++]);
        seg(b0, m1, 2.9, '#ff7a00', 0); seg(m1, m2, 2.9, '#111111', 0); seg(m2, t, 2.9, '#ff7a00', 0);
      }
    };
    const drawRobe = () => { // robe noire de la Faucheuse, jusqu'aux genoux
      const pts = [];
      for (const ff of [-1, 1]) for (const ll of [-1, 1]) {
        pts.push(Ph(ff * 4.6 * cl, hipD - 3 + ff * 4.6 * sl, ll * (BU[3] + 1.5), J[n++]));
        pts.push(P(ff * 6 - 2 - 4 * flow, hipD + 17 - 2 * flow, ll * (BU[3] + 5), J[n++]));
      }
      const hp = hull(pts);
      ctx.beginPath(); ctx.moveTo(hp[0][0], hp[0][1]); for (let k = 1; k < hp.length; k++) ctx.lineTo(hp[k][0], hp[k][1]); ctx.closePath();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.stroke(); ctx.fillStyle = '#17161c'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.lineWidth = 1; // plis
      for (const l of [-0.5, 0.2]) { const a = Ph(4 * cl, hipD, l * BU[3], J[n++]), b = P(5, hipD + 15, l * (BU[3] + 3), J[n++]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    };
    const drawCollar = () => { // par-dessus le torse : fourrure, collerette, chaîne
      if (OF.fur) {
        const pts = []; for (const l of [-1, -0.55, -0.1, 0.35, 0.8]) pts.push(Pt(scF + (fy >= -0.15 ? 1 : -1) * 2 * cl, scD + 1, l * (shW + 1.5), J[n++]));
        ctx.fillStyle = INK; for (const q of pts) { circ(q[0], q[1], 5.1); ctx.fill(); }
        ctx.fillStyle = '#6b4f33'; for (const q of pts) { circ(q[0], q[1], 4); ctx.fill(); }
        ctx.fillStyle = '#8f6d48'; for (const q of pts) { circ(q[0] - 1.2, q[1] - 1.3, 1.6); ctx.fill(); }
      }
      if (OF.ruff) {
        ctx.lineWidth = 0.9; ctx.strokeStyle = INK;
        for (let k = 0; k < 7; k++) { const a = k * 0.9; const x = nk[0] + Math.cos(a) * 4.8, y = nk[1] + 2.2 + Math.sin(a) * 2; ctx.fillStyle = k % 2 ? '#f4f1ea' : tcol; circ(x, y, 2.2); ctx.fill(); ctx.stroke(); }
      }
      if (OF.chain) {
        const a = Ph(3 * cl, hipD - 1, BU[3] * 0.5, J[n++]), b = Ph(1 * cl, hipD - 1, BU[3] + 0.5, J[n++]);
        ctx.strokeStyle = '#c9ccd2'; ctx.lineWidth = 1.2; ctx.setLineDash([1.6, 1.2]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo((a[0] + b[0]) / 2, Math.max(a[1], b[1]) + 5, b[0], b[1]); ctx.stroke(); ctx.setLineDash([]);
      }
    };
    // ordre de dessin par profondeur
    const seenFront = fy >= -0.15;
    if (!ghost && seenFront) drawBehind();
    legs.sort((a, b) => a.dep - b.dep); arms.sort((a, b) => a.dep - b.dep);
    drawLeg(legs[0]); drawLeg(legs[1]);
    if (!ghost && OF.robe) drawRobe();
    const headFirst = fy < -0.3; // de dos : la tête passe derrière les bras levés
    if (arms[0].dep < 0.5) drawArm(arms[0]);
    if (arms[1].dep < -0.5) drawArm(arms[1]);
    drawTorso();
    if (!ghost) { drawCollar(); if (!seenFront) drawBehind(); }
    if (headFirst) drawHead();
    if (arms[0].dep >= 0.5) drawArm(arms[0]);
    if (!headFirst) drawHead();
    if (arms[1].dep >= -0.5) drawArm(arms[1]);
    ctx.restore();
  }

  const HOP = new Float32Array(8);
  function drawPlayer(p, i, V) {
    const team = i >> 2, T = TEAMS[team];
    const st = p.st, now = performance.now(), hf = (HITT[i] - now) / 1000;
    let X = sx(p.x), Y = sy(p.y, p.z);
    if (hf > 0) { X += (R() * 2 - 1) * 3.2 * K; Y += (R() * 2 - 1) * 2 * K; } // la victime vibre sous le choc
    if (HOP[i] > 0) { HOP[i] -= animDt; Y -= Math.sin(Math.PI * clamp(1 - HOP[i] / 0.32, 0, 1)) * 26 * K; } // SAUTERELLE : saute le tacle
    if (LK[i].tr.berserk && p.dmg >= 3) { // BERSERKER : il fume de rage
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.18 + 0.08 * Math.sin(now / 90);
      ctx.fillStyle = '#ff2a1e'; ctx.beginPath(); ctx.ellipse(X, Y - 30 * K, 22 * K, 38 * K, 0, 0, 7); ctx.fill(); ctx.restore();
    }
    // images rémanentes (feinte, ciseau, éjection)
    const gh = ghosts[i];
    if (gh.length > 2) for (let k = 0; k < gh.length - 1; k += 2) { const g = gh[k]; figure(p, i, sx(g[0]), sy(g[1], g[2]), 0.1 + k * 0.025); }
    if (st === ST.charge || st === ST.blast) aura(X, sy(p.y, p.z), team, curBar[team] >= 1, st === ST.blast);
    const tr = TRL[i];
    if (tr.length > 2) { // traînée « smear » du coup
      ctx.save(); ctx.lineCap = 'round';
      for (let k = 1; k < tr.length; k++) {
        const u = k / (tr.length - 1);
        ctx.strokeStyle = `rgba(255,250,235,${0.5 * u})`; ctx.lineWidth = (2 + 8 * u) * Math.min(K, 1.8);
        ctx.beginPath(); ctx.moveTo(tr[k - 1][0], tr[k - 1][1]); ctx.lineTo(tr[k][0], tr[k][1]); ctx.stroke();
      }
      ctx.restore();
    }
    figure(p, i, X, Y, 0);
    if (hf > 0) { ghostCol = hf > 0.05 ? '#ffffff' : '#ff2a1e'; figure(p, i, X, Y, Math.min(0.92, hf * 10)); ghostCol = null; } // image d'impact
    // sonné : petites étincelles qui tournent
    if (st === ST.down && p.z < 3) {
      const t = now / 1000, dirS = p.fx * cam.flip >= 0 ? 1 : -1, hx = X - dirS * 22 * K, hyy = Y - 10 * K;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6 * Math.min(K, 1.5);
      for (let k = 0; k < 3; k++) {
        const a = t * 6 + k * 2.09, x = hx + Math.cos(a) * 11 * K, y = hyy + Math.sin(a) * 4 * K - 6 * K, r = 3 * K;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(a * 2);
        ctx.beginPath(); ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x, y - r); ctx.lineTo(x, y + r); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // jauge de charge segmentée
    if (p.chg !== 0) {
      const v = Math.abs(p.chg), N = 8, sw = 5 * K, gap = 1.4 * K, h = 6 * K, w = N * (sw + gap), gx = X - w / 2, gy = Y - 80 * K;
      ctx.fillStyle = 'rgba(0,0,0,.75)'; para(gx - 3 * K, gy - 2 * K, w + 4 * K, h + 4 * K, 3 * K); ctx.fill();
      const full = p.chg > 0 && v >= 0.97, blink = (now / 70 | 0) % 2;
      for (let k = 0; k < N; k++) {
        const on = v * N > k + 0.15;
        ctx.fillStyle = !on ? 'rgba(255,255,255,.12)' : p.chg < 0 ? '#9fd3ff' : full ? (blink ? '#fff' : '#ff1e1e') : k < 3 ? '#ffc21a' : k < 6 ? '#ff6a00' : '#ff1e1e';
        para(gx + k * (sw + gap), gy, sw, h, 2 * K); ctx.fill();
      }
      if (full) { ctx.font = `${Math.max(12, 13 * K) | 0}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = blink ? '#fff' : '#ff1e1e'; ctx.fillText('MAX', X, gy - 4 * K); }
    }
    // chevron du joueur contrôlé
    if (app.mode !== 'menu' && !app.drafting && team === app.myTeam && (i & 3) === V.ctrl[team]) {
      const ay = Y - (p.chg !== 0 ? 98 : 82) * K - Math.abs(Math.sin(now / 160)) * 3 * K, s = Math.min(K, 1.6);
      ctx.fillStyle = INK; ctx.beginPath(); ctx.moveTo(X - 10 * s, ay - 9 * s); ctx.lineTo(X, ay + 1 * s); ctx.lineTo(X + 10 * s, ay - 9 * s); ctx.lineTo(X, ay - 4 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = T.c1; ctx.beginPath(); ctx.moveTo(X - 8 * s, ay - 8 * s); ctx.lineTo(X, ay - 1 * s); ctx.lineTo(X + 8 * s, ay - 8 * s); ctx.lineTo(X, ay - 4.5 * s); ctx.closePath(); ctx.fill();
      ctx.font = `italic 800 ${Math.max(9, 10 * s) | 0}px ${UIF}`; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
      const nm = LK[i].name;
      ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.strokeText(nm, X, ay - 11 * s); ctx.fillStyle = T.c1; ctx.fillText(nm, X, ay - 11 * s);
    }
  }

  const BLV = d => (d >= 7 ? 3 : d >= 4.5 ? 2 : d >= 2 ? 1 : 0); // niveau de blessure visible
  const KICOL = [['#bff4ff', '#3cc8ff', '#0a6cff'], ['#fff1c2', '#ff8a1a', '#ff2a1e']];
  function aura(X, Y, team, full, burst) { // aura façon combattant qui « monte en puissance »
    const t = performance.now() / 1000, c = full ? ['#fff8d0', '#ffd23a', '#ff9a00'] : KICOL[team];
    const s = K * (burst ? 1.15 : 1), cy = Y - 30 * s;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(X, cy, 4 * s, X, cy, 48 * s);
    g.addColorStop(0, c[0] + '00'); g.addColorStop(0.45, c[1] + '55'); g.addColorStop(1, c[2] + '00');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(X, cy, 30 * s, 50 * s, 0, 0, 7); ctx.fill();
    for (let k = 0; k < 7; k++) { // langues de flammes
      const ph = t * 9 + k * 1.7, h = (34 + 16 * Math.sin(ph)) * s, x0 = X + (k - 3) * 7 * s;
      ctx.fillStyle = (k % 2 ? c[1] : c[2]) + '66';
      ctx.beginPath(); ctx.moveTo(x0 - 7 * s, Y - 4 * s); ctx.quadraticCurveTo(x0 + Math.sin(ph * 1.3) * 8 * s, Y - h * 1.2, x0 + Math.sin(ph) * 4 * s, Y - h - 34 * s);
      ctx.quadraticCurveTo(x0 + 2 * s, Y - h * 0.7, x0 + 7 * s, Y - 4 * s); ctx.fill();
    }
    ctx.restore();
  }
  function drawKi(k) {
    const X = sx(k[0]), Y = sy(k[1], 30), c = KICOL[k[4]], r = 11 * K, sp = len(k[2], k[3]) || 1;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let n = 6; n >= 1; n--) { // traînée
      const tx = sx(k[0] - k[2] / sp * n * 9), ty = sy(k[1] - k[3] / sp * n * 9, 30);
      ctx.fillStyle = c[1]; ctx.globalAlpha = 0.12 * (7 - n) / 6 * 2; circ(tx, ty, r * (1 - n * 0.1)); ctx.fill();
    }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, r * 2.4);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, c[0]); g.addColorStop(0.55, c[1] + 'aa'); g.addColorStop(1, c[2] + '00');
    ctx.fillStyle = g; circ(X, Y, r * 2.4); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(X, sy(k[1], 0), r, r * 0.4, 0, 0, 7); ctx.fill();
  }
  function drawBeam(bm) { // [x, y, dx, dy, L, t, équipe]
    const c = KICOL[bm[6]], t = performance.now() / 1000;
    const A = [sx(bm[0]), sy(bm[1], 30)], B = [sx(bm[0] + bm[2] * bm[4]), sy(bm[1] + bm[3] * bm[4], 30)];
    const life = clamp(bm[5] / 0.15, 0, 1), wd = (30 + Math.sin(t * 60) * 3) * K * life;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
    const L = (w, col, a) => { ctx.strokeStyle = col; ctx.globalAlpha = a; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.stroke(); };
    L(wd * 2.4, c[2], 0.25); L(wd * 1.5, c[1], 0.55); L(wd * 0.9, c[0], 0.9); L(wd * 0.4, '#ffffff', 1);
    ctx.globalAlpha = 0.9;
    for (const P of [A, B]) { const g = ctx.createRadialGradient(P[0], P[1], 0, P[0], P[1], wd * 1.6); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, c[1]); g.addColorStop(1, c[2] + '00'); ctx.fillStyle = g; circ(P[0], P[1], wd * 1.6); ctx.fill(); }
    ctx.restore();
  }

