import type { EffectProps } from "./PreviewStage";

const icons: Record<string, string> = {
  gpt: 'openai', chatgpt: 'openai', openai: 'openai', claude: 'claude-color', gemini: 'gemini-color',
  perplexity: 'perplexity-color', deepseek: 'deepseek-color', grok: 'grok', midjourney: 'midjourney', llama: 'meta-color', meta: 'meta-color',
};

export function AppIconOrbit({ clip, progress, aspectRatio }: EffectProps) {
  const portrait = aspectRatio === '9:16' || aspectRatio === '4:5';
  const height = portrait ? 1800 : 820;
  const items = clip.text.split(/\n+/).map(line => line.split('|')[0].trim()).filter(Boolean).slice(0, 16);
  return <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>
    {items.map((name, index) => {
      const angle = index / Math.max(1, items.length) * Math.PI * 2 + progress * Math.PI * 1.4;
      const depth = (Math.sin(angle) + 1) / 2;
      const inner = index % 3 === 0;
      const x = 640 + Math.cos(angle) * (inner ? 340 : 475);
      const y = height * 0.45 + Math.sin(angle) * height * (inner ? 0.23 : 0.34);
      const size = 106 + depth * 30;
      const entry = Math.min(1, Math.max(0, (progress - index * 0.008) / 0.12));
      const icon = icons[name.toLowerCase()];
      return <div key={`${name}-${index}`} title={name} data-app-orbit-icon={name} style={{
        position: 'absolute', left: x, top: y, width: size, height: size,
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        borderRadius: 24, border: '1px solid #e4e6e9', background: '#ffffff',
        transform: `translate(-50%, -50%) scale(${0.8 + depth * 0.2}) rotate(${Math.cos(angle) * 3}deg)`,
        opacity: entry * (0.72 + depth * 0.28), zIndex: Math.round(depth * 100),
      }}>
        {icon ? <img src={`${import.meta.env.BASE_URL}app-icons/${icon}.svg`} alt={name} draggable={false} style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
          : <span style={{ fontSize: 20, color: '#16202c', fontWeight: 700, textAlign: 'center', overflowWrap: 'anywhere', padding: 8 }}>{name}</span>}
      </div>;
    })}
  </div>;
}
