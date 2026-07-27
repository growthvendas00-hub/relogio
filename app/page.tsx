import type { Metadata } from "next";
import { Storefront } from "./storefront";

export const metadata: Metadata = {
  title: "Almare | Relógios masculinos",
  description: "Relógios masculinos com presença, estilo urbano e envio imediato para todo o Brasil.",
};

export default function Home() {
  return <Storefront />;
}
