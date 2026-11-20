import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});

export const FPS = 30;
export const TOTAL_SECONDS = 60;
const s = (sec: number) => Math.round(sec * FPS);

// Timeline from the storyboard (seconds).
const TIMELINE = {
  clip1: [0, 4],
  clip2: [4, 12],
  scene3: [12, 16],
  clip4: [16, 24],
  clip5: [24, 32],
  clip6: [32, 37],
  clip7: [37, 43],
  black: [43, 46],
  clip8: [46, 53],
  choices: [53, 60],
} as const;

const At: React.FC<{
  range: readonly [number, number];
  children: React.ReactNode;
}> = ({ range, children }) => (
  <Sequence from={s(range[0])} durationInFrames={s(range[1] - range[0])}>
    {children}
  </Sequence>
);

const Clip: React.FC<{ src: string }> = ({ src }) => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    <OffthreadVideo
      src={staticFile(src)}
      muted
      style={{ width: "100%", height: "100%", objectFit: "cover" }}
    />
  </AbsoluteFill>
);

/* ---------- Overlays ---------- */

// Same notification banner (font, colour, position) at 0 s and 48 s.
const NotificationBanner: React.FC<{ detail: string }> = ({ detail }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ alignItems: "center" }}>
      <div
        style={{
          marginTop: 150,
          width: 940,
          transform: `translateY(${interpolate(enter, [0, 1], [-260, 0])}px)`,
          opacity: enter,
          display: "flex",
          alignItems: "center",
          gap: 30,
          padding: "30px 36px",
          borderRadius: 48,
          background: "rgba(30, 32, 40, 0.72)",
          backdropFilter: "blur(30px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          fontFamily,
          color: "white",
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "linear-gradient(160deg,#5ee07a,#24b04a)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MicIcon />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontWeight: 700, fontSize: 40 }}>Message vocal</span>
            <span style={{ fontSize: 32, opacity: 0.6 }}>maintenant</span>
          </div>
          <div style={{ fontSize: 38, opacity: 0.9, marginTop: 6 }}>
            {detail}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MicIcon: React.FC = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="white">
    <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z" />
  </svg>
);

const BigClock: React.FC<{ time: string; top?: number }> = ({
  time,
  top = 330,
}) => (
  <AbsoluteFill style={{ alignItems: "center" }}>
    <div
      style={{
        marginTop: top,
        fontFamily,
        fontWeight: 300,
        fontSize: 220,
        letterSpacing: -4,
        color: "white",
        textShadow: "0 6px 40px rgba(0,0,0,0.6)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {time}
    </div>
  </AbsoluteFill>
);

const FadeIn: React.FC<{ children: React.ReactNode; frames?: number }> = ({
  children,
  frames = 8,
}) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        opacity: interpolate(frame, [0, frames], [0, 1], {
          extrapolateRight: "clamp",
        }),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

const Pill: React.FC<{ children: React.ReactNode; bottom?: number; top?: number }> = ({
  children,
  bottom,
  top,
}) => (
  <AbsoluteFill
    style={{
      alignItems: "center",
      justifyContent: top !== undefined ? "flex-start" : "flex-end",
    }}
  >
    <div
      style={{
        marginTop: top,
        marginBottom: bottom,
        display: "flex",
        alignItems: "center",
        gap: 20,
        padding: "22px 44px",
        borderRadius: 999,
        background: "rgba(20, 22, 30, 0.7)",
        backdropFilter: "blur(20px)",
        fontFamily,
        fontWeight: 600,
        fontSize: 44,
        color: "white",
      }}
    >
      {children}
    </div>
  </AbsoluteFill>
);

const Waveform: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", height: 50 }}>
      {Array.from({ length: 14 }).map((_, i) => {
        const h = 12 + Math.abs(Math.sin(frame / 4 + i * 0.9)) * 38;
        return (
          <div
            key={i}
            style={{ width: 7, height: h, borderRadius: 4, background: "white" }}
          />
        );
      })}
    </div>
  );
};

/* ---------- Scenes ---------- */

const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const dur = s(4);
  const zoom = interpolate(frame, [0, dur], [1, 1.1]);
  const blackStart = dur - s(0.5);
  const black = interpolate(frame, [blackStart, blackStart + 3], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const clockFlip = s(2.4);
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})` }}>
        <Img
          src={staticFile("S3.jpg")}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </AbsoluteFill>
      <FadeIn>
        <BigClock time={frame < clockFlip ? "03:16" : "03:17"} top={260} />
        <AbsoluteFill style={{ alignItems: "center" }}>
          <div
            style={{
              marginTop: 530,
              fontFamily,
              fontWeight: 600,
              fontSize: 46,
              color: "white",
              padding: "14px 34px",
              borderRadius: 999,
              background: "rgba(20,22,30,0.65)",
            }}
          >
            Envoyé : demain, 03:17
          </div>
        </AbsoluteFill>
      </FadeIn>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: black }} />
    </AbsoluteFill>
  );
};

const Choices: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const appear = (delay: number) =>
    spring({ frame: frame - delay, fps, config: { damping: 20 } });
  const line = (text: string, delay: number, size: number, weight = 700) => {
    const p = appear(delay);
    return (
      <div
        style={{
          opacity: p,
          transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px)`,
          fontSize: size,
          fontWeight: weight,
          textAlign: "center",
        }}
      >
        {text}
      </div>
    );
  };
  return (
    <AbsoluteFill>
      <Img
        src={staticFile("clip8_last.png")}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "grayscale(1) contrast(1.05)",
        }}
      />
      <AbsoluteFill style={{ background: "rgba(0,0,0,0.55)" }} />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          gap: 60,
          padding: "0 90px",
          fontFamily,
          color: "white",
          textShadow: "0 4px 30px rgba(0,0,0,0.8)",
        }}
      >
        {line("A : Ouvrir la porte", s(0.4), 76)}
        {line("B : Rappeler son propre numéro", s(1.2), 76)}
        <div style={{ height: 30 }} />
        {line("Commente A ou B.", s(2.2), 52, 400)}
        {line("La majorité décide de la suite.", s(2.6), 52, 400)}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const Episode1: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "black" }}>
    {/* 0–4 s — Clip 1 : le téléphone */}
    <At range={TIMELINE.clip1}>
      <Clip src="clip1.mp4" />
      <BigClock time="03:14" />
      <Sequence from={s(1)}>
        <NotificationBanner detail="Noé · envoyé demain à 03:17" />
      </Sequence>
    </At>

    {/* 4–12 s — Clip 2 : le vocal */}
    <At range={TIMELINE.clip2}>
      <Clip src="clip2.mp4" />
      <FadeIn>
        <Pill bottom={360}>
          <MicIcon />
          Message vocal
          <Waveform />
        </Pill>
      </FadeIn>
    </At>

    {/* 12–16 s — Scène 3 : image fixe, zoom lent, puis noir 0,5 s */}
    <At range={TIMELINE.scene3}>
      <Scene3 />
    </At>

    {/* 16–24 s — Clip 4 : les coups */}
    <At range={TIMELINE.clip4}>
      <Clip src="clip4.mp4" />
    </At>

    {/* 24–32 s — Clip 5 : l'appel à Léa */}
    <At range={TIMELINE.clip5}>
      <Clip src="clip5.mp4" />
      <FadeIn>
        <Pill top={170}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: "#3ddc6a" }} />
          Appel : Léa
        </Pill>
      </FadeIn>
    </At>

    {/* 32–37 s — Clip 6 : le judas */}
    <At range={TIMELINE.clip6}>
      <Clip src="clip6.mp4" />
    </At>

    {/* 37–43 s — Clip 7 : le palier vide */}
    <At range={TIMELINE.clip7}>
      <Clip src="clip7.mp4" />
    </At>

    {/* 43–46 s — écran noir (chuchotement de Léa) : rien à afficher */}

    {/* 46–53 s — Clip 8 : le nouveau message (bannière à 48 s) */}
    <At range={TIMELINE.clip8}>
      <Clip src="clip8.mp4" />
      <Sequence from={s(2)}>
        <NotificationBanner detail="Noé · envoyé demain à 03:18" />
      </Sequence>
    </At>

    {/* 53–60 s — arrêt sur image désaturé + choix */}
    <At range={TIMELINE.choices}>
      <Choices />
    </At>
  </AbsoluteFill>
);
