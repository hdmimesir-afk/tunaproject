import { SlideCanvas } from "@/components/SlideCanvas";
import { slides } from "@/data/slides";

export const metadata = { title: "KATALIS ERP — Versi cetak" };

export default function PrintPage() {
  return (
    <div style={{ width: 1920, background: "#fff" }} id="print-root">
      {slides.map((s) => (
        <div key={s.id} className="print-slide" style={{ width: 1920, height: 1080, overflow: "hidden", marginBottom: 0 }}>
          <SlideCanvas slide={s} />
        </div>
      ))}
    </div>
  );
}
