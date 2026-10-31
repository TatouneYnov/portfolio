// Typographie française : espace insécable avant « : », espace fine insécable avant « ; ? ! »,
// et dans les guillemets « ». Évite qu'un signe se retrouve seul en début de ligne (« : au fond… »).
// Appliqué à la compilation sur les textes (src/data/*.json, pages annexes) : on continue d'écrire
// des espaces normales dans les fichiers.
const NBSP = ' ';
const NNBSP = ' ';

/** @param {string} text */
export function frTypo(text) {
  return text
    .replace(/([\p{L}\d)\]»…%]) :/gu, `$1${NBSP}:`)
    .replace(/([\p{L}\d)\]»…%]) ([;?!])/gu, `$1${NNBSP}$2`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`);
}
