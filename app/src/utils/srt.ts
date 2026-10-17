import type { SrtCue } from '../types';

function parseTimestamp(raw: string) {
  const [time, millis = '0'] = raw.trim().replace(',', '.').split('.');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + Number(`0.${millis.padEnd(3, '0').slice(0, 3)}`);
}

export function parseSrt(input: string): SrtCue[] {
  return input
    .replace(/\r/g, '')
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block, blockIndex) => {
      const lines = block.split('\n');
      const maybeIndex = Number(lines[0]);
      const timeLine = Number.isFinite(maybeIndex) ? lines[1] : lines[0];
      const textLines = Number.isFinite(maybeIndex) ? lines.slice(2) : lines.slice(1);
      const [startRaw, endRaw] = timeLine.split('-->').map((part) => part.trim());

      return {
        index: Number.isFinite(maybeIndex) ? maybeIndex : blockIndex + 1,
        start: parseTimestamp(startRaw),
        end: parseTimestamp(endRaw),
        text: textLines.join(' ').replace(/<[^>]+>/g, '').trim(),
      };
    })
    .filter((cue) => Number.isFinite(cue.start) && Number.isFinite(cue.end) && cue.text);
}
