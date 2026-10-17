export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('app:toast', { detail: message }));
}

/** Copie dans le presse-papiers, avec repli sur la sélection si l'API est refusée. */
export async function copyText(text: string, confirmation = 'Copié ✓') {
  try {
    await navigator.clipboard.writeText(text);
    toast(confirmation);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    toast(ok ? confirmation : `Copie impossible : ${text}`);
  }
}
