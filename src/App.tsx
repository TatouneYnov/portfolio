import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Loader } from './components/Loader';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Backdrop } from './components/Backdrop';
import { Hero } from './sections/Hero';
import { About } from './sections/About';
import { WhatIDo } from './sections/WhatIDo';
import { Journey } from './sections/Journey';
import { Toolbox } from './sections/Toolbox';
import { Training } from './sections/Training';
import { Projects } from './sections/Projects';
import { Availability } from './sections/Availability';
import { Testimonials } from './sections/Testimonials';
import { Contact } from './sections/Contact';
import { Footer } from './sections/Footer';
import { bindAnchorLinks, refreshScroll, startMotion } from './lib/motion';
import { canRun3D, getCapabilities } from './lib/capabilities';
import { useMounted } from './lib/hooks';
import { preload3D, scheduleIdleMount } from './lib/warm';

const AvatarStage = lazy(() => import('./three/AvatarStage'));

export function App() {
  const mounted = useMounted();
  const [stage, setStage] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('js');
    const stopMotion = startMotion();
    const unbind = bindAnchorLinks();
    const caps = getCapabilities();
    if (caps.reducedMotion) document.documentElement.classList.add('reduced-motion');
    // Avatar animé seulement si WebGL, pas de préférence « moins d'animations » et appareil assez puissant
    if (canRun3D() && !caps.lowEnd) setStage(true);
    else {
      (window as Window & { __stageReady?: boolean }).__stageReady = true;
      window.dispatchEvent(new Event('stage:ready'));
    }
    preload3D();
    scheduleIdleMount();
    const onLost = () => setStage(false);
    window.addEventListener('webgl:lost', onLost);
    return () => {
      stopMotion();
      unbind();
      window.removeEventListener('webgl:lost', onLost);
    };
  }, []);

  const onLoaded = useCallback(() => {
    document.documentElement.classList.add('is-loaded');
    window.dispatchEvent(new Event('app:loaded'));
    refreshScroll();
  }, []);

  return (
    <>
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <Loader onDone={onLoaded} />
      <Backdrop />
      <Header />
      <main id="contenu">
        <Hero />
        <About />
        <WhatIDo />
        <Journey />
        <Toolbox />
        <Training />
        <Projects />
        <Testimonials />
        <Availability />
        <Contact />
      </main>
      <Footer />
      {mounted && stage && (
        <Suspense fallback={null}>
          <AvatarStage onLost={() => setStage(false)} />
        </Suspense>
      )}
      <Toast />
    </>
  );
}
