import { useEffect, useRef, useState, type FormEvent } from 'react';
import IconArrow from '~icons/solar/arrow-right-up-linear';
import IconCopy from '~icons/solar/copy-linear';
import IconLetter from '~icons/solar/letter-linear';
import IconDoc from '~icons/solar/document-text-linear';
import IconCheck from '~icons/solar/check-circle-linear';
import IconDanger from '~icons/solar/danger-circle-linear';
import IconGithub from '~icons/simple-icons/github';
import IconLinkedin from '~icons/simple-icons/linkedin';
import IconTHM from '~icons/simple-icons/tryhackme';
import IconHTB from '~icons/simple-icons/hackthebox';
import IconDiscord from '~icons/simple-icons/discord';
import profile from '../data/profile.json';
import { FORM_ENDPOINT, FORM_KEY, SITE_URL, asset } from '../lib/env';
import { copyText } from '../lib/toast';
import { gsap, isReducedMotion } from '../lib/motion';
import { revealFade } from '../lib/reveal';
import { SplitHeading } from '../components/SplitHeading';

const SUBJECTS = [
  { value: 'stage', label: 'Stage 170 h' },
  { value: 'alternance', label: 'Alternance B3' },
  { value: 'autre', label: 'Autre' },
];

type Status = 'idle' | 'sending' | 'success' | 'error';
type Field = 'name' | 'email' | 'message';

const MESSAGES: Record<Field, { missing: string; invalid?: string }> = {
  name: { missing: 'Indique ton nom.' },
  email: { missing: 'Indique ton adresse e-mail.', invalid: "Cette adresse e-mail n'a pas l'air valide." },
  message: { missing: 'Écris quelques mots sur ta proposition.' },
};

export function Contact() {
  const root = useRef<HTMLElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [subject, setSubject] = useState('stage');

  useEffect(() => {
    const onSubject = (e: Event) => setSubject((e as CustomEvent<string>).detail);
    window.addEventListener('contact:subject', onSubject);
    return () => window.removeEventListener('contact:subject', onSubject);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      if (!isReducedMotion()) {
        gsap.from(el.querySelectorAll('.contact__title .split__wi'), {
          yPercent: 110,
          duration: 0.9,
          stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 75%', once: true },
        });
        gsap.fromTo(
          '.contact__title',
          { letterSpacing: '0.04em' },
          { letterSpacing: '-0.01em', ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 20%', scrub: true } },
        );
      }
      revealFade(el.querySelectorAll('.contact__form, .quick-links li'), el.querySelector('.contact__grid'), { stagger: 0.05 });
    }, el);
    return () => ctx.revert();
  }, []);

  const validate = (target: HTMLInputElement | HTMLTextAreaElement): string | undefined => {
    const name = target.name as Field;
    const msg = MESSAGES[name];
    if (!msg) return undefined;
    if (target.validity.valueMissing) return msg.missing;
    if (target.validity.typeMismatch && msg.invalid) return msg.invalid;
    return undefined;
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const error = validate(e.currentTarget);
    setErrors((prev) => ({ ...prev, [e.currentTarget.name]: error }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const next: Partial<Record<Field, string>> = {};
    (['name', 'email', 'message'] as Field[]).forEach((n) => {
      const input = f.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement;
      const err = validate(input);
      if (err) next[n] = err;
    });
    setErrors(next);
    const firstError = (Object.keys(next) as Field[])[0];
    if (firstError) {
      (f.elements.namedItem(firstError) as HTMLElement).focus();
      return;
    }
    const data = new FormData(f);
    if (data.get('botcheck')) return; // honeypot rempli : robot
    setStatus('sending');
    try {
      const payload = Object.fromEntries(data.entries());
      payload.subject = `Portfolio · ${SUBJECTS.find((s) => s.value === payload.topic)?.label ?? 'Contact'}`;
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean };
      if (!res.ok || json.success === false) throw new Error('send failed');
      setStatus('success');
      f.reset();
    } catch {
      setStatus('error');
    }
  };

  const fieldProps = (name: Field) => ({
    name,
    id: `f-${name}`,
    required: true,
    onBlur,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `f-${name}-error` : undefined,
  });

  return (
    <section ref={root} id="contact" className="contact section" aria-labelledby="contact-title">
      <div className="container">
        <SplitHeading id="contact-title" className="display display--xxl contact__title" lines={[{ text: 'Travaillons' }, { text: 'ensemble', accent: true }]} />

        <div className="contact__grid">
          {FORM_KEY ? (
            <form ref={form} className="contact__form" action={FORM_ENDPOINT} method="POST" noValidate onSubmit={onSubmit}>
              <input type="hidden" name="access_key" value={FORM_KEY} />
              <input type="hidden" name="from_name" value="Portfolio ethanbacquier" />
              <input type="hidden" name="redirect" value={`${SITE_URL}/merci.html`} />
              <div className="hp" aria-hidden="true">
                <label htmlFor="f-botcheck">Ne pas remplir</label>
                <input type="checkbox" id="f-botcheck" name="botcheck" tabIndex={-1} autoComplete="off" />
              </div>

              <div className="field">
                <label htmlFor="f-name">Nom <span aria-hidden="true">*</span></label>
                <input type="text" autoComplete="name" {...fieldProps('name')} />
                {errors.name && <p id="f-name-error" className="field__error">{errors.name}</p>}
              </div>
              <div className="field">
                <label htmlFor="f-email">E-mail <span aria-hidden="true">*</span></label>
                <input type="email" autoComplete="email" inputMode="email" {...fieldProps('email')} />
                {errors.email && <p id="f-email-error" className="field__error">{errors.email}</p>}
              </div>
              <div className="field">
                <label htmlFor="f-company">Entreprise <span className="field__opt">(optionnel)</span></label>
                <input type="text" id="f-company" name="company" autoComplete="organization" />
              </div>
              <div className="field">
                <label htmlFor="f-topic">Objet</label>
                <select id="f-topic" name="topic" value={subject} onChange={(e) => setSubject(e.target.value)}>
                  {SUBJECTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field field--full">
                <label htmlFor="f-message">Message <span aria-hidden="true">*</span></label>
                <textarea rows={6} {...fieldProps('message')} />
                {errors.message && <p id="f-message-error" className="field__error">{errors.message}</p>}
              </div>

              <div className="contact__actions">
                <button type="submit" className="btn btn--primary" disabled={status === 'sending'} aria-busy={status === 'sending'}>
                  {status === 'sending' ? (
                    <>
                      <span className="spinner" aria-hidden="true" /> Envoi…
                    </>
                  ) : (
                    <>
                      Envoyer <IconArrow aria-hidden="true" />
                    </>
                  )}
                </button>
                <p className="contact__privacy">Tes données servent uniquement à te répondre.</p>
              </div>
              <div className="contact__feedback" role="status" aria-live="polite">
                {status === 'success' && (
                  <p className="notice notice--ok">
                    <IconCheck aria-hidden="true" /> Message reçu, je te réponds vite ✓
                  </p>
                )}
                {status === 'error' && (
                  <p className="notice notice--error">
                    <IconDanger aria-hidden="true" /> L'envoi n'a pas abouti. Écris-moi directement à{' '}
                    <a href={`mailto:${profile.email}`}>{profile.email}</a>.
                  </p>
                )}
              </div>
            </form>
          ) : (
            <div className="contact__form contact__direct">
              <p className="label">Écris-moi directement</p>
              <p className="contact__direct-mail">{profile.email}</p>
              <div className="contact__direct-actions">
                <a className="btn btn--primary" href={`mailto:${profile.email}?subject=${encodeURIComponent('Stage 170 h')}`}>
                  Écrire un e-mail <IconArrow aria-hidden="true" />
                </a>
                <button type="button" className="btn btn--ghost" onClick={() => copyText(profile.email, 'Adresse copiée ✓')}>
                  <IconCopy aria-hidden="true" /> Copier l'adresse
                </button>
              </div>
              <p className="contact__privacy">Pour un stage, précise la période et le type de missions : je réponds vite.</p>
            </div>
          )}

          <ul className="quick-links" aria-label="Me retrouver">
            <li>
              <button type="button" className="quick-link" onClick={() => copyText(profile.email, 'Adresse copiée ✓')}>
                <IconLetter aria-hidden="true" />
                <span className="quick-link__label">E-mail</span>
                <span className="quick-link__meta">copier</span>
                <IconCopy className="arrow" aria-hidden="true" />
              </button>
            </li>
            <QuickLink href={profile.links.linkedin} label="LinkedIn" icon={<IconLinkedin aria-hidden="true" />} />
            <QuickLink href={profile.links.github} label="GitHub" icon={<IconGithub aria-hidden="true" />} />
            <QuickLink href={profile.links.tryhackme} label="TryHackMe" icon={<IconTHM aria-hidden="true" />} />
            <QuickLink href={profile.links.hackthebox} label="Hack The Box" icon={<IconHTB aria-hidden="true" />} />
            <li>
              <button type="button" className="quick-link" onClick={() => copyText(profile.discord, 'Pseudo Discord copié ✓')}>
                <IconDiscord aria-hidden="true" />
                <span className="quick-link__label">Discord</span>
                <span className="quick-link__meta">{profile.discord} · copier</span>
                <IconCopy className="arrow" aria-hidden="true" />
              </button>
            </li>
            <li>
              {profile.cv.available ? (
                <a className="quick-link" href={asset(profile.cv.path)} download>
                  <IconDoc aria-hidden="true" />
                  <span className="quick-link__label">CV</span>
                  <span className="quick-link__meta">PDF</span>
                  <IconArrow className="arrow" aria-hidden="true" />
                </a>
              ) : (
                <span className="quick-link is-disabled" aria-disabled="true">
                  <IconDoc aria-hidden="true" />
                  <span className="quick-link__label">CV</span>
                  <span className="quick-link__meta">bientôt</span>
                </span>
              )}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: JSX.Element }) {
  return (
    <li>
      <a className="quick-link" href={href} target="_blank" rel="noopener noreferrer">
        {icon}
        <span className="quick-link__label">{label}</span>
        <IconArrow className="arrow" aria-hidden="true" />
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </li>
  );
}
