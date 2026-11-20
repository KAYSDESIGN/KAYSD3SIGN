import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Easing,
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

/* ---------- Transitions ---------- */

// Length of a zoom-blur dissolve (fast: ~0.27 s).
const T = 8;
const ease = Easing.inOut(Easing.cubic);

type InKind = "none" | "zoom" | "flash" | "fromBlack" | "dissolve";
type OutKind = "none" | "zoom" | "toBlack";

// Frames the shot starts before its storyboard time, to overlap the previous one.
const leadFor = (k: InKind) => (k === "zoom" || k === "dissolve" ? T : 0);

// Real clip lengths (s): the clip is slowed imperceptibly (~3 %) to also fill
// the overlap, so every storyboard timing stays exact.
const CLIP_SECONDS: Record<string, number> = {
  "clip1.mp4": 4.032,
  "clip2.mp4": 8.042,
  "clip4.mp4": 8.042,
  "clip5.mp4": 8.042,
  "clip6.mp4": 5.034,
  "clip7.mp4": 6.037,
  "clip8.mp4": 7.04,
};

const Shot: React.FC<{
  range: readonly [number, number];
  inKind?: InKind;
  outKind?: OutKind;
  video?: string;
  background?: (lead: number) => React.ReactNode;
  children?: React.ReactNode;
}> = ({ range, inKind = "none", outKind = "none", video, background, children }) => {
  const lead = leadFor(inKind);
  const from = s(range[0]) - lead;
  const duration = s(range[1] - range[0]) + lead;
  return (
    <Sequence from={from} durationInFrames={duration}>
      <ShotFx inKind={inKind} outKind={outKind} lead={lead} duration={duration}>
        {video ? (
          <AbsoluteFill style={{ backgroundColor: "black" }}>
            <OffthreadVideo
              src={staticFile(video)}
              muted
              playbackRate={CLIP_SECONDS[video] / (duration / FPS)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        ) : null}
        {background?.(lead)}
        {children ? (
          <Sequence from={lead} layout="none">
            {children}
          </Sequence>
        ) : null}
      </ShotFx>
    </Sequence>
  );
};

const ShotFx: React.FC<{
  inKind: InKind;
  outKind: OutKind;
  lead: number;
  duration: number;
  children: React.ReactNode;
}> = ({ inKind, outKind, lead, duration, children }) => {
  const frame = useCurrentFrame();
  let opacity = 1;
  let scale = 1;
  let blur = 0;
  let flash = 0;

  // Entrance
  if (inKind === "zoom" && frame < lead) {
    const p = ease(frame / lead);
    opacity = p;
    scale = interpolate(p, [0, 1], [1.08, 1]);
    blur = interpolate(p, [0, 1], [14, 0]);
  } else if (inKind === "dissolve" && frame < lead) {
    opacity = ease(frame / lead);
  } else if (inKind === "fromBlack") {
    const p = ease(Math.min(1, frame / 10));
    opacity = p;
    scale = interpolate(p, [0, 1], [1.04, 1]);
  } else if (inKind === "flash") {
    flash = interpolate(frame, [0, 2, 9], [0.55, 0.35, 0], {
      extrapolateRight: "clamp",
    });
    scale = interpolate(frame, [0, 9], [1.05, 1], {
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
  }

  // Exit (the next shot dissolves on top during the last T frames)
  const outStart = duration - T;
  if (outKind === "zoom" && frame >= outStart) {
    const p = ease((frame - outStart) / T);
    scale *= interpolate(p, [0, 1], [1, 1.06]);
    blur += interpolate(p, [0, 1], [0, 10]);
  } else if (outKind === "toBlack") {
    const start = duration - 12;
    if (frame >= start) opacity *= 1 - ease((frame - start) / 12);
  }

  return (
    <AbsoluteFill style={{ opacity }}>
      <AbsoluteFill
        style={{
          transform: `scale(${scale})`,
          filter: blur > 0.01 ? `blur(${blur}px)` : undefined,
        }}
      >
        {children}
      </AbsoluteFill>
      {flash > 0 ? (
        <AbsoluteFill style={{ backgroundColor: "white", opacity: flash }} />
      ) : null}
    </AbsoluteFill>
  );
};

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

const Scene3: React.FC<{ lead: number }> = ({ lead }) => {
  const frame = useCurrentFrame() - lead;
  const dur = s(4);
  const zoom = interpolate(frame, [-lead, dur], [1, 1.1]);
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
      <Sequence from={lead} layout="none">
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
      </Sequence>
      <AbsoluteFill style={{ backgroundColor: "black", opacity: black }} />
    </AbsoluteFill>
  );
};

const Choices: React.FC<{ lead: number }> = ({ lead }) => {
  const frame = useCurrentFrame() - lead;
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
    <Shot range={TIMELINE.clip1} video="clip1.mp4" outKind="zoom">
      <BigClock time="03:14" />
      <Sequence from={s(1)}>
        <NotificationBanner detail="Noé · envoyé demain à 03:17" />
      </Sequence>
    </Shot>

    {/* 4–12 s — Clip 2 : le vocal */}
    <Shot range={TIMELINE.clip2} video="clip2.mp4" inKind="zoom" outKind="zoom">
      <FadeIn>
        <Pill bottom={360}>
          <MicIcon />
          Message vocal
          <Waveform />
        </Pill>
      </FadeIn>
    </Shot>

    {/* 12–16 s — Scène 3 : image fixe, zoom lent, puis noir 0,5 s */}
    <Shot
      range={TIMELINE.scene3}
      inKind="zoom"
      background={(lead) => <Scene3 lead={lead} />}
    />

    {/* 16–24 s — Clip 4 : les coups (flash sur le premier coup) */}
    <Shot range={TIMELINE.clip4} video="clip4.mp4" inKind="flash" outKind="zoom" />

    {/* 24–32 s — Clip 5 : l'appel à Léa */}
    <Shot range={TIMELINE.clip5} video="clip5.mp4" inKind="zoom" outKind="zoom">
      <FadeIn>
        <Pill top={170}>
          <span style={{ width: 22, height: 22, borderRadius: 11, background: "#3ddc6a" }} />
          Appel : Léa
        </Pill>
      </FadeIn>
    </Shot>

    {/* 32–37 s — Clip 6 : le judas */}
    <Shot range={TIMELINE.clip6} video="clip6.mp4" inKind="zoom" outKind="zoom" />

    {/* 37–43 s — Clip 7 : le palier vide, fondu au noir */}
    <Shot range={TIMELINE.clip7} video="clip7.mp4" inKind="zoom" outKind="toBlack" />

    {/* 43–46 s — écran noir (chuchotement de Léa) */}

    {/* 46–53 s — Clip 8 : le nouveau message (bannière à 48 s) */}
    <Shot range={TIMELINE.clip8} video="clip8.mp4" inKind="fromBlack">
      <Sequence from={s(2)}>
        <NotificationBanner detail="Noé · envoyé demain à 03:18" />
      </Sequence>
    </Shot>

    {/* 53–60 s — arrêt sur image : la couleur se dissout en noir et blanc */}
    <Shot
      range={TIMELINE.choices}
      inKind="dissolve"
      background={(lead) => <Choices lead={lead} />}
    />
  </AbsoluteFill>
);
