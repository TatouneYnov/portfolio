import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import '@fontsource-variable/archivo/wdth.css';
import '@fontsource-variable/inter/wght.css';
import '@fontsource/jetbrains-mono/latin-400.css';
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
