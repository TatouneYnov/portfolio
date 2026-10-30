import { useEffect, useRef, type ReactNode } from 'react';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import IconTHM from '~icons/simple-icons/tryhackme';
import IconHTB from '~icons/simple-icons/hackthebox';
import IconShield from '~icons/solar/shield-check-linear';
import training from '../data/training.json';
import { frDate, isFilled } from '../lib/content';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealFade, revealWords } from '../lib/reveal';
import { SplitHeading } from '../components/SplitHeading';

/**
 * Terrain d'entraînement en tuiles façon widgets : une grande tuile par plateforme (chiffre phare),
 * des petites tuiles pour les autres stats. Une valeur null dans training.json retire sa tuile ;
 * la grille se recompacte toute seule (grid-auto-flow: dense).
 */
export function Training() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      revealWords(el.querySelector('.training__title'));
      revealFade(el.querySelectorAll('.tile'), el.querySelector('.tiles'), { stagger: 0.05 });
      if (isReducedMotion()) return;
      // Compteurs animés une seule fois, à l'entrée
      el.querySelectorAll<HTMLElement>('[data-count]').forEach((node) => {
        const end = Number(node.dataset.count);
        const obj = { v: 0 };
        gsap.to(obj, {
          v: end,
          duration: 1,
          ease: 'out',
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
  const cert = training.certification;

  return (
    <section ref={root} id="entrainement" className="training section" aria-labelledby="training-title">
      <div className="container">
        <div className="section-head section-head--mirror">
          <SplitHeading id="training-title" className="display display--lg training__title" lines={[{ text: 'Terrain' }, { text: "d'entraînement", accent: true }]} />
          <p className="label section-head__hint">Stats au {frDate(training.updatedAt)}</p>
        </div>

        <ul className="tiles">
          {/* TryHackMe : grande tuile, classement en vedette */}
          <li className="tile glass-card tile--hero tile--thm">
            <PlatformHead icon={<IconTHM aria-hidden="true" />} name="TryHackMe" user={thm.username} since={thm.memberSince} />
            {isFilled(thm.topPercent) && (
              <p className="tile__big">
                <span className="tile__value tile__value--xl">
                  Top&nbsp;<span data-count={thm.topPercent}>{thm.topPercent}</span>&nbsp;%
                </span>
                <span className="tile__caption">des joueurs TryHackMe</span>
              </p>
            )}
            <ProfileLink href={thm.url} name="TryHackMe" />
          </li>

          {isFilled(thm.highestLeague) && <Stat label="Meilleure ligue" value={thm.highestLeague as string} />}
          {isFilled(thm.questionsAnswered) && <Stat label="Questions résolues" value={thm.questionsAnswered as number} />}
          {isFilled(thm.roomsCompleted) && <Stat label="Rooms terminées" value={thm.roomsCompleted as unknown as number} />}
          {isFilled(thm.highestStreak) && <Stat label="Meilleure série" value={thm.highestStreak as number} suffix={' j'} />}

          <li className="tile glass-card tile--cert">
            <IconShield className="tile__icon" aria-hidden="true" />
            <p className="tile__label">Certification TryHackMe</p>
            <p className="tile__value tile__value--sm">{isFilled(cert.name) ? `${cert.name} · en préparation` : 'En préparation'}</p>
          </li>

          {isFilled(thm.badges) && (
            <li className="tile glass-card tile--wide">
              <p className="tile__label">Badges TryHackMe</p>
              <ul className="chips">
                {thm.badges.map((b) => (
                  <li key={b} className="chip">
                    {b}
                  </li>
                ))}
              </ul>
            </li>
          )}

          {/* Hack The Box : grande tuile, niveau en vedette et machines nommées */}
          <li className="tile glass-card tile--hero tile--htb">
            <PlatformHead icon={<IconHTB aria-hidden="true" />} name="Hack The Box" user={htb.username} since={htb.memberSince} />
            {isFilled(htb.level) && (
              <p className="tile__big">
                <span className="tile__value tile__value--xl">
                  <span data-count={htb.level}>{htb.level}</span>
                </span>
                <span className="tile__caption">niveau</span>
              </p>
            )}
            {isFilled(htb.machines) && (
              <div className="tile__machines">
                <p className="tile__label">
                  {(htb.machines as string[]).length} {(htb.machines as string[]).length > 1 ? 'machines résolues' : 'machine résolue'}
                </p>
                <ul className="chips">
                  {(htb.machines as string[]).map((m) => (
                    <li key={m} className="chip">
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ProfileLink href={htb.url} name="Hack The Box" />
          </li>

          {isFilled(thm.pathInProgress) && (
            <li className="tile glass-card tile--wide">
              <p className="tile__label">Parcours TryHackMe en cours</p>
              <p className="tile__value tile__value--sm">{thm.pathInProgress}</p>
            </li>
          )}
          {isFilled(htb.challenges) && <Stat label="Challenges HTB" value={htb.challenges as unknown as number} />}
          {isFilled(htb.sherlocks) && <Stat label="Sherlocks HTB" value={htb.sherlocks as unknown as number} />}
        </ul>
      </div>
    </section>
  );
}

function PlatformHead({ icon, name, user, since }: { icon: ReactNode; name: string; user: string; since: string | null }) {
  return (
    <header className="tile__head">
      <span className="tile__logo">{icon}</span>
      <div>
        <h3 className="tile__name">{name}</h3>
        <p className="tile__user">
          {user}
          {isFilled(since) ? ` · depuis ${frDate(since as string)}` : ''}
        </p>
      </div>
    </header>
  );
}

function Stat({ label, value, suffix }: { label: string; value: number | string; suffix?: string }) {
  return (
    <li className="tile glass-card">
      <p className="tile__label">{label}</p>
      <p className="tile__value">
        {typeof value === 'number' ? <span data-count={value}>{value}</span> : value}
        {suffix}
      </p>
    </li>
  );
}

function ProfileLink({ href, name }: { href: string; name: string }) {
  return (
    <a className="tile__link" href={href} target="_blank" rel="noopener noreferrer">
      Voir le profil <IconArrow aria-hidden="true" />
      <span className="sr-only"> {name} (nouvel onglet)</span>
    </a>
  );
}
