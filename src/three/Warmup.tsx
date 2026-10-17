import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import type * as THREE from 'three';

/**
 * Envoie les textures à la carte graphique, compile les shaders et fait un rendu à blanc dès le
 * montage, pour que la première image affichée ne provoque pas d'à-coup pendant le défilement.
 * - `reveal` : objets cachés au départ (ex. le bureau) rendus visibles le temps du préchauffage.
 * - `tick` : exécute aussi une image complète de la scène (effets créés à la première image,
 *   comme l'ombre portée du clavier).
 */
export function Warmup({ reveal = [], tick = false }: { reveal?: THREE.Object3D[]; tick?: boolean }) {
  const { gl, scene, camera, advance } = useThree();
  useEffect(() => {
    const hidden = reveal.filter((o) => !o.visible);
    hidden.forEach((o) => (o.visible = true));
    const culled: THREE.Object3D[] = [];
    scene.traverse((o) => {
      // Tout dessiner pendant le rendu à blanc, même hors du champ de la caméra
      if (o.frustumCulled) {
        o.frustumCulled = false;
        culled.push(o);
      }
      const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (!mat) return;
      (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
        Object.values(m).forEach((v) => {
          if (v && (v as THREE.Texture).isTexture) gl.initTexture(v as THREE.Texture);
        });
      });
    });
    gl.compile(scene, camera);
    // Le rendu à blanc force le navigateur à terminer la compilation maintenant
    gl.render(scene, camera);
    culled.forEach((o) => (o.frustumCulled = true));
    hidden.forEach((o) => (o.visible = false));
    if (tick) advance(performance.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera]);
  return null;
}
