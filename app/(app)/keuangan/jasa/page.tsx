import type { Metadata } from "next";
import { HalamanLini } from "@/components/keuangan/HalamanLini";

export const metadata: Metadata = { title: "KATALIS ERP | Keuangan Jasa proses loin" };

export default function KeuanganJasaPage(props: PageProps<"/keuangan/jasa">) {
  return <HalamanLini lini="jasa" searchParams={props.searchParams} />;
}
