import { Composition } from "remotion";
import { Episode1, FPS, TOTAL_SECONDS } from "./Episode1";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Episode1"
    component={Episode1}
    durationInFrames={TOTAL_SECONDS * FPS}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
