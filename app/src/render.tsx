import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./render.css";
import { sampleProject } from "./data/sampleProject";
import { normalizeProject } from "./utils/project";
import type { OverlayProject } from "./types";
import { OverlayRender } from "./render/OverlayRender";

declare global {
  interface Window {
    __OVERLAY_PROJECT?: Partial<OverlayProject>;
    __RENDER_TIME?: number;
    __FRAME_READY?: boolean;
    __RENDER_READY?: boolean;
    __setRenderTime?: (time: number) => void;
  }
}

function markFrameReady() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      window.__FRAME_READY = true;
    });
  });
}

function RenderApp() {
  const [project] = useState<OverlayProject>(() =>
    normalizeProject(window.__OVERLAY_PROJECT || {}, sampleProject),
  );
  const [frame, setFrame] = useState(() => ({
    time: window.__RENDER_TIME || 0,
    seq: 0,
  }));

  useEffect(() => {
    window.__setRenderTime = (time: number) => {
      window.__FRAME_READY = false;
      // Always bump seq so the effect fires even when the time value repeats.
      setFrame((current) => ({ time, seq: current.seq + 1 }));
    };
    void document.fonts.ready.then(() => {
      window.__RENDER_READY = true;
      markFrameReady();
    });
  }, []);

  useEffect(() => {
    if (window.__RENDER_READY) markFrameReady();
  }, [frame.seq]);

  return <OverlayRender project={project} currentTime={frame.time} />;
}

createRoot(document.getElementById("root")!).render(<RenderApp />);
