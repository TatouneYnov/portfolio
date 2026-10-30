import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
// Polices du système (SF sur Apple, Segoe UI sur Windows, Roboto sur Android) : rien à télécharger
import './styles/main.css';
import { App } from './App';

const root = document.getElementById('root') as HTMLElement;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// En production, le HTML est pré-rendu : on hydrate. En développement, on monte à vide.
if (root.firstElementChild) hydrateRoot(root, app);
else createRoot(root).render(app);
