// Shared 64-swatch retro-realistic palette. This is the reusable "art bible" for
// every future voxel theme, not just the car — new themes should draw colors from
// here rather than inventing new hex values, so all generated assets stay visually
// consistent with each other.

export const BODY_PAINTS = [
  0xb22222, // candy red
  0x1b3a6b, // navy blue
  0x0b5d3b, // forest green
  0x101010, // black
  0xf2f2f2, // white
  0xc0c0c8, // silver
  0xc9b896, // tan
  0x5a1f2a, // burgundy
  0x2f3a4a, // gunmetal
  0x8b0000, // dark red
  0x003366, // deep blue
  0x556b2f, // olive green
  0x704214, // brown
  0xe8dcc5, // cream
  0x3b3b3b, // charcoal
  0xd9a441, // gold
];

export const GREYS = [0x000000, 0x1a1a1a, 0x333333, 0x4d4d4d, 0x666666, 0x808080, 0xb3b3b3, 0xffffff];

export const GLASS = [0x1b2a38, 0x2e4b5e, 0x4a6b80, 0x0d1b24];

export const CHROME = [0xe0e0e0, 0xa8a8a8, 0x707070, 0x3a3f44];

export const TIRE_RIM = [0x0d0d0d, 0x1a1a1a, 0xc8c8c8, 0xe0e0e0, 0xd4af37, 0x2b2b2b];

export const LIGHTS = [0xfff6d5, 0xffffff, 0xffe9a8, 0xff2e2e, 0xff5a1f, 0x8b0000, 0xffb300, 0xff8c00];

export const INTERIOR = [0xc9a876, 0x3a3a3a, 0x8b1a1a, 0x1a3a6b, 0x111111, 0x9a9a9a];

export const ENVIRONMENT = [
  0x4a4a4a, // asphalt
  0xe8d44d, // road line yellow
  0x3d7a34, // grass
  0x87ceeb, // sky
  0xe6e6e6, // curb white
  0xa34a3d, // brick
  0x9a9a9a, // concrete
  0x6b4423, // wood
  0xb5651d, // rust
  0xf2c230, // taxi yellow
  0xe8a0bf, // miami pink (90s neon accent)
  0x2fbfa0, // miami teal (90s neon accent)
];

export const PALETTE_64 = [
  ...BODY_PAINTS,
  ...GREYS,
  ...GLASS,
  ...CHROME,
  ...TIRE_RIM,
  ...LIGHTS,
  ...INTERIOR,
  ...ENVIRONMENT,
];

if (PALETTE_64.length !== 64) {
  throw new Error(`PALETTE_64 must have exactly 64 entries, has ${PALETTE_64.length}`);
}

// Character theme colors — kept separate from PALETTE_64 (which is fixed at 64
// automotive swatches) rather than folded in, since skin/hair tones don't belong
// in a car palette and PALETTE_64's length is asserted elsewhere.
export const SKIN_TONES = [0xffdbac, 0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0x5a3825];

export const HAIR_COLORS = [0x1a1a1a, 0x3b2414, 0x6b4423, 0xd9a441, 0xb0b0b0];

// Shirt color picker options — matched to the Fortal Main Arena player-config UI
// (aowallop.github.io/Ao-Presentation/main-arena-sim) so generated characters use
// the same 6 team/shirt colors the arena already lets a player pick from.
export const SHIRT_COLORS = [0x2f6fed, 0xef4060, 0x2fbf6b, 0xf2c230, 0xa855f7, 0xf5793a];

export const PANTS_COLORS = [0x2b2f3a, 0x4a4a4a, 0x1b3a6b, 0x3b3b3b];

export const SHOE_COLORS = [0x1a1a1a, 0xf2f2f2, 0x704214];

// Boss/creature theme colors — for the ghast-silhouette dragon boss (and future
// monster presets), kept separate from the vehicle/character palettes above for
// the same reason those are separate from PALETTE_64: different subject, no
// reason to force it through a 64-entry automotive palette.
export const DRAGON_SCALES = [0x1b4d2e, 0x2e6b45]; // base + lighter accent, for a position-dependent scale pattern (see ae86Generator's panda paint)
export const DRAGON_BELLY = 0x3d7a34;
export const DRAGON_EYE = 0xf2c230;
export const DRAGON_PUPIL = 0x1a1a1a;
export const DRAGON_HORN = 0xe8dcc5;
export const DRAGON_TEETH = 0xf2f2f2;
export const DRAGON_MOUTH = 0x2b0d0d;
