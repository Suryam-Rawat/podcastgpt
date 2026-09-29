export type Cue = {
  start: number;
  end: number;
  text: string;
  speaker?: string;
};

export type Passage = {
  start: number;
  end: number;
  text: string;
  tokenCount: number;
};

const WORDS_PER_TOKEN = 0.75;

function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(wordsOf(text).length / WORDS_PER_TOKEN));
}

/** Pack timestamped cues into ~400-token blocks with a short overlap. */
export function chunkCues(cues: Cue[], targetTokens = 400): Passage[] {
  const passages: Passage[] = [];
  let buffer: Cue[] = [];
  let tokens = 0;

  const flush = () => {
    if (!buffer.length) return;
    const text = buffer
      .map((cue) => (cue.speaker ? `${cue.speaker}: ${cue.text}` : cue.text))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (!text) {
      buffer = [];
      tokens = 0;
      return;
    }
    passages.push({
      start: Math.max(0, Math.floor(buffer[0].start)),
      end: Math.max(0, Math.ceil(buffer[buffer.length - 1].end || buffer[buffer.length - 1].start)),
      text,
      tokenCount: estimateTokens(text),
    });
    const overlap: Cue[] = [];
    let overlapTokens = 0;
    for (let i = buffer.length - 1; i >= 0; i -= 1) {
      const cueTokens = estimateTokens(buffer[i].text);
      if (overlapTokens + cueTokens > 40 && overlap.length) break;
      overlap.unshift(buffer[i]);
      overlapTokens += cueTokens;
    }
    buffer = overlap;
    tokens = overlapTokens;
  };

  for (const cue of cues) {
    const text = cue.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    const next = { ...cue, text };
    const cueTokens = estimateTokens(text);
    if (tokens + cueTokens > targetTokens && tokens > 80) flush();
    buffer.push(next);
    tokens += cueTokens;
    if (tokens >= targetTokens) flush();
  }
  if (buffer.length && tokens > 40) flush();
  else if (buffer.length && !passages.length) flush();
  return passages.slice(0, 220);
}

export function chunkPlain(text: string, targetTokens = 400): Passage[] {
  const words = wordsOf(text);
  if (!words.length) return [];
  const wordsPerChunk = Math.round(targetTokens * WORDS_PER_TOKEN);
  const wordsPerSecond = 2.5;
  const passages: Passage[] = [];
  for (let i = 0; i < words.length; i += wordsPerChunk - 40) {
    const slice = words.slice(i, i + wordsPerChunk);
    const start = Math.floor(i / wordsPerSecond);
    const end = Math.floor((i + slice.length) / wordsPerSecond);
    passages.push({
      start,
      end,
      text: slice.join(" "),
      tokenCount: estimateTokens(slice.join(" ")),
    });
    if (passages.length >= 220) break;
  }
  return passages;
}

export function clockToSeconds(clock: string): number {
  const parts = clock
    .trim()
    .replace(/[()[\]]/g, "")
    .split(":")
    .map((part) => Number(part));
  if (!parts.length || parts.some((part) => Number.isNaN(part))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

/** Lines like `12:04 text`, `(01:02:03) text`, or `[00:12] text`. */
export function parseTimestampedText(raw: string): Cue[] {
  const lines = raw.replace(/\r/g, "").split("\n");
  const cues: Cue[] = [];
  const lineRe = /^(?:\[|\()?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\]|\))?\s*[-–—:]?\s+(.+)$/;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const match = trimmed.match(lineRe);
    if (match) {
      const start = clockToSeconds(match[1]);
      cues.push({ start, end: start + 20, text: match[2].trim() });
    } else if (cues.length) {
      cues[cues.length - 1].text += ` ${trimmed}`;
    } else {
      cues.push({ start: 0, end: 20, text: trimmed });
    }
  }
  for (let i = 0; i < cues.length; i += 1) {
    const next = cues[i + 1];
    if (next && next.start > cues[i].start) cues[i].end = next.start;
  }
  return cues;
}
