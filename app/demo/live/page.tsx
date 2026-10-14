import type { Metadata } from "next";
import LiveView from "./LiveView";

export const metadata: Metadata = { title: "KATALIS ERP · Demo Desktop dan Ponsel" };

export default function Page() {
  return <LiveView />;
}
