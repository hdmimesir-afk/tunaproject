import type { Metadata } from "next";
import "./layar.css";

/* Layar contoh untuk bingkai perangkat di /update. Dimuat di dalam iframe, tidak untuk diindeks. */
export const metadata: Metadata = { title: "Layar contoh | KATALIS ERP", robots: { index: false, follow: false } };

export default function LayarLayout({ children }: { children: React.ReactNode }) {
  return children;
}
