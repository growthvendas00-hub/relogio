import Image from "next/image";

export function BrandLogo({ priority = false }: { priority?: boolean }) {
  return <><Image className="brand-logo" src="/almare-logo.webp" width={512} height={512} sizes="48px" alt="" priority={priority} /><b>ALMARE</b></>;
}
