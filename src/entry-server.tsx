import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';

/** Rendu statique de la page (utilisé au build pour pré-remplir index.html). */
export function render(): string {
  return renderToString(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
