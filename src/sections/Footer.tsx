import { useRef } from 'react';
import IconUp from '~icons/solar/arrow-up-linear';
import IconClose from '~icons/solar/close-linear';
import IconShield from '~icons/solar/shield-check-linear';
import { FORM_KEY, asset } from '../lib/env';

const CREDITS = [
  {
    title: 'Avatar et scènes 3D',
    items: [
      "Avatar « figurine » modélisé en code avec Three.js, inspiré de photos d'Ethan (aucun fichier 3D externe).",
      'Bureau, clavier et bulles : géométries Three.js générées en code.',
    ],
  },
  {
    title: 'Polices (auto-hébergées)',
    items: ['Archivo · Omnibus-Type · SIL Open Font License', 'Inter · Rasmus Andersson · SIL Open Font License', 'JetBrains Mono · JetBrains · SIL Open Font License'],
  },
  {
    title: 'Icônes',
    items: [
      'Solar Icons via Iconify · 480 Design · licence CC BY 4.0',
      'Logos des outils et plateformes : Simple Icons via Iconify · CC0. Les marques appartiennent à leurs propriétaires.',
    ],
  },
  {
    title: 'Code',
    items: ['React, Three.js, React Three Fiber, Rapier, GSAP, Lenis', 'Formulaire : Web3Forms'],
  },
];

// Encart « Comment ce site est sécurisé » : uniquement ce qui est réellement en place dans le code.
const SECURITY = [
  'Aucun tracker, aucun cookie, aucune publicité.',
  "Polices et icônes hébergées ici : rien n'est chargé depuis un autre site, ton adresse IP n'est pas envoyée à Google.",
  'Politique de sécurité du contenu (CSP) stricte : seuls les scripts du site peuvent s\'exécuter, aucun script inline.',
  ...(FORM_KEY ? ['Seul le formulaire de contact échange avec un service externe (Web3Forms), pour me transmettre ton message.'] : []),
];

export function Footer() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <footer className="site-footer">
      <section className="container site-footer__sec" aria-labelledby="sec-title">
        <h2 id="sec-title" className="label site-footer__sec-title">
          <IconShield aria-hidden="true" /> Comment ce site est sécurisé
        </h2>
        <ul>
          {SECURITY.map((line) => (
            <li key={line}>{line}</li>
          ))}
          <li>
            Une faille ? Le fichier{' '}
            <a href={asset('.well-known/security.txt')}>security.txt</a> indique comment me la signaler.
          </li>
        </ul>
      </section>
      <div className="container site-footer__inner">
        <p>© 2026 Ethan Bacquier · Fait à Lyon</p>
        <div className="site-footer__links">
          <a className="text-link" href={asset('confidentialite.html')}>
            Politique de confidentialité
          </a>
          <a className="text-link" href={asset('mentions-legales.html')}>
            Mentions légales
          </a>
          <button type="button" className="text-link" onClick={() => dialog.current?.showModal()}>
            Crédits
          </button>
          <a className="text-link" href="#top">
            Retour en haut <IconUp aria-hidden="true" />
          </a>
        </div>
      </div>

      <dialog ref={dialog} className="credits" aria-labelledby="credits-title" onClick={(e) => e.target === dialog.current && dialog.current?.close()}>
        <div className="credits__inner">
          <div className="credits__head">
            <h2 id="credits-title" className="label">
              Crédits
            </h2>
            <button type="button" className="icon-btn" onClick={() => dialog.current?.close()}>
              <IconClose aria-hidden="true" />
              <span className="sr-only">Fermer les crédits</span>
            </button>
          </div>
          {CREDITS.map((block) => (
            <section key={block.title} className="credits__block">
              <h3>{block.title}</h3>
              <ul>
                {block.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </dialog>
    </footer>
  );
}
