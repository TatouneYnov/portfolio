import type { ReactNode } from 'react';

/** Cadre en tirets avec équerres aux quatre coins. */
export function Frame({ children, className = '', as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'article' | 'li' }) {
  return (
    <Tag className={`frame ${className}`}>
      <span className="frame__c frame__c--tl" aria-hidden="true" />
      <span className="frame__c frame__c--tr" aria-hidden="true" />
      <span className="frame__c frame__c--bl" aria-hidden="true" />
      <span className="frame__c frame__c--br" aria-hidden="true" />
      {children}
    </Tag>
  );
}
