import type { Metadata } from "next";
import { HalamanProduksi } from "@/components/produksi/HalamanProduksi";

export const metadata: Metadata = { title: "KATALIS ERP | Jasa proses loin" };

export default function JasaPage(props: PageProps<"/produksi/jasa">) {
  return <HalamanProduksi lini="jasa" searchParams={props.searchParams} />;
}
