import projectsData from '../data/projects.json';
import timelineData from '../data/timeline.json';

/** Une valeur s'affiche seulement si elle est renseignée pour de vrai (jamais "TODO", jamais vide). */
export function isFilled<T>(value: T | null | undefined): value is T {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') {
    const v = value.trim();
    return v.length > 0 && !/^todo\b/i.test(v);
  }
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export type ProjectLinks = {
  github: string | null;
  organization: string | null;
  live: string | null;
  current: string | null;
};

export type Project = {
  id: string;
  name: string;
  /** Une ligne sous le nom dans la fiche (null : rien) */
  tagline: string | null;
  bubbleLabel: string;
  size: number;
  status: string | null;
  role: string | null;
  context: string | null;
  description: string | null;
  stack: string[];
  learned: string | null;
  note: string | null;
  links: ProjectLinks;
  image: string | null;
  draft: boolean;
};

export const projects: Project[] = (projectsData.projects as Project[]).filter((p) => !p.draft);

export type TimelineItem = {
  title: string;
  place: string;
  year: string;
  text: string;
  link?: { label: string; href: string };
  upcoming: boolean;
  subtle?: boolean;
  draft: boolean;
};

export const timeline: TimelineItem[] = (timelineData.items as TimelineItem[]).filter((t) => !t.draft);

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
/** "2024-10" → "oct. 2024" ; "2026-10-17" → "17 oct. 2026" */
export function frDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const month = MONTHS[(m || 1) - 1];
  return d ? `${d} ${month} ${y}` : `${month} ${y}`;
}
