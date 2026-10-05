  /* =============== OPTIONS & NIVEAUX GRAPHIQUES =============== */
  // réglages du joueur, mémorisés dans le navigateur
  const OPT = { gfx: 'auto', music: 0.55, sfx: 1, vib: 1, shake: 1 };
  try { Object.assign(OPT, JSON.parse(localStorage.getItem('tf_opts') || '{}')); } catch (e) { /* réglages par défaut */ }
  function saveOpts() { try { localStorage.setItem('tf_opts', JSON.stringify(OPT)); } catch (e) { /* stockage indisponible */ } }
  // ULTRA : pipeline complet · HAUTE : bloom simple, définition réduite · PERF : rendu 2D direct
  const GFXT = {
    ultra: { post: true, levels: 2, dpr: 2, bloom: 0.92, persp: 0.06, grain: 0.03, vig: 1.0, lights: true },
    high: { post: true, levels: 1, dpr: 1.5, bloom: 0.78, persp: 0.05, grain: 0.022, vig: 0.95, lights: true },
    perf: { post: false, levels: 0, dpr: 1.25, bloom: 0, persp: 0, grain: 0, vig: 0, lights: false }
  };
  let gfxAuto = isTouch ? 'high' : 'ultra'; // AUTO : on part haut, on descend si l'appareil peine
  const gfxTier = () => (OPT.gfx === 'auto' ? gfxAuto : OPT.gfx);
  const GFX = () => GFXT[gfxTier()] || GFXT.high;

