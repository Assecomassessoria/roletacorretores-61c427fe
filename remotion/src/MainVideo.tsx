import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Anton";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";

const display = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const body = loadBody("normal", { weights: ["400", "600", "800"], subsets: ["latin"] });

const FF_DISPLAY = display.fontFamily;
const FF_BODY = body.fontFamily;

/* ===== Paleta marca ===== */
const NAVY = "#0B1733";
const NAVY_DEEP = "#06101F";
const ORANGE = "#F5A524";
const ORANGE_HOT = "#FF7A1A";
const CREAM = "#F6EFE2";
const SLATE = "#94A3B8";

/* ===== Duração ===== */
const FPS = 30;
const S1 = 4 * FPS; // Hook
const S2 = 4 * FPS; // Problema
const S3 = 5 * FPS; // Solução / Fila
const S4 = 4 * FPS; // Recursos
const S5 = 4 * FPS; // CTA
const TRANS = 18;
export const DURATION = S1 + S2 + S3 + S4 + S5 - TRANS * 4;

/* ===== Background persistente ===== */
function Bg() {
  const f = useCurrentFrame();
  const drift = Math.sin(f / 90) * 30;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(60% 50% at 50% ${30 + drift}%, ${NAVY} 0%, ${NAVY_DEEP} 70%, #04080F 100%)` }}>
      {/* grain */}
      <AbsoluteFill style={{ opacity: 0.08, mixBlendMode: "overlay", backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)", backgroundSize: "3px 3px" }} />
      {/* glow */}
      <div style={{ position: "absolute", top: "10%", left: "-20%", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE}55, transparent 60%)`, filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "5%", right: "-25%", width: 800, height: 800, borderRadius: "50%", background: `radial-gradient(circle, ${ORANGE_HOT}33, transparent 60%)`, filter: "blur(60px)" }} />
    </AbsoluteFill>
  );
}

/* ===== Helpers de texto ===== */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: FF_BODY, fontWeight: 800, letterSpacing: 6, fontSize: 28, color: ORANGE, textTransform: "uppercase" }}>
      {children}
    </div>
  );
}
function Headline({ children, size = 130 }: { children: React.ReactNode; size?: number }) {
  return (
    <h1 style={{ fontFamily: FF_DISPLAY, fontSize: size, lineHeight: 0.92, color: CREAM, margin: 0, textTransform: "uppercase", letterSpacing: -2 }}>
      {children}
    </h1>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: FF_BODY, fontWeight: 400, color: SLATE, fontSize: 38, lineHeight: 1.25, maxWidth: 900, margin: 0 }}>
      {children}
    </p>
  );
}

/* ===== Scene 1 — Hook ===== */
function Scene1() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op1 = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const y1 = interpolate(spring({ frame: f, fps, config: { damping: 18 } }), [0, 1], [80, 0]);
  const op2 = interpolate(f, [22, 40], [0, 1], { extrapolateRight: "clamp" });
  const op3 = interpolate(f, [55, 75], [0, 1], { extrapolateRight: "clamp" });
  const bar = interpolate(spring({ frame: f - 60, fps, config: { damping: 16 } }), [0, 1], [0, 280]);
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "flex-end" }}>
      <div style={{ opacity: op1, transform: `translateY(${y1}px)` }}>
        <Eyebrow>Elite 4.0</Eyebrow>
      </div>
      <div style={{ marginTop: 28, opacity: op2 }}>
        <Headline size={150}>
          ROLETA<br />CORRETOR
        </Headline>
      </div>
      <div style={{ marginTop: 38, opacity: op3 }}>
        <Sub>O fim do sorteio injusto no seu stand.</Sub>
      </div>
      <div style={{ marginTop: 48, height: 8, width: bar, background: ORANGE, borderRadius: 4 }} />
    </AbsoluteFill>
  );
}

/* ===== Scene 2 — Problema ===== */
function Scene2() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const items = [
    "Quem chegou primeiro briga.",
    "Quem grita mais leva o cliente.",
    "O coordenador apaga incêndio.",
  ];
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity: interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" }) }}>
        <Eyebrow>O caos do plantão</Eyebrow>
        <div style={{ marginTop: 20 }}>
          <Headline size={110}>SEM<br />REGRA<br />CLARA…</Headline>
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, marginTop: 60, display: "flex", flexDirection: "column", gap: 22 }}>
        {items.map((t, i) => {
          const start = 30 + i * 18;
          const s = spring({ frame: f - start, fps, config: { damping: 18 } });
          const op = interpolate(s, [0, 1], [0, 1]);
          const x = interpolate(s, [0, 1], [-60, 0]);
          return (
            <li key={i} style={{ opacity: op, transform: `translateX(${x}px)`, display: "flex", alignItems: "center", gap: 24, fontFamily: FF_BODY, color: CREAM, fontSize: 42, fontWeight: 600 }}>
              <span style={{ display: "inline-block", width: 18, height: 18, background: ORANGE_HOT, borderRadius: 4, transform: "rotate(45deg)" }} />
              {t}
            </li>
          );
        })}
      </ul>
    </AbsoluteFill>
  );
}

/* ===== Scene 3 — Fila justa ===== */
function Scene3() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Fila dinâmica — rotaciona quando o do topo é atendido
  const swap = f > 75 ? 1 : 0;
  const ordemBase = ["Ana · 2 atend", "Carlos · 3 atend", "Bruno · 4 atend", "Diego · 5 atend"];
  const ordem = swap ? ["Carlos · 3 atend", "Bruno · 4 atend", "Diego · 5 atend", "Ana · 3 atend"] : ordemBase;

  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity: op }}>
        <Eyebrow>Fila justa, automática</Eyebrow>
        <div style={{ marginTop: 18 }}>
          <Headline size={108}>QUEM<br />ATENDEU<br />MENOS,<br /><span style={{ color: ORANGE }}>ATENDE AGORA.</span></Headline>
        </div>
      </div>

      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", gap: 14 }}>
        {ordem.map((nome, i) => {
          const delay = 25 + i * 8;
          const s = spring({ frame: f - delay, fps, config: { damping: 18 } });
          const opi = interpolate(s, [0, 1], [0, 1]);
          const isTop = i === 0;
          return (
            <div
              key={nome + i}
              style={{
                opacity: opi,
                display: "flex",
                alignItems: "center",
                gap: 24,
                padding: "22px 28px",
                borderRadius: 14,
                background: isTop ? `linear-gradient(90deg, ${ORANGE}, ${ORANGE_HOT})` : "rgba(255,255,255,0.05)",
                border: isTop ? "none" : "1px solid rgba(255,255,255,0.1)",
                color: isTop ? NAVY_DEEP : CREAM,
                fontFamily: FF_BODY,
                fontWeight: isTop ? 800 : 600,
                fontSize: 34,
              }}
            >
              <span style={{ fontFamily: FF_DISPLAY, fontSize: 44, opacity: 0.85, minWidth: 60 }}>#{i + 1}</span>
              <span style={{ flex: 1 }}>{nome}</span>
              {isTop && <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: 2 }}>★ PRÓXIMO</span>}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ===== Scene 4 — Recursos ===== */
function Scene4() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const cards = [
    { title: "GEOFENCE", sub: "Presença por GPS" },
    { title: "WI-FI", sub: "SSID do stand" },
    { title: "QR CODE", sub: "Token rotativo" },
    { title: "PIN", sub: "Senha de 6 dígitos" },
  ];
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center" }}>
      <div style={{ opacity: op }}>
        <Eyebrow>Presença blindada</Eyebrow>
        <div style={{ marginTop: 18 }}>
          <Headline size={110}>4 FORMAS<br />DE PROVAR<br />QUE VOCÊ<br />ESTÁ AQUI.</Headline>
        </div>
      </div>
      <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {cards.map((c, i) => {
          const s = spring({ frame: f - (30 + i * 6), fps, config: { damping: 16 } });
          const sc = interpolate(s, [0, 1], [0.85, 1]);
          const opi = interpolate(s, [0, 1], [0, 1]);
          return (
            <div key={c.title}
              style={{
                opacity: opi,
                transform: `scale(${sc})`,
                padding: "32px 28px",
                borderRadius: 18,
                background: "rgba(245,165,36,0.08)",
                border: `1.5px solid ${ORANGE}66`,
                color: CREAM,
              }}>
              <div style={{ fontFamily: FF_DISPLAY, fontSize: 64, color: ORANGE, letterSpacing: 1 }}>{c.title}</div>
              <div style={{ fontFamily: FF_BODY, fontSize: 26, color: SLATE, marginTop: 6 }}>{c.sub}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}

/* ===== Scene 5 — CTA ===== */
function Scene5() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const op1 = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const s1 = spring({ frame: f - 18, fps, config: { damping: 16 } });
  const sc = interpolate(s1, [0, 1], [0.9, 1]);
  const pulse = 1 + Math.sin(f / 6) * 0.02;
  return (
    <AbsoluteFill style={{ padding: 100, justifyContent: "center", alignItems: "center", textAlign: "center" }}>
      <div style={{ opacity: op1 }}>
        <Eyebrow>Elite 4.0</Eyebrow>
      </div>
      <div style={{ marginTop: 24, transform: `scale(${sc})` }}>
        <h1 style={{ fontFamily: FF_DISPLAY, fontSize: 170, lineHeight: 0.9, color: CREAM, margin: 0, textTransform: "uppercase", letterSpacing: -2 }}>
          ROLETA<br /><span style={{ color: ORANGE }}>CORRETOR</span>
        </h1>
      </div>
      <p style={{ fontFamily: FF_BODY, color: SLATE, fontSize: 34, marginTop: 30, maxWidth: 800 }}>
        Justiça, presença e governança no plantão.
      </p>
      <div style={{
        marginTop: 60,
        transform: `scale(${pulse})`,
        background: `linear-gradient(90deg, ${ORANGE}, ${ORANGE_HOT})`,
        color: NAVY_DEEP,
        padding: "26px 50px",
        borderRadius: 999,
        fontFamily: FF_BODY,
        fontWeight: 800,
        fontSize: 36,
        letterSpacing: 1,
        boxShadow: `0 10px 40px ${ORANGE}55`,
      }}>
        roletacorretor.simuladorcorretorelite.com.br
      </div>
      <div style={{ marginTop: 26, fontFamily: FF_BODY, color: SLATE, fontSize: 24, letterSpacing: 3 }}>
        SIMULADOR CORRETOR · ECOSSISTEMA ELITE 4.0
      </div>
    </AbsoluteFill>
  );
}

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: NAVY_DEEP }}>
      <Bg />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={S1}><Scene1 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS })} />
        <TransitionSeries.Sequence durationInFrames={S2}><Scene2 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS })} />
        <TransitionSeries.Sequence durationInFrames={S3}><Scene3 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS })} />
        <TransitionSeries.Sequence durationInFrames={S4}><Scene4 /></TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={springTiming({ config: { damping: 200 }, durationInFrames: TRANS })} />
        <TransitionSeries.Sequence durationInFrames={S5}><Scene5 /></TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
