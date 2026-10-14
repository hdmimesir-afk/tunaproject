import type { Metadata } from "next";
import DesktopApp from "./DesktopApp";

export const metadata: Metadata = { title: "KATALIS ERP · Demo Desktop" };

export default function Page() {
  return <DesktopApp />;
}
