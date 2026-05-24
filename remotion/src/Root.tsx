import { Composition } from "remotion";
import { MainVideo, DURATION } from "./MainVideo";

export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={DURATION}
    fps={30}
    width={1080}
    height={1920}
  />
);
