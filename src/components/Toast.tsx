import { useEffect, useRef, useState } from 'react';

export function Toast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      setVisible(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setVisible(false), 2200);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  return (
    <div className={`toast${visible ? ' is-visible' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}
