import type { Metadata } from "next";
import { HalamanProduksi } from "@/components/produksi/HalamanProduksi";

export const metadata: Metadata = { title: "KATALIS ERP | Jual loin" };

export default function JualPage(props: PageProps<"/produksi/jual">) {
  return <HalamanProduksi lini="jual" searchParams={props.searchParams} />;
}
