import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { FilesetResolver, ImageSegmenter } from "@mediapipe/tasks-vision";

export function BehindPerson({ videoRef, videoUrl, children, onError }: {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoUrl: string;
  children: ReactNode;
  onError: (message: string) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!videoUrl) return;
    let stopped = false;
    let frame = 0;
    let segmenter: ImageSegmenter | undefined;
    let lastTime = -1;
    let lastStamp = 0;
    setReady(false);
    const mask = document.createElement("canvas");
    const full = document.createElement("canvas");
    const maskContext = mask.getContext("2d")!;
    const fullContext = full.getContext("2d")!;
    const fail = () => {
      setReady(false);
      onErrorRef.current("人物遮挡识别暂不可用，APP 环绕层已隐藏。请重新上传视频后重试。");
    };
    void (async () => {
      try {
        const base = import.meta.env.BASE_URL;
        const vision = await FilesetResolver.forVisionTasks(`${base}person-mask/wasm`);
        const instance = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: `${base}person-mask/selfie_segmenter.tflite`, delegate: "CPU" },
          runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false,
        });
        if (stopped) { instance.close(); return; }
        segmenter = instance;
        const tick = (stamp: number) => {
          if (stopped) return;
          const video = videoRef.current;
          const target = layer.current;
          if (video && target && video.readyState >= 2 && !video.seeking && stamp - lastStamp > 66) {
            const key = `${video.currentTime}:${target.clientWidth}:${target.clientHeight}:${getComputedStyle(video).transform}`;
            if (target.dataset.maskFrame !== key) {
              lastStamp = stamp;
              try {
                instance.segmentForVideo(video, Math.max(stamp, lastTime + 1), result => {
                  lastTime = stamp;
                  const confidence = result.confidenceMasks?.at(-1);
                  if (!confidence) throw new Error("Missing person confidence mask");
                  mask.width = confidence.width; mask.height = confidence.height;
                  const pixels = maskContext.createImageData(mask.width, mask.height);
                  const values = confidence.getAsFloat32Array();
                  for (let i = 0; i < values.length; i++) {
                    const v = Math.min(1, Math.max(0, (values[i] - 0.2) / 0.55));
                    pixels.data[i * 4] = pixels.data[i * 4 + 1] = pixels.data[i * 4 + 2] = 255;
                    pixels.data[i * 4 + 3] = Math.round(255 * (1 - v * v * (3 - 2 * v)));
                  }
                  maskContext.putImageData(pixels, 0, 0);
                  full.width = 512;
                  full.height = Math.round(512 * target.clientHeight / Math.max(1, target.clientWidth));
                  fullContext.fillStyle = "white"; fullContext.fillRect(0, 0, full.width, full.height);
                  const matrix = new DOMMatrix(getComputedStyle(video).transform);
                  const scale = Math.max(full.width / video.videoWidth, full.height / video.videoHeight) * matrix.a;
                  const w = video.videoWidth * scale, h = video.videoHeight * scale;
                  fullContext.globalCompositeOperation = "copy";
                  fullContext.drawImage(mask, (full.width - w) / 2, (full.height - h) / 2, w, h);
                  fullContext.globalCompositeOperation = "source-over";
                  target.style.maskImage = `url(${full.toDataURL()})`;
                  target.dataset.maskFrame = key;
                  target.dataset.maskState = "ready";
                  setReady(true);
                });
              } catch { fail(); return; }
            }
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch { if (!stopped) fail(); }
    })();
    return () => { stopped = true; cancelAnimationFrame(frame); segmenter?.close(); };
  }, [videoUrl, videoRef]);

  return <div ref={layer} data-mask-state={videoUrl ? ready ? "ready" : "loading" : "no-video"} style={{
    position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none",
    maskSize: "100% 100%", maskRepeat: "no-repeat", opacity: !videoUrl || ready ? 1 : 0,
    ...(!videoUrl ? { maskImage: "radial-gradient(ellipse 27% 39% at 50% 43%, transparent 90%, black 100%)" } : {}),
  }}>{children}</div>;
}
