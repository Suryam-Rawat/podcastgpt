import { a as string, i as object, r as number, t as array } from "../_libs/zod.mjs";
import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/server-DqRIWeit.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var _0002_booth_default = "create table if not exists bots (\n  id text primary key,\n  name text not null,\n  host_name text not null,\n  system_prompt text not null,\n  threshold double precision not null default 0.72,\n  namespace text not null unique,\n  created_at timestamptz not null default now(),\n  updated_at timestamptz not null default now()\n);\n\ncreate table if not exists sources (\n  id text primary key,\n  bot_id text not null references bots(id) on delete cascade,\n  url text not null,\n  kind text not null,\n  title text,\n  status text not null default 'pending',\n  detail text,\n  chunk_count integer not null default 0,\n  synced_at timestamptz,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists sources_bot_idx on sources (bot_id);\n\ncreate table if not exists chunks (\n  id text primary key,\n  bot_id text not null references bots(id) on delete cascade,\n  source_id text references sources(id) on delete cascade,\n  video_id text not null default '',\n  video_title text not null default '',\n  source_url text not null default '',\n  origin text not null default 'captions',\n  start_sec integer not null default 0,\n  end_sec integer not null default 0,\n  text text not null,\n  token_count integer not null default 0,\n  embedding text not null,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists chunks_bot_idx on chunks (bot_id);\n\ncreate table if not exists messages (\n  id text primary key,\n  bot_id text not null references bots(id) on delete cascade,\n  role text not null,\n  content text not null,\n  citations text,\n  refused boolean not null default false,\n  score double precision,\n  created_at timestamptz not null default now()\n);\n\ncreate index if not exists messages_bot_idx on messages (bot_id, created_at);\n";
/**
* Migration bookkeeping shared by the two appliers — `scripts/migrate.mjs`
* (deploy, `readdir`) and `src/lib/db.ts` (PGLite preview, `import.meta.glob`).
*
* Applied files are keyed by BASENAME, so the same file applies once no matter
* which directory it is globbed from. That is what makes the auth schema safe to
* copy from `migrations/auth/` into `migrations/` when an app turns sign-in on:
* a database that already has `0001_auth.sql` will not re-run it.
*
* Neither applier descends into subdirectories, so `migrations/auth/*.sql` is
* out of scope for both until it is copied up.
*/
/**
* The `_migrations` key for a migration path (or bare filename).
* @param {string} path
* @returns {string}
*/
function migrationName(path) {
	return path.split("/").pop() ?? path;
}
/**
* @param {string} path
* @returns {boolean}
*/
function isMigrationFile(path) {
	return path.endsWith(".sql");
}
/**
* Migrations in `paths` that are not yet in `applied`, in apply order.
* Non-`.sql` entries (a `readdir` also yields `migrations/auth/`) are dropped.
* @param {Iterable<string>} paths
* @param {Iterable<string>} applied
* @returns {Array<{ name: string, path: string }>}
*/
function pendingMigrations(paths, applied) {
	const done = new Set(applied);
	return [...paths].filter(isMigrationFile).map((path) => ({
		name: migrationName(path),
		path
	})).sort((a, b) => a.name.localeCompare(b.name)).filter(({ name }) => !done.has(name));
}
var rawDatabaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : void 0;
var databaseUrl = rawDatabaseUrl && rawDatabaseUrl.trim() ? rawDatabaseUrl : void 0;
/**
* Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
* sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
* the app has a working database even with nothing configured — the live preview
* included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
*/
var dbSource = databaseUrl ? "neon" : "pglite";
/**
* Init state lives on globalThis as promises: dev HMR creates new instances of
* this module, and two instances racing module-level state would open a second
* pool or run two concurrent PGLite migration passes (whose duplicate
* `_migrations` insert rejects — and would get memoized, poisoning every later
* `getSql()`). A failed init clears its slot so the next call retries.
*/
var globalRef = globalThis;
/**
* Result-type parity: Postgres sends every value as text plus a type OID — the
* JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
* int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
* JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
* production return identical, JSON-safe shapes:
*   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
*                                   `::text` if you ever need huge integers)
*   date                         -> 'YYYY-MM-DD' string
*   interval                     -> Postgres interval text
* numeric already comes back as a string on both (arbitrary precision).
*/
var OID_INT8 = 20;
var OID_DATE = 1082;
var OID_INTERVAL = 1186;
var identity = (v) => v;
/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run) {
	const sql = (async (strings, ...values) => {
		let text = strings[0];
		for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
		return run(text, values);
	});
	sql.query = (text, params = []) => run(text, params);
	return sql;
}
function createNeonSql() {
	globalRef.__pgSqlPromise__ ??= (async () => {
		const { Pool, types } = await import("../_libs/pg.mjs").then((n) => n.t);
		types.setTypeParser(OID_INT8, Number);
		types.setTypeParser(OID_DATE, identity);
		types.setTypeParser(OID_INTERVAL, identity);
		const pool = new Pool({ connectionString: databaseUrl });
		return toSql(async (text, params) => {
			return (await pool.query(text, params)).rows;
		});
	})().catch((err) => {
		globalRef.__pgSqlPromise__ = void 0;
		throw err;
	});
	return globalRef.__pgSqlPromise__;
}
async function createPgliteSql() {
	globalRef.__pgliteInstance__ ??= (async () => {
		const { PGlite } = await import("../_libs/electric-sql__pglite.mjs").then((n) => n.t);
		const pg = new PGlite({ parsers: {
			[OID_INT8]: Number,
			[OID_DATE]: identity,
			[OID_INTERVAL]: identity
		} });
		await pg.waitReady;
		await pg.exec("create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())");
		return pg;
	})().catch((err) => {
		globalRef.__pgliteInstance__ = void 0;
		throw err;
	});
	const pg = await globalRef.__pgliteInstance__;
	const migrate = async () => {
		const migrations = /* #__PURE__ */ Object.assign({ "/migrations/0002_booth.sql": _0002_booth_default });
		const done = (await pg.query("select name from _migrations")).rows.map((r) => r.name);
		for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) await pg.transaction(async (tx) => {
			await tx.exec(migrations[path]);
			await tx.query("insert into _migrations (name) values ($1)", [name]);
		});
	};
	const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve()).catch(() => void 0).then(migrate);
	globalRef.__pgliteMigrateChain__ = pass;
	await pass;
	return toSql(async (text, params) => {
		return (await pg.query(text, params)).rows;
	});
}
var sqlPromise = null;
async function createSql() {
	if (typeof window !== "undefined") throw new Error("@/lib/db is server-only — call getSql() from a createServerFn handler or a server route loader, never from client code.");
	return dbSource === "neon" ? createNeonSql() : createPgliteSql();
}
/**
* Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
* otherwise the local PGLite fallback. Memoized — safe to call per request.
*
* Schema comes from `migrations/*.sql`, auto-applied before the first query on
* both backends — define tables there, never inline in server functions.
*/
function getSql() {
	sqlPromise ??= createSql().catch((err) => {
		sqlPromise = null;
		throw err;
	});
	return sqlPromise;
}
/**
* Finish DB bootstrap before the server handles traffic.
*
* - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
*   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
* - **Neon**: no-op (pool is created lazily on first query).
*
* Vite `configureServer` awaits this at dev startup; production imports of this
* module kick it off immediately (see bottom of file).
*/
function ensureDbReady() {
	if (dbSource !== "pglite") return Promise.resolve();
	return getSql().then(() => void 0);
}
var globalBoot = globalThis;
if (typeof window === "undefined" && dbSource === "pglite") globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
	globalBoot.__pgBootstrapPromise__ = void 0;
	console.error("[db] PGLite bootstrap failed:", err);
	throw err;
});
var WORDS_PER_TOKEN = .75;
function wordsOf(text) {
	return text.trim().split(/\s+/).filter(Boolean);
}
function estimateTokens(text) {
	return Math.max(1, Math.round(wordsOf(text).length / WORDS_PER_TOKEN));
}
/** Pack timestamped cues into ~400-token blocks with a short overlap. */
function chunkCues(cues, targetTokens = 400) {
	const passages = [];
	let buffer = [];
	let tokens = 0;
	const flush = () => {
		if (!buffer.length) return;
		const text = buffer.map((cue) => cue.speaker ? `${cue.speaker}: ${cue.text}` : cue.text).join(" ").replace(/\s+/g, " ").trim();
		if (!text) {
			buffer = [];
			tokens = 0;
			return;
		}
		passages.push({
			start: Math.max(0, Math.floor(buffer[0].start)),
			end: Math.max(0, Math.ceil(buffer[buffer.length - 1].end || buffer[buffer.length - 1].start)),
			text,
			tokenCount: estimateTokens(text)
		});
		const overlap = [];
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
		const next = {
			...cue,
			text
		};
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
function chunkPlain(text, targetTokens = 400) {
	const words = wordsOf(text);
	if (!words.length) return [];
	const wordsPerChunk = Math.round(targetTokens * WORDS_PER_TOKEN);
	const wordsPerSecond = 2.5;
	const passages = [];
	for (let i = 0; i < words.length; i += wordsPerChunk - 40) {
		const slice = words.slice(i, i + wordsPerChunk);
		const start = Math.floor(i / wordsPerSecond);
		const end = Math.floor((i + slice.length) / wordsPerSecond);
		passages.push({
			start,
			end,
			text: slice.join(" "),
			tokenCount: estimateTokens(slice.join(" "))
		});
		if (passages.length >= 220) break;
	}
	return passages;
}
function clockToSeconds(clock) {
	const parts = clock.trim().replace(/[()[\]]/g, "").split(":").map((part) => Number(part));
	if (!parts.length || parts.some((part) => Number.isNaN(part))) return 0;
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return parts[0];
}
/** Lines like `12:04 text`, `(01:02:03) text`, or `[00:12] text`. */
function parseTimestampedText(raw) {
	const lines = raw.replace(/\r/g, "").split("\n");
	const cues = [];
	const lineRe = /^(?:\[|\()?\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:\]|\))?\s*[-–—:]?\s+(.+)$/;
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;
		const match = trimmed.match(lineRe);
		if (match) {
			const start = clockToSeconds(match[1]);
			cues.push({
				start,
				end: start + 20,
				text: match[2].trim()
			});
		} else if (cues.length) cues[cues.length - 1].text += ` ${trimmed}`;
		else cues.push({
			start: 0,
			end: 20,
			text: trimmed
		});
	}
	for (let i = 0; i < cues.length; i += 1) {
		const next = cues[i + 1];
		if (next && next.start > cues[i].start) cues[i].end = next.start;
	}
	return cues;
}
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";
var FEEDS = [
	{
		test: /fridman/i,
		url: "https://lexfridman.com/feed/podcast/",
		label: "Lex Fridman transcript archive",
		mode: "lex"
	},
	{
		test: /senra|founders/i,
		url: "https://feeds.megaphone.fm/DSLLC6297708582",
		label: "Founders episode notes",
		mode: "notes"
	},
	{
		test: /kamath|\bwtf\b/i,
		url: "https://feeds.hubhopper.com/664690fdea0d7a6f61a052da119934d3.rss",
		label: "WTF episode notes",
		mode: "notes"
	},
	{
		test: /shamani|figuring/i,
		url: "https://anchor.fm/s/f5347ab0/podcast/rss",
		label: "Figuring Out episode notes",
		mode: "notes"
	}
];
var feedCache = /* @__PURE__ */ new Map();
function decodeEntities(value) {
	const named = {
		amp: "&",
		lt: "<",
		gt: ">",
		quot: "\"",
		apos: "'",
		nbsp: " "
	};
	return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16))).replace(/&([a-z]+);/gi, (whole, name) => named[name.toLowerCase()] ?? whole);
}
function stripTags(value) {
	return decodeEntities(value).replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}
function pickTag(block, tag) {
	const match = block.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
	return match ? decodeEntities(match[1]).trim() : "";
}
async function fetchText(url, ms = 25e3) {
	const response = await fetch(url, {
		headers: {
			"User-Agent": UA,
			"Accept-Language": "en-US,en;q=0.9",
			Accept: "*/*"
		},
		signal: AbortSignal.timeout(ms),
		redirect: "follow"
	});
	if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
	return response.text();
}
function youtubeVideoId(url) {
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
		const marker = parts.findIndex((part) => [
			"shorts",
			"embed",
			"live",
			"v"
		].includes(part));
		if (marker >= 0 && parts[marker + 1] && /^[\w-]{11}$/.test(parts[marker + 1])) return parts[marker + 1];
		return null;
	} catch {
		return null;
	}
}
function isYoutubeChannel(url) {
	try {
		const parsed = new URL(url);
		if (!parsed.hostname.replace(/^www\./, "").endsWith("youtube.com")) return false;
		if (youtubeVideoId(url)) return false;
		return /\/@[^/]+|\/channel\/|\/c\/|\/user\//.test(parsed.pathname);
	} catch {
		return false;
	}
}
function isTranscriptPage(url) {
	try {
		const parsed = new URL(url);
		return /transcript/i.test(parsed.pathname);
	} catch {
		return false;
	}
}
function extractJsonArray(html, marker) {
	const markerAt = html.indexOf(marker);
	if (markerAt < 0) return null;
	const start = html.indexOf("[", markerAt);
	if (start < 0) return null;
	let depth = 0;
	let inString = false;
	let escaped = false;
	for (let i = start; i < html.length && i < start + 5e5; i += 1) {
		const char = html[i];
		if (inString) {
			if (escaped) escaped = false;
			else if (char === "\\") escaped = true;
			else if (char === "\"") inString = false;
			continue;
		}
		if (char === "\"") {
			inString = true;
			continue;
		}
		if (char === "[") depth += 1;
		else if (char === "]") {
			depth -= 1;
			if (depth === 0) try {
				return JSON.parse(html.slice(start, i + 1));
			} catch {
				return null;
			}
		}
	}
	return null;
}
async function oembedTitle(videoId) {
	try {
		const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`, {
			headers: { "User-Agent": UA },
			signal: AbortSignal.timeout(12e3)
		});
		if (!response.ok) return videoId;
		return (await response.json()).title?.trim() || videoId;
	} catch {
		return videoId;
	}
}
async function listChannelVideos(url) {
	const parsed = new URL(url);
	parsed.search = "";
	if (!parsed.pathname.endsWith("/videos")) parsed.pathname = `${parsed.pathname.replace(/\/$/, "")}/videos`;
	const ids = [...(await fetchText(parsed.toString())).matchAll(/"videoId":"([\w-]{11})"/g)].map((match) => match[1]);
	return [...new Set(ids)].slice(0, 3);
}
function cuesFromJson3(body) {
	try {
		const parsed = JSON.parse(body);
		const cues = [];
		for (const event of parsed.events || []) {
			const text = (event.segs || []).map((seg) => seg.utf8 || "").join("").replace(/\n/g, " ").trim();
			if (!text) continue;
			const start = (event.tStartMs || 0) / 1e3;
			const end = start + (event.dDurationMs || 2e3) / 1e3;
			cues.push({
				start,
				end,
				text
			});
		}
		return cues;
	} catch {
		return [];
	}
}
function cuesFromXml(body) {
	const cues = [];
	const re = /<text\b([^>]*)>([\s\S]*?)<\/text>/g;
	let match;
	while (match = re.exec(body)) {
		const attrs = match[1];
		const start = Number(attrs.match(/\bstart="([^"]+)"/)?.[1] || 0);
		const dur = Number(attrs.match(/\bdur="([^"]+)"/)?.[1] || 2);
		const text = stripTags(match[2]);
		if (text) cues.push({
			start,
			end: start + dur,
			text
		});
	}
	return cues;
}
async function captionsForVideo(videoId) {
	try {
		const tracks = extractJsonArray(await fetchText(`https://www.youtube.com/watch?v=${videoId}&hl=en`, 2e4), "\"captionTracks\":");
		if (!tracks?.length) return [];
		const track = tracks.find((item) => item.languageCode === "en" && item.kind !== "asr") || tracks.find((item) => item.languageCode?.startsWith("en")) || tracks[0];
		if (!track?.baseUrl) return [];
		const base = track.baseUrl.replace(/\\u0026/g, "&");
		for (const suffix of [
			"&fmt=json3",
			"&fmt=srv3",
			""
		]) {
			const body = await (await fetch(base + suffix, {
				headers: {
					"User-Agent": UA,
					Referer: `https://www.youtube.com/watch?v=${videoId}`
				},
				signal: AbortSignal.timeout(15e3)
			})).text();
			if (body.length < 40) continue;
			const cues = body.trim().startsWith("{") ? cuesFromJson3(body) : cuesFromXml(body);
			if (cues.length > 3) return cues;
		}
	} catch {
		return [];
	}
	return [];
}
async function mirrorForVideo(videoId) {
	try {
		const html = await fetchText(`https://2outube.com/watch?v=${videoId}`, 15e3);
		const marker = html.indexOf("var EMBEDDED = ");
		if (marker < 0) return [];
		if (html.slice(marker + 15, marker + 30).startsWith("null")) return [];
		const rows = extractJsonArray(html, "var EMBEDDED = ");
		if (!rows?.length) return [];
		return rows.map((row) => ({
			start: Number(row.start) || 0,
			end: (Number(row.start) || 0) + (Number(row.duration) || 2),
			text: String(row.text || "").replace(/\n/g, " ").trim()
		})).filter((cue) => cue.text);
	} catch {
		return [];
	}
}
function parseLexTranscript(html, fallbackUrl) {
	const re = /<div class="ts-segment">\s*<span class="ts-name">([^<]*)<\/span>\s*<span class="ts-timestamp"><a href="([^"]+)">\(([^)<]+)\)<\/a>\s*<\/span>\s*<span class="ts-text">([\s\S]*?)<\/span>/g;
	const cues = [];
	let videoId = "";
	let match;
	while (match = re.exec(html)) {
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
		cues.push({
			start,
			end: start + 30,
			speaker: stripTags(match[1]),
			text
		});
	}
	for (let i = 0; i < cues.length; i += 1) {
		const next = cues[i + 1];
		if (next && next.start > cues[i].start) cues[i].end = next.start;
	}
	if (cues.length < 4) return null;
	const title = stripTags(html.match(/<title>([^<]+)/)?.[1] || "Transcript").replace(/^Transcript for\s+/i, "").split("|")[0].replace(/\s+[-–]\s+Lex Fridman\s*$/i, "").trim() || "Transcript";
	return {
		videoId,
		title,
		sourceUrl: videoId ? `https://www.youtube.com/watch?v=${videoId}` : fallbackUrl,
		origin: "transcript",
		cues,
		detail: `Human transcript · ${cues.length} timestamped turns`
	};
}
function notesToCues(description) {
	const text = stripTags(description).slice(0, 12e3);
	if (!text) return [];
	const re = /(?:^|\n)\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*[—–\-:]\s*/g;
	const marks = [];
	let match;
	while (match = re.exec(text)) marks.push({
		index: match.index,
		start: clockToSeconds(match[1]),
		length: match[0].length
	});
	if (!marks.length) return [{
		start: 0,
		end: 60,
		text: text.slice(0, 4e3)
	}];
	const cues = [];
	for (let i = 0; i < marks.length; i += 1) {
		const from = marks[i].index + marks[i].length;
		const to = i + 1 < marks.length ? marks[i + 1].index : Math.min(text.length, from + 1800);
		const body = text.slice(from, to).replace(/\s+/g, " ").trim();
		if (body) cues.push({
			start: marks[i].start,
			end: marks[i + 1]?.start || marks[i].start + 60,
			text: body
		});
	}
	return cues;
}
async function loadFeed(url) {
	const cached = feedCache.get(url);
	if (cached && Date.now() - cached.at < 6e5) return cached.items;
	const xml = await fetchText(url, 3e4);
	const items = [];
	const re = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
	let match;
	while ((match = re.exec(xml)) && items.length < 12) {
		const block = match[1];
		const title = stripTags(pickTag(block, "title"));
		const description = pickTag(block, "description") || pickTag(block, "itunes:summary");
		const link = stripTags(pickTag(block, "link"));
		const transcripts = [...new Set([...block.matchAll(/https?:\/\/[^<\s"'\\]*transcript[^<\s"'\\]*/gi)].map((item) => decodeEntities(item[0])))];
		items.push({
			title,
			description,
			link,
			transcripts
		});
	}
	feedCache.set(url, {
		at: Date.now(),
		items
	});
	return items;
}
function titleOverlap(a, b) {
	const left = new Set(a.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 3));
	const right = new Set(b.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 3));
	if (!left.size || !right.size) return 0;
	let shared = 0;
	for (const word of left) if (right.has(word)) shared += 1;
	return shared / Math.min(left.size, right.size);
}
async function lexTapeForVideo(videoId, title) {
	const feed = FEEDS.find((item) => item.mode === "lex");
	if (!feed) return null;
	const ranked = (await loadFeed(feed.url)).map((item) => ({
		item,
		score: titleOverlap(title, item.title)
	})).sort((a, b) => b.score - a.score);
	const ordered = [...ranked.filter((row) => row.score >= .34), ...ranked.filter((row) => row.score < .34)].slice(0, 4);
	for (const row of ordered) {
		const page = row.item.transcripts[0];
		if (!page) continue;
		try {
			const html = await fetchText(page, 25e3);
			if (!html.includes(videoId) && row.score < .34) continue;
			const tape = parseLexTranscript(html, page);
			if (tape && (tape.videoId === videoId || row.score >= .45 || html.includes(videoId))) {
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
async function notesForHost(hostName, titleHint) {
	const feed = FEEDS.find((item) => item.mode === "notes" && item.test.test(hostName));
	if (!feed) return [];
	const ranked = (await loadFeed(feed.url)).map((item) => ({
		item,
		score: titleHint ? titleOverlap(titleHint, item.title) : 0
	})).sort((a, b) => b.score - a.score);
	const picked = titleHint ? ranked[0] && ranked[0].score >= .34 ? ranked.slice(0, 1) : [] : ranked.slice(0, 2);
	const tapes = [];
	for (const row of picked) {
		const cues = notesToCues(row.item.description);
		if (!cues.length) continue;
		tapes.push({
			videoId: "",
			title: row.item.title || feed.label,
			sourceUrl: row.item.link || feed.url,
			origin: "notes",
			cues,
			detail: `${feed.label}. Published show notes, not a full caption track.`
		});
	}
	return tapes;
}
async function tapeForVideo(videoId, hostName) {
	const title = await oembedTitle(videoId);
	const captions = await captionsForVideo(videoId);
	if (captions.length > 3) return {
		videoId,
		title,
		sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
		origin: "captions",
		cues: captions,
		detail: `YouTube captions · ${captions.length} cues`
	};
	const mirror = await mirrorForVideo(videoId);
	if (mirror.length > 3) return {
		videoId,
		title,
		sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
		origin: "mirror",
		cues: mirror,
		detail: `Public caption mirror · ${mirror.length} cues`
	};
	if (FEEDS.some((feed) => feed.mode === "lex" && feed.test.test(hostName)) || /lex fridman/i.test(title)) {
		const lex = await lexTapeForVideo(videoId, title);
		if (lex) return lex;
	}
	const notes = await notesForHost(hostName, title).catch(() => []);
	if (notes[0]) return {
		...notes[0],
		videoId,
		sourceUrl: `https://www.youtube.com/watch?v=${videoId}`
	};
	throw new Error(`No captions for “${title}”. YouTube blocked the caption track. Paste a transcript in settings.`);
}
async function ingestUrl(url, hostName) {
	const notes = [];
	const errors = [];
	const tapes = [];
	if (isTranscriptPage(url) && !youtubeVideoId(url)) {
		try {
			const tape = parseLexTranscript(await fetchText(url), url);
			if (!tape) throw new Error("That page has no timestamped transcript.");
			tapes.push(tape);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : "Could not read that transcript page.");
		}
		return {
			tapes,
			notes,
			errors
		};
	}
	if (isYoutubeChannel(url)) {
		let ids = [];
		try {
			ids = await listChannelVideos(url);
		} catch (error) {
			errors.push(error instanceof Error ? error.message : "Could not read that channel.");
			return {
				tapes,
				notes,
				errors
			};
		}
		if (!ids.length) {
			errors.push("No public videos found on that channel.");
			return {
				tapes,
				notes,
				errors
			};
		}
		notes.push(`Channel sync uses the ${ids.length} latest videos.`);
		for (const id of ids) try {
			tapes.push(await tapeForVideo(id, hostName));
		} catch (error) {
			errors.push(error instanceof Error ? error.message : `Could not index ${id}.`);
		}
		if (!tapes.length) {
			const fallback = await notesForHost(hostName, "").catch(() => []);
			tapes.push(...fallback);
			if (fallback.length) notes.push("YouTube captions were blocked, so the latest episode notes were indexed instead.");
		}
		return {
			tapes,
			notes,
			errors
		};
	}
	const videoId = youtubeVideoId(url);
	if (!videoId) {
		errors.push("Use a YouTube video, a channel URL, or a public transcript page.");
		return {
			tapes,
			notes,
			errors
		};
	}
	try {
		tapes.push(await tapeForVideo(videoId, hostName));
	} catch (error) {
		errors.push(error instanceof Error ? error.message : "Could not index that video.");
	}
	return {
		tapes,
		notes,
		errors
	};
}
function passagesForTape(tape) {
	return chunkCues(tape.cues).filter((passage) => passage.text.length > 40);
}
var STOP = new Set(`a an the of to and or in on for with from by at as is are was were be been being it this that those these i you he she they we me my your his her their our what how why when who whom which did do does about into over just not but if so than then there here also very really say said says saying think thinks thought tell told talk talks talking podcast episode host guest please can could would should something anything everything`.split(" "));
var SYN = {
	rich: "wealth",
	wealthy: "wealth",
	fortune: "wealth",
	money: "wealth",
	capital: "wealth",
	financial: "wealth",
	company: "business",
	startup: "business",
	firm: "business",
	venture: "business",
	founder: "entrepreneur",
	builder: "entrepreneur",
	book: "reading",
	books: "reading",
	read: "reading",
	fail: "failure",
	mistake: "failure",
	failed: "failure",
	ai: "intelligence",
	llm: "intelligence",
	habit: "discipline",
	routine: "discipline",
	obsession: "discipline",
	invest: "investor",
	investing: "investor",
	investment: "investor"
};
var DIM = 192;
function stem(word) {
	if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
	if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
	if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
	if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
	return word;
}
function tokens(text) {
	return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)).map((word) => {
		const stemmed = stem(word);
		return SYN[stemmed] || SYN[word] || stemmed;
	});
}
function hash(value) {
	let h = 2166136261;
	for (let i = 0; i < value.length; i += 1) {
		h ^= value.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
}
/** L2-normalized feature-hash embedding. Stored per chunk; namespace is bot_id. */
function embed(text) {
	const vec = new Float64Array(DIM);
	const counts = /* @__PURE__ */ new Map();
	const words = tokens(text);
	for (const word of words) counts.set(word, (counts.get(word) || 0) + 1);
	for (let i = 0; i < words.length - 1; i += 1) {
		const bigram = `${words[i]}_${words[i + 1]}`;
		counts.set(bigram, (counts.get(bigram) || 0) + 1);
	}
	for (const [term, tf] of counts) {
		const weight = 1 + Math.log(tf);
		const h = hash(term);
		const sign = h & 1 ? 1 : -1;
		vec[h % DIM] += sign * weight;
	}
	let norm = 0;
	for (const value of vec) norm += value * value;
	norm = Math.sqrt(norm) || 1;
	return Array.from(vec, (value) => Math.round(value / norm * 1e4) / 1e4);
}
function cosine(a, b) {
	const n = Math.min(a.length, b.length);
	let sum = 0;
	for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
	return sum;
}
/**
* Grounded similarity in [0, 1]: the IDF-weighted share of the question's
* content terms that appear in a passage. 0.72 means most of the question
* is actually in the best passage. Vector cosine only breaks ties.
*/
function rankBySimilarity(query, items) {
	const queryTokens = [...new Set(tokens(query))];
	if (!queryTokens.length || !items.length) return [];
	const sets = items.map((item) => new Set(tokens(item.text)));
	const df = /* @__PURE__ */ new Map();
	for (const set of sets) for (const term of set) df.set(term, (df.get(term) || 0) + 1);
	const n = items.length;
	const weight = (term) => Math.max(.35, Math.log((n + 1) / ((df.get(term) || 0) + .5)));
	const queryVec = embed(query);
	const ranked = items.map((item, index) => {
		let matched = 0;
		let total = 0;
		for (const term of queryTokens) {
			const w = weight(term);
			total += w;
			if (sets[index].has(term)) matched += w;
		}
		return {
			item,
			score: total ? matched / total : 0,
			tie: Math.max(0, cosine(queryVec, item.embedding))
		};
	});
	ranked.sort((a, b) => b.score - a.score || b.tie - a.tie);
	return ranked.map(({ item, score }) => ({
		item,
		score
	}));
}
var REFUSE_LINE = "This podcast hasn't covered this topic yet.";
var GROUNDING = `
GROUNDING CONTRACT — this overrides the persona if they conflict:
- Use only the numbered excerpts in the user message. They are the entire library for this host.
- If the excerpts do not contain the answer, reply with exactly this sentence and nothing else: ${REFUSE_LINE}
- Cite supporting excerpts inline as [1], [2], using only those numbers.
- Do not invent quotes, guests, numbers, dates, or timestamps.
- Temperature is zero. Be specific and short.`.trim();
function readInput(schema, input) {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Check that form and try again.");
	return parsed.data;
}
function namespaceFor(host) {
	return `bot_${host.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 32) || "host"}`;
}
function cleanUrls(values) {
	const out = [];
	for (const raw of values) {
		const trimmed = raw.trim();
		if (!trimmed) continue;
		const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
		let parsed;
		try {
			parsed = new URL(withProto);
		} catch {
			throw new Error(`Not a valid URL: ${trimmed.slice(0, 80)}`);
		}
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Only http(s) links can be indexed.");
		out.push(parsed.toString());
	}
	return [...new Set(out)].slice(0, 12);
}
function kindFor(url) {
	if (/youtube\.com|youtu\.be/.test(url)) return /\/@|\/channel\/|\/c\/|\/user\//.test(url) && !/[?&]v=/.test(url) ? "channel" : "video";
	if (/transcript/i.test(url)) return "transcript";
	return "link";
}
async function uniqueNamespace(host) {
	const sql = await getSql();
	const base = namespaceFor(host);
	let name = base;
	let n = 2;
	while (true) {
		if (!(await sql`select id from bots where namespace = ${name} limit 1`).length) return name;
		name = `${base}_${n}`;
		n += 1;
	}
}
function citeUrl(videoId, sourceUrl, startSec) {
	if (/^[\w-]{11}$/.test(videoId)) return `https://youtu.be/${videoId}?t=${Math.max(0, startSec)}`;
	return sourceUrl || "https://www.youtube.com";
}
function limiter(limit, windowMs) {
	const bucket = [];
	return () => {
		const now = Date.now();
		while (bucket.length && now - bucket[0] > windowMs) bucket.shift();
		if (bucket.length >= limit) return false;
		bucket.push(now);
		return true;
	};
}
var allowChat = limiter(24, 6e4);
var allowSync = limiter(8, 6e5);
var syncing = /* @__PURE__ */ new Set();
var listBots_createServerFn_handler = createServerRpc({
	id: "17ed49ddc197083260b59942eb32b890712b8ac290c8eabf6d006b255e7d7451",
	name: "listBots",
	filename: "src/lib/booth/server.ts"
}, (opts) => listBots.__executeServer(opts));
var listBots = createServerFn({ method: "GET" }).handler(listBots_createServerFn_handler, async () => {
	return (await getSql())`
    select b.id, b.name, b.host_name, b.system_prompt, b.threshold, b.namespace,
           b.created_at::text as created_at,
           (select count(*)::int from chunks c where c.bot_id = b.id) as chunk_count,
           (select count(*)::int from sources s where s.bot_id = b.id) as source_count
    from bots b
    order by b.created_at asc
  `;
});
var getDesk_createServerFn_handler = createServerRpc({
	id: "dd101ca7c2485ee01bd2ef862a979299253e13925b1931aa73b0a1b9aee15d45",
	name: "getDesk",
	filename: "src/lib/booth/server.ts"
}, (opts) => getDesk.__executeServer(opts));
var getDesk = createServerFn({ method: "GET" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(getDesk_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const bot = (await sql`
      select b.id, b.name, b.host_name, b.system_prompt, b.threshold, b.namespace,
             b.created_at::text as created_at,
             (select count(*)::int from chunks c where c.bot_id = b.id) as chunk_count,
             (select count(*)::int from sources s where s.bot_id = b.id) as source_count
      from bots b where b.id = ${data.botId} limit 1
    `)[0];
	if (!bot) return null;
	return {
		bot,
		sources: await sql`
      select id, url, kind, title, status, detail, chunk_count, synced_at::text as synced_at
      from sources where bot_id = ${bot.id} order by created_at asc
    `,
		messages: (await sql`
      select id, role, content, citations, refused, score, created_at::text as created_at
      from messages where bot_id = ${bot.id}
      order by created_at asc
      limit 80
    `).map((message) => ({
			...message,
			citations: message.citations ? JSON.parse(message.citations) : []
		}))
	};
});
var createSchema = object({
	name: string().trim().min(1).max(80),
	hostName: string().trim().min(1).max(80),
	systemPrompt: string().trim().min(1).max(4e3),
	threshold: number().min(.05).max(.95).optional(),
	urls: array(string()).max(12).optional()
});
var createBot_createServerFn_handler = createServerRpc({
	id: "e6291160de7b5172f3c47ecd974feb4eaff463b0cee2a66c04c1b5d02d3704af",
	name: "createBot",
	filename: "src/lib/booth/server.ts"
}, (opts) => createBot.__executeServer(opts));
var createBot = createServerFn({ method: "POST" }).validator((input) => readInput(createSchema, input)).handler(createBot_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const id = crypto.randomUUID();
	const namespace = await uniqueNamespace(data.hostName);
	const threshold = data.threshold ?? .72;
	const urls = cleanUrls(data.urls ?? []);
	await sql`
      insert into bots (id, name, host_name, system_prompt, threshold, namespace)
      values (${id}, ${data.name}, ${data.hostName}, ${data.systemPrompt}, ${threshold}, ${namespace})
    `;
	for (const url of urls) await sql`
        insert into sources (id, bot_id, url, kind, status)
        values (${crypto.randomUUID()}, ${id}, ${url}, ${kindFor(url)}, 'pending')
      `;
	return {
		id,
		namespace
	};
});
var updateSchema = object({
	id: string().min(1),
	name: string().trim().min(1).max(80),
	hostName: string().trim().min(1).max(80),
	systemPrompt: string().trim().min(1).max(4e3),
	threshold: number().min(.05).max(.95)
});
var updateBot_createServerFn_handler = createServerRpc({
	id: "09573bd431ddf3bad55b131d54837fe6e361ca3760ee19e7e4110300b1e7642b",
	name: "updateBot",
	filename: "src/lib/booth/server.ts"
}, (opts) => updateBot.__executeServer(opts));
var updateBot = createServerFn({ method: "POST" }).validator((input) => readInput(updateSchema, input)).handler(updateBot_createServerFn_handler, async ({ data }) => {
	if (!(await (await getSql())`
      update bots
      set name = ${data.name},
          host_name = ${data.hostName},
          system_prompt = ${data.systemPrompt},
          threshold = ${data.threshold},
          updated_at = now()
      where id = ${data.id}
      returning id
    `).length) throw new Error("That desk no longer exists.");
	return { ok: true };
});
var deleteBot_createServerFn_handler = createServerRpc({
	id: "117aa6cf7e1485a07fb8405ddbe855f9d3e14c47612df17b9fc47b1e96f11d94",
	name: "deleteBot",
	filename: "src/lib/booth/server.ts"
}, (opts) => deleteBot.__executeServer(opts));
var deleteBot = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.id) throw new Error("Missing bot.");
	return { id: String(input.id) };
}).handler(deleteBot_createServerFn_handler, async ({ data }) => {
	await (await getSql())`delete from bots where id = ${data.id}`;
	return { ok: true };
});
var addSource_createServerFn_handler = createServerRpc({
	id: "05e11b7a12104bdf7d627af2230a0f337a1d0bbe050ba601e2f08461fdd264f5",
	name: "addSource",
	filename: "src/lib/booth/server.ts"
}, (opts) => addSource.__executeServer(opts));
var addSource = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	const [url] = cleanUrls([input.url || ""]);
	if (!url) throw new Error("Add a YouTube or transcript URL.");
	return {
		botId: String(input.botId),
		url
	};
}).handler(addSource_createServerFn_handler, async ({ data }) => {
	const sql = await getSql();
	const id = crypto.randomUUID();
	await sql`
      insert into sources (id, bot_id, url, kind, status)
      values (${id}, ${data.botId}, ${data.url}, ${kindFor(data.url)}, 'pending')
    `;
	return { id };
});
var removeSource_createServerFn_handler = createServerRpc({
	id: "88b4ed6fe22df935a5cb4d9cdfadc7b07c7a857a8dcd4996302f75dc9fb6ffb4",
	name: "removeSource",
	filename: "src/lib/booth/server.ts"
}, (opts) => removeSource.__executeServer(opts));
var removeSource = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.id) throw new Error("Missing source.");
	return { id: String(input.id) };
}).handler(removeSource_createServerFn_handler, async ({ data }) => {
	await (await getSql())`delete from sources where id = ${data.id}`;
	return { ok: true };
});
var clearChat_createServerFn_handler = createServerRpc({
	id: "b98f9f76478d9f6d4588ab2a5801200711a277f01ef38378531fae04bd94d927",
	name: "clearChat",
	filename: "src/lib/booth/server.ts"
}, (opts) => clearChat.__executeServer(opts));
var clearChat = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(clearChat_createServerFn_handler, async ({ data }) => {
	await (await getSql())`delete from messages where bot_id = ${data.botId}`;
	return { ok: true };
});
var pasteSchema = object({
	botId: string().min(1),
	videoUrl: string().trim().min(1).max(500),
	title: string().trim().max(180).optional(),
	transcript: string().trim().min(40).max(2e5)
});
var pasteTranscript_createServerFn_handler = createServerRpc({
	id: "cac8a1cd0f8ef7509ccea2a7537ffd0cf8bafb9b06f6a7fee623e2677b0d9a58",
	name: "pasteTranscript",
	filename: "src/lib/booth/server.ts"
}, (opts) => pasteTranscript.__executeServer(opts));
var pasteTranscript = createServerFn({ method: "POST" }).validator((input) => readInput(pasteSchema, input)).handler(pasteTranscript_createServerFn_handler, async ({ data }) => {
	const [videoUrl] = cleanUrls([data.videoUrl]);
	const sql = await getSql();
	if (!(await sql`select id from bots where id = ${data.botId} limit 1`).length) throw new Error("That desk no longer exists.");
	const sourceId = crypto.randomUUID();
	const videoId = youtubeVideoId(videoUrl) || "";
	const cues = parseTimestampedText(data.transcript);
	const passages = cues.length > 1 ? chunkCues(cues) : chunkPlain(data.transcript);
	if (!passages.length) throw new Error("That transcript was empty.");
	await sql`
      insert into sources (id, bot_id, url, kind, title, status, detail, chunk_count, synced_at)
      values (
        ${sourceId}, ${data.botId}, ${videoUrl}, 'paste', ${data.title || "Pasted transcript"},
        'synced', ${"Pasted transcript"}, ${passages.length}, now()
      )
    `;
	for (const passage of passages) await sql`
        insert into chunks (
          id, bot_id, source_id, video_id, video_title, source_url, origin,
          start_sec, end_sec, text, token_count, embedding
        ) values (
          ${crypto.randomUUID()}, ${data.botId}, ${sourceId}, ${videoId},
          ${data.title || "Pasted transcript"}, ${videoUrl}, 'paste',
          ${passage.start}, ${passage.end}, ${passage.text}, ${passage.tokenCount},
          ${JSON.stringify(embed(passage.text))}
        )
      `;
	return { chunks: passages.length };
});
var syncBot_createServerFn_handler = createServerRpc({
	id: "146f62ac43dfc601a85d40927fe2e4040f6e2af647d8f158c32a6a45f666ce73",
	name: "syncBot",
	filename: "src/lib/booth/server.ts"
}, (opts) => syncBot.__executeServer(opts));
var syncBot = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(syncBot_createServerFn_handler, async ({ data }) => {
	if (syncing.has(data.botId)) throw new Error("This desk is already syncing.");
	if (!allowSync()) throw new Error("Sync limit reached. Wait a few minutes and try again.");
	syncing.add(data.botId);
	try {
		const sql = await getSql();
		const bot = (await sql`
        select id, host_name from bots where id = ${data.botId} limit 1
      `)[0];
		if (!bot) throw new Error("That desk no longer exists.");
		const sources = await sql`
        select id, url from sources where bot_id = ${bot.id} and kind <> 'paste' order by created_at asc
      `;
		await sql`delete from chunks where bot_id = ${bot.id} and origin <> 'paste'`;
		const errors = [];
		const notes = [];
		let chunkCount = 0;
		let tapeCount = 0;
		for (const source of sources) try {
			const result = await ingestUrl(source.url, bot.host_name);
			notes.push(...result.notes);
			errors.push(...result.errors);
			let sourceChunks = 0;
			const titles = [];
			for (const tape of result.tapes) {
				const passages = passagesForTape(tape);
				if (!passages.length) continue;
				tapeCount += 1;
				titles.push(tape.title);
				for (const passage of passages) {
					await sql`
                insert into chunks (
                  id, bot_id, source_id, video_id, video_title, source_url, origin,
                  start_sec, end_sec, text, token_count, embedding
                ) values (
                  ${crypto.randomUUID()}, ${bot.id}, ${source.id}, ${tape.videoId},
                  ${tape.title}, ${tape.sourceUrl}, ${tape.origin},
                  ${passage.start}, ${passage.end}, ${passage.text}, ${passage.tokenCount},
                  ${JSON.stringify(embed(passage.text))}
                )
              `;
					sourceChunks += 1;
					chunkCount += 1;
				}
			}
			const detail = [.../* @__PURE__ */ new Set([
				result.tapes[0]?.detail,
				...result.notes,
				...result.errors
			])].filter(Boolean).join(" ").slice(0, 500);
			await sql`
            update sources
            set status = ${sourceChunks ? "synced" : "error"},
                title = ${titles[0] || null},
                detail = ${detail || null},
                chunk_count = ${sourceChunks},
                synced_at = now()
            where id = ${source.id}
          `;
		} catch (error) {
			const message = error instanceof Error ? error.message : "Sync failed.";
			errors.push(message);
			await sql`
            update sources set status = 'error', detail = ${message.slice(0, 500)}, synced_at = now()
            where id = ${source.id}
          `;
		}
		const pasted = await sql`
        select count(*)::int as count from chunks where bot_id = ${bot.id} and origin = 'paste'
      `;
		return {
			chunks: chunkCount + (pasted[0]?.count || 0),
			tapes: tapeCount,
			notes: [...new Set(notes)].slice(0, 6),
			errors: [...new Set(errors)].slice(0, 6)
		};
	} finally {
		syncing.delete(data.botId);
	}
});
async function askModel(system, user) {
	const apiKey = process.env.XAI_API_KEY;
	if (!apiKey) throw new Error("AI is not available in this environment.");
	const response = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		signal: AbortSignal.timeout(45e3),
		body: JSON.stringify({
			model: "grok-4.5",
			temperature: 0,
			max_tokens: 900,
			messages: [{
				role: "system",
				content: system
			}, {
				role: "user",
				content: user
			}]
		})
	});
	if (!response.ok) throw new Error(`The model returned ${response.status}. Try again in a moment.`);
	return (await response.json()).choices?.[0]?.message?.content?.trim() || "";
}
var askBot_createServerFn_handler = createServerRpc({
	id: "9e076d0fd0164bee56046dc6ff9a84e17bb82a2a725ca78a025443578d93bff5",
	name: "askBot",
	filename: "src/lib/booth/server.ts"
}, (opts) => askBot.__executeServer(opts));
var askBot = createServerFn({ method: "POST" }).validator((input) => {
	const question = String(input?.question || "").trim();
	if (!input?.botId) throw new Error("Missing bot.");
	if (question.length < 2) throw new Error("Ask a question first.");
	if (question.length > 2e3) throw new Error("That question is too long.");
	return {
		botId: String(input.botId),
		question
	};
}).handler(askBot_createServerFn_handler, async ({ data }) => {
	if (!allowChat()) throw new Error("Too many questions at once. Wait a minute.");
	const sql = await getSql();
	const bot = (await sql`
      select id, system_prompt, threshold, host_name from bots where id = ${data.botId} limit 1
    `)[0];
	if (!bot) throw new Error("That desk no longer exists.");
	const userId = crypto.randomUUID();
	await sql`
      insert into messages (id, bot_id, role, content)
      values (${userId}, ${bot.id}, 'user', ${data.question})
    `;
	const history = (await sql`
      select role, content from messages
      where bot_id = ${bot.id} and id <> ${userId}
      order by created_at desc
      limit 6
    `).reverse();
	const contentTokens = data.question.split(/\s+/).filter((word) => word.length > 3);
	const previousUser = history.filter((message) => message.role === "user").at(-1);
	const retrievalQuery = contentTokens.length < 3 && previousUser ? `${previousUser.content}\n${data.question}` : data.question;
	const library = (await sql`
      select video_id, video_title, source_url, origin, start_sec, text, embedding
      from chunks where bot_id = ${bot.id}
    `).map((row) => {
		try {
			return {
				...row,
				embedding: JSON.parse(row.embedding)
			};
		} catch {
			return null;
		}
	}).filter((row) => row != null && Array.isArray(row.embedding));
	const finish = async (content, refused, score, citations) => {
		const id = crypto.randomUUID();
		await sql`
        insert into messages (id, bot_id, role, content, citations, refused, score)
        values (
          ${id}, ${bot.id}, 'assistant', ${content}, ${JSON.stringify(citations)}, ${refused}, ${score}
        )
      `;
		return {
			id,
			content,
			refused,
			score,
			citations
		};
	};
	if (!library.length) return finish("This desk has no library yet. Add a YouTube link and sync it.", false, null, []);
	const ranked = rankBySimilarity(retrievalQuery, library);
	const top = ranked[0];
	const threshold = Number(bot.threshold) || .72;
	if (!top || top.score < threshold) return finish(REFUSE_LINE, true, top ? Math.round(top.score * 1e3) / 1e3 : 0, []);
	const picked = ranked.filter((row) => row.score >= Math.max(.45, threshold * .75)).slice(0, 5);
	const excerpts = picked.map((row, index) => {
		const stamp = row.item.start_sec;
		return `[${index + 1}] ${row.item.video_title} @ ${stamp}s (${row.item.origin})\n${row.item.text.slice(0, 1800)}`;
	}).join("\n\n");
	const historyBlock = history.map((message) => `${message.role === "user" ? "Listener" : "Desk"}: ${message.content.slice(0, 500)}`).join("\n");
	let answer = "";
	try {
		answer = await askModel(`${bot.system_prompt}\n\n${GROUNDING}`, `${historyBlock ? `Recent conversation:\n${historyBlock}\n\n` : ""}Excerpts:\n${excerpts}\n\nQuestion: ${data.question}`);
	} catch (error) {
		return finish(error instanceof Error ? error.message : "The model could not answer.", false, top.score, []);
	}
	if (!answer) answer = "The model returned an empty reply. Ask again.";
	const refused = answer.trim() === REFUSE_LINE || answer.trim().startsWith(REFUSE_LINE);
	const used = /* @__PURE__ */ new Set();
	for (const match of answer.matchAll(/\[(\d+)\]/g)) {
		const index = Number(match[1]);
		if (index >= 1 && index <= picked.length) used.add(index);
	}
	const citations = (used.size ? [...used] : refused ? [] : picked.map((_, index) => index + 1)).map((index) => {
		const row = picked[index - 1];
		return {
			index,
			videoId: row.item.video_id,
			title: row.item.video_title,
			startSec: row.item.start_sec,
			url: citeUrl(row.item.video_id, row.item.source_url, row.item.start_sec),
			origin: row.item.origin,
			quote: row.item.text.slice(0, 220)
		};
	});
	return finish(answer, refused, Math.round(top.score * 1e3) / 1e3, citations);
});
//#endregion
export { addSource_createServerFn_handler, askBot_createServerFn_handler, clearChat_createServerFn_handler, createBot_createServerFn_handler, deleteBot_createServerFn_handler, getDesk_createServerFn_handler, listBots_createServerFn_handler, pasteTranscript_createServerFn_handler, removeSource_createServerFn_handler, syncBot_createServerFn_handler, updateBot_createServerFn_handler };
