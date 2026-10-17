import type { CSSProperties } from 'react';
import type { EffectId, OverlayClip, OverlayProject } from '../types';
import { effectRegistry, effectsById } from '../data/effectRegistry';
import type { EffectCardTemplate } from '../data/effectTemplates';

type InspectorProps = {
  clip: OverlayClip | undefined;
  clipIndex: number;
  duration: number;
  techTemplates: EffectCardTemplate[];
  projectTitleColor?: string;
  onProjectUpdate: (patch: Partial<OverlayProject>) => void;
  onUpdate: (clipId: string, patch: Partial<OverlayClip>) => void;
  onParamUpdate: (clipId: string, key: keyof OverlayClip['params'], value: string | number) => void;
  onReplaceWithTemplate: (clipId: string, module: EffectCardTemplate) => void;
  onDuplicate: (clipId: string) => void;
  onDelete: (clipId: string) => void;
};

const accentOptions = [
  { name: '数据蓝', color: '#4da3ff' },
  { name: '琥珀橙', color: '#ffad44' },
  { name: '达成橙', color: '#ff5a22' },
  { name: '重点黄', color: '#f7cb46' },
  { name: '转变绿', color: '#20c978' },
  { name: '引用紫', color: '#9d7bff' },
  { name: '亮粉', color: '#fe90e8' },
];

function colorInputValue(color: string) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#ffad44';
}

const titleColorOptions = [
  { name: '白字', color: '#ffffff' },
  { name: '黑字', color: '#111111' },
  { name: '数据蓝', color: '#eaf7ff' },
];

function renderGlobalTitleColorControls(
  projectTitleColor: string | undefined,
  onProjectUpdate: (patch: Partial<OverlayProject>) => void,
) {
  const activeColor = projectTitleColor || '';
  return (
    <section className="inspector-section inspector-global-title-section">
      <div className="section-label"><strong>全局标题颜色</strong><span>GLOBAL TITLE</span></div>
      <div className="segmented-control title-tone-control">
        <button className={activeColor === '#ffffff' ? 'is-active' : ''} type="button" onClick={() => onProjectUpdate({ globalTitleColor: '#ffffff' })}>
          白字
        </button>
        <button className={activeColor === '#111111' ? 'is-active' : ''} type="button" onClick={() => onProjectUpdate({ globalTitleColor: '#111111' })}>
          黑字
        </button>
        <button className={!activeColor ? 'is-active' : ''} type="button" onClick={() => onProjectUpdate({ globalTitleColor: undefined })}>
          默认
        </button>
      </div>
      <div className="accent-grid accent-grid--title">
        {titleColorOptions.map((item) => (
          <button
            className={activeColor === item.color ? 'is-active' : ''}
            key={item.name}
            style={{ '--swatch': item.color } as CSSProperties}
            type="button"
            onClick={() => onProjectUpdate({ globalTitleColor: item.color })}
          >
            {item.name}
          </button>
        ))}
      </div>
      <label className="color-field">
        自定义全局标题色
        <input
          type="color"
          value={colorInputValue(activeColor || '#ffffff')}
          onChange={(event) => onProjectUpdate({ globalTitleColor: event.target.value })}
        />
      </label>
      <p className="field-note">这会覆盖当前项目里所有卡片的默认标题色；单卡标题色仍可在下方单独改。</p>
    </section>
  );
}

function exportClipJson(clip: OverlayClip) {
  const blob = new Blob([JSON.stringify(clip, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${clip.id}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Inspector({
  clip,
  clipIndex,
  duration,
  techTemplates,
  projectTitleColor,
  onProjectUpdate,
  onUpdate,
  onParamUpdate,
  onReplaceWithTemplate,
  onDuplicate,
  onDelete,
}: InspectorProps) {
  if (!clip) {
    return (
      <aside className="inspector empty-inspector">
        <span>PARAMETERS</span>
        <h2>选择一张动效卡</h2>
        <p>点中时间轴或画布上的动效块，就能改文案、时间、位置和颜色。</p>
        {renderGlobalTitleColorControls(projectTitleColor, onProjectUpdate)}
      </aside>
    );
  }

  const activeClip = clip;
  const effect = effectsById[activeClip.effectId];
  const endTime = Number((activeClip.start + activeClip.duration).toFixed(1));
  const hasFaceRisk = activeClip.params.x >= 38 && activeClip.params.x <= 62 && activeClip.params.y >= 14 && activeClip.params.y <= 54;
  const titleColor = activeClip.params.titleColor || '';
  const isTimeline = activeClip.params.moduleVariant === 'timeline-progress-bar';
  const widthScale = activeClip.params.widthScale || 1;
  const heightScale = activeClip.params.heightScale || 1;
  const isSplitVideo = activeClip.effectId === 'split-evidence';

  function setEffect(effectId: EffectId) {
    const nextEffect = effectsById[effectId];
    onUpdate(activeClip.id, {
      effectId,
      label: nextEffect.name,
      duration: Math.max(activeClip.duration, nextEffect.defaultDuration),
      params: {
        ...activeClip.params,
        ...nextEffect.defaultParams,
        x: activeClip.params.x,
        y: activeClip.params.y,
        scale: activeClip.params.scale,
        accent: activeClip.params.accent || nextEffect.defaultParams.accent,
        intensity: activeClip.params.intensity,
        speed: activeClip.params.speed,
        kicker: activeClip.params.kicker || nextEffect.defaultParams.kicker,
        subtitle: activeClip.params.subtitle || nextEffect.defaultParams.subtitle,
        titleColor: nextEffect.defaultParams.titleColor || '',
      },
    });
  }

  function setAlign(align: 'left' | 'center' | 'right') {
    onParamUpdate(activeClip.id, 'align', align);
    onParamUpdate(activeClip.id, 'x', align === 'left' ? 24 : align === 'right' ? 76 : 50);
  }

  function nudgeCardSize(axis: 'widthScale' | 'heightScale', delta: number) {
    const current = axis === 'widthScale' ? widthScale : heightScale;
    onParamUpdate(activeClip.id, axis, Number((current + delta).toFixed(2)));
  }

  function resetCardSize() {
    const { widthScale: _widthScale, heightScale: _heightScale, ...params } = activeClip.params;
    onUpdate(activeClip.id, { params });
  }

  return (
    <aside className="inspector">
      <div className="inspector-title card-title">
        <span>单卡参数 · CARD-{clipIndex + 1}</span>
        <h2>{effect.name}</h2>
        <p>{effect.role}</p>
      </div>

      <section className="inspector-section inspector-action-section">
        <div className="section-label"><strong>卡片操作</strong><span>ACTIONS</span></div>
        <div className="inspector-actions inspector-actions--top">
          <button type="button" onClick={() => onUpdate(clip.id, { enabled: !clip.enabled })}>{clip.enabled ? '临时隐藏' : '重新显示'}</button>
          <button type="button" onClick={() => onDuplicate(clip.id)}>复制</button>
          <button type="button" className="danger" onClick={() => onDelete(clip.id)}>删除</button>
        </div>
        <div className="card-quick-actions">
          <button type="button" onClick={() => onUpdate(clip.id, { start: 0 })}>重放动画</button>
          <button type="button" onClick={() => onDuplicate(clip.id)}>+ 加入时间轴</button>
          <button type="button" onClick={() => exportClipJson(clip)}>导出这张卡</button>
        </div>
      </section>

      {isSplitVideo && (
        <section className="inspector-section">
          <div className="section-label"><strong>分屏布局</strong><span>SPLIT SCREEN</span></div>
          <div className="segmented-control">
            <button className={(activeClip.params.splitLayout || 'side-by-side') === 'side-by-side' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(activeClip.id, 'splitLayout', 'side-by-side')}>左右分屏</button>
            <button className={activeClip.params.splitLayout === 'stacked' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(activeClip.id, 'splitLayout', 'stacked')}>上下分屏</button>
          </div>
          <div className="segmented-control">
            <button className={(activeClip.params.splitType || 'material') === 'web-demo' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(activeClip.id, 'splitType', 'web-demo')}>网页演示</button>
            <button className={activeClip.params.splitType === 'ai-animation' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(activeClip.id, 'splitType', 'ai-animation')}>AI 动画</button>
            <button className={activeClip.params.splitType === 'material' || !activeClip.params.splitType ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(activeClip.id, 'splitType', 'material')}>材料卡</button>
          </div>
          <label>
            人物画面占比
            <input type="range" min="35" max="65" step="1" value={activeClip.params.splitRatio || 52} onChange={(event) => onParamUpdate(activeClip.id, 'splitRatio', Number(event.target.value))} />
          </label>
          <p className="field-note">先在左侧上传演示视频，再播放这张卡。没有演示视频时，会显示原来的材料图表。</p>
        </section>
      )}

      <section className="inspector-section">
        <div className="section-label"><strong>落位与大小</strong><span>LAYOUT</span></div>
        <div className="segmented-control">
          {(['left', 'center', 'right'] as const).map((align) => (
            <button className={(clip.params.align || 'center') === align ? 'is-active' : ''} key={align} type="button" onClick={() => setAlign(align)}>
              {align === 'left' ? '左侧' : align === 'right' ? '右侧' : '居中'}
            </button>
          ))}
        </div>
        <div className="field-grid">
          <label>
            X 位置
            <input type="range" min="3" max={isTimeline ? 97 : 72} value={clip.params.x} onChange={(event) => onParamUpdate(clip.id, 'x', Number(event.target.value))} />
          </label>
          <label>
            Y 位置
            <input type="range" min={isTimeline ? -16 : 12} max={isTimeline ? 0 : 86} value={clip.params.y} onChange={(event) => onParamUpdate(clip.id, 'y', Number(event.target.value))} />
          </label>
        </div>
        {hasFaceRisk && (
          <div className="face-risk">
            当前卡片进入人物脸部安全区，建议移到左上、右上、左中或右中。
          </div>
        )}
        <div className="size-nudge-panel">
          <div>
            <strong>卡片宽高</strong>
            <span>宽 {Math.round(widthScale * 100)}% · 高 {Math.round(heightScale * 100)}%</span>
          </div>
          <div className="size-nudge-buttons">
            <button type="button" onClick={() => nudgeCardSize('widthScale', -0.1)}>窄一点</button>
            <button type="button" onClick={() => nudgeCardSize('widthScale', 0.1)}>宽一点</button>
            <button type="button" onClick={() => nudgeCardSize('heightScale', -0.1)}>矮一点</button>
            <button type="button" onClick={() => nudgeCardSize('heightScale', 0.1)}>高一点</button>
            <button type="button" onClick={resetCardSize}>恢复默认</button>
          </div>
        </div>
        <div className="field-grid">
          <label>
            缩放
            <input type="range" min="0.2" max="1.2" step="0.01" value={clip.params.scale} onChange={(event) => onParamUpdate(clip.id, 'scale', Number(event.target.value))} />
          </label>
          <label>
            强度
            <input type="range" min="20" max="100" value={clip.params.intensity} onChange={(event) => onParamUpdate(clip.id, 'intensity', Number(event.target.value))} />
          </label>
        </div>
      </section>

      <section className="inspector-section">
        <div className="section-label"><strong>内容</strong><span>CONTENT</span></div>
        <label>
          标注
          <input value={clip.params.kicker || ''} onChange={(event) => onParamUpdate(clip.id, 'kicker', event.target.value)} />
        </label>
        <label>
          主文案 / 章节表
          <textarea value={clip.text} rows={4} onChange={(event) => onUpdate(clip.id, { text: event.target.value })} />
        </label>
        <label>
          辅助说明
          <input value={clip.params.subtitle || ''} onChange={(event) => onParamUpdate(clip.id, 'subtitle', event.target.value)} />
        </label>
      </section>

      <section className="inspector-section">
        <div className="section-label"><strong>节奏</strong><span>TIMING</span></div>
        <div className="section-label section-label--sub"><strong>出现到消失(秒)</strong><span>{duration.toFixed(1)}s</span></div>
        <div className="range-pair">
          <input type="number" min="0" step="0.1" value={clip.start} onChange={(event) => onUpdate(clip.id, { start: Number(event.target.value) })} />
          <span>{'->'}</span>
          <input
            type="number"
            min={clip.start + 0.4}
            step="0.1"
            value={endTime}
            onChange={(event) => onUpdate(clip.id, { duration: Math.max(0.4, Number(event.target.value) - clip.start) })}
          />
        </div>
        <label>
          讲过变浅时刻(秒)
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="到这秒后压暗让位，但不退场"
            value={clip.params.fadeAt ?? ''}
            onChange={(event) => onParamUpdate(clip.id, 'fadeAt', Number(event.target.value))}
          />
        </label>
        <label className="slider-field">
          <span>动画速度(此卡)</span>
          <b>{clip.params.speed.toFixed(2)}x</b>
          <input type="range" min="0.5" max="1.8" step="0.05" value={clip.params.speed} onChange={(event) => onParamUpdate(clip.id, 'speed', Number(event.target.value))} />
        </label>
        <label>
          音效(出现时响，导出自动混入)
          <select value={clip.params.soundCue || 'auto'} onChange={(event) => onParamUpdate(clip.id, 'soundCue', event.target.value)}>
            <option value="auto">自动(按特效类型)</option>
            <option value="none">无</option>
            <option value="tick">轻点 tick</option>
            <option value="whoosh">滑入 whoosh</option>
            <option value="pop">卡片 pop</option>
          </select>
        </label>
      </section>

      <section className="inspector-section">
        <div className="section-label"><strong>样式</strong><span>STYLE</span></div>
        <div className="segmented-control">
          <button className={(clip.params.cardTheme || 'bright') === 'bright' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(clip.id, 'cardTheme', 'bright')}>日 亮底</button>
          <button className={clip.params.cardTheme === 'dim' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(clip.id, 'cardTheme', 'dim')}>月 暗底</button>
        </div>
        <div className="accent-grid">
          {accentOptions.map((item) => (
            <button
              className={clip.params.accent === item.color ? 'is-active' : ''}
              key={item.name}
              style={{ '--swatch': item.color } as CSSProperties}
              type="button"
              onClick={() => onParamUpdate(clip.id, 'accent', item.color)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <label className="color-field">
          自定义颜色
          <input
            type="color"
            value={colorInputValue(clip.params.accent)}
            onChange={(event) => onParamUpdate(clip.id, 'accent', event.target.value)}
          />
        </label>
        <div className="section-label"><strong>标题颜色</strong><span>TITLE</span></div>
        <div className="segmented-control title-tone-control">
          <button className={titleColor === '#ffffff' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(clip.id, 'titleColor', '#ffffff')}>
            白字
          </button>
          <button className={titleColor === '#111111' ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(clip.id, 'titleColor', '#111111')}>
            黑字
          </button>
          <button className={!titleColor ? 'is-active' : ''} type="button" onClick={() => onParamUpdate(clip.id, 'titleColor', '')}>
            默认
          </button>
        </div>
        <label className="color-field">
          自定义标题色
          <input
            type="color"
            value={colorInputValue(titleColor || '#ffffff')}
            onChange={(event) => onParamUpdate(clip.id, 'titleColor', event.target.value)}
          />
        </label>
        <p className="field-note">白字适合暗底，黑字适合亮底，自定义色会直接作用在当前卡片标题上。</p>
        <label>
          玻璃底色
          <select value={clip.params.panelTone || 'none'} onChange={(event) => onParamUpdate(clip.id, 'panelTone', event.target.value)}>
            <option value="none">无</option>
            <option value="dark-glass">月影璃</option>
            <option value="light-glass">白玻璃</option>
          </select>
          </label>
        </section>

      {renderGlobalTitleColorControls(projectTitleColor, onProjectUpdate)}

      <section className="inspector-section inspector-replace-section">
        <div className="section-label"><strong>更换特效</strong><span>REPLACE</span></div>
        <input placeholder="先搜再换：名字 / 用途" aria-label="搜索特效" />
        <select value={clip.effectId} onChange={(event) => setEffect(event.target.value as EffectId)}>
          {effectRegistry.map((item) => (
            <option key={item.id} value={item.id}>{item.name} · {item.bestFor}</option>
          ))}
        </select>
        <div className="template-picker">
          <div className="template-picker__label">高级动效 {techTemplates.length}</div>
          <div className="template-picker__grid">
            {techTemplates.map((module) => (
              <button
                key={module.id}
                type="button"
                className="template-picker__item"
                onClick={() => onReplaceWithTemplate(clip.id, module)}
              >
                <strong>{module.name}</strong>
                <span>{module.detail}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
    </aside>
  );
}
