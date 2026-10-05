/* ================= TACLE FURY — RENDU, CONTRÔLES, SON, RÉSEAU ================= */
(function () {
  'use strict';
  const { W, H, GD, BARZ, PR, BR, MT, MB, ST, PH, TEAMS } = TF;
  const VER = '2.0';
  const PFX = 'tfury26-';
  const $ = id => document.getElementById(id);
  const R = Math.random;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const len = (x, y) => Math.sqrt(x * x + y * y);
  const lerp = (a, b, t) => a + (b - a) * t;
  const pick = a => a[(R() * a.length) | 0];
  const Q = new URLSearchParams(location.search);
  const isTouch = matchMedia('(pointer:coarse)').matches || ('ontouchstart' in window);
  const FONT = 'Anton, Impact, "Arial Narrow Bold", sans-serif';

  const cv = $('cv'); let ctx = cv.getContext('2d');
  const ctl = $('ctl'), mbtn = $('mbtn');

  /* =============== état de l'appli =============== */
  const app = {
    mode: 'menu',          // menu | solo | host | guest
    myTeam: 0, world: null, paused: false, diff: 'normal',
    V: null, endShown: false, endT: 0, demo: null, tick: 0, lastCount: -1, drafting: false
  };

