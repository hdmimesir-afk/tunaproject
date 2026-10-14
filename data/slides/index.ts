import type { El, Slide } from "@/lib/scene";
import { V3SLIDES } from "./v3";

/**
 * Deck v3 (13 slides): one idea per slide, a real icon set, and screenshots of the interactive demo.
 * The earlier 17-slide deck still lives in s01-07.ts … s37.ts and landing.ts, unused.
 */
const ORDER: Slide[] = V3SLIDES;

/** Renumber ids and the "NN / total" page label so the deck is always consecutive. */
export const slides: Slide[] = ORDER.map((sl, i) => ({
  ...sl,
  id: i + 1,
  els: sl.els.map((el): El =>
    el.t === "text" && typeof el.text === "string" && /^\d{2} \/ \d+$/.test(el.text)
      ? { ...el, text: String(i + 1).padStart(2, "0") + " / " + ORDER.length }
      : el,
  ),
}));
