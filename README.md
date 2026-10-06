# Tacle Fury

Foot de combat 3 contre 3 (+ gardiens) : zéro arbitre, zéro carton, zéro pitié.
Solo contre l'IA ou en ligne avec un pote (PeerJS). Tout tient dans **un seul fichier**,
`index.html`, jouable hors ligne : ouvre-le dans un navigateur (PC, tablette ou téléphone en paysage).
Pour jouer en ligne, héberge le fichier (GitHub Pages par exemple) et envoie le lien.

## Commandes

| Action | Tactile | Clavier | Manette |
|---|---|---|---|
| Se déplacer | joystick | ZQSD / flèches | stick gauche / croix |
| Tir (maintenir) / passe (tap) / frappe | FRAPPE | Espace | A |
| Tacle (maintenir) / esquive avec ballon | TACLE | K | B ou X |
| Sprint | SPRINT | Maj | RB / RT / LB |
| Ki, rayon, ultime | KI | E | Y / LT |
| Pause | ☰ | Échap | Start |
| Plein écran | | F | |

## Bruitages enregistrés et annonceur

55 vrais sons (domaine public, CC0) remplacent ou épaississent la synthèse là où elle sonnait « jeu vidéo » :
coups de poing légers et lourds, impacts sur le corps, corps qui s'écrasent sur la pelouse, frappes de balle,
poteaux qui sonnent, coups dans le vide, sons d'interface. Chaque son a plusieurs variantes jouées au hasard,
légèrement désaccordées, et plus graves au ralenti.

**Annonceur** façon jeu de combat : « 3, 2, 1… FIGHT! » au coup d'envoi, « COMBO! », « MULTI KILL! » sur un
carnage, « SUDDEN DEATH! » au but en or, compte à rebours des 5 dernières secondes, « YOU WIN! »,
« FLAWLESS VICTORY! » (victoire sans encaisser) ou « YOU LOSE! ». Désactivable dans les Options.

Tout reste dans `index.html` (environ 180 Ko de MP3 mono embarqués, décodés au premier geste ; tant qu'un son
n'est pas prêt, la synthèse prend le relais). La foule, le sifflet, la musique et les ultimes restent synthétisés.

Sons (CC0) : [Kenney](https://kenney.nl) (Impact Sounds, Interface Sounds, UI Audio, Voiceover Pack: Fighter),
OpenGameArt ([37 hits/punches](https://opengameart.org/content/37-hitspunches),
[Battle sound effects](https://opengameart.org/content/battle-sound-effects)), récupérés via l'index
[open-game-sfx-index](https://github.com/Mcamento8/open-game-sfx-index), puis coupés, normalisés et encodés.

## Version 3.0 : refonte « console »

### Rendu
- **Pipeline WebGL maison** (aucune bibliothèque à charger) au-dessus du rendu 2D encré : bloom sur deux
  niveaux, **lumières dynamiques** (feu, ki, rayons, impacts, pyrotechnie qui éclairent pelouse et joueurs),
  **ondes de choc** qui déforment l'image, chaleur autour des ultimes, flou radial, aberration chromatique
  sur les gros chocs, légère perspective, étalonnage cinéma, ralenti rougi, défaite désaturée, vignette, grain.
- Trois couches : monde → composition GPU → interface (jamais déformée ni floutée).
- **Qualité AUTO / ULTRA / HAUTE / PERF**. En AUTO, le jeu baisse tout seul la qualité si l'appareil peine,
  et reste en rendu 2D direct si le GPU est émulé par le processeur.

### Caméra
Plan d'ouverture sur la tribune, suivi qui anticipe le jeu, zoom selon la densité de l'action,
plans courts sur les ultimes, les K.O. brutaux, les buts et la fin du match. Le joueur que tu contrôles
ne sort jamais du cadre.

### Lisibilité
Cône et réticule de tir (avec le % de charge), coéquipier qui recevra la passe, crochets rouges sur
celui que tu vas frapper, « ACHÈVE ! » quand un coup de grâce est possible, portée du tacle chargé,
**« ! » rouge quand un tacle ou du ki arrive sur toi**, flèche quand le ballon sort de l'écran.
**Esquive parfaite** (feinte au dernier moment) : ralenti + ki.

### Animation
Squash & stretch du ballon (étiré par la vitesse, écrasé au rebond) et des corps (tassés à l'impact,
étirés quand ils sont éjectés), filets qui se creusent au but, perdants qui baissent la tête.

### Interface
HUD en verre fumé (blasons, score qui « pop », ki en 3 crans, carte du joueur avec portrait, endurance
et état physique), écran **VS** avant chaque match, transitions d'écrans, logo animé, menus floutés,
écran **Options**, fin de match animée (compteurs, boucher du match avec portrait, victoire dorée).

### Audio
Musique procédurale (menu + match dont l'intensité monte en fin de match, au but en or et pendant
les combos), « ducking » sous les gros chocs, clapping des supporters, sons d'interface, jingles de
victoire et de défaite, décompte des 5 dernières secondes. Volumes musique / effets réglables.

### Options
Graphismes, volume musique, volume effets, sang (sans / sang / gore max), vibrations (téléphone et manette),
secousses de caméra (normales / réduites). Tout est mémorisé.

## Version 2.0 : l'édition « défouloir »
Arrêt sur image et silhouette d'impact, caméra qui encaisse, ralenti sur les coups qui détruisent,
sang sur l'objectif, dents qui sautent ; craquements d'os, cris synthétisés, foule qui réagit ;
corps qui rebondissent, effet domino, murets, filets ; **coup de grâce** ; blessures visibles
(coquards, boue, boitement) ; fil des K.O., combos, CARNAGE, bilan du carnage en fin de match.

## Développement

Le code source est découpé par domaine dans `src/`, puis assemblé en un seul fichier :

```
node build.js          # régénère index.html à partir de src/
node build.js --check  # vérifie que index.html est à jour
```

| Fichier | Rôle |
|---|---|
| `src/shell.html`, `src/body.html` | squelette HTML, écrans |
| `src/css/main.css`, `src/css/premium.css` | styles, animations d'interface |
| `src/js/sim.js` | simulation pure (règles, physique, IA), sans DOM, partagée hôte/invité |
| `src/js/post.js` | pipeline de post-traitement WebGL |
| `src/js/game/05-options.js` | réglages, niveaux graphiques |
| `src/js/game/10-audio.js`, `12-music.js` | effets sonores (synthèse + sons enregistrés, annonceur), musique procédurale |
| `src/sfx/*.mp3` | sons enregistrés, embarqués en base64 par `build.js` (`@@sfx`) ; `nom-0`, `nom-1`… = variantes |
| `src/js/game/20-input.js` | tactile, clavier, manette |
| `src/js/game/30-stage.js` | stade pré-rendu, couches de canvas |
| `src/js/game/35-fx.js` | particules, sang, gore, sang sur l'objectif |
| `src/js/game/40-figure.js` | personnages (squelette pseudo-3D, poses, tenues, blessures) |
| `src/js/game/45-powers.js`, `50-ball.js` | ki, rayons, ultimes, ballon, cages |
| `src/js/game/60-hud.js`, `65-guides.js` | HUD, aides de jeu |
| `src/js/game/70-render.js`, `72-camera.js` | rendu principal, caméra |
| `src/js/game/75-events.js` | réaction aux événements (sons, effets, caméra) |
| `src/js/game/80-net.js`, `90-ui.js`, `99-loop.js` | réseau, menus, boucle principale |

> En ligne, les deux joueurs doivent avoir la même version (3.0) du fichier.
