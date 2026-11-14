// Shared by DOM, SVG cables and the pixel displays. No audio state lives here.
export const PALETTE = {
  background: '#080d0c', surface: '#101b16', raised: '#17271e', display: '#080f0d',
  ink: '#d4f5dc', muted: '#96b7a0', dim: '#52705f', line: '#365243', grid: '#20382b',
  green: '#8bee9b', greenSoft: '#b0edba', greenBright: '#6cde8c',
  lime: '#d9e978', limeSoft: '#e2eaa5', limeBright: '#badb56',
  amber: '#ffbf68', amberSoft: '#f0cb95', amberBright: '#eea34e',
  red: '#ff827a', redSoft: '#f1aaa0', redBright: '#ef6d65',
  pink: '#ed9ac8', pinkSoft: '#edb3d3', pinkBright: '#dc82b9',
  cyan: '#67dce7', cyanSoft: '#a0dfe5', cyanBright: '#50c7d4',
  blue: '#8aaeff', blueSoft: '#aec4f0', blueBright: '#7096e9',
  purple: '#bfa1f4', purpleSoft: '#d1bde9', purpleBright: '#a888df',
} as const;

// The original warm/cool identities remain, using eight small families of ink.
export const MODULE_COLORS = {
  MIRAGE: PALETTE.purpleSoft,
  LEVEL: PALETTE.greenSoft,
  FOUND: PALETTE.cyanSoft,
  SMEAR: PALETTE.blueSoft, FRICTION: PALETTE.amberBright,
  PULSE: PALETTE.green, BRANCH: PALETTE.purple, FLOCK: PALETTE.cyan,
  ALLOY: PALETTE.amber, RESON: PALETTE.limeSoft, FRACTURE: PALETTE.pink,
  VENOM: PALETTE.limeBright, CAUSTIC: PALETTE.amberBright, SNAP: PALETTE.red,
  TAPE: PALETTE.amberSoft, DRONE: PALETTE.greenSoft, SIEVE: PALETTE.cyanSoft,
  PARASITE: PALETTE.pinkBright, VCA: PALETTE.greenBright, SHAPE: PALETTE.blueSoft,
  SWITCH: PALETTE.blueSoft, LOOP: PALETTE.redSoft, CHORUS: PALETTE.cyanBright,
  CLOUD: PALETTE.purpleSoft, OSC: PALETTE.lime, NOISE: PALETTE.greenSoft,
  FILTER: PALETTE.cyanBright, RING: PALETTE.pinkSoft, COMB: PALETTE.amberSoft,
  SHIFT: PALETTE.purpleBright, CHANCE: PALETTE.amber, PRISM: PALETTE.cyan,
  PARTIAL: PALETTE.amberSoft, WEFT: PALETTE.blue, TIDE: PALETTE.greenBright,
  BOUNCE: PALETTE.amber, FERAL: PALETTE.redBright, COUNT: PALETTE.green,
  MAP: PALETTE.purple, QUANTIZE: PALETTE.limeSoft, SLEW: PALETTE.cyanSoft,
  FORMANT: PALETTE.redSoft, LOGIC: PALETTE.blueBright, DUCK: PALETTE.pinkSoft,
  SWARM: PALETTE.lime, UNSPENT: PALETTE.limeBright, SIDEWAYS: PALETTE.cyan,
  QUORUM: PALETTE.purpleBright, 'FAULT LINE': PALETTE.redBright,
  CLIP: PALETTE.amberBright, FUZZ: PALETTE.amber, CRUSH: PALETTE.blue,
  CHIP: PALETTE.greenBright, TOUCH: PALETTE.cyanSoft, PENDULUM: PALETTE.amberSoft,
  LPG: PALETTE.limeSoft, OPERATOR: PALETTE.blue, EDGE: PALETTE.lime,
  MESH: PALETTE.greenSoft, ORBIT: PALETTE.purpleSoft,
  CHAMBER: PALETTE.purple, OUTPUT: PALETTE.green,
} as const;

export const SIGNAL_INKS = {audio: PALETTE.amber, control: PALETTE.cyan, trigger: PALETTE.green};

// Fixed background inks keep low-energy detail visible without adding glow passes.
export const DISPLAY_INKS = {
  background: PALETTE.display, grid: '#14271d', frame: '#3a6048',
  green: '#4a865b', cyan: '#46838a', blue: '#506e9b',
  amber: '#9e7846', red: '#a26359', purple: '#80659d',
};

export function installPalette(root: HTMLElement) {
  for (const [name, color] of Object.entries(PALETTE)) {
    root.style.setProperty(`--${name.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`, color);
  }
}
