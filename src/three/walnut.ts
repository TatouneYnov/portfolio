// Bois partagé par les scènes 3D : boîtier du clavier et socle des projets.
import * as THREE from 'three';

/** Noyer moyen : brun noisette chaud, veinage fin et ondulé (dessiné en code, reproductible). */
export function makeWalnutTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  let seed = 7;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  ctx.fillStyle = '#7A5236';
  ctx.fillRect(0, 0, w, h);
  // Larges bandes de teinte
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(168,121,82,0.18)' : 'rgba(64,40,24,0.16)';
    ctx.fillRect(0, rand() * h, w, 10 + rand() * 46);
  }
  // Veines fines et ondulées
  for (let i = 0; i < 150; i++) {
    const y0 = rand() * h;
    const amp = 2 + rand() * 7;
    const freq = 0.004 + rand() * 0.01;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = rand() > 0.35 ? `rgba(58,35,19,${0.12 + rand() * 0.22})` : `rgba(186,138,96,${0.08 + rand() * 0.14})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = y0 + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 3.1 + phase * 2) * amp * 0.25;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = 8;
  return tex;
}
