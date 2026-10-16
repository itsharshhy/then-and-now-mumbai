import { OUTLINE, Px, darken, lighten, type Col } from "./px";

// Chibi characters drawn from parts: big head, small body, dark outline, 2-3 tone shading.
// Each look renders 3 directions (down, up, side) x 3 frames (idle, step A, step B). Left = side flipped.

export type Dir = "down" | "up" | "side";
export const DIRS: Dir[] = ["down", "up", "side"];
export const CHAR_W = 20;
export const CHAR_H = 29;

export interface Look {
  skin: Col;
  hair: Col;
  hairStyle: "short" | "long" | "bun" | "bald" | "spiky";
  hat?: { kind: "topi" | "cap" | "helmet" | "turban"; col: Col };
  beard?: boolean;
  top: Col;
  topStyle: "shirt" | "kurta" | "saree" | "vest" | "uniform" | "tshirt";
  accent?: Col; // saree border, dupatta, collar
  bottom: Col;
  shoes: Col;
  backpack?: Col;
  glasses?: boolean;
  moustache?: boolean;
  bindi?: boolean;
  greyHair?: boolean;
}

export const SKINS = ["#8d5524", "#a86b3c", "#c68642", "#6b4423", "#b5794a"];

export const LOOKS: Record<string, Look> = {
  // shopkeepers
  raju: { skin: "#8d5524", hair: "#b9b4ae", hairStyle: "short", top: "#efe9dc", topStyle: "vest", bottom: "#4b5a7a", shoes: "#5a3a22", moustache: true, greyHair: true },
  sunita: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "bun", top: "#c23b3b", topStyle: "saree", accent: "#e8b13a", bottom: "#c23b3b", shoes: "#7a4e2d", bindi: true },
  mehta: { skin: "#c68642", hair: "#3a2a22", hairStyle: "bald", top: "#e0a526", topStyle: "shirt", bottom: "#5b4636", shoes: "#3a2a22", glasses: true },
  clerk: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "short", hat: { kind: "cap", col: "#24345c" }, top: "#2b3d6b", topStyle: "uniform", bottom: "#24345c", shoes: "#1d1a1f", moustache: true },
  pappu: { skin: "#6b4423", hair: "#1d1a1f", hairStyle: "spiky", top: "#a08a4f", topStyle: "uniform", bottom: "#7d6a3a", shoes: "#3a2a22" },
  // people of the street
  dabbawala: { skin: "#8d5524", hair: "#1d1a1f", hairStyle: "short", hat: { kind: "topi", col: "#f3f1ea" }, top: "#f3f1ea", topStyle: "kurta", bottom: "#e6e1d4", shoes: "#5a3a22", moustache: true },
  office: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "short", top: "#dfe7f2", topStyle: "shirt", bottom: "#2b3148", shoes: "#1d1a1f", backpack: "#3a3f4b" },
  student: { skin: "#c68642", hair: "#1d1a1f", hairStyle: "spiky", top: "#f3f1ea", topStyle: "shirt", bottom: "#24345c", shoes: "#1d1a1f", backpack: "#c23b3b" },
  aunty: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "bun", top: "#2e8b57", topStyle: "saree", accent: "#e0a526", bottom: "#2e8b57", shoes: "#7a4e2d", bindi: true },
  koli: { skin: "#8d5524", hair: "#1d1a1f", hairStyle: "bun", top: "#7a4fb5", topStyle: "saree", accent: "#2e8b57", bottom: "#7a4fb5", shoes: "#5a3a22", bindi: true },
  college: { skin: "#c68642", hair: "#1d1a1f", hairStyle: "long", top: "#e86a8a", topStyle: "kurta", accent: "#f2c230", bottom: "#f3f1ea", shoes: "#7a4e2d" },
  dada: { skin: "#a86b3c", hair: "#d9d4cc", hairStyle: "bald", top: "#f3f1ea", topStyle: "kurta", bottom: "#f3f1ea", shoes: "#5a3a22", glasses: true, greyHair: true },
  techie: { skin: "#b5794a", hair: "#2b1d1a", hairStyle: "short", top: "#2f6fb3", topStyle: "tshirt", bottom: "#3b4a6b", shoes: "#e9e6e0", backpack: "#2b2b33" },
  // Delhi
  sardar: { skin: "#c68642", hair: "#2b2b33", hairStyle: "short", hat: { kind: "turban", col: "#e08a2a" }, top: "#f3f1ea", topStyle: "kurta", bottom: "#f3f1ea", shoes: "#5a3a22", beard: true },
  bittu: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "spiky", top: "#e9e6e0", topStyle: "vest", bottom: "#5b6b8a", shoes: "#5a3a22", moustache: true },
  gupta: { skin: "#c68642", hair: "#2b1d1a", hairStyle: "short", top: "#c9d6a0", topStyle: "kurta", bottom: "#f3f1ea", shoes: "#5a3a22", glasses: true, moustache: true },
  metrostaff: { skin: "#a86b3c", hair: "#1d1a1f", hairStyle: "short", hat: { kind: "cap", col: "#3a4a6b" }, top: "#9aa6b8", topStyle: "uniform", bottom: "#3a4a6b", shoes: "#1d1a1f" },
  ramesh: { skin: "#8d5524", hair: "#1d1a1f", hairStyle: "short", top: "#8a8f6b", topStyle: "uniform", bottom: "#5b5a40", shoes: "#3a2a22", moustache: true },
  sardarWalker: { skin: "#c68642", hair: "#2b2b33", hairStyle: "short", hat: { kind: "turban", col: "#2f4f8f" }, top: "#3a6fa3", topStyle: "shirt", bottom: "#2b3148", shoes: "#1d1a1f", beard: true },
  salwar: { skin: "#c68642", hair: "#1d1a1f", hairStyle: "long", top: "#2e8b7a", topStyle: "kurta", accent: "#f28bb0", bottom: "#f3f1ea", shoes: "#7a4e2d" },
  biker: { skin: "#8d5524", hair: "#1d1a1f", hairStyle: "short", hat: { kind: "helmet", col: "#c23b3b" }, top: "#3a3f4b", topStyle: "tshirt", bottom: "#2b3148", shoes: "#1d1a1f" },
};

export const playerLook = (shirt: Col, skin = SKINS[1]): Look => ({
  skin,
  hair: "#2b1d1a",
  hairStyle: "short",
  top: shirt,
  topStyle: "tshirt",
  bottom: "#2b3148",
  shoes: "#e9e6e0",
  backpack: "#7a4e2d",
});

const OX = 2;
const OY = 3;

/** Draws one frame of a character. frame 0 = idle, 1 and 2 = walking steps. */
export function drawCharacter(look: Look, dir: Dir, frame: 0 | 1 | 2): Px {
  const p = new Px(CHAR_W, CHAR_H);
  const r = (x: number, y: number, w: number, h: number, c: Col) => p.rect(OX + x, OY + y, w, h, c);
  const skinDk = darken(look.skin, 0.22);
  const hairCol = look.greyHair ? look.hair : look.hair;
  const hairLt = lighten(hairCol, 0.18);
  const top = look.top;
  const topDk = darken(top, 0.25);
  const topLt = lighten(top, 0.2);
  const bot = look.bottom;
  const botDk = darken(bot, 0.25);
  const bob = frame === 0 ? 0 : 1; // body dips one pixel mid-step
  const long = look.topStyle === "saree" || look.topStyle === "kurta";

  // ---------------------------------------------------------------- legs + feet
  const legTop = 17;
  if (look.topStyle !== "saree") {
    if (dir === "side") {
      const a = frame === 1 ? 2 : frame === 2 ? -1 : 0;
      r(6 - a / 2 + 0, legTop, 3, 5, botDk);
      r(7 + a, legTop, 3, 5 - (frame ? 0 : 0), bot);
      r(5 - a / 2, 22, 4, 1, look.shoes);
      r(7 + a, 22, 4, 1, look.shoes);
    } else {
      const lUp = frame === 1 ? 1 : 0;
      const rUp = frame === 2 ? 1 : 0;
      r(5, legTop, 3, 5 - lUp, bot);
      r(8, legTop, 3, 5 - rUp, dir === "down" ? botDk : bot);
      r(5, 22 - lUp, 3, 1, look.shoes);
      r(8, 22 - rUp, 3, 1, look.shoes);
    }
  } else {
    // saree: long skirt to the ankles, feet peeking out
    const w = dir === "side" ? 6 : 8;
    const x = dir === "side" ? 5 : 4;
    r(x, legTop, w, 5, top);
    r(x + w - 2, legTop, 2, 5, topDk);
    r(x, 21, w, 1, look.accent ?? topLt);
    const s = frame === 1 ? -1 : frame === 2 ? 1 : 0;
    r(x + 1 + Math.max(0, s), 22, 3, 1, look.shoes);
    r(x + w - 4 + Math.min(0, s), 22, 3, 1, look.shoes);
  }

  // ---------------------------------------------------------------- torso
  const ty = 10 + bob;
  const torsoH = long ? 9 : 7;
  if (dir === "side") {
    r(5, ty, 6, torsoH, top);
    r(5, ty, 1, torsoH, topDk);
    r(10, ty, 1, torsoH, topLt);
    if (look.backpack) {
      r(2, ty + 1, 4, 6, look.backpack);
      r(2, ty + 1, 1, 6, darken(look.backpack, 0.3));
    }
    // swinging arm
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    const sleeve = look.topStyle === "vest" || look.topStyle === "saree" ? look.skin : top;
    r(7 + sw, ty + 1, 2, 3, sleeve === top ? topDk : sleeve);
    r(7 + sw, ty + 4, 2, 2, look.skin);
  } else {
    r(4, ty, 8, torsoH, top);
    r(4, ty, 1, torsoH, topLt);
    r(10, ty, 2, torsoH, topDk);
    if (dir === "down") {
      // collar / neckline
      if (look.topStyle === "shirt" || look.topStyle === "uniform") {
        r(6, ty, 4, 1, lighten(top, 0.4));
        r(7, ty + 1, 2, 1, look.skin);
        r(8, ty + 2, 1, 4, topDk); // placket
      } else if (look.topStyle === "vest") {
        r(6, ty, 4, 2, look.skin);
      } else r(7, ty, 2, 1, look.skin);
      if (look.topStyle === "uniform") r(4, ty + 5, 8, 1, darken(top, 0.45)); // belt
      if (look.topStyle === "saree") {
        // pallu: diagonal drape from left shoulder
        for (let i = 0; i < 6; i++) r(4 + i, ty + i, 2, 1, look.accent ?? topLt);
      }
      if (look.topStyle === "kurta" && look.accent) for (let i = 0; i < 4; i++) r(4 + i, ty + i, 1, 1, look.accent); // dupatta
      if (look.backpack) {
        r(5, ty, 1, 4, darken(look.backpack, 0.2));
        r(10, ty, 1, 4, darken(look.backpack, 0.2));
      }
    } else {
      if (look.backpack) {
        r(5, ty + 1, 6, 6, look.backpack);
        r(5, ty + 1, 6, 1, lighten(look.backpack, 0.2));
        r(10, ty + 2, 1, 5, darken(look.backpack, 0.3));
      }
      if (look.topStyle === "saree") r(4, ty, 3, torsoH, look.accent ?? topLt);
    }
    // arms
    const sleeveless = look.topStyle === "vest" || look.topStyle === "saree";
    const sw = frame === 1 ? 1 : frame === 2 ? -1 : 0;
    r(2, ty + 1, 2, 3, sleeveless ? look.skin : top);
    r(12, ty + 1, 2, 3, sleeveless ? skinDk : topDk);
    r(2, ty + 4 + sw, 2, 2, look.skin);
    r(12, ty + 4 - sw, 2, 2, skinDk);
  }

  // ---------------------------------------------------------------- head
  const hy = bob;
  const face = (x: number, y: number, w: number, h: number) => r(x, y + hy, w, h, look.skin);
  if (dir === "side") {
    // head in profile, facing right
    r(4, 1 + hy, 9, 9, look.skin);
    r(3, 2 + hy, 1, 7, look.skin);
    r(4, 9 + hy, 9, 1, skinDk);
    r(12, 6 + hy, 1, 2, skinDk); // nose
    r(10, 5 + hy, 1, 2, "#1d1a1f"); // eye
    r(10, 7 + hy, 1, 1, "#e58a7a"); // blush
    r(6, 5 + hy, 1, 2, skinDk); // ear
    if (look.moustache) r(10, 8 + hy, 2, 1, look.hair);
    if (look.glasses) r(9, 4 + hy, 3, 1, "#2b2b33");
    if (look.hairStyle !== "bald") {
      r(3, 0 + hy, 9, 3, hairCol);
      r(2, 1 + hy, 4, 6, hairCol);
      r(4, 0 + hy, 6, 1, hairLt);
      if (look.hairStyle === "long") r(2, 3 + hy, 4, 11, hairCol);
      if (look.hairStyle === "bun") r(0, 2 + hy, 3, 3, hairCol);
      if (look.hairStyle === "spiky") r(5, -1 + hy, 2, 1, hairCol), r(8, -1 + hy, 2, 1, hairCol);
    } else {
      r(2, 3 + hy, 2, 4, hairCol);
    }
  } else {
    face(4, 1, 8, 9);
    face(3, 2, 10, 7);
    r(4, 9 + hy, 8, 1, skinDk);
    r(12, 3 + hy, 1, 6, skinDk);
    if (dir === "down") {
      r(5, 5 + hy, 1, 2, "#1d1a1f");
      r(10, 5 + hy, 1, 2, "#1d1a1f");
      r(4, 7 + hy, 1, 1, "#e58a7a");
      r(11, 7 + hy, 1, 1, "#e58a7a");
      r(7, 8 + hy, 2, 1, skinDk);
      if (look.moustache) r(6, 7 + hy, 4, 1, look.greyHair ? look.hair : "#1d1a1f");
      if (look.bindi) r(7, 3 + hy, 2, 1, "#c0392b");
      if (look.glasses) {
        r(4, 4 + hy, 3, 1, "#2b2b33");
        r(9, 4 + hy, 3, 1, "#2b2b33");
        r(7, 4 + hy, 2, 1, "#2b2b33");
      }
    }
    if (look.hairStyle !== "bald") {
      if (dir === "down") {
        r(4, 0 + hy, 8, 1, hairCol);
        r(3, 1 + hy, 10, 2, hairCol);
        r(3, 3 + hy, 1, 3, hairCol);
        r(12, 3 + hy, 1, 3, hairCol);
        r(5, 0 + hy, 4, 1, hairLt);
        if (look.hairStyle === "spiky") r(4, -1 + hy, 2, 1, hairCol), r(8, -1 + hy, 2, 1, hairCol);
        if (look.hairStyle === "long") r(2, 3 + hy, 2, 10, hairCol), r(12, 3 + hy, 2, 10, hairCol);
        if (look.hairStyle === "bun") r(6, -2 + hy, 4, 2, hairCol);
      } else {
        r(3, 0 + hy, 10, 9, hairCol);
        r(4, 0 + hy, 6, 1, hairLt);
        r(6, 9 + hy, 4, 1, skinDk);
        if (look.hairStyle === "long") r(3, 8 + hy, 10, 6, hairCol);
        if (look.hairStyle === "bun") r(5, 2 + hy, 6, 4, darken(hairCol, 0.2)), r(6, -2 + hy, 4, 2, hairCol);
      }
    } else {
      // bald on top, a ring of hair round the sides
      r(3, 4 + hy, 1, 3, hairCol);
      r(12, 4 + hy, 1, 3, hairCol);
      r(5, 1 + hy, 3, 1, lighten(look.skin, 0.25)); // shine
      if (dir === "up") r(3, 4 + hy, 10, 4, hairCol);
    }
  }

  // ---------------------------------------------------------------- hats
  if (look.hat) {
    const c = look.hat.col;
    const cd = darken(c, 0.2);
    if (look.hat.kind === "topi") {
      // Gandhi topi: a white boat-shaped cap, the dabbawala's badge
      r(4, -1 + hy, 8, 3, c);
      r(4, 1 + hy, 8, 1, cd);
      r(5, -2 + hy, 6, 1, c);
    } else if (look.hat.kind === "cap") {
      r(3, -1 + hy, 10, 3, c);
      r(4, -2 + hy, 8, 1, c);
      if (dir === "down") r(3, 2 + hy, 10, 1, cd);
      if (dir === "side") r(10, 2 + hy, 4, 1, cd);
      r(7, -1 + hy, 2, 1, "#e0a526");
    } else if (look.hat.kind === "turban") {
      // a pagri: wrapped folds rising to a peak at the front
      const lt = lighten(c, 0.25);
      r(2, -2 + hy, 12, 6, c);
      r(3, -3 + hy, 10, 1, c);
      if (dir === "down") {
        for (let i = 0; i < 5; i++) r(3 + i, 2 - i + hy, 1, 1, cd), r(12 - i, 2 - i + hy, 1, 1, cd);
        r(7, -3 + hy, 2, 2, lt);
      } else if (dir === "side") {
        r(1, -1 + hy, 3, 5, c);
        for (let i = 0; i < 4; i++) r(4 + i * 2, 1 - (i % 2) + hy, 2, 1, cd);
      } else {
        for (let i = 0; i < 4; i++) r(3, -1 + i + hy, 10, 1, i % 2 ? cd : c);
      }
      r(4, -2 + hy, 6, 1, lt);
    } else {
      r(2, -2 + hy, 12, 7, c);
      r(3, -2 + hy, 8, 1, lighten(c, 0.3));
      r(dir === "side" ? 9 : 4, 2 + hy, dir === "side" ? 4 : 8, 2, "#2b2b33"); // visor
    }
  }

  // a full beard, for the sardars of Delhi (and anyone else who wants one)
  if (look.beard && dir !== "up") {
    if (dir === "down") {
      r(4, 6 + bob, 8, 4, look.hair);
      r(5, 10 + bob, 6, 1, look.hair);
      r(6, 7 + bob, 4, 1, darken(look.skin, 0.4)); // mouth peeking through
    } else {
      r(7, 6 + bob, 6, 4, look.hair);
      r(8, 10 + bob, 4, 1, look.hair);
    }
  }
  p.outline(OUTLINE, true, true);
  return p;
}

/** A small round shadow that sits under everyone's feet. */
export function shadow(w = 12, h = 4): Px {
  const p = new Px(w, h);
  p.ellipse(Math.floor(w / 2), Math.floor(h / 2), Math.floor(w / 2) - 1, Math.floor(h / 2) - 1, "rgba(20,10,20,0.28)");
  return p;
}
