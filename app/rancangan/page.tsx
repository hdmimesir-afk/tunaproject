import type { Metadata, Viewport } from "next";
import RancanganView from "./RancanganView";

export const metadata: Metadata = {
  title: "KATALIS ERP | Rancangan Final",
  description: "Rancangan final sistem KATALIS ERP setelah catatan owner: apa yang berubah, cara kerja sistem, dan jadwal pengerjaan.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#00171F" };

export default function RancanganPage() {
  return <RancanganView />;
}
