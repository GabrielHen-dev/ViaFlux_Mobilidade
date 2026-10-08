import { ImageResponse } from "next/og";
import { GRADIENTE_DA_MARCA, TRACO_DA_MARCA } from "@/components/ui/MarcaViaFlux";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: GRADIENTE_DA_MARCA }}>
      <svg width="120" height="120" viewBox="-1 1 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d={TRACO_DA_MARCA} />
      </svg>
    </div>,
    size,
  );
}
