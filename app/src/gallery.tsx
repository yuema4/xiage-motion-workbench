import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Pause, Play, ArrowCounterClockwise } from '@phosphor-icons/react';
import { effectRegistry, effectsById } from './data/effectRegistry';
import { allTechModules } from './data/effectTemplates';
import { defaultTextForEffect, defaultTitleColorForBaseEffect } from './data/effectExamples';
import { OverlayRender } from './render/OverlayRender';
import type { OverlayProject } from './types';
import './styles.css';
import './gallery.css';

const items = [
  ...effectRegistry.filter(e => e.id !== 'split-evidence').map(e => ({
    id: e.id, name: e.name, group: '基础动效',
    project: { title: e.name, styleId: 'tech-hud', canvas: { aspectRatio: '16:9', width: 1920, height: 1080, fps: 30 }, clips: [{ id: e.id, effectId: e.id, label: e.name, text: defaultTextForEffect(e.id), start: 0, duration: 6, lane: 0, enabled: true, params: { ...e.defaultParams, x: 8, y: 16, titleColor: defaultTitleColorForBaseEffect(e.id) || e.defaultParams.titleColor } }] } as OverlayProject,
  })),
  ...allTechModules.filter(m => !m.id.startsWith('split-')).map(m => ({
    id: m.id, name: m.name, group: '高级动效',
    project: { title: m.name, styleId: m.styleId, canvas: { aspectRatio: '16:9', width: 1920, height: 1080, fps: 30 }, clips: [{ id: m.id, effectId: m.effectId, label: m.label, text: m.text, start: 0, duration: 6, lane: 0, enabled: true, params: { ...effectsById[m.effectId].defaultParams, ...m.params } }] } as OverlayProject,
  })),
];

function Tile({ item, playing, reset }: { item: typeof items[number]; playing: boolean; reset: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [visible, setVisible] = useState(false);
  const [time, setTime] = useState(3);
  const [bounds, setBounds] = useState<{x:number;y:number;w:number;h:number} | null>(null);
  const elapsed = useRef(3);
  useEffect(() => {
    if (bounds || time < 2.8 || !visible) return;
    const canvas = ref.current?.querySelector('.catalog-canvas');
    const card = canvas?.querySelector('.effect-hitbox')?.firstElementChild;
    if (!canvas || !card) return;
    const a = canvas.getBoundingClientRect(), b = card.getBoundingClientRect();
    const s = width / 1920;
    if (b.width > 0 && b.height > 0) setBounds({x:(b.left-a.left)/s,y:(b.top-a.top)/s,w:b.width/s,h:b.height/s});
  }, [time, visible, bounds, width]);
  useEffect(() => {
    const el = ref.current!;
    const resize = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    const observer = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    resize.observe(el); observer.observe(el);
    return () => { resize.disconnect(); observer.disconnect(); };
  }, []);
  useEffect(() => { elapsed.current = 0; setTime(0); }, [reset]);
  useEffect(() => {
    if (!playing || !visible) return;
    let raf = 0, previous = performance.now(), drawn = previous;
    const tick = (now: number) => {
      elapsed.current = (elapsed.current + Math.min((now - previous) / 1000, .1)) % 6.5;
      previous = now;
      if (now - drawn > 50) { setTime(elapsed.current); drawn = now; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, visible, reset]);
  const zoom = bounds ? Math.min((width - 48) / bounds.w, (width * 9 / 16 - 48) / bounds.h, 2) : width / 1920;
  const left = bounds ? (width - bounds.w * zoom) / 2 - bounds.x * zoom : 0;
  const top = bounds ? (width * 9 / 16 - bounds.h * zoom) / 2 - bounds.y * zoom : 0;
  return <article className="catalog-tile"><header><h2>{item.name}</h2><span>{item.group}</span></header>
    <div ref={ref} className="catalog-preview"><div className="catalog-canvas" style={{ left, top, transform: `scale(${zoom})` }}>
      {visible && <OverlayRender project={item.project} currentTime={time} />}
    </div></div><footer><code>{item.id}</code><span>{time.toFixed(1)} / 6.0s</span></footer>
  </article>;
}

function Gallery() {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('全部');
  const [playing, setPlaying] = useState(true);
  const [background, setBackground] = useState('dark');
  const [reset, setReset] = useState(0);
  const shown = items.filter(i => (group === '全部' || i.group === group) && (i.name + i.id).toLowerCase().includes(query.toLowerCase()));
  return <main className="catalog" data-background={background}><header className="catalog-head"><div><span>夏哥视效工作台</span><h1>动效总览 <small>{items.length}</small></h1></div><a href="/">返回工作台</a></header>
    <nav className="catalog-toolbar"><input aria-label="搜索卡片" placeholder="搜索卡片" value={query} onChange={e => setQuery(e.target.value)} />
      <select aria-label="卡片分类" value={group} onChange={e => setGroup(e.target.value)}>{['全部', '基础动效', '高级动效'].map(g => <option key={g}>{g}</option>)}</select>
      <select aria-label="预览底色" value={background} onChange={e => setBackground(e.target.value)}><option value="dark">深色底</option><option value="light">浅色底</option><option value="checker">透明棋盘</option></select>
      <button title={playing ? '暂停全部' : '播放全部'} aria-label={playing ? '暂停全部' : '播放全部'} onClick={() => setPlaying(!playing)}>{playing ? <Pause size={20}/> : <Play size={20}/>}</button>
      <button title="从头播放" aria-label="从头播放" onClick={() => {setReset(r => r + 1); setPlaying(true);}}><ArrowCounterClockwise size={20}/></button><span>{shown.length} 张</span>
    </nav><section className="catalog-grid">{shown.map(item => <Tile key={item.id} item={item} playing={playing} reset={reset}/>)}</section>{!shown.length && <p>没有匹配的卡片</p>}</main>;
}
createRoot(document.getElementById('root')!).render(<Gallery/>);
