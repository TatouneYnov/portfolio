import { useEffect, useRef } from 'react';
import profile from '../data/profile.json';
import { gsap, isReducedMotion } from '../lib/motion';
import { stageState } from '../lib/stageState';
import { asset } from '../lib/env';
import { SplitHeading } from '../components/SplitHeading';

/** Lance l'animation d'entrée quand le chargement est terminé (événement app:loaded). */
export function Hero() {
  const root = useRef<HTMLElement>(null);
  const rotator = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (isReducedMotion()) {
      stageState.intro = 1;
      return;
    }
    const ctx = gsap.context(() => {
      const words = el.querySelectorAll('.hero__name .split__wi');
      const right = el.querySelectorAll('.hero__right > *');
      const glow = el.querySelector('.hero__glow');
      gsap.set(words, { yPercent: 110 });
      gsap.set(right, { autoAlpha: 0, y: 24 });
      gsap.set('.hero__hello', { autoAlpha: 0, y: 12 });
      gsap.set(glow, { scale: 0.6, autoAlpha: 0 });
      gsap.set('.hero__badge, .hero__actions', { autoAlpha: 0, y: 12 });

      const play = () => {
        gsap
          .timeline({ defaults: { ease: 'power3.out' } })
          .to(glow, { scale: 1, autoAlpha: 1, duration: 1.1 }, 0)
          .to(stageState, { intro: 1, duration: 1.0 }, 0.1)
          .to('.hero__hello', { autoAlpha: 1, y: 0, duration: 0.6 }, 0.25)
          .to(words, { yPercent: 0, duration: 0.9, stagger: 0.08 }, 0.35)
          .to(right, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08 }, 0.6)
          .to('.hero__badge', { autoAlpha: 1, y: 0, duration: 0.6 }, 0.8)
          .to('.hero__actions', { autoAlpha: 1, y: 0, duration: 0.6 }, 0.9);
      };
      if (document.documentElement.classList.contains('is-loaded')) play();
      else window.addEventListener('app:loaded', play, { once: true });
    }, el);
    return () => ctx.revert();
  }, []);

  // Mot rotatif : le mot sortant monte et passe en lavande, l'entrant arrive par le bas.
  useEffect(() => {
    const el = rotator.current;
    if (!el || isReducedMotion()) return;
    const words = Array.from(el.querySelectorAll<HTMLElement>('.rotator__word'));
    if (words.length < 2) return;
    let index = 0;
    // Le CSS décale déjà le 2e mot (repli sans JS) : on remet ce décalage à zéro avant d'animer.
    gsap.set(words, { y: 0, yPercent: 110 });
    gsap.set(words[0], { yPercent: 0 });
    const id = window.setInterval(() => {
      const current = words[index];
      index = (index + 1) % words.length;
      const next = words[index];
      gsap
        .timeline({ defaults: { duration: 0.7, ease: 'power3.inOut' } })
        .to(current, { yPercent: -110, color: 'var(--accent)', opacity: 0.2 }, 0)
        .fromTo(next, { yPercent: 110, color: 'var(--text)', opacity: 1 }, { yPercent: 0 }, 0);
    }, 2600);
    return () => window.clearInterval(id);
  }, []);

  const [first, last] = [profile.firstName, profile.lastName];

  return (
    <section ref={root} id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero__grid container">
        <div className="hero__left">
          <p className="hero__hello">Salut, moi c'est</p>
          <SplitHeading
            as="h1"
            id="hero-title"
            className="hero__name"
            lines={[{ text: first }, { text: last }]}
          />
          <a className="hero__badge badge" href="#dispos">
            <span className="badge__dot" aria-hidden="true" />
            <span className="hero__badge-text">
              {profile.badge.split(' · ').map((part, i) => (
                <span key={part}>
                  {i > 0 && <span className="sr-only"> · </span>}
                  {part}
                </span>
              ))}
            </span>
          </a>
          <div className="hero__actions">
            <a className="btn btn--primary btn--sm" href="#contact">
              Me contacter
            </a>
            <a className="btn btn--ghost btn--sm" href="#projets">
              Voir mes projets
            </a>
          </div>
        </div>

        <div className="hero__center">
          <div className="avatar-slot avatar-slot--hero" data-slot="hero">
            <span className="hero__glow" aria-hidden="true" />
            <img
              className="avatar-slot__poster"
              src={asset('assets/avatar/avatar-poster.webp')}
              srcSet={`${asset('assets/avatar/avatar-poster-450.webp')} 450w, ${asset('assets/avatar/avatar-poster.webp')} 900w`}
              sizes="(max-width: 1023px) 80vw, 34vw"
              alt="Avatar 3D d'Ethan : cheveux bouclés avec une mèche claire, chemise noire"
              width={360}
              height={400}
              fetchPriority="high"
            />
          </div>
        </div>

        <div className="hero__right">
          <p className="hero__lead">Étudiant en</p>
          <p className="rotator" aria-hidden="true">
            <span ref={rotator} className="rotator__mask">
              {profile.rotatingWords.map((w) => (
                <span key={w} className="rotator__word">
                  {w}
                </span>
              ))}
            </span>
          </p>
          <p className="sr-only">{profile.rotatingSrOnly}</p>
          <p className="hero__status">
            {profile.heroStatus.split(' · ').map((part, i) => (
              <span key={part}>
                {i > 0 && ' · '}
                {part}
              </span>
            ))}
          </p>
        </div>
      </div>
      <div className="scroll-hint" aria-hidden="true">
        <span className="scroll-hint__line" />
      </div>
    </section>
  );
}
