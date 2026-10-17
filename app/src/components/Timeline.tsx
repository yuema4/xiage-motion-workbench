import type { PointerEvent } from 'react';
import type { OverlayClip } from '../types';
import { formatTime } from '../utils/time';

type TimelineProps = {
  clips: OverlayClip[];
  currentTime: number;
  duration: number;
  selectedClipId: string;
  onSeek: (time: number) => void;
  onSelectClip: (clipId: string) => void;
};

export function Timeline({ clips, currentTime, duration, selectedClipId, onSeek, onSelectClip }: TimelineProps) {
  const lanes = [0, 1, 2];

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(duration, ratio * duration)));
  }

  return (
    <section className="timeline-panel">
      <div className="timeline-head">
        <span>时间轴</span>
        <strong>{formatTime(currentTime)}</strong>
      </div>
      <div className="timeline-track" onPointerDown={handlePointerDown} role="slider" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime} tabIndex={0}>
        <div className="timeline-ruler">
          {[0, 0.25, 0.5, 0.75, 1].map((mark) => (
            <span key={mark} style={{ left: `${mark * 100}%` }}>{formatTime(duration * mark)}</span>
          ))}
        </div>
        <div className="playhead" style={{ left: `${(currentTime / duration) * 100}%` }} />
        {lanes.map((lane) => (
          <div className="timeline-lane" key={lane}>
            {clips.filter((clip) => clip.lane === lane).map((clip) => (
              <button
                key={clip.id}
                className={`clip-block ${clip.id === selectedClipId ? 'is-selected' : ''} ${clip.enabled ? '' : 'is-muted'}`}
                style={{
                  left: `${(clip.start / duration) * 100}%`,
                  width: `${Math.max(2, (clip.duration / duration) * 100)}%`,
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectClip(clip.id);
                  onSeek(clip.start + 0.05);
                }}
                type="button"
              >
                <span>{clip.label}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
