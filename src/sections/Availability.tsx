import { useEffect, useMemo, useRef, useState } from 'react';
import IconLeft from '~icons/solar/alt-arrow-left-linear';
import IconRight from '~icons/solar/alt-arrow-right-linear';
import IconArrow from '~icons/solar/arrow-right-linear';
import data from '../data/availability.json';
import { gsap, isReducedMotion, scrollToHash } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { useMediaQuery, useMounted } from '../lib/hooks';
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

export function Availability() {
  const root = useRef<HTMLElement>(null);
  const cal = useRef<HTMLDivElement>(null);
  const mounted = useMounted();
  const mobile = useMediaQuery('(max-width: 767px)');
  const [today, setToday] = useState<Date | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  }, []);

  const months = useMemo(() => buildMonths(today), [today]);
  const perPage = mounted && mobile ? 1 : 4;
  const pages = Math.max(1, Math.ceil(months.length / perPage));
  const safePage = Math.min(page, pages - 1);
  const visible = months.slice(safePage * perPage, safePage * perPage + perPage);

  useEffect(() => setPage(0), [perPage]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.dispo__title'));
      revealFade(el.querySelectorAll('.dispo__fact'), el.querySelector('.dispo__facts'), { stagger: 0.08 });
    }, el);
    return () => ctx.revert();
  }, []);

  // Remplissage en cascade (diagonale) à l'entrée, puis à chaque changement de page
  const played = useRef(false);
  useEffect(() => {
    const el = cal.current;
    if (!el || !mounted || isReducedMotion()) return;
    const cells = el.querySelectorAll<HTMLElement>('.day__fill');
    const anim = () =>
      gsap.fromTo(cells, { scale: 0.4, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: 'power2.out', stagger: (_i, t) => Number((t as HTMLElement).dataset.diag) * 0.01 });
    if (played.current) {
      anim();
      return;
    }
    const st = gsap.context(() => {
      gsap.set(cells, { scale: 0.4, autoAlpha: 0 });
      gsap.to(cells, {
        scale: 1,
        autoAlpha: 1,
        duration: 0.35,
        ease: 'power2.out',
        stagger: (_i, t) => Number((t as HTMLElement).dataset.diag) * 0.01,
        scrollTrigger: { trigger: el, start: 'top 80%', once: true, onEnter: () => (played.current = true) },
      });
    }, el);
    return () => st.revert();
  }, [mounted, safePage, perPage, today]);

  // Balayage horizontal sur mobile
  const swipe = useRef<number | null>(null);

  const propose = () => {
    window.dispatchEvent(new CustomEvent('contact:subject', { detail: 'stage' }));
    scrollToHash('#contact');
  };

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
          </div>

          <div className="dispo__cal">
            <div className="dispo__cal-head">
              <ul className="dispo__legend" aria-label="Légende">
                <li><span className="day__fill day__fill--morning" aria-hidden="true" /> Matin dispo</li>
                <li><span className="day__fill day__fill--full" aria-hidden="true" /> Journée complète</li>
                <li><span className="day__fill day__fill--off" aria-hidden="true" /> Férié, passé ou week-end</li>
              </ul>
              {mounted && pages > 1 && (
                <div className="dispo__pager">
                  <button type="button" className="icon-btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}>
                    <IconLeft aria-hidden="true" />
                    <span className="sr-only">{perPage === 1 ? 'Mois précédent' : 'Mois précédents'}</span>
                  </button>
                  <span className="label" aria-live="polite">
                    {visible[0]?.title}
                    {visible.length > 1 ? ` – ${visible[visible.length - 1].title}` : ''}
                  </span>
                  <button type="button" className="icon-btn" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={safePage >= pages - 1}>
                    <IconRight aria-hidden="true" />
                    <span className="sr-only">{perPage === 1 ? 'Mois suivant' : 'Mois suivants'}</span>
                  </button>
                </div>
              )}
            </div>
            <div
              ref={cal}
              className={`months${perPage === 1 ? ' months--single' : ''}`}
              onPointerDown={(e) => (swipe.current = e.clientX)}
              onPointerUp={(e) => {
                if (swipe.current === null || perPage !== 1) return;
                const dx = e.clientX - swipe.current;
                swipe.current = null;
                if (dx < -50) setPage((p) => Math.min(pages - 1, p + 1));
                if (dx > 50) setPage((p) => Math.max(0, p - 1));
              }}
            >
              {visible.map((month) => (
                <MonthGrid key={month.key} month={month} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthGrid({ month }: { month: Month }) {
  const titleId = `month-${month.key}`;
  return (
    <table className="month" role="grid" aria-labelledby={titleId}>
      <caption id={titleId} className="month__title">
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
                <td
                  key={day.iso}
                  role="gridcell"
                  className={`day day--${day.state}`}
                  aria-label={`${cap(fmtShort.format(day.date))} · ${LABELS[day.state]}`}
                >
                  <span className="day__fill" data-diag={wi + di} aria-hidden="true" />
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
