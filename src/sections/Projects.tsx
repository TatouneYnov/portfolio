import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import IconGithub from '~icons/simple-icons/github';
import IconGlobe from '~icons/solar/global-linear';
import IconClose from '~icons/solar/close-linear';
import IconPrev from '~icons/solar/alt-arrow-left-linear';
import IconNext from '~icons/solar/alt-arrow-right-linear';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import { projects, isFilled, type Project } from '../lib/content';
import { canRun3D, getCapabilities } from '../lib/capabilities';
import { useInView, useMounted } from '../lib/hooks';
import { useIdleMount } from '../lib/warm';
import { gsap } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { asset } from '../lib/env';
import { SplitHeading } from '../components/SplitHeading';

const BubblesScene = lazy(() => import('../three/BubblesScene'));

export type DockRequest = { id: string; n: number } | null;

// Le projet à la plus grosse bulle (Hera) prend 2 colonnes dans la grille statique
const featuredSize = Math.max(...projects.map((p) => p.size));

export function Projects() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
  const head = useRef<HTMLDivElement>(null);
  const [topInset, setTopInset] = useState(0);
  const mounted = useMounted();
  const nearView = useInView(root, '100% 0px', true);
  const idleMount = useIdleMount(1);
  const near = nearView || idleMount;
  const visible = useInView(root, '0px');
  const [use3D, setUse3D] = useState(false);
  const [docked, setDocked] = useState<string | null>(null);
  const [request, setRequest] = useState<DockRequest>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => setUse3D(canRun3D()), []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.projects__title'));
      revealFade(el.querySelectorAll('.project-card'), el.querySelector('.projects__grid'), { stagger: 0.08 });
    }, el);
    return () => ctx.revert();
  }, [use3D]);

  const openFromButton = (id: string, button: HTMLElement) => {
    returnFocus.current = button;
    setRequest((r) => ({ id, n: (r?.n ?? 0) + 1 }));
  };

  const onDock = useCallback((id: string | null) => setDocked(id), []);
  // Position de la fiche (px, depuis le bas de la scène) et distance jusqu'au centre de la bulle, d'où elle sort
  const [anchor, setAnchor] = useState<{ bottom: number; rise: number } | null>(null);
  const onAnchor = useCallback((bottom: number, rise: number) => setAnchor({ bottom, rise }), []);

  // Séquence : la bulle se pose → le socle s'allume → la fiche sort de la bulle (0,3 s après le dépôt).
  // Fermer ou changer de projet : la fiche rentre d'abord dans la bulle.
  const [panelOpen, setPanelOpen] = useState(false);
  const timer = useRef(0);
  const later = (fn: () => void, ms: number) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(fn, ms);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const onArrive = useCallback(() => later(() => setPanelOpen(true), 300), []);
  const PANEL_OUT = 300; // durée de la rentrée de la fiche (main.css, .project-panel)

  // Projet précédent / suivant : la fiche rentre, la bulle suivante file dans le socle, la séquence reprend
  const dockedNow = useRef<string | null>(null);
  dockedNow.current = docked;
  const navFocus = useRef<'prev' | 'next' | null>(null);
  const go = useCallback((delta: number) => {
    const i = projects.findIndex((p) => p.id === dockedNow.current);
    if (i < 0) return;
    const next = projects[(i + delta + projects.length) % projects.length].id;
    navFocus.current = delta < 0 ? 'prev' : 'next';
    setPanelOpen(false);
    later(() => setRequest((r) => ({ id: next, n: (r?.n ?? 0) + 1 })), PANEL_OUT);
  }, []);

  const close = () => {
    setPanelOpen(false);
    navFocus.current = null;
    later(() => setDocked(null), PANEL_OUT);
    const target = returnFocus.current;
    returnFocus.current = null;
    target?.focus();
  };

  const current = projects.find((p) => p.id === docked) ?? null;
  const show3D = mounted && use3D;

  // Titre posé sur la scène : sa hauteur (depuis le haut de la scène) sert de plafond aux bulles
  useEffect(() => {
    const h = head.current;
    const st = stage.current;
    if (!show3D || !h || !st) return;
    const measure = () => setTopInset(Math.max(0, h.getBoundingClientRect().bottom - st.getBoundingClientRect().top));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(h);
    ro.observe(st);
    return () => ro.disconnect();
  }, [show3D]);

  const title = (
    <SplitHeading
      id="projects-title"
      className="display display--lg projects__title"
      lines={[{ text: 'Mes' }, { text: 'projets', accent: true }]}
    />
  );

  return (
    <section ref={root} id="projets" className={`projects section${show3D ? ' projects--scene' : ''}`} aria-labelledby="projects-title">
      {show3D ? (
        // Scène plein écran : bulles en apesanteur, socle en bas au centre, titre posé dessus
        <div className={`projects__scene${current ? ' has-panel' : ''}`} style={anchor ? ({ '--panel-bottom': `${anchor.bottom}px`, '--panel-rise': `${anchor.rise}px` } as React.CSSProperties) : undefined}>
          <div ref={stage} className="projects__stage" aria-hidden="true">
            {near && (
              <Suspense fallback={null}>
                <BubblesScene
                  projects={projects}
                  docked={docked}
                  request={request}
                  onDock={onDock}
                  paused={!visible}
                  maxBubbles={getCapabilities().lowEnd ? 5 : 12}
                  wrapper={stage}
                  tip={tip}
                  topInset={topInset}
                  onAnchor={onAnchor}
                  onArrive={onArrive}
                  onLost={() => setUse3D(false)}
                />
              </Suspense>
            )}
            <div ref={tip} className="bubble-tip" />
          </div>

          <div className="container projects__overlay">
            <div ref={head} className="section-head">
              {title}
              <p className="label section-head__hint">
                <span className="only-mouse">Clique sur une bulle pour ouvrir le projet</span>
                <span className="only-touch">Touche une bulle pour ouvrir le projet</span>
                <span className="section-head__hint-sub">ou glisse-la dans le socle ↓</span>
              </p>
            </div>
          </div>

          {/* Pour le clavier et les lecteurs d'écran : barre invisible qui apparaît dès qu'un bouton a le focus */}
          <div className="projects__open">
            <p className="label" id="open-project-label">
              Ou choisis directement
            </p>
            <ul aria-labelledby="open-project-label">
              {projects.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="chip-btn"
                    aria-pressed={docked === p.id}
                    onClick={(e) => openFromButton(p.id, e.currentTarget)}
                  >
                    {p.bubbleLabel.replace(/\n/g, ' ')}
                    <span className="sr-only"> : ouvrir la fiche « {p.name} »</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Voile flouté derrière la fiche (le socle reste net) ; un clic dessus ferme la fiche */}
          <div className={`projects__veil${current && panelOpen ? ' is-open' : ''}`} aria-hidden="true" onClick={close} />
          <ProjectPanel project={panelOpen ? current : null} onClose={close} onPrev={() => go(-1)} onNext={() => go(1)} navFocus={navFocus} />
        </div>
      ) : (
        <div className="container">
          <div className="section-head">{title}</div>
          <ul className="projects__grid">
            {projects.map((p) => (
              <li key={p.id} className={`project-card${p.size === featuredSize ? ' project-card--featured' : ''}`}>
                <ProjectDetails project={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ProjectPanel({
  project,
  onClose,
  onPrev,
  onNext,
  navFocus,
}: {
  project: Project | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  navFocus: { current: 'prev' | 'next' | null };
}) {
  const panel = useRef<HTMLElement>(null);
  const [shown, setShown] = useState<Project | null>(project);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  // Fiche plus haute que la place disponible (écran bas) : fondu + « Suite » en bas, tant qu'il reste à lire
  const [more, setMore] = useState(false);
  const index = shown ? projects.findIndex((p) => p.id === shown.id) : -1;

  useEffect(() => {
    if (project) setShown(project);
  }, [project]);

  // Focus dans la fiche à l'ouverture ; après ‹ ou ›, il revient sur la même flèche
  const open = !!project;
  useEffect(() => {
    if (!open) return;
    const nav = navFocus.current;
    const target = nav ? panel.current?.querySelector<HTMLElement>(`[data-nav="${nav}"]`) : null;
    (target ?? panel.current)?.focus({ preventScroll: true });
  }, [open, navFocus]);

  useEffect(() => {
    const el = panel.current;
    if (!open || !el) return;
    const update = () => setMore(el.scrollHeight - el.clientHeight - el.scrollTop > 8);
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    const body = el.querySelector('.project-panel__body');
    if (body) ro.observe(body);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [open, shown]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onPrev();
      else if (e.key === 'ArrowRight') onNext();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, onPrev, onNext]);

  return (
    <aside
      ref={panel}
      className={`project-panel${project ? ' is-open' : ''}${more ? ' has-more' : ''}`}
      aria-labelledby="project-panel-title"
      aria-hidden={!project}
      tabIndex={-1}
      {...(!project ? { inert: '' } : {})}
      // Au doigt : balayer vers la gauche ou la droite change de projet
      onPointerDown={(e) => {
        if (e.pointerType === 'touch') swipe.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s0 = swipe.current;
        swipe.current = null;
        if (!s0) return;
        const dx = e.clientX - s0.x;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(e.clientY - s0.y) * 1.5) (dx < 0 ? onNext : onPrev)();
      }}
      onPointerCancel={() => (swipe.current = null)}
    >
      {shown && (
        <>
          <div className="project-panel__bar">
            <div className="project-panel__nav">
              <button type="button" className="icon-btn" data-nav="prev" onClick={onPrev}>
                <IconPrev aria-hidden="true" />
                <span className="sr-only">Projet précédent</span>
              </button>
              <span className="project-panel__count" aria-hidden="true">
                {index + 1} / {projects.length}
              </span>
              <button type="button" className="icon-btn" data-nav="next" onClick={onNext}>
                <IconNext aria-hidden="true" />
                <span className="sr-only">Projet suivant</span>
              </button>
            </div>
            <button type="button" className="project-panel__close" onClick={onClose}>
              <IconClose aria-hidden="true" />
              <span className="sr-only">Fermer la fiche projet</span>
            </button>
          </div>
          <div key={shown.id} className="project-panel__body">
            <ProjectDetails project={shown} headingLevel="h3" headingId="project-panel-title" />
          </div>
          <div className="project-panel__more" aria-hidden="true">
            <span>Suite ↓</span>
          </div>
        </>
      )}
    </aside>
  );
}

export function ProjectDetails({ project: p, headingLevel: H, headingId }: { project: Project; headingLevel: 'h3' | 'h4'; headingId?: string }) {
  return (
    <div className="project">
      {isFilled(p.image) && (
        <img className="project__image" src={asset(p.image as string)} alt={`Capture d'écran : ${p.name}`} width={800} height={500} loading="lazy" />
      )}
      <div className="project__head">
        <H id={headingId} className="project__name">
          {p.name}
        </H>
        {isFilled(p.tagline) && <p className="project__tagline">{p.tagline}</p>}
        <div className="project__meta">
          {isFilled(p.status) && <p className="pill">{p.status}</p>}
          {isFilled(p.context) && <p className="project__context">{p.context}</p>}
        </div>
      </div>
      {/* Deux blocs : ce que c'est (description, technos, liens) et ce que j'y ai fait (rôle, appris).
          Empilés dans les cartes ; côte à côte dans la fiche sur grand écran */}
      <div className="project__main">
        {isFilled(p.description) && <p className="project__desc">{p.description}</p>}
        {isFilled(p.stack) && (
          <ul className="chips" aria-label="Technologies">
            {p.stack.map((s) => (
              <li key={s} className="chip">
                {s}
              </li>
            ))}
          </ul>
        )}
        {isFilled(p.note) && <p className="project__note">{p.note}</p>}
        <ProjectLinks project={p} />
      </div>
      {(isFilled(p.role) || isFilled(p.learned)) && (
        <div className="project__side">
          {isFilled(p.role) && (
            <div className="project__block">
              <p className="label">Mon rôle</p>
              <p>{p.role}</p>
            </div>
          )}
          {isFilled(p.learned) && (
            <div className="project__block">
              <p className="label">Ce que j'ai appris</p>
              <p>{p.learned}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ProjectLinks({ project: p }: { project: Project }) {
  const items = [
    isFilled(p.links.live) && { href: p.links.live as string, label: 'Voir le site', icon: <IconGlobe aria-hidden="true" /> },
    isFilled(p.links.github) && { href: p.links.github as string, label: 'Code sur GitHub', icon: <IconGithub aria-hidden="true" /> },
    isFilled(p.links.organization) && { href: p.links.organization as string, label: 'Organisation GitHub', icon: <IconGithub aria-hidden="true" /> },
    isFilled(p.links.current) && { href: p.links.current as string, label: 'Site actuel du club', icon: <IconGlobe aria-hidden="true" /> },
  ].filter(Boolean) as { href: string; label: string; icon: JSX.Element }[];
  if (!items.length) return null;
  return (
    <ul className="project__links">
      {items.map((l) => (
        <li key={l.href}>
          <a className="text-link" href={l.href} target="_blank" rel="noopener noreferrer">
            {l.icon}
            {l.label}
            <IconArrow aria-hidden="true" className="arrow" />
            <span className="sr-only"> : {p.name} (nouvel onglet)</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
