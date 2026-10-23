import { Fragment, type ElementType } from 'react';

export type HeadingLine = { text: string; accent?: boolean };

type Props = {
  as?: ElementType;
  id?: string;
  className?: string;
  lines: HeadingLine[];
};

/**
 * Titre découpé en mots pour la révélation mot par mot.
 * Le nom accessible reste le texte complet (aria-label) ; les mots découpés sont aria-hidden
 * et restent visibles sans JavaScript.
 */
export function SplitHeading({ as: Tag = 'h2', id, className = '', lines }: Props) {
  const label = lines.map((l) => l.text).join(' ');
  return (
    <Tag id={id} className={`split ${className}`} aria-label={label}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {/* espace entre les lignes : le texte brut (moteurs de recherche, copier-coller) reste « Ethan Bacquier » */}
          {li > 0 ? ' ' : null}
          <span className={`split__line${line.accent ? ' tone-2' : ''}`} aria-hidden="true">
          {line.text.split(' ').map((word, wi) => (
            <Fragment key={wi}>
              {wi > 0 ? ' ' : null}
              <span className="split__w">
                <span className="split__wi">{word}</span>
              </span>
            </Fragment>
          ))}
          </span>
        </Fragment>
      ))}
    </Tag>
  );
}
