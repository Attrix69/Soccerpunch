/* ================= TACLE FURY — PIPELINE DE RENDU WEBGL (post-traitement) =================
   Le monde est dessiné en 2D (canvas « encré ») puis composé ici sur le GPU :
   bloom 2 niveaux, lumières dynamiques, ondes de choc, flou radial, aberration chromatique,
   légère perspective, étalonnage (épaule douce, contraste, saturation, virage couleur),
   ralenti / défaite, flash, vignette et grain. WebGL 1 : marche partout, repli 2D sinon. */
var POST = (function () {
  'use strict';
  const MAXL = 8, MAXS = 4;
  const VS = 'attribute vec2 aP;varying vec2 vUv;void main(){vUv=aP*0.5+0.5;gl_Position=vec4(aP,0.,1.);}';
  const HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nvarying vec2 vUv;\n';
  // extraction des hautes lumières + réduction (4 échantillons bilinéaires = bloc 4×4)
  const FS_BRIGHT = HEAD + 'uniform sampler2D uTex;uniform vec2 uTexel;uniform float uThr,uKnee;' +
    'void main(){vec3 c=(texture2D(uTex,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(1.,1.)).rgb)*0.25;' +
    'float br=max(c.r,max(c.g,c.b));float s=clamp(br-uThr+uKnee,0.,2.*uKnee);s=s*s/(4.*uKnee+1e-4);' +
    'gl_FragColor=vec4(c*max(s,br-uThr)/max(br,1e-4),1.);}';
  const FS_DOWN = HEAD + 'uniform sampler2D uTex;uniform vec2 uTexel;' +
    'void main(){gl_FragColor=vec4((texture2D(uTex,vUv+uTexel*vec2(-1.,-1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(1.,-1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(-1.,1.)).rgb+texture2D(uTex,vUv+uTexel*vec2(1.,1.)).rgb)*0.25,1.);}';
  // flou gaussien séparable (9 taps en 5 lectures bilinéaires)
  const FS_BLUR = HEAD + 'uniform sampler2D uTex;uniform vec2 uDir;' +
    'void main(){vec3 c=texture2D(uTex,vUv).rgb*0.2270270;' +
    'c+=(texture2D(uTex,vUv+uDir*1.3846154).rgb+texture2D(uTex,vUv-uDir*1.3846154).rgb)*0.3162162;' +
    'c+=(texture2D(uTex,vUv+uDir*3.2307692).rgb+texture2D(uTex,vUv-uDir*3.2307692).rgb)*0.0702703;gl_FragColor=vec4(c,1.);}';
  const FS_COMP = HEAD + [
    'uniform sampler2D uScene,uB1,uB2;uniform vec2 uRes;uniform float uAsp,uTime,uBloom,uSat,uCon,uTone,uVig,uGrain,uChroma,uSlow,uGray,uPersp;uniform vec3 uHeat;',
    'uniform int uNS,uNL;uniform vec4 uFlash;uniform vec4 uShock[' + MAXS + '];uniform vec4 uLight[' + MAXL + '];uniform vec3 uLCol[' + MAXL + '];uniform vec3 uZoom;',
    'vec3 samp(vec2 uv){if(uChroma>0.0004){vec2 o=(uv-0.5)*uChroma;return vec3(texture2D(uScene,uv+o).r,texture2D(uScene,uv).g,texture2D(uScene,uv-o).b);}return texture2D(uScene,uv).rgb;}',
    'vec3 shoulder(vec3 c){vec3 k=vec3(0.78);vec3 e=k+(1.-k)*(1.-exp(-(c-k)/(1.-k)));return mix(c,e,step(k,c));}',
    'void main(){',
    // perspective : le premier plan (bas de l'écran) est grossi, le fond reste à l'échelle
    '  vec2 uv=vUv;float s=1.-uPersp*(1.-uv.y);uv.x=0.5+(uv.x-0.5)*s;uv.y=uv.y-uPersp*uv.y+uPersp*uv.y*uv.y*0.5+uPersp*0.5;',
    // ondes de choc : anneaux qui déforment l'image
    '  vec2 off=vec2(0.);',
    '  for(int i=0;i<' + MAXS + ';i++){if(i>=uNS)break;vec4 S=uShock[i];vec2 d=uv-S.xy;d.x*=uAsp;float r=length(d);float x=(r-S.z)/0.045;float ring=exp(-x*x)*S.w;vec2 n=d/max(r,1e-4);n.x/=uAsp;off+=n*ring;}',
    // chaleur : l'air ondule autour des grosses énergies (ultimes, rayon), pas sur tout l'écran
    '  if(uHeat.z>0.){vec2 hd=uv-uHeat.xy;hd.x*=uAsp;float hf=max(0.,1.-length(hd)/0.28);off+=vec2(sin(uv.y*90.+uTime*14.),cos(uv.x*70.+uTime*11.))*0.0022*uHeat.z*hf*hf;}',
    '  vec2 su=uv-off;vec3 col;',
    '  if(uZoom.z>0.001){col=vec3(0.);for(int k=0;k<6;k++){float f=1.-uZoom.z*float(k)/5.;col+=samp(uZoom.xy+(su-uZoom.xy)*f);}col/=6.;}else col=samp(su);',
    // lumières dynamiques : elles éclairent vraiment la pelouse et les joueurs
    '  vec3 lit=vec3(0.);',
    '  for(int i=0;i<' + MAXL + ';i++){if(i>=uNL)break;vec4 L=uLight[i];vec2 d=su-L.xy;d.x*=uAsp;float f=max(0.,1.-length(d)/L.z);lit+=uLCol[i]*(f*f*L.w);}',
    '  col+=col*lit*1.7+lit*0.08;',
    '  col+=(texture2D(uB1,su).rgb*0.55+texture2D(uB2,su).rgb*0.85)*uBloom;',
    '  col=shoulder(col);',
    '  float l=dot(col,vec3(0.2126,0.7152,0.0722));',
    '  col=mix(vec3(l),col,uSat);col=(col-0.5)*uCon+0.5;',
    '  col+=(vec3(-0.018,0.004,0.03)*(1.-l)+vec3(0.03,0.012,-0.022)*l)*uTone;',
    '  float g=dot(col,vec3(0.299,0.587,0.114));',
    '  col=mix(col,vec3(g)*vec3(1.18,0.84,0.8),uSlow*0.5);col=mix(col,vec3(g*0.92),uGray);',
    '  col=mix(col,uFlash.rgb,uFlash.a);',
    '  vec2 q=(vUv-0.5)*vec2(1.05,1.25);col*=clamp(1.-dot(q,q)*uVig,0.,1.);',
    '  float n=fract(sin(dot(floor(vUv*uRes)+fract(uTime*7.31)*vec2(113.,71.),vec2(12.9898,78.233)))*43758.5453)-0.5;col+=n*uGrain;',
    '  gl_FragColor=vec4(clamp(col,0.,1.),1.);}'
  ].join('\n');

  let gl = null, cv = null, src = null, ok = false, lost = false, soft = false;
  let prog = {}, quad = null, tScene = null, fb = [], W = 0, H = 0, levels = 2;
  const shocks = [], lights = [];
  const U = {}; // emplacements des uniformes par programme

  function sh(type, s) { const o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  function mk(name, fs) {
    const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aP'); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    prog[name] = p; U[name] = {};
  }
  function u(name, k) { const c = U[name]; return k in c ? c[k] : (c[k] = gl.getUniformLocation(prog[name], k)); }
  function tex(w, h) {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (w) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return t;
  }
  function target(w, h) { const t = tex(w, h), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); return { t, f, w, h }; }
  function freeTargets() { for (const o of fb) { gl.deleteTexture(o.t); gl.deleteFramebuffer(o.f); } fb = []; }

  function setup() {
    prog = {}; for (const k in U) delete U[k];
    mk('bright', FS_BRIGHT); mk('down', FS_DOWN); mk('blur', FS_BLUR); mk('comp', FS_COMP);
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    tScene = tex(0, 0); fb = []; W = H = 0;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND);
  }
  function init(glCanvas, sourceCanvas) {
    cv = glCanvas; src = sourceCanvas;
    try {
      const o = { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
      gl = cv.getContext('webgl', o) || cv.getContext('experimental-webgl', o);
      if (!gl) return false;
      setup(); ok = true;
      try { const di = gl.getExtension('WEBGL_debug_renderer_info'); const rn = di ? gl.getParameter(di.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); soft = /swiftshader|llvmpipe|software|softpipe/i.test(String(rn)); } catch (e) { soft = false; }
      cv.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }, false);
      cv.addEventListener('webglcontextrestored', () => { try { setup(); lost = false; } catch (e) { ok = false; } }, false);
    } catch (e) { ok = false; gl = null; }
    return ok;
  }
  function resize(w, h) {
    if (!ok || lost) return;
    cv.width = w; cv.height = h;
    if (w === W && h === H && fb.length) return;
    W = w; H = h; freeTargets();
    const w4 = Math.max(4, w >> 2), h4 = Math.max(4, h >> 2), w8 = Math.max(2, w >> 3), h8 = Math.max(2, h >> 3);
    fb = [target(w4, h4), target(w4, h4), target(w8, h8), target(w8, h8)];
  }
  function pass(name, out, w, h) { gl.useProgram(prog[name]); gl.bindFramebuffer(gl.FRAMEBUFFER, out ? out.f : null); gl.viewport(0, 0, w, h); }
  function draw() { gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
  function bindTex(unit, t, name, k) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u(name, k), unit); }
  function blur(name, a, b) { // a -> b (horizontal) -> a (vertical)
    pass('blur', b, b.w, b.h); bindTex(0, a.t, 'blur', 'uTex'); gl.uniform2f(u('blur', 'uDir'), 1 / a.w, 0); draw();
    pass('blur', a, a.w, a.h); bindTex(0, b.t, 'blur', 'uTex'); gl.uniform2f(u('blur', 'uDir'), 0, 1 / b.h); draw();
  }

  /* ---------- effets pilotés par le jeu (coordonnées écran en px CSS, origine en haut à gauche) ---------- */
  function shock(x, y, amp, dur, rmax) { shocks.push({ x, y, amp, dur, rmax: rmax || 0.35, t: 0 }); if (shocks.length > MAXS) shocks.shift(); }
  function light(x, y, r, col, i, life) { lights.push({ x, y, r, c: col, i, life: life || 0, max: life || 0 }); }

  // p : { w, h (px CSS), time, dt, bloom, thr, sat, con, tone, vig, grain, chroma, slow, gray, persp, heat, flash:[r,g,b,a], zoom:[x,y,a] | null, lights:[...] }
  function render(p) {
    if (!ok || lost || !W) return false;
    // 1. la scène 2D devient une texture
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tScene);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    // 2. bloom : hautes lumières à 1/4, flou, puis 1/8, flou
    const A = fb[0], B = fb[1], C = fb[2], D = fb[3];
    if (p.bloom > 0) {
      pass('bright', A, A.w, A.h); bindTex(0, tScene, 'bright', 'uTex');
      gl.uniform2f(u('bright', 'uTexel'), 1 / W, 1 / H); gl.uniform1f(u('bright', 'uThr'), p.thr); gl.uniform1f(u('bright', 'uKnee'), 0.18); draw();
      blur('blur', A, B);
      if (levels > 1) { pass('down', C, C.w, C.h); bindTex(0, A.t, 'down', 'uTex'); gl.uniform2f(u('down', 'uTexel'), 1 / A.w, 1 / A.h); draw(); blur('blur', C, D); }
    }
    // 3. composition finale
    pass('comp', null, W, H);
    bindTex(0, tScene, 'comp', 'uScene'); bindTex(1, A.t, 'comp', 'uB1'); bindTex(2, (levels > 1 ? C : A).t, 'comp', 'uB2');
    const f1 = (k, v) => gl.uniform1f(u('comp', k), v);
    gl.uniform2f(u('comp', 'uRes'), W, H);
    f1('uAsp', p.w / p.h); f1('uTime', p.time); f1('uBloom', p.bloom > 0 ? p.bloom : 0); f1('uSat', p.sat); f1('uCon', p.con); f1('uTone', p.tone);
    f1('uVig', p.vig); f1('uGrain', p.grain); f1('uChroma', p.chroma); f1('uSlow', p.slow); f1('uGray', p.gray); f1('uPersp', p.persp);
    const ht = p.heat; gl.uniform3f(u('comp', 'uHeat'), ht ? ht[0] / p.w : 0, ht ? 1 - ht[1] / p.h : 0, ht ? ht[2] : 0);
    const fl = p.flash || [0, 0, 0, 0]; gl.uniform4f(u('comp', 'uFlash'), fl[0], fl[1], fl[2], fl[3]);
    const z = p.zoom; gl.uniform3f(u('comp', 'uZoom'), z ? z[0] / p.w : 0, z ? 1 - z[1] / p.h : 0, z ? z[2] : 0);
    // ondes de choc
    const sv = new Float32Array(MAXS * 4);
    for (let k = shocks.length - 1; k >= 0; k--) { const s = shocks[k]; s.t += p.dt; if (s.t >= s.dur) shocks.splice(k, 1); }
    shocks.forEach((s, k) => { const e = s.t / s.dur; sv[k * 4] = s.x / p.w; sv[k * 4 + 1] = 1 - s.y / p.h; sv[k * 4 + 2] = s.rmax * (1 - Math.pow(1 - e, 2.2)); sv[k * 4 + 3] = s.amp * (1 - e) * (1 - e); });
    gl.uniform4fv(u('comp', 'uShock[0]'), sv); gl.uniform1i(u('comp', 'uNS'), shocks.length);
    // lumières : celles du jeu (p.lights) + les flashs éphémères, les plus fortes d'abord
    for (let k = lights.length - 1; k >= 0; k--) { const L = lights[k]; L.life -= p.dt; if (L.life <= 0) lights.splice(k, 1); }
    const all = (p.lights || []).concat(lights.map(L => ({ x: L.x, y: L.y, r: L.r, c: L.c, i: L.i * (L.max ? Math.pow(L.life / L.max, 1.5) : 1) })));
    all.sort((a, b) => b.i * b.r - a.i * a.r);
    const lv = new Float32Array(MAXL * 4), lc = new Float32Array(MAXL * 3);
    for (let k = 0; k < Math.min(MAXL, all.length); k++) {
      const L = all[k]; lv[k * 4] = L.x / p.w; lv[k * 4 + 1] = 1 - L.y / p.h; lv[k * 4 + 2] = L.r / p.h; lv[k * 4 + 3] = L.i;
      lc[k * 3] = L.c[0]; lc[k * 3 + 1] = L.c[1]; lc[k * 3 + 2] = L.c[2];
    }
    gl.uniform4fv(u('comp', 'uLight[0]'), lv); gl.uniform3fv(u('comp', 'uLCol[0]'), lc); gl.uniform1i(u('comp', 'uNL'), Math.min(MAXL, all.length));
    draw();
    return true;
  }
  return {
    init, resize, render, shock, light,
    get ok() { return ok && !lost; },
    get soft() { return soft; }, // GPU émulé par le processeur : le pipeline y serait trop lent
    set levels(n) { levels = n; },
    clear() { shocks.length = 0; lights.length = 0; }
  };
})();
