import { useEffect, useRef } from 'react';
import data from '../data/testimonials.json';
import { isFilled } from '../lib/content';
import { gsap } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { SplitHeading } from '../components/SplitHeading';

type Testimonial = { quote: string; name: string; role?: string | null; org?: string | null; consent?: boolean; draft?: boolean };

// Seuls les témoignages réels, avec accord, et non brouillons sont affichés.
const items = (data.items as Testimonial[]).filter((t) => t.consent === true && !t.draft && isFilled(t.quote) && isFilled(t.name));

export function Testimonials() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.testimonials__title'));
      revealFade(el.querySelectorAll('.quote-card'), el.querySelector('.testimonials__grid'), { stagger: 0.12 });
    }, el);
    return () => ctx.revert();
  }, []);

  if (items.length === 0) return null;

  return (
    <section ref={root} id="temoignages" className="testimonials section" aria-labelledby="testimonials-title">
      <div className="container">
        <SplitHeading
          id="testimonials-title"
          className="display display--lg testimonials__title"
          lines={[{ text: 'Ils en' }, { text: 'parlent', accent: true }]}
        />
        <ul className="testimonials__grid">
          {items.map((t) => (
            <li key={t.name} className="quote-card">
              <blockquote>
                <p>« {t.quote} »</p>
              </blockquote>
              <p className="quote-card__who">
                <span className="quote-card__name">{t.name}</span>
                {[t.role, t.org].filter(isFilled).length > 0 && (
                  <span className="quote-card__role">{[t.role, t.org].filter(isFilled).join(' · ')}</span>
                )}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
