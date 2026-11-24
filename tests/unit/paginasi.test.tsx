import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataList } from "@/components/ui";

/* Paginasi semua daftar (24 Nov 2026): urut dari yang terlama (urutan data dari server), 20 per halaman,
   dan pas dibuka langsung di halaman terakhir. */
const baris = Array.from({ length: 45 }, (_, i) => ({ kode: `PRD/26/11/01/${String(i + 1).padStart(3, "0")}` }));

describe("DataList paginasi", () => {
  it("kebuka di halaman terakhir, isinya data terbaru", () => {
    const html = renderToStaticMarkup(<DataList rows={baris} cols={[{ h: "Kode", r: (b) => b.kode }]} />);
    expect(html).toContain("PRD/26/11/01/045");
    expect(html).toContain("PRD/26/11/01/041");
    expect(html).not.toContain("PRD/26/11/01/040");
    expect(html).toContain("41–45 dari 45 data");
    expect(html).toContain("halaman 3 dari 3");
  });
  it("daftar pendek nggak ada paginasi", () => {
    const html = renderToStaticMarkup(<DataList rows={baris.slice(0, 20)} cols={[{ h: "Kode", r: (b) => b.kode }]} />);
    expect(html).toContain("PRD/26/11/01/001");
    expect(html).not.toContain("data-testid=\"paginasi\"");
  });
});
