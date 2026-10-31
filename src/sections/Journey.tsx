import { useEffect, useRef } from 'react';
import IconDown from '~icons/solar/arrow-down-linear';
import { timeline } from '../lib/content';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealWords } from '../lib/reveal';
import { SplitHeading } from '../components/SplitHeading';

export function Journey() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.journey__title'));
      if (isReducedMotion()) return;
      const list = el.querySelector('.timeline');
      // La ligne se remplit au défilement ; la perle marque sa tête (à 70 % de la hauteur de l'écran).
      // Une seule timeline pour les deux, en transform (composité, pas de recalcul de mise en page) et un léger
      // lissage : sur iPhone, le défilement natif devance les mises à jour et la perle avançait par à-coups.
      const track = el.querySelector<HTMLElement>('.timeline__track');
      gsap
        .timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: list, start: 'top 70%', end: 'bottom 70%', scrub: 0.4, invalidateOnRefresh: true },
        })
        .fromTo('.timeline__fill', { scaleY: 0 }, { scaleY: 1 }, 0)
        .fromTo('.timeline__bead', { y: 0 }, { y: () => track?.offsetHeight ?? 0 }, 0);
      el.querySelectorAll('.tl-row').forEach((row) => {
        gsap.from(row.children, {
          opacity: 0,
          y: 30,
          duration: 0.7,
          stagger: 0.06,
          scrollTrigger: { trigger: row, start: 'top 70%', once: true },
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="parcours" className="journey section" aria-labelledby="journey-title">
      <div className="container">
        <SplitHeading
          id="journey-title"
          className="display display--md journey__title"
          lines={[{ text: 'Mon parcours &' }, { text: 'mes objectifs', accent: true }]}
        />
        <div className="timeline">
          <span className="timeline__track" aria-hidden="true">
            <span className="timeline__fill" />
            <span className="timeline__bead" />
          </span>
          <ol className="timeline__list">
            {timeline.map((item) => (
              <li
                key={item.title}
                className={`tl-row${item.upcoming ? ' tl-row--upcoming' : ''}${item.subtle ? ' tl-row--subtle' : ''}`}
              >
                <div className="tl-row__head">
                  <h3 className="tl-row__title">{item.title}</h3>
                  <p className="tl-row__place">{item.place}</p>
                </div>
                <p className="tl-row__year">
                  <span className="sr-only">Période&nbsp;: </span>
                  {item.year}
                </p>
                <div className="tl-row__body">
                  <p>{item.text}</p>
                  {item.link && (
                    <a className="text-link" href={item.link.href}>
                      {item.link.label} <IconDown aria-hidden="true" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
