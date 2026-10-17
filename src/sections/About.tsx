import { useEffect, useRef } from 'react';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import IconInstagram from '~icons/simple-icons/instagram';
import profile from '../data/profile.json';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealFade } from '../lib/reveal';
import { stageState } from '../lib/stageState';
import { asset } from '../lib/env';
import { isFilled } from '../lib/content';

export function About() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (isReducedMotion()) {
        stageState.about = 1;
        return;
      }
      // L'avatar glisse du hero vers la colonne de gauche
      gsap.to(stageState, {
        about: 1,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 25%', scrub: true },
      });
      // Le contenu du hero s'écarte
      gsap.to(document.querySelector('.hero__left'), {
        xPercent: -18,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 40%', scrub: true },
      });
      gsap.to(document.querySelector('.hero__right'), {
        xPercent: 18,
        autoAlpha: 0,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 95%', end: 'top 40%', scrub: true },
      });
      // Le texte passe du gris au blanc, mot à mot
      const words = el.querySelectorAll('.about__text .aw');
      gsap.fromTo(
        words,
        { color: 'var(--muted)' },
        {
          color: 'var(--text)',
          ease: 'none',
          stagger: 0.1,
          scrollTrigger: { trigger: '.about__text', start: 'top 80%', end: 'bottom 50%', scrub: true },
        },
      );
      revealFade(el.querySelectorAll('.about__label, .offscreen'), el, { start: 'top 70%' });
    }, el);
    return () => ctx.revert();
  }, []);

  const off = profile.offscreen;
  const hasPhoto = isFilled(off.photo);

  return (
    <section ref={root} id="a-propos" className="about section" aria-labelledby="about-title">
      <div className="container about__grid">
        <div className="about__aside">
          <div className="avatar-slot avatar-slot--about" data-slot="about">
            <img
              className="avatar-slot__poster"
              src={asset('assets/avatar/avatar-poster.webp')}
              srcSet={`${asset('assets/avatar/avatar-poster-450.webp')} 450w, ${asset('assets/avatar/avatar-poster.webp')} 900w`}
              sizes="(max-width: 1023px) 80vw, 40vw"
              alt=""
              width={360}
              height={400}
              loading="lazy"
            />
          </div>
        </div>
        <div className="about__content">
          <h2 id="about-title" className="label about__label">
            À propos
          </h2>
          <p className="about__text">
            {profile.about.split(' ').map((w, i) => (
              <span key={i} className="aw">
                {i > 0 ? ' ' : ''}
                {w}
              </span>
            ))}
          </p>

          <article className={`offscreen${hasPhoto ? ' offscreen--photo' : ''}`} aria-labelledby="offscreen-title">
            {hasPhoto && (
              <img className="offscreen__photo" src={asset(off.photo as unknown as string)} alt={off.photoAlt} width={480} height={600} loading="lazy" />
            )}
            <div className="offscreen__body">
              <h3 id="offscreen-title" className="label">
                {off.title}
              </h3>
              <p>{off.text}</p>
              <a className="offscreen__link" href={profile.links.instagram} target="_blank" rel="noopener noreferrer">
                <IconInstagram aria-hidden="true" />
                <span>{profile.instagramHandle}</span>
                <IconArrow aria-hidden="true" className="arrow" />
                <span className="sr-only"> (Instagram, nouvel onglet)</span>
              </a>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
