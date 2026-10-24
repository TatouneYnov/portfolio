import { useEffect, useRef } from 'react';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import IconTHM from '~icons/simple-icons/tryhackme';
import IconHTB from '~icons/simple-icons/hackthebox';
import IconShield from '~icons/solar/shield-check-linear';
import training from '../data/training.json';
import { frDate, isFilled } from '../lib/content';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { SplitHeading } from '../components/SplitHeading';
import { Frame } from '../components/Frame';

type Stat = { label: string; value: number | string; prefix?: string; suffix?: string };

export function Training() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.training__title'));
      revealFade(el.querySelectorAll('.platform'), el.querySelector('.training__grid'), { stagger: 0.12 });
      if (isReducedMotion()) return;
      // Compteurs animés une seule fois, à l'entrée
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
        const end = Number(node.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1.4,
          ease: 'power2.out',
          scrollTrigger: { trigger: node, start: 'top 90%', once: true },
          onStart: () => {
            node.textContent = '0';
          },
          onUpdate: () => {
            node.textContent = String(Math.round(obj.v));
          },
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const thm = training.tryhackme;
  const htb = training.hackthebox;

  const thmStats: Stat[] = [
    isFilled(thm.topPercent) && { label: 'Classement', value: thm.topPercent as number, prefix: 'Top\u00a0', suffix: '\u00a0%' },
    isFilled(thm.highestLeague) && { label: 'Meilleure ligue', value: thm.highestLeague as string },
    isFilled(thm.roomsCompleted) && { label: 'Rooms terminées', value: thm.roomsCompleted as unknown as number },
    isFilled(thm.questionsAnswered) && { label: 'Questions résolues', value: thm.questionsAnswered as number },
    isFilled(thm.highestStreak) && { label: 'Meilleure série', value: thm.highestStreak as number, suffix: '\u00a0j' },
  ].filter(Boolean) as Stat[];

  const htbStats: Stat[] = [
    isFilled(htb.level) && { label: 'Niveau', value: htb.level as number },
    isFilled(htb.machines) && { label: 'Machines', value: (htb.machines as string[]).length },
    isFilled(htb.challenges) && { label: 'Challenges', value: htb.challenges as unknown as number },
    isFilled(htb.sherlocks) && { label: 'Sherlocks', value: htb.sherlocks as unknown as number },
  ].filter(Boolean) as Stat[];

  return (
    <section ref={root} id="entrainement" className="training section" aria-labelledby="training-title">
      <div className="container">
        <div className="section-head section-head--mirror">
          <SplitHeading
            id="training-title"
            className="display display--lg training__title"
            lines={[{ text: "Terrain" }, { text: "d'entraînement", accent: true }]}
          />
          <p className="label section-head__hint">Stats au {frDate(training.updatedAt)}</p>
        </div>

        <div className="training__grid">
          <Frame as="article" className="platform">
            <header className="platform__head">
              <IconTHM className="platform__logo" aria-hidden="true" />
              <div>
                <h3 className="platform__name">TryHackMe</h3>
                <p className="platform__user">{thm.username}{isFilled(thm.memberSince) ? ` · depuis ${frDate(thm.memberSince)}` : ''}</p>
              </div>
            </header>
            <StatList stats={thmStats} />
            {isFilled(thm.badges) && (
              <div className="platform__block">
                <p className="label">Badges</p>
                <ul className="chips">
                  {thm.badges.map((b) => (
                    <li key={b} className="chip">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isFilled(thm.pathInProgress) && (
              <p className="platform__path">
                <span className="label">Parcours en cours</span> {thm.pathInProgress}
              </p>
            )}
            <a className="btn btn--ghost platform__cta" href={thm.url} target="_blank" rel="noopener noreferrer">
              Voir le profil <IconArrow aria-hidden="true" />
              <span className="sr-only"> TryHackMe (nouvel onglet)</span>
            </a>
          </Frame>

          <Frame as="article" className="platform">
            <header className="platform__head">
              <IconHTB className="platform__logo" aria-hidden="true" />
              <div>
                <h3 className="platform__name">Hack The Box</h3>
                <p className="platform__user">{htb.username}{isFilled(htb.memberSince) ? ` · depuis ${frDate(htb.memberSince)}` : ''}</p>
              </div>
            </header>
            <StatList stats={htbStats} />
            {isFilled(htb.machines) && (
              <div className="platform__block">
                <p className="label">Machines résolues</p>
                <ul className="chips">
                  {htb.machines.map((m) => (
                    <li key={m} className="chip">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a className="btn btn--ghost platform__cta" href={htb.url} target="_blank" rel="noopener noreferrer">
              Voir le profil <IconArrow aria-hidden="true" />
              <span className="sr-only"> Hack The Box (nouvel onglet)</span>
            </a>
          </Frame>
        </div>

        <p className="cert-pill">
          <IconShield aria-hidden="true" />
          {isFilled(training.certification.name)
            ? `Certification TryHackMe ${training.certification.name} : en préparation`
            : 'Certification TryHackMe : en préparation'}
        </p>
      </div>
    </section>
  );
}

function StatList({ stats }: { stats: Stat[] }) {
  if (!stats.length) return null;
  return (
    <dl className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stats__item">
          <dt className="label">{s.label}</dt>
          <dd className="stats__value">
            {s.prefix}
            {typeof s.value === 'number' ? <span data-count={s.value}>{s.value}</span> : s.value}
            {s.suffix}
          </dd>
        </div>
      ))}
    </dl>
  );
}
