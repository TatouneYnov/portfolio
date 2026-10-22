import type * as THREE from 'three';

type Limb = {
  ua: THREE.Group; la: THREE.Group; hand: THREE.Group;
  /** Articulations des doigts ([base, phalange] × 4) et du pouce, pour les frappes au clavier. */
  fingers: { fingers: [THREE.Group, THREE.Group][]; thumb: [THREE.Group, THREE.Group] };
};
type Leg = { ul: THREE.Group; ll: THREE.Group; foot: THREE.Group };

export type Avatar = {
  root: THREE.Group;
  hips: THREE.Group;
  spine: THREE.Group;
  chest: THREE.Group;
  neck: THREE.Group;
  head: THREE.Group;
  torso: THREE.Mesh;
  eyes: THREE.Group[];
  arms: { L: Limb; R: Limb };
  legs: { L: Leg; R: Leg };
  /** Regard en radians (même repère que la tête). */
  setGaze: (yaw: number, pitch: number) => void;
  /** Paupières : 1 ouvertes, 0 fermées. */
  setBlink: (open: number) => void;
  /** Sourire : 0 neutre, 1 sourire. */
  setSmile: (v: number) => void;
};

export type Terminal = { texture: THREE.CanvasTexture; draw: () => void; step: () => void };
export type Pose = Record<string, [number, number, number]> & { hipsY: number; breath: number };

export const COLORS: Record<string, number>;
export function buildAvatar(): Avatar;
export function buildLights(): THREE.Group;
export function buildDesk(): { group: THREE.Group; screen: Terminal };
export function makeTerminal(): Terminal;
export const JOINT_KEYS: string[];
export function makePose(): Pose;
export function idlePose(t: number, P: Pose): void;
export function sitPose(t: number, P: Pose): void;
export function wavePose(t: number, P: Pose): void;
export function typeFingers(avatar: Avatar, t: number, sit: number, openR?: number): void;
