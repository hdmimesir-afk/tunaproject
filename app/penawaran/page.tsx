import type { Metadata } from "next";
import Deck from "@/components/Deck";

export const metadata: Metadata = {
  title: "KATALIS ERP | Penawaran dari Dar Dev",
  description: "Penawaran aplikasi untuk usaha perikanan PT Katalis Lintas Global: masalah yang kami lihat dan fitur yang menjawabnya.",
};

export default function Page() {
  return <Deck />;
}
