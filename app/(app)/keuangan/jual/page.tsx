import type { Metadata } from "next";
import { HalamanLini } from "@/components/keuangan/HalamanLini";

export const metadata: Metadata = { title: "KATALIS ERP | Keuangan Jual loin" };

export default function KeuanganJualPage(props: PageProps<"/keuangan/jual">) {
  return <HalamanLini lini="jual" searchParams={props.searchParams} />;
}
