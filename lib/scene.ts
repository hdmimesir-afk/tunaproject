/**
 * Scene graph shared by the web deck, the PDF export and the PPTX export.
 * Canvas: 1920 x 1080 px (16:9). PPTX conversion: 144 px = 1 inch, 1 px = 0.5 pt.
 * Because all three outputs render from the same elements, content cannot drift between them.
 */

export interface Run {
  text: string;
  bold?: boolean;
  color?: string;
  italic?: boolean;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Cell =
  | string
  | { t: string; b?: boolean; c?: string; f?: string; a?: "l" | "c" | "r" };

export type El =
  | ({ t: "rect"; fill?: string; line?: string; lw?: number; r?: number; dash?: boolean; op?: number } & Box)
  | ({ t: "ellipse"; fill?: string; line?: string; lw?: number; op?: number } & Box)
  | ({
      t: "text";
      text: string | Run[];
      size: number;
      color?: string;
      bold?: boolean;
      weight?: 400 | 500 | 600 | 700 | 800;
      italic?: boolean;
      align?: "l" | "c" | "r";
      va?: "t" | "m" | "b";
      lh?: number;
      ls?: number;
      mono?: boolean;
      bullet?: boolean;
      para?: number;
      op?: number;
    } & Box)
  | { t: "line"; x1: number; y1: number; x2: number; y2: number; color: string; lw: number; dash?: boolean; arrow?: boolean }
  | ({ t: "img"; src: string; fit?: "cover" | "contain" } & Box)
  | ({
      t: "table";
      cols: number[];
      rowH: number;
      headH?: number;
      head?: string[];
      rows: Cell[][];
      size: number;
      headFill?: string;
      headColor?: string;
      zebra?: string;
      rowFill?: string;
      border?: string;
      align?: ("l" | "c" | "r")[];
      color?: string;
    } & Box);

export type SourceKind = "source" | "assumption" | "proposed" | "illustrative" | "commercial" | "derived";

export interface SourceRef {
  kind: SourceKind;
  ref: string; // e.g. "Proposal hlm. 6" or "Brief — Modul 07"
  claim: string;
}

export interface Slide {
  id: number;
  title: string; // plain title used for QA, outline and notes
  theme: "light" | "dark";
  els: El[];
  notes: string;
  sources: SourceRef[];
}

export const W = 1920;
export const H = 1080;
