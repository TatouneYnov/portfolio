import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import IconList from '~icons/solar/list-linear';
import IconKeyboard from '~icons/solar/keyboard-linear';
import skillsData from '../data/skills.json';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealWords } from '../lib/reveal';
import { canRun3D } from '../lib/capabilities';
import { useInView, useMounted } from '../lib/hooks';
import { useIdleMount } from '../lib/warm';
import { SplitHeading } from '../components/SplitHeading';

const KeyboardScene = lazy(() => import('../three/KeyboardScene'));

export type Skill = (typeof skillsData.skills)[number];
export type Category = (typeof skillsData.categories)[number];
export type PressSignal = { id: string; n: number } | null;

const skills = skillsData.skills;
const categories = skillsData.categories;
const catById = Object.fromEntries(categories.map((c) => [c.id, c]));

export function Toolbox() {
  const root = useRef<HTMLElement>(null);
  const readout = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const nearView = useInView(root, '100% 0px', true);
  const idleMount = useIdleMount();
  const near = nearView || idleMount;
  const visible = useInView(root, '0px');
  const [use3D, setUse3D] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [active, setActive] = useState<string | null>(null);
  const [press, setPress] = useState<PressSignal>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const scroll = useRef({ rotation: 0 });

  useEffect(() => {
    if (canRun3D()) {
      setUse3D(true);
      setListOpen(false);
    }
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.toolbox__title'));
      if (isReducedMotion()) return;
      gsap.fromTo(
        scroll.current,
        { rotation: -0.14 },
        { rotation: 0.14, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
    }, el);
    return () => ctx.revert();
  }, []);

  // Animation du texte de gauche quand la touche change
  const current = useMemo(() => skills.find((s) => s.id === active) ?? null, [active]);
  useEffect(() => {
    const el = readout.current;
    if (!el || isReducedMotion() || !mounted) return;
    gsap.fromTo(el.children, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.05, ease: 'power3.out' });
  }, [active, mounted]);

  const pressKey = useCallback((id: string) => {
    setActive(id);
    setPress((p) => ({ id, n: (p?.n ?? 0) + 1 }));
  }, []);

  // Touches physiques : seulement si la section est visible et qu'aucun champ n'a le focus
  useEffect(() => {
    if (!visible) return;
    const byKey = new Map(skills.map((s) => [s.hotkey.toLowerCase(), s.id]));
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const t = document.activeElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || (t as HTMLElement).isContentEditable)) return;
      const id = byKey.get(e.key.toLowerCase());
      if (id) pressKey(id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, pressKey]);

  const show3D = mounted && use3D && near;

  return (
    <section ref={root} id="outils" className="toolbox section" aria-labelledby="toolbox-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading
            id="toolbox-title"
            className="display display--lg toolbox__title"
            lines={[{ text: 'Ma boîte' }, { text: 'à outils', accent: true }]}
          />
          <p className="label section-head__hint">{use3D ? '(astuce : survole ou appuie sur une touche)' : `${skills.length} outils, classés par domaine`}</p>
        </div>

        {use3D && (
          <div className="toolbox__stage-wrap">
            <div ref={readout} className="toolbox__readout" aria-live="polite">
              {current ? (
                <>
                  <p className="toolbox__name" data-cat={current.category}>
                    {current.label}
                  </p>
                  <p className="toolbox__quip">{current.quip}</p>
                  <p className="label toolbox__cat">{catById[current.category]?.label}</p>
                </>
              ) : (
                <>
                  <p className="toolbox__name">{skills.length} outils</p>
                  <p className="toolbox__quip">Des langages aux outils d'analyse. Survole une touche ou tape sa lettre.</p>
                </>
              )}
            </div>
            <div className="toolbox__stage" aria-hidden="true">
              {show3D && (
                <Suspense fallback={null}>
                  <KeyboardScene
                    skills={skills}
                    categories={categories}
                    active={active}
                    press={press}
                    highlight={highlight}
                    onHover={(id) => id && setActive(id)}
                    paused={!visible}
                    scroll={scroll.current}
                    onLost={() => {
                      setUse3D(false);
                      setListOpen(true);
                    }}
                  />
                </Suspense>
              )}
            </div>
          </div>
        )}

        <div className="toolbox__bar">
          <ul className="legend" aria-label="Catégories">
            {categories.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  className="legend__item"
                  aria-pressed={highlight === c.id}
                  onClick={() => setHighlight((h) => (h === c.id ? null : c.id))}
                >
                  <span className="legend__swatch" data-cat={c.id} aria-hidden="true" />
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
          {use3D && (
            <button type="button" className="btn btn--ghost btn--sm" aria-expanded={listOpen} aria-controls="skills-list" onClick={() => setListOpen((v) => !v)}>
              {listOpen ? <IconKeyboard aria-hidden="true" /> : <IconList aria-hidden="true" />}
              {listOpen ? 'Masquer la liste' : 'Voir en liste'}
            </button>
          )}
        </div>

        <ul id="skills-list" className="skills-list" hidden={!listOpen}>
          {skills.map((s) => (
            <li
              key={s.id}
              className={`skills-list__item${highlight && highlight !== s.category ? ' is-dim' : ''}`}
              data-cat={s.category}
            >
              <span className="skills-list__name">{s.label}</span>
              <span className="skills-list__cat">{catById[s.category]?.label}</span>
              <span className="skills-list__quip">{s.quip}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
