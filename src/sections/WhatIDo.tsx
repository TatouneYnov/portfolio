import { useEffect, useRef, useState } from 'react';
import IconPlus from '~icons/solar/add-circle-linear';
import profile from '../data/profile.json';
import { gsap, isReducedMotion, ScrollTrigger } from '../lib/motion';
import { revealWords } from '../lib/reveal';
import { stageState } from '../lib/stageState';
import { asset } from '../lib/env';
import { SplitHeading } from '../components/SplitHeading';
import { Frame } from '../components/Frame';

const cards = profile.whatIDo;

export function WhatIDo() {
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  // Rendu serveur : toutes les cartes ouvertes (lisible sans JS). Au montage : seule la première.
  const [open, setOpen] = useState<string | null>('__all__');

  useEffect(() => setOpen(cards[0]?.id ?? null), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.whatido__title'));
      if (isReducedMotion()) {
        stageState.travel = 1;
        stageState.desk = 1;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add('(min-width: 1024px)', () => {
        gsap.to(stageState, {
          travel: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top top', scrub: true },
        });
        gsap.to(stageState, {
          desk: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top top', end: '+=150%', scrub: true, pin: pin.current, anticipatePin: 1 },
        });
      });
      mm.add('(max-width: 1023px)', () => {
        gsap.to(stageState, {
          travel: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 70%', scrub: true },
        });
        gsap.to(stageState, {
          desk: 1,
          ease: 'none',
          scrollTrigger: { trigger: '.avatar-slot--desk', start: 'top 85%', end: 'center 45%', scrub: true },
        });
      });
      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} id="ce-que-je-fais" className="whatido section" aria-labelledby="whatido-title">
      <div ref={pin} className="whatido__pin">
        <div className="container whatido__grid">
          <div className="whatido__left">
            <SplitHeading
              id="whatido-title"
              className="display display--xl whatido__title"
              lines={[{ text: 'Ce que' }, { text: 'je fais', accent: true }]}
            />
            <div className="avatar-slot avatar-slot--desk" data-slot="desk">
              <img
                className="avatar-slot__poster"
                src={asset('assets/avatar/desk-poster.webp')}
                srcSet={`${asset('assets/avatar/desk-poster-600.webp')} 600w, ${asset('assets/avatar/desk-poster.webp')} 1200w`}
                sizes="(max-width: 1023px) 92vw, 50vw"
                alt="L'avatar d'Ethan assis à son bureau, devant un écran de terminal violet"
                width={360}
                height={240}
                loading="lazy"
              />
            </div>
          </div>
          <div className="whatido__cards">
            {cards.map((card) => (
              <AccordionCard
                key={card.id}
                card={card}
                open={open === '__all__' || open === card.id}
                onOpen={() => setOpen(card.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

type CardData = (typeof cards)[number];

function AccordionCard({ card, open, onOpen }: { card: CardData; open: boolean; onOpen: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = panel.current;
    if (!el) return;
    if (first.current || isReducedMotion()) {
      first.current = false;
      el.style.height = open ? 'auto' : '0px';
      return;
    }
    gsap.to(el, { height: open ? 'auto' : 0, duration: 0.6, ease: 'power3.inOut' });
    gsap.to(el.children, { autoAlpha: open ? 1 : 0, y: open ? 0 : 8, duration: open ? 0.5 : 0.25, delay: open ? 0.15 : 0, stagger: 0.05 });
  }, [open]);

  const finePointerOpen = () => {
    if (window.matchMedia('(pointer: fine)').matches) onOpen();
  };

  return (
    <Frame className={`acc${open ? ' is-open' : ''}`}>
      <h3 className="acc__heading">
        <button
          type="button"
          className="acc__toggle"
          aria-expanded={open}
          aria-controls={`acc-${card.id}`}
          onClick={onOpen}
          onMouseEnter={finePointerOpen}
          onFocus={onOpen}
        >
          <span className="acc__title">{card.title}</span>
          <IconPlus className="acc__icon" aria-hidden="true" />
        </button>
      </h3>
      <div id={`acc-${card.id}`} ref={panel} className="acc__panel" role="region" aria-label={card.title}>
        <p className="acc__text">{card.text}</p>
        <ul className="tags" aria-label="Domaines">
          {card.tags.map((t) => (
            <li key={t} className="tag">
              {t}
            </li>
          ))}
        </ul>
      </div>
    </Frame>
  );
}
