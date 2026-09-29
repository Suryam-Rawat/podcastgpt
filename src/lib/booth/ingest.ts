import { chunkCues, clockToSeconds, type Cue } from "./chunk";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export type IndexedTape = {
  videoId: string;
  title: string;
  sourceUrl: string;
  origin: "captions" | "mirror" | "transcript" | "notes";
  cues: Cue[];
  detail: string;
};

export type IngestResult = {
  tapes: IndexedTape[];
  notes: string[];
  errors: string[];
};

type FeedItem = {
  title: string;
  description: string;
  link: string;
  transcripts: string[];
};

const FEEDS: { test: RegExp; url: string; label: string; mode: "lex" | "notes" }[] = [
  {
    test: /fridman/i,
    url: "https://lexfridman.com/feed/podcast/",
    label: "Lex Fridman transcript archive",
    mode: "lex",
  },
  {
    test: /senra|founders/i,
    url: "https://feeds.megaphone.fm/DSLLC6297708582",
    label: "Founders episode notes",
    mode: "notes",
  },
  {
    test: /kamath|\bwtf\b/i,
    url: "https://feeds.hubhopper.com/664690fdea0d7a6f61a052da119934d3.rss",
    label: "WTF episode notes",
    mode: "notes",
  },
  {
    test: /shamani|figuring/i,
    url: "https://anchor.fm/s/f5347ab0/podcast/rss",
    label: "Figuring Out episode notes",
    mode: "notes",
  },
];

type CacheEntry = { at: number; items: FeedItem[] };
const feedCache = new Map<string, CacheEntry>();

function decodeEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (whole, name: string) => named[name.toLowerCase()] ?? whole);
}

function stripTags(value: string): string {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function pickTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeEntities(match[1]).trim() : "";
}

async function fetchText(url: string, ms = 25000): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9", Accept: "*/*" },
    signal: AbortSignal.timeout(ms),
    redirect: "follow",
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return response.text();
}

export function youtubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (!host.endsWith("youtube.com") && host !== "music.youtube.com") return null;
    const fromQuery = parsed.searchParams.get("v");
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const marker = parts.findIndex((part) => ["shorts", "embed", "live", "v"].includes(part));
    if (marker >= 0 && parts[marker + 1] && /^[\w-]{11}$/.test(parts[marker + 1])) return parts[marker + 1];
    return null;
  } catch {
    return null;
  }
}

export function isYoutubeChannel(url: string): boolean {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (!host.endsWith("youtube.com")) return false;
    if (youtubeVideoId(url)) return false;
    return /\/@[^/]+|\/channel\/|\/c\/|\/user\//.test(parsed.pathname);
  } catch {
    return false;
  }
}

function isTranscriptPage(url: string): boolean {
  try {
    const parsed = new URL(url);
    return /transcript/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function extractJsonArray(html: string, marker: string): unknown[] | null {
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;
  const start = html.indexOf("[", markerAt);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length && i < start + 500000; i += 1) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "[") depth += 1;
    else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1)) as unknown[];
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

async function oembedTitle(videoId: string): Promise<string> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) },
    );
    if (!response.ok) return videoId;
    const body = (await response.json()) as { title?: string };
    return body.title?.trim() || videoId;
  } catch {
    return videoId;
  }
}

async function listChannelVideos(url: string): Promise<string[]> {
  const parsed = new URL(url);
  parsed.search = "";
  if (!parsed.pathname.endsWith("/videos")) {
    parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/videos`;
  }
  const html = await fetchText(parsed.toString());
  const ids = [...html.matchAll(/"videoId":"([\w-]{11})"/g)].map((match) => match[1]);
  return [...new Set(ids)].slice(0, 3);
}

function cuesFromJson3(body: string): Cue[] {
  try {
    const parsed = JSON.parse(body) as {
      events?: { tStartMs?: number; dDurationMs?: number; segs?: { utf8?: string }[] }[];
    };
    const cues: Cue[] = [];
    for (const event of parsed.events || []) {
      const text = (event.segs || []).map((seg) => seg.utf8 || "").join("").replace(/\n/g, " ").trim();
      if (!text) continue;
      const start = (event.tStartMs || 0) / 1000;
      const end = start + (event.dDurationMs || 2000) / 1000;
      cues.push({ start, end, text });
    }
    return cues;
  } catch {
    return [];
  }
}

function cuesFromXml(body: string): Cue[] {
  const cues: Cue[] = [];
  const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(body))) {
    const attrs = match[1];
    const start = Number(attrs.match(/\bstart="([^"]+)"/)?.[1] || 0);
    const dur = Number(attrs.match(/\bdur="([^"]+)"/)?.[1] || 2);
    const text = stripTags(match[2]);
    if (text) cues.push({ start, end: start + dur, text });
  }
  return cues;
}

async function captionsForVideo(videoId: string): Promise<Cue[]> {
  try {
    const html = await fetchText(`https://www.youtube.com/watch?v=${videoId}&hl=en`, 20000);
    const tracks = extractJsonArray(html, '"captionTracks":') as
      | { baseUrl?: string; languageCode?: string; kind?: string }[]
      | null;
    if (!tracks?.length) return [];
    const track =
      tracks.find((item) => item.languageCode === "en" && item.kind !== "asr") ||
      tracks.find((item) => item.languageCode?.startsWith("en")) ||
      tracks[0];
    if (!track?.baseUrl) return [];
    const base = track.baseUrl.replace(/\\u0026/g, "&");
    for (const suffix of ["&fmt=json3", "&fmt=srv3", ""]) {
      const response = await fetch(base + suffix, {
        headers: { "User-Agent": UA, Referer: `https://www.youtube.com/watch?v=${videoId}` },
        signal: AbortSignal.timeout(15000),
      });
      const body = await response.text();
      if (body.length < 40) continue;
      const cues = body.trim().startsWith("{") ? cuesFromJson3(body) : cuesFromXml(body);
      if (cues.length > 3) return cues;
    }
  } catch {
    return [];
  }
  return [];
}

async function mirrorForVideo(videoId: string): Promise<Cue[]> {
  try {
    const html = await fetchText(`https://2outube.com/watch?v=${videoId}`, 15000);
    const marker = html.indexOf("var EMBEDDED = ");
    if (marker < 0) return [];
    const slice = html.slice(marker + "var EMBEDDED = ".length, marker + 30);
    if (slice.startsWith("null")) return [];
    const rows = extractJsonArray(html, "var EMBEDDED = ") as
      | { text?: string; start?: number; duration?: number }[]
      | null;
    if (!rows?.length) return [];
    return rows
      .map((row) => ({
        start: Number(row.start) || 0,
        end: (Number(row.start) || 0) + (Number(row.duration) || 2),
        text: String(row.text || "").replace(/\n/g, " ").trim(),
      }))
      .filter((cue) => cue.text);
  } catch {
    return [];
  }
}

function parseLexTranscript(html: string, fallbackUrl: string): IndexedTape | null {
  const re =
    /<div class="ts-segment">\s*<span class="ts-name">([^<]*)<\/span>\s*<span class="ts-timestamp"><a href="([^"]+)">\(([^)<]+)\)<\/a>\s*<\/span>\s*<span class="ts-text">([\s\S]*?)<\/span>/g;
  const cues: Cue[] = [];
  let videoId = "";
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = decodeEntities(match[2]);
    const absolute = href.startsWith("http") ? href : `https://${href.replace(/^\/\//, "")}`;
    const id = youtubeVideoId(absolute);
    if (id) videoId = id;
    let start = clockToSeconds(match[3]);
    try {
      const param = new URL(absolute).searchParams.get("t");
      if (param && href.includes("t=")) start = Number(param) || start;
    } catch {
      start = clockToSeconds(match[3]);
    }
    const text = stripTags(match[4]);
    if (!text) continue;
    cues.push({ start, end: start + 30, speaker: stripTags(match[1]), text });
  }
  for (let i = 0; i < cues.length; i += 1) {
    const next = cues[i + 1];
    if (next && next.start > cues[i].start) cues[i].end = next.start;
  }
  if (cues.length < 4) return null;
  const rawTitle = stripTags(html.match(/<title>([^<]+)/)?.[1] || "Transcript");
  const title =
    rawTitle
      .replace(/^Transcript for\s+/i, "")
      .split("|")[0]
      .replace(/\s+[-–]\s+Lex Fridman\s*$/i, "")
      .trim() || "Transcript";
  return {
    videoId,
    title,
    sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : fallbackUrl,
    origin: "transcript",
    cues,
    detail: `Human transcript · ${cues.length} timestamped turns`,
  };
}

function notesToCues(description: string): Cue[] {
  const text = stripTags(description).slice(0, 12000);
  if (!text) return [];
  const re = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–\-:]\s*/g;
  const marks: { index: number; start: number; length: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    marks.push({ index: match.index, start: clockToSeconds(match[1]), length: match[0].length });
  }
  if (!marks.length) return [{ start: 0, end: 60, text: text.slice(0, 4000) }];
  const cues: Cue[] = [];
  for (let i = 0; i < marks.length; i += 1) {
    const from = marks[i].index + marks[i].length;
    const to = i + 1 < marks.length ? marks[i + 1].index : Math.min(text.length, from + 1800);
    const body = text.slice(from, to).replace(/\s+/g, " ").trim();
    if (body) cues.push({ start: marks[i].start, end: marks[i + 1]?.start || marks[i].start + 60, text: body });
  }
  return cues;
}

async function loadFeed(url: string): Promise<FeedItem[]> {
  const cached = feedCache.get(url);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.items;
  const xml = await fetchText(url, 30000);
  const items: FeedItem[] = [];
  const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) && items.length < 12) {
    const block = match[1];
    const title = stripTags(pickTag(block, "title"));
    const description = pickTag(block, "description") || pickTag(block, "itunes:summary");
    const link = stripTags(pickTag(block, "link"));
    const transcripts = [
      ...new Set(
        [...block.matchAll(/https?:\/\/[^<\s"'\\]*transcript[^<\s"'\\]*/gi)].map((item) =>
          decodeEntities(item[0]),
        ),
      ),
    ];
    items.push({ title, description, link, transcripts });
  }
  feedCache.set(url, { at: Date.now(), items });
  return items;
}

function titleOverlap(a: string, b: string): number {
  const left = new Set(
    a
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
  const right = new Set(
    b
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3),
  );
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const word of left) if (right.has(word)) shared += 1;
  return shared / Math.min(left.size, right.size);
}

async function lexTapeForVideo(videoId: string, title: string): Promise<IndexedTape | null> {
  const feed = FEEDS.find((item) => item.mode === "lex");
  if (!feed) return null;
  const items = await loadFeed(feed.url);
  const ranked = items
    .map((item) => ({ item, score: titleOverlap(title, item.title) }))
    .sort((a, b) => b.score - a.score);
  const ordered = [
    ...ranked.filter((row) => row.score >= 0.34),
    ...ranked.filter((row) => row.score < 0.34),
  ].slice(0, 4);
  for (const row of ordered) {
    const page = row.item.transcripts[0];
    if (!page) continue;
    try {
      const html = await fetchText(page, 25000);
      if (!html.includes(videoId) && row.score < 0.34) continue;
      const tape = parseLexTranscript(html, page);
      if (tape && (tape.videoId === videoId || row.score >= 0.45 || html.includes(videoId))) {
        tape.videoId = tape.videoId || videoId;
        tape.sourceUrl = `https://www.youtube.com/watch?v=${tape.videoId}`;
        return tape;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function notesForHost(hostName: string, titleHint: string): Promise<IndexedTape[]> {
  const feed = FEEDS.find((item) => item.mode === "notes" && item.test.test(hostName));
  if (!feed) return [];
  const items = await loadFeed(feed.url);
  const ranked = items
    .map((item) => ({ item, score: titleHint ? titleOverlap(titleHint, item.title) : 0 }))
    .sort((a, b) => b.score - a.score);
  const picked = titleHint
    ? ranked[0] && ranked[0].score >= 0.34
      ? ranked.slice(0, 1)
      : []
    : ranked.slice(0, 2);
  const tapes: IndexedTape[] = [];
  for (const row of picked) {
    const cues = notesToCues(row.item.description);
    if (!cues.length) continue;
    tapes.push({
      videoId: "",
      title: row.item.title || feed.label,
      sourceUrl: row.item.link || feed.url,
      origin: "notes",
      cues,
      detail: `${feed.label}. Published show notes, not a full caption track.`,
    });
  }
  return tapes;
}

async function tapeForVideo(videoId: string, hostName: string): Promise<IndexedTape> {
  const title = await oembedTitle(videoId);
  const captions = await captionsForVideo(videoId);
  if (captions.length > 3) {
    return {
      videoId,
      title,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      origin: "captions",
      cues: captions,
      detail: `YouTube captions · ${captions.length} cues`,
    };
  }
  const mirror = await mirrorForVideo(videoId);
  if (mirror.length > 3) {
    return {
      videoId,
      title,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      origin: "mirror",
      cues: mirror,
      detail: `Public caption mirror · ${mirror.length} cues`,
    };
  }
  if (FEEDS.some((feed) => feed.mode === "lex" && feed.test.test(hostName)) || /lex fridman/i.test(title)) {
    const lex = await lexTapeForVideo(videoId, title);
    if (lex) return lex;
  }
  const notes = await notesForHost(hostName, title).catch(() => [] as IndexedTape[]);
  if (notes[0]) {
    return {
      ...notes[0],
      videoId,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    };
  }
  throw new Error(
    `No captions for “${title}”. YouTube blocked the caption track. Paste a transcript in settings.`,
  );
}

export async function ingestUrl(url: string, hostName: string): Promise<IngestResult> {
  const notes: string[] = [];
  const errors: string[] = [];
  const tapes: IndexedTape[] = [];

  if (isTranscriptPage(url) && !youtubeVideoId(url)) {
    try {
      const html = await fetchText(url);
      const tape = parseLexTranscript(html, url);
      if (!tape) throw new Error("That page has no timestamped transcript.");
      tapes.push(tape);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Could not read that transcript page.");
    }
    return { tapes, notes, errors };
  }

  if (isYoutubeChannel(url)) {
    let ids: string[] = [];
    try {
      ids = await listChannelVideos(url);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Could not read that channel.");
      return { tapes, notes, errors };
    }
    if (!ids.length) {
      errors.push("No public videos found on that channel.");
      return { tapes, notes, errors };
    }
    notes.push(`Channel sync uses the ${ids.length} latest videos.`);
    for (const id of ids) {
      try {
        tapes.push(await tapeForVideo(id, hostName));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Could not index ${id}.`);
      }
    }
    if (!tapes.length) {
      const fallback = await notesForHost(hostName, "").catch(() => []);
      tapes.push(...fallback);
      if (fallback.length) notes.push("YouTube captions were blocked, so the latest episode notes were indexed instead.");
    }
    return { tapes, notes, errors };
  }

  const videoId = youtubeVideoId(url);
  if (!videoId) {
    errors.push("Use a YouTube video, a channel URL, or a public transcript page.");
    return { tapes, notes, errors };
  }
  try {
    tapes.push(await tapeForVideo(videoId, hostName));
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "Could not index that video.");
  }
  return { tapes, notes, errors };
}

export function passagesForTape(tape: IndexedTape) {
  return chunkCues(tape.cues).filter((passage) => passage.text.length > 40);
}
