# L'avatar

L'avatar est une **figurine modélisée directement en code** avec Three.js, dans `src/three/avatar.js`. Il n'y a aucun fichier 3D (`.glb`) à générer ni à charger : le site reste léger et l'avatar se modifie en quelques lignes.

Il s'inspire de photos d'Ethan sans chercher la ressemblance exacte :

- cheveux brun foncé bouclés, avec du volume sur le dessus ;
- une mèche claire à l'avant ;
- côtés courts et fondus ;
- fine moustache et bouc court ;
- chemise noire, pantalon sombre, sneakers blanches.

Les photos brutes ne sont pas dans le repo (`assets-src/` est ignoré par Git) et ne sont jamais publiées.

## Comment il est construit

- **Squelette** : `Hips > Spine > Chest > Neck > Head`, plus les bras (`UpperArm`, `LowerArm`, `Hand`) et les jambes (`UpperLeg`, `LowerLeg`, `Foot`). Chaque os est un `THREE.Group` animé en rotation.
- **Tête** : une seule sphère déformée (crâne rond, menton affiné), donc une surface lisse sans raccord.
- **Visage** : yeux, nez et oreilles sont posés sur la tête par lancer de rayon. Sourcils et bouche sont des traits sculptés (`sculptStroke`) : section ovale, épaisseur variable, bouts arrondis, projetés sur le visage. Moustache, mouche et bouc forment une fine coque calée sur la tête (`buildFacialHairGeometry`), en relief, dont les bords prennent la couleur de la peau pour se fondre dedans.
- **Cheveux** : une seule surface continue calée sur la ligne d'implantation (`hairlineAt`). Côtés et arrière ras en dégradé jusqu'à la peau ; sur le dessus, des pointes soudées et irrégulières (`HAIR_SPIKES`, tirées au hasard avec une graine fixe), inclinées vers l'avant et vers la gauche du perso (droite de l'écran). Creux adoucis et plus sombres. Brun presque noir, mèche blanche sur l'avant côté droit du perso.
- **Animations** : deux poses calculées à chaque image, `idlePose` (respiration, balancement) et `sitPose` (assis, en train de taper). La scène passe de l'une à l'autre en fondu de 0,5 s.
- **Suivi** : la tête et les yeux suivent le pointeur (±35° horizontalement, ±20° verticalement). Sans souris, la tête balaie lentement la scène. La scène passe par `avatar.setGaze(yaw, pitch)` et `avatar.setBlink(ouverture)` : changer les yeux ne demande pas de toucher à `AvatarStage.tsx`.

## Modifier l'avatar

Tout se règle en haut de `src/three/avatar.js`.

| Pour changer… | Modifier |
|---|---|
| Les couleurs (peau, cheveux, mèche, vêtements) | l'objet `COLORS` |
| Les pointes (nombre, taille, hauteur) | `HAIR_SPIKES` : grille, tirage aléatoire (graine `seed`), `[x, z, rayon, hauteur]` |
| L'inclinaison des pointes | dans `buildHairGeometry`, les lignes `o.z += …` (avant) et `o.x += …` (côté) |
| La mèche blanche (place, taille) | dans `buildHairGeometry`, la ligne `streak[k] = …` ; couleur `COLORS.streak` |
| L'épaisseur du dessus | dans `buildHairGeometry`, la ligne `let h = …` |
| La ligne d'implantation (front, côtés, pattes) | `hairlineAt` |
| La forme du visage (ovale) | `headShape` |
| La moustache et le bouc (position, taille, densité) | `facialHairMask` |
| Les sourcils, la bouche | les appels à `sculptStroke` dans `buildAvatar` |
| La forme du torse, l'ouverture du col | `buildTorsoGeometry` |
| Les mains et les doigts | `buildHand` |
| Les chaussures | `buildSneaker`, `soleOutline` |
| L'éclairage (site et images fixes) | `buildLights` |
| Le bureau, la chaise, le décor | `buildDesk` (le clavier doit rester sous les mains de `sitPose`) |
| La matière de la peau, des tissus | `M.skin`, `fabric()` dans `buildAvatar` |
| La pose assise | `sitPose` |

Après une modification, recrée les images fixes (section suivante).

## Images fixes (repli sans 3D)

Les images `public/assets/avatar/avatar-poster.webp` (buste) et `desk-poster.webp` (au bureau) s'affichent dans quatre cas : sans WebGL, sous « réduire les animations », sur un appareil modeste et sans JavaScript. L'image `public/og-image.jpg` sert au partage sur les réseaux.

Pour les recréer :

1. Lance `npm run dev`.
2. Ouvre `http://localhost:5173/tools/poster.html?view=bust&w=900&h=1000` (ou `view=desk&w=1200&h=800`).
   Pour contrôler une retouche : `view=face` (gros plan), `&turn=0.6` (3/4) ou `&turn=1.57` (profil), `&bg=1` (fond du site), `&gaze=0.4`, `&blink=0`.
3. Fais une capture du canvas sur fond transparent (outil de capture de ton navigateur), puis convertis-la en WebP.
4. Pour l'image Open Graph : `tools/og.html`, au format 1200 × 630.

Les versions réduites (`avatar-poster-450.webp`, `desk-poster-600.webp`) servent aux petits écrans.

## Remplacer par un modèle 3D plus détaillé (plus tard, facultatif)

Le reste du site ne dépend que de l'interface de `avatar.js` :

- `buildAvatar()` doit renvoyer `root`, `hips`, `head`, `neck`, `eyes`, `torso`, `arms`, `legs`, `setGaze` et `setBlink` ;
- `idlePose` et `sitPose` doivent exister.

Un modèle GLB riggé (Meshy, Tripo, Mixamo) peut donc remplacer la figurine. Il faudra relier ses os à ces noms et charger le fichier avec `useGLTF`, en compression meshopt, avec un décodeur hébergé sur le site pour respecter la CSP.
