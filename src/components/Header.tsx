import { useEffect, useRef, useState } from 'react';
import IconMenu from '~icons/solar/hamburger-menu-linear';
import IconClose from '~icons/solar/close-linear';
import profile from '../data/profile.json';
import { copyText } from '../lib/toast';
import { asset } from '../lib/env';
import { useDragToDismiss } from '../lib/useDragToDismiss';

const NAV = [
  { href: '#a-propos', label: 'À propos' },
  { href: '#projets', label: 'Projets' },
  { href: '#contact', label: 'Contact' },
];

export function Header() {
  const [open, setOpen] = useState(false);
  // Fond de l'en-tête dès qu'on quitte le haut de page ; onglet CV masqué quand le pied de page est visible
  const [scrolled, setScrolled] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  // Lien de la section en cours (repère de position dans la navigation)
  const [current, setCurrent] = useState<string | null>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  // Menu plein écran : on peut le fermer en le tirant vers le haut
  const grab = useDragToDismiss(menuRef, { direction: -1, enabled: open, onDismiss: () => setOpen(false) });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onNavigate = () => setOpen(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('app:navigate', onNavigate);
    document.documentElement.classList.add('menu-open');
    menuRef.current?.querySelector<HTMLElement>('a')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('app:navigate', onNavigate);
      document.documentElement.classList.remove('menu-open');
    };
  }, [open]);

  useEffect(() => {
    const sections = NAV.map((item) => document.getElementById(item.href.slice(1)));
    let frame = 0;
    const measure = () => {
      frame = 0;
      setScrolled(window.scrollY > 24);
      // Section en cours : celle qui occupe la ligne située à 40 % de la hauteur de l'écran
      const line = window.innerHeight * 0.4;
      const i = sections.findIndex((el) => {
        const r = el?.getBoundingClientRect();
        return !!r && r.top <= line && r.bottom > line;
      });
      setCurrent(i >= 0 ? NAV[i].href : null);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    const footer = document.querySelector('.site-footer');
    const io = footer ? new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting)) : null;
    if (footer && io) io.observe(footer);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      io?.disconnect();
    };
  }, []);

  return (
    <header className={`site-header${scrolled ? ' site-header--scrolled' : ''}${footerVisible ? ' site-header--footer' : ''}`}>
      <div className="site-header__inner">
        <a className="monogram" href="#top" aria-label="EB, Ethan Bacquier : retour en haut">
          EB
        </a>
        <button type="button" className="site-header__mail" onClick={() => copyText(profile.email, 'Adresse copiée ✓')}>
          <span className="sr-only">Copier l'adresse e-mail : </span>
          {profile.email}
        </button>
        <nav className="site-nav" aria-label="Navigation principale">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href} aria-current={current === item.href ? 'true' : undefined}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <button
          ref={toggleRef}
          type="button"
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="menu-mobile"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <IconClose aria-hidden="true" /> : <IconMenu aria-hidden="true" />}
          <span className="sr-only">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
        </button>
      </div>

      <div id="menu-mobile" ref={menuRef} className="menu-mobile" hidden={!open} {...grab}>
        <nav aria-label="Menu mobile">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <a href={item.href}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        {profile.cv.available ? (
          <a className="menu-mobile__cv" href={asset(profile.cv.path)} download>
            Télécharger mon CV
          </a>
        ) : (
          <p className="menu-mobile__cv menu-mobile__cv--off">CV · bientôt dispo</p>
        )}
        <p className="menu-mobile__mail">{profile.email}</p>
        <span className="menu-mobile__grabber" aria-hidden="true" />
      </div>

      {profile.cv.available ? (
        <a className="cv-tab" href={asset(profile.cv.path)} download>
          CV
        </a>
      ) : (
        <span className="cv-tab cv-tab--off" aria-disabled="true">
          CV · bientôt
        </span>
      )}
    </header>
  );
}
