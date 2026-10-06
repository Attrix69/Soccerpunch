#!/usr/bin/env node
// Assemble le jeu en un seul fichier jouable hors ligne : src/shell.html + ses inclusions -> index.html
// Usage : node build.js            (écrit index.html)
//         node build.js --check    (vérifie que index.html est à jour, code de sortie 1 sinon)
'use strict';
const fs = require('fs'), path = require('path');
const SRC = path.join(__dirname, 'src');

function include(spec) {
  const m = spec.match(/^(.*\/)?([^/]*\*[^/]*)$/);
  if (!m) return [spec];
  const dir = m[1] || '', re = new RegExp('^' + m[2].replace(/[.]/g, '\\.').replace(/\*/g, '.*') + '$');
  return fs.readdirSync(path.join(SRC, dir)).filter(f => re.test(f)).sort().map(f => dir + f);
}
function sounds(dir) { // @@sfx dir : les .mp3 de src/dir deviennent var SFXD = { nom: base64 }
  const files = fs.readdirSync(path.join(SRC, dir)).filter(f => f.endsWith('.mp3')).sort();
  return 'var SFXD = {\n' + files.map(f => JSON.stringify(f.slice(0, -4)) + ':"' + fs.readFileSync(path.join(SRC, dir, f)).toString('base64') + '"').join(',\n') + '\n};';
}
function expand(text) {
  return text.split('\n').map(line => {
    const s = line.match(/^@@sfx (\S+)$/);
    if (s) return sounds(s[1]);
    const m = line.match(/^@@include (\S+)$/);
    if (!m) return line;
    return include(m[1]).map(f => {
      const t = fs.readFileSync(path.join(SRC, f), 'utf8');
      return t.endsWith('\n') ? t.slice(0, -1) : t;
    }).join('\n');
  }).join('\n');
}
const out = expand(fs.readFileSync(path.join(SRC, 'shell.html'), 'utf8'));
const dest = path.join(__dirname, 'index.html');
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
  if (cur !== out) { console.error('index.html n\'est pas à jour : lance « node build.js »'); process.exit(1); }
  console.log('index.html à jour');
} else {
  fs.writeFileSync(dest, out);
  console.log('index.html écrit (' + (Buffer.byteLength(out) / 1024).toFixed(0) + ' Ko)');
}
