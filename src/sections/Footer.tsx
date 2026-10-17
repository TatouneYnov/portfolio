import { useRef } from 'react';
import IconUp from '~icons/solar/arrow-up-linear';
import IconClose from '~icons/solar/close-linear';
import { asset } from '../lib/env';

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

export function Footer() {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <footer className="site-footer">
      <div className="container site-footer__inner">
        <p>© 2026 Ethan Bacquier · Fait à Lyon</p>
        <div className="site-footer__links">
          <a className="text-link" href={asset('confidentialite.html')}>
            Politique de confidentialité
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
