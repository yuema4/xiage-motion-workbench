import { useLayoutEffect, useRef } from "react";
import * as THREE from "three";
import type { EffectProps } from "./PreviewStage";

function makeTexture(title: string, meta: string, accent: string, ink: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext("2d")!;
  ctx.beginPath();
  ctx.roundRect(8, 8, 1008, 304, 40);
  const glass = ctx.createLinearGradient(0, 0, 1024, 320);
  glass.addColorStop(0, "rgba(233,246,255,0.68)");
  glass.addColorStop(0.18, "rgba(166,198,223,0.36)");
  glass.addColorStop(0.46, "rgba(28,49,68,0.48)");
  glass.addColorStop(0.78, "rgba(69,99,123,0.38)");
  glass.addColorStop(1, "rgba(218,237,248,0.62)");
  ctx.fillStyle = glass;
  ctx.fill();
  const edge = ctx.createLinearGradient(0, 0, 1024, 320);
  edge.addColorStop(0, "rgba(255,255,255,0.96)");
  edge.addColorStop(0.38, "rgba(228,244,255,0.22)");
  edge.addColorStop(0.7, "rgba(21,39,58,0.5)");
  edge.addColorStop(1, "rgba(241,250,255,0.88)");
  ctx.strokeStyle = edge;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(17, 17, 990, 286, 33);
  ctx.strokeStyle = "rgba(235,248,255,0.26)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(12, 12, 1000, 296, 37);
  ctx.clip();
  const reflection = ctx.createLinearGradient(0, 0, 180, 300);
  reflection.addColorStop(0, "rgba(255,255,255,0.24)");
  reflection.addColorStop(0.45, "rgba(255,255,255,0.02)");
  reflection.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = reflection;
  ctx.fillRect(0, 0, 1024, 320);
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = accent;
  ctx.fillRect(12, 296, 1000, 3);
  ctx.restore();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = ink;
  const chars = Array.from(title);
  const lines = chars.length > 12
    ? [chars.slice(0, Math.ceil(chars.length / 2)).join(""), chars.slice(Math.ceil(chars.length / 2)).join("")]
    : [title];
  let fontSize = lines.length > 1 ? 62 : 78;
  do { ctx.font = `600 ${fontSize}px sans-serif`; fontSize -= 2; }
  while (Math.max(...lines.map(line => ctx.measureText(line).width)) > 888 && fontSize > 12);
  lines.forEach((line, i) => ctx.fillText(line, 512, (lines.length > 1 ? 104 : 136) + i * 74));
  ctx.font = "500 28px sans-serif";
  ctx.fillStyle = "#e4f1ff";
  ctx.fillText(meta, 512, 251, 888);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function OrbitGlassCards({ clip, progress, aspectRatio = "16:9" }: EffectProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const world = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.OrthographicCamera;
    cards: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[];
    height: number;
  } | null>(null);
  const height = aspectRatio === "9:16" || aspectRatio === "4:5" ? 2240 : 820;

  useLayoutEffect(() => {
    if (!canvas.current) return;
    const renderer = new THREE.WebGLRenderer({ canvas: canvas.current, alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(1280, height, false);
    renderer.setClearColor(0, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-640, 640, height / 2, -height / 2, 1, 3000);
    camera.position.z = 1800;
    const lines = clip.text.split(/\n+/).map(line => line.trim()).filter(Boolean).slice(0, 12);
    const cards = (lines.length ? lines : ["脚本拆解", "信息卡片", "流程节点", "证据图表", "标题动效", "素材沉淀"]).map(line => {
      const [title, meta = ""] = line.split("|").map(part => part.trim());
      const geometry = new THREE.PlaneGeometry(440, 138, 32, 1);
      const vertices = geometry.attributes.position;
      // Bend the panel itself, so the edge and lettering share the curvature.
      for (let i = 0; i < vertices.count; i++) {
        const x = vertices.getX(i);
        vertices.setXYZ(i, Math.sin(x / 360) * 360, vertices.getY(i), (Math.cos(x / 360) - 1) * 360);
      }
      geometry.computeVertexNormals();
      const material = new THREE.MeshBasicMaterial({ map: makeTexture(title, meta, clip.params.accent, clip.params.titleColor || "#ffffff"), transparent: true, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(geometry, material);
      const sheen = { value: 0 };
      material.userData.sheen = sheen;
      material.onBeforeCompile = (shader) => {
        shader.uniforms.glassSheen = sheen;
        shader.fragmentShader = "uniform float glassSheen;\n" + shader.fragmentShader;
        // Reflection stays inside the texture alpha; opaque lettering remains crisp.
        shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", `
          #include <map_fragment>
          float band = exp(-pow((vMapUv.x + vMapUv.y * 0.3 - glassSheen) / 0.13, 2.0));
          float surface = (1.0 - sampledDiffuseColor.a) * step(0.02, sampledDiffuseColor.a);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.90, 0.96, 1.0), band * surface * 0.32);
        `);
      };
      scene.add(mesh);
      return mesh;
    });
    world.current = { renderer, scene, camera, cards, height };
    return () => {
      world.current = null;
      cards.forEach(card => { card.geometry.dispose(); card.material.map?.dispose(); card.material.dispose(); });
      renderer.dispose();
    };
  }, [clip.text, clip.params.accent, clip.params.titleColor, height]);

  useLayoutEffect(() => {
    const state = world.current;
    if (!state) return;
    const { cards, renderer, scene, camera } = state;
    cards.forEach((card, index) => {
      const row = index % 3;
      const count = Math.ceil((cards.length - row) / 3);
      const angle = Math.floor(index / 3) / count * Math.PI * 2 + progress * Math.PI * 2 * 0.65 + row * 0.85;
      const depth = (Math.sin(angle) + 1) / 2;
      const slot = Math.floor(index / 3);
      const side = slot % 2 === 0 ? -1 : 1;
      const x = row === 0 ? side * (395 + Math.sin(angle) * 10) : Math.cos(angle) * 400;
      const yFromTop = row === 0
        ? height * (0.14 + slot * 0.12) + Math.sin(angle) * 12
        : height * [0, 0.69, 0.84][row] + Math.sin(angle) * height * 0.045;
      const scale = row === 0 ? 0.7 + depth * 0.15 : 0.72 + depth * 0.44;
      const enter = Math.min(1, Math.max(0, (progress - index * 0.014) / 0.15));
      // Face-height cards follow the outer side arcs; lower rings can cross
      // the foreground. No person segmentation is implied by this layout.
      const faceVisibility = 1;
      card.position.set(x - (1 - enter) * 60, height / 2 - yFromTop, depth * 160);
      card.rotation.y = row === 0 ? -side * 0.9 : -Math.cos(angle) * 0.85;
      card.rotation.z = Math.cos(angle) * 0.035;
      card.material.userData.sheen.value = 0.65 + Math.sin(angle) * 0.65;
      card.scale.setScalar(scale);
      card.material.opacity = enter * faceVisibility * (0.62 + depth * 0.38);
      card.renderOrder = Math.round(depth * 100);
    });
    renderer.render(scene, camera);
  }, [progress, clip.text, clip.params.accent, clip.params.titleColor, height]);

  return <canvas ref={canvas} aria-label="曲面玻璃环绕卡片" style={{ display: "block", width: "100%", height: "100%", background: "transparent" }} />;
}
