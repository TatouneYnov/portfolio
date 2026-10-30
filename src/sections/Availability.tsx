import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import IconLeft from '~icons/solar/alt-arrow-left-linear';
import IconRight from '~icons/solar/alt-arrow-right-linear';
import IconArrow from '~icons/solar/arrow-right-linear';
import data from '../data/availability.json';
import { gsap, scrollToHash } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { useMounted } from '../lib/hooks';
import { project, rubberband, springTo, velocityTracker, type Spring } from '../lib/spring';
import { SplitHeading } from '../components/SplitHeading';

type DayState = 'morning' | 'full' | 'holiday' | 'weekend' | 'past' | 'out';
type Day = { date: Date; iso: string; state: DayState } | null;
type Month = { key: string; title: string; weeks: Day[][]; last: Date };

const parse = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtMonth = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' });
const fmtShort = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const LABELS: Record<DayState, string> = {
  morning: 'matin dispo (8h–12h)',
  full: 'journée complète',
  holiday: 'jour férié',
  weekend: 'week-end',
  past: 'date passée',
  out: 'hors période',
};

function buildMonths(today: Date | null): Month[] {
  const start = parse(data.start);
  const end = parse(data.end);
  const holidays = new Set(data.holidays);
  const full = data.fullWeeks.map((w) => [parse(w.from), parse(w.to)] as const);
  const months: Month[] = [];
  for (let cursor = new Date(start.getFullYear(), start.getMonth(), 1); cursor <= end; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const lead = (new Date(y, m, 1).getDay() + 6) % 7; // lundi = 0
    const cells: Day[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const iso = isoOf(date);
      const dow = (date.getDay() + 6) % 7;
      let state: DayState;
      if (date < start || date > end) state = 'out';
      else if (dow >= 5) state = 'weekend';
      else if (holidays.has(iso)) state = 'holiday';
      else if (full.some(([a, b]) => date >= a && date <= b)) state = 'full';
      else state = 'morning';
      if (today && date < today && state !== 'weekend' && state !== 'out') state = 'past';
      cells.push({ date, iso, state });
    }
    while (cells.length % 7) cells.push(null);
    const weeks: Day[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    months.push({ key: `${y}-${m}`, title: cap(fmtMonth.format(cursor)), weeks, last: new Date(y, m, daysInMonth) });
  }
  return today ? months.filter((mo) => mo.last >= today) : months;
}

/** Nombre de jours de semaine à temps plein encore à venir (pour le résumé au-dessus du calendrier). */
function fullWeekdays(today: Date | null) {
  let n = 0;
  data.fullWeeks.forEach((w) => {
    for (let d = parse(w.from); d <= parse(w.to); d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      if ((d.getDay() + 6) % 7 < 5 && (!today || d >= today)) n++;
    }
  });
  return n;
}

export function Availability() {
  const root = useRef<HTMLElement>(null);
  const mounted = useMounted();
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const months = useMemo(() => buildMonths(today), [today]);
  const weeks = Math.round(fullWeekdays(today) / 5);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.dispo__title'));
      revealFade(el.querySelectorAll('.dispo__fact'), el.querySelector('.dispo__facts'), { stagger: 0.08 });
      revealFade(el.querySelector('.dispo__cal'), el.querySelector('.dispo__cal'));
    }, el);
    return () => ctx.revert();
  }, []);

  const propose = (topic: 'stage' | 'alternance' = 'stage') => {
    window.dispatchEvent(new CustomEvent('contact:subject', { detail: topic }));
    scrollToHash('#contact');
  };
  const alt = data.alternance;

  return (
    <section ref={root} id="dispos" className="dispo section" aria-labelledby="dispo-title">
      <div className="container">
        <SplitHeading id="dispo-title" className="display display--lg dispo__title" lines={[{ text: 'Quand' }, { text: 'je suis dispo', accent: true }]} />
        <div className="dispo__grid">
          <div className="dispo__facts">
            <ul>
              {data.facts.map((f) => (
                <li key={f} className="dispo__fact">
                  {f}
                </li>
              ))}
            </ul>
            <p className="dispo__example">{data.example}</p>
            <p className="dispo__other">{data.otherPeriods}</p>
            <a className="btn btn--primary" href="#contact" onClick={(e) => (e.preventDefault(), propose())}>
              Me proposer un créneau <IconArrow aria-hidden="true" />
            </a>
            {alt && (
              <div className="dispo__alt">
                <p className="label">{alt.title}</p>
                <p>{alt.text}</p>
                <p className="dispo__alt-rhythm">{alt.rhythm}</p>
                <a className="text-link" href="#contact" onClick={(e) => (e.preventDefault(), propose('alternance'))}>
                  {alt.cta} <span className="arrow" aria-hidden="true">→</span>
                </a>
              </div>
            )}
          </div>

          <div className="dispo__cal glass-card">
            {weeks > 0 && (
              <p className="cal__summary">
                <strong>
                  {weeks} semaine{weeks > 1 ? 's' : ''} à temps plein
                </strong>{' '}
                · sinon les matins ({data.morningHours})
              </p>
            )}
            <Calendar months={months} interactive={mounted} />
            <ul className="cal__legend" aria-label="Légende">
              <li>
                <span className="cal__key cal__key--morning" aria-hidden="true" /> Matin dispo
              </li>
              <li>
                <span className="cal__key cal__key--full" aria-hidden="true" /> Journée complète
              </li>
              <li>
                <span className="cal__key cal__key--off" aria-hidden="true" /> Férié, passé ou week-end
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Calendrier façon app Calendrier d'iOS : un mois à la fois. Au doigt (ou à la souris), le mois suit le
 * geste 1:1, résiste à l'élastique aux extrémités, puis se cale sur le mois visé avec un ressort qui
 * reprend la vitesse du lâcher. Sans JavaScript, tous les mois s'affichent en grille (voir main.css).
 */
function Calendar({ months, interactive }: { months: Month[]; interactive: boolean }) {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pos = useRef(0); // décalage affiché du ruban, en px
  const spring = useRef<Spring | null>(null);
  const drag = useRef<{ id: number; x0: number; y0: number; base: number; active: boolean } | null>(null);
  const tracker = useRef(velocityTracker());
  const count = months.length;

  const width = () => viewport.current?.clientWidth ?? 1;
  const apply = useCallback((x: number) => {
    pos.current = x;
    if (track.current) track.current.style.transform = `translate3d(${x}px, 0, 0)`;
  }, []);

  const goTo = useCallback(
    (target: number, velocity = 0) => {
      const i = Math.max(0, Math.min(count - 1, target));
      setIndex(i);
      spring.current?.stop();
      // Un léger rebond seulement si le geste a été lancé (Apple : amortissement ~0,8 après un mouvement)
      spring.current = springTo(pos.current, -i * width(), { velocity, damping: Math.abs(velocity) > 400 ? 0.85 : 1, response: 0.35, onUpdate: apply });
    },
    [apply, count],
  );

  // Mois hors champ : retirés de la tabulation et des lecteurs d'écran
  useEffect(() => {
    track.current?.querySelectorAll<HTMLElement>('.cal__month').forEach((m, i) => {
      m.toggleAttribute('inert', interactive && i !== index);
    });
  }, [index, interactive, count]);

  // Nombre de mois qui change (mois passés retirés) ou redimensionnement : on recale sans animation
  useEffect(() => {
    if (!interactive) return;
    const fit = () => apply(-Math.min(index, count - 1) * width());
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactive, count]);
  useEffect(() => () => spring.current?.stop(), []);

  const onPointerDown = (e: PointerEvent) => {
    if (!interactive || (e.pointerType === 'mouse' && e.button !== 0)) return;
    // On rattrape le mois là où il est, même en plein mouvement
    spring.current?.stop();
    drag.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, base: pos.current, active: false };
    tracker.current.reset();
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    if (!d.active) {
      // 10 px de marge avant de décider : glisser horizontal = changer de mois, vertical = défiler la page
      if (Math.abs(dx) < 10) return;
      if (Math.abs(e.clientY - d.y0) > Math.abs(dx)) {
        drag.current = null;
        return;
      }
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const w = width();
    const min = -(count - 1) * w;
    let x = d.base + dx;
    if (x > 0) x = rubberband(x, w);
    else if (x < min) x = min + rubberband(x - min, w);
    apply(x);
    tracker.current.add(e.clientX);
  };
  const onPointerUp = (e: PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.active) {
      goTo(index); // simple appui : on termine le calage en cours
      return;
    }
    const v = tracker.current.get();
    const w = width();
    // Où le geste emmènerait le mois (projection), puis on se cale au mois voisin dans ce sens
    const landing = Math.round(-(pos.current + project(v)) / w);
    const target = Math.max(index - 1, Math.min(index + 1, landing));
    goTo(target, v);
  };

  const current = months[Math.min(index, count - 1)];

  return (
    <div className="cal">
      <div className="cal__head">
        <h3 className="cal__title" aria-live="polite">
          {current?.title}
        </h3>
        <div className="cal__nav">
          <button type="button" className="icon-btn" onClick={() => goTo(index - 1)} disabled={!interactive || index === 0}>
            <IconLeft aria-hidden="true" />
            <span className="sr-only">Mois précédent</span>
          </button>
          <button type="button" className="icon-btn" onClick={() => goTo(index + 1)} disabled={!interactive || index >= count - 1}>
            <IconRight aria-hidden="true" />
            <span className="sr-only">Mois suivant</span>
          </button>
        </div>
      </div>
      <div
        ref={viewport}
        className="cal__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={track} className="cal__track">
          {months.map((month) => (
            <MonthGrid key={month.key} month={month} />
          ))}
        </div>
      </div>
    </div>
  );
}

function MonthGrid({ month }: { month: Month }) {
  const titleId = `month-${month.key}`;
  return (
    <table className="cal__month" role="grid" aria-labelledby={titleId}>
      <caption id={titleId} className="sr-only">
        {month.title}
      </caption>
      <thead>
        <tr>
          {['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'].map((d) => (
            <th key={d} scope="col" abbr={d}>
              <span aria-hidden="true">{d.charAt(0).toUpperCase()}</span>
              <span className="sr-only">{d}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {month.weeks.map((week, wi) => (
          <tr key={wi}>
            {week.map((day, di) =>
              day ? (
                <td key={day.iso} role="gridcell" className={`day day--${day.state}`} aria-label={`${cap(fmtShort.format(day.date))} · ${LABELS[day.state]}`}>
                  <span className="day__num" aria-hidden="true">
                    {day.date.getDate()}
                  </span>
                </td>
              ) : (
                <td key={`e${wi}-${di}`} className="day day--empty" role="presentation" />
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
