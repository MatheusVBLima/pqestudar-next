import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Aprenda, Organize e Evolua com as Ferramentas Certas — PqEstudar";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
          backgroundColor: "#ffffff",
          backgroundImage:
            "radial-gradient(circle at 30% 50%, rgba(139, 92, 246, 0.15), transparent 50%), linear-gradient(135deg, rgba(139, 92, 246, 0.06) 0%, #ffffff 100%)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            textAlign: "center",
            fontSize: 110,
            fontWeight: 800,
            letterSpacing: "-0.035em",
            lineHeight: 1.05,
            color: "#232323",
          }}
        >
          <span>Aprenda, Organize e&nbsp;</span>
          <span
            style={{
              backgroundImage: "linear-gradient(90deg, #800080 0%, rgba(128, 0, 128, 0.7) 100%)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Evolua
          </span>
          <span>&nbsp;com as Ferramentas Certas</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
