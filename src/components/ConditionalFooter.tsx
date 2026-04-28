"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ConditionalFooter() {
  const pathname = usePathname();
  const isProctice = pathname === "/practice";

  if (isProctice) return null;

  return <Footer />;
}
