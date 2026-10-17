import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import IconGithub from '~icons/simple-icons/github';
import IconGlobe from '~icons/solar/global-linear';
import IconClose from '~icons/solar/close-linear';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import { projects, isFilled, type Project } from '../lib/content';
import { canRun3D, getCapabilities } from '../lib/capabilities';
import { useInView, useMounted } from '../lib/hooks';
import { useIdleMount } from '../lib/warm';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { asset } from '../lib/env';
import { SplitHeading } from '../components/SplitHeading';

const BubblesScene = lazy(() => import('../three/BubblesScene'));

export type DockRequest = { id: string; n: number } | null;

export function Projects() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const tip = useRef<HTMLDivElement>(null);
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

  const close = () => {
    setDocked(null);
    const target = returnFocus.current;
    returnFocus.current = null;
    target?.focus();
  };

  const current = projects.find((p) => p.id === docked) ?? null;
  const show3D = mounted && use3D;

  return (
    <section ref={root} id="projets" className="projects section" aria-labelledby="projects-title">
      <div className="container">
        <div className="section-head">
          <SplitHeading
            id="projects-title"
            className="display display--lg projects__title"
            lines={[{ text: 'Mes' }, { text: 'projets', accent: true }]}
          />
          {show3D && (
            <p className="label section-head__hint">
              Clique sur une bulle pour ouvrir le projet
              <span className="section-head__hint-sub">ou glisse-la dans le socle →</span>
            </p>
          )}
        </div>
      </div>

      {show3D ? (
        <div className="projects__stage-wrap">
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
                  onLost={() => setUse3D(false)}
                />
              </Suspense>
            )}
            <div ref={tip} className="bubble-tip" />
          </div>

          <div className="container">
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
          </div>

          <ProjectPanel project={current} onClose={close} />
        </div>
      ) : (
        <div className="container">
          <ul className="projects__grid">
            {projects.map((p) => (
              <li key={p.id} className="project-card">
                <ProjectDetails project={p} headingLevel="h3" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function ProjectPanel({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  const [shown, setShown] = useState<Project | null>(project);

  useEffect(() => {
    if (project) setShown(project);
  }, [project]);

  useEffect(() => {
    if (!project) return;
    panel.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [project, onClose]);

  return (
    <aside
      ref={panel}
      className={`project-panel${project ? ' is-open' : ''}${isReducedMotion() ? ' no-anim' : ''}`}
      aria-labelledby="project-panel-title"
      aria-hidden={!project}
      tabIndex={-1}
      {...(!project ? { inert: '' } : {})}
    >
      {shown && (
        <>
          <button type="button" className="project-panel__close" onClick={onClose}>
            <IconClose aria-hidden="true" />
            <span className="sr-only">Fermer la fiche projet</span>
          </button>
          <ProjectDetails project={shown} headingLevel="h3" headingId="project-panel-title" />
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
        {isFilled(p.status) && <p className="pill">{p.status}</p>}
        <H id={headingId} className="project__name">
          {p.name}
        </H>
        {isFilled(p.context) && <p className="project__context">{p.context}</p>}
      </div>
      {isFilled(p.description) && <p className="project__desc">{p.description}</p>}
      {isFilled(p.role) && (
        <div className="project__block">
          <p className="label">Mon rôle</p>
          <p>{p.role}</p>
        </div>
      )}
      {isFilled(p.stack) && (
        <ul className="chips" aria-label="Technologies">
          {p.stack.map((s) => (
            <li key={s} className="chip">
              {s}
            </li>
          ))}
        </ul>
      )}
      {isFilled(p.learned) && (
        <div className="project__block">
          <p className="label">Ce que j'ai appris</p>
          <p>{p.learned}</p>
        </div>
      )}
      {isFilled(p.note) && <p className="project__note">{p.note}</p>}
      <ProjectLinks project={p} />
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
