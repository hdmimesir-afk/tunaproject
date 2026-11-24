import type { Metadata } from "next";
import { HalamanLini } from "@/components/keuangan/HalamanLini";

export const metadata: Metadata = { title: "KATALIS ERP | Keuangan Titip barang" };

export default function KeuanganTitipPage(props: PageProps<"/keuangan/titip">) {
  return <HalamanLini lini="titip" searchParams={props.searchParams} />;
}
