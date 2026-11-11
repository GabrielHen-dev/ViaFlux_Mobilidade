import { ImageResponse } from "next/og";
import { COR_DA_MARCA, COR_DO_DESTAQUE, PONTA_DA_SETA, TRACO_DIREITO, TRACO_ESQUERDO } from "@/components/ui/MarcaViaFlux";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: COR_DA_MARCA }}>
      <svg width="150" height="150" viewBox="0 0 32 32" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={TRACO_ESQUERDO} stroke="#fff" strokeWidth="3.4" />
        <path d={TRACO_DIREITO} stroke={COR_DO_DESTAQUE} strokeWidth="3.4" />
        <path d={PONTA_DA_SETA} stroke={COR_DO_DESTAQUE} strokeWidth="3" />
      </svg>
    </div>,
    size,
  );
}
