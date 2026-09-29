import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSql } from "@/lib/db";
import { passagesForTape, ingestUrl, youtubeVideoId } from "./ingest";
import { chunkCues, chunkPlain, parseTimestampedText, } from "./chunk";
import { embed, rankBySimilarity } from "./score";

export const REFUSE_LINE = "This podcast hasn't covered this topic yet.";

const GROUNDING = `
GROUNDING CONTRACT — this overrides the persona if they conflict:
- Use only the numbered excerpts in the user message. They are the entire library for this host.
- If the excerpts do not contain the answer, reply with exactly this sentence and nothing else: ${REFUSE_LINE}
- Cite supporting excerpts inline as [1], [2], using only those numbers.
- Do not invent quotes, guests, numbers, dates, or timestamps.
- Temperature is zero. Be specific and short.`.trim();

type Citation = {
  index: number;
  videoId: string;
  title: string;
  startSec: number;
  url: string;
  origin: string;
  quote: string;
};

type BotRow = {
  id: string;
  name: string;
  host_name: string;
  system_prompt: string;
  threshold: number;
  namespace: string;
  created_at: string;
  chunk_count: number;
  source_count: number;
};

type SourceRow = {
  id: string;
  url: string;
  kind: string;
  title: string | null;
  status: string;
  detail: string | null;
  chunk_count: number;
  synced_at: string | null;
};

type MessageRow = {
  id: string;
  role: string;
  content: string;
  citations: string | null;
  refused: boolean;
  score: number | null;
  created_at: string;
};

function readInput<T>(schema: z.ZodType<T>, input: unknown): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Check that form and try again.");
  }
  return parsed.data;
}

function namespaceFor(host: string): string {
  const slug = host
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
  return `bot_${slug || "host"}`;
}

function cleanUrls(values: string[]): string[] {
  const out: string[] = [];
  for (const raw of values) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let parsed: URL;
    try {
      parsed = new URL(withProto);
    } catch {
      throw new Error(`Not a valid URL: ${trimmed.slice(0, 80)}`);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("Only http(s) links can be indexed.");
    }
    out.push(parsed.toString());
  }
  return [...new Set(out)].slice(0, 12);
}

function kindFor(url: string): string {
  if (/youtube\.com|youtu\.be/.test(url)) {
    return /\/@|\/channel\/|\/c\/|\/user\//.test(url) && !/[?&]v=/.test(url) ? "channel" : "video";
  }
  if (/transcript/i.test(url)) return "transcript";
  return "link";
}

async function uniqueNamespace(host: string): Promise<string> {
  const sql = await getSql();
  const base = namespaceFor(host);
  let name = base;
  let n = 2;
  while (true) {
    const rows = await sql<{ id: string }>`select id from bots where namespace = ${name} limit 1`;
    if (!rows.length) return name;
    name = `${base}_${n}`;
    n += 1;
  }
}

function citeUrl(videoId: string, sourceUrl: string, startSec: number): string {
  if (/^[\w-]{11}$/.test(videoId)) return `https://youtu.be/${videoId}?t=${Math.max(0, startSec)}`;
  return sourceUrl || "https://www.youtube.com";
}

function limiter(limit: number, windowMs: number) {
  const bucket: number[] = [];
  return () => {
    const now = Date.now();
    while (bucket.length && now - bucket[0] > windowMs) bucket.shift();
    if (bucket.length >= limit) return false;
    bucket.push(now);
    return true;
  };
}

const allowChat = limiter(24, 60 * 1000);
const allowSync = limiter(8, 10 * 60 * 1000);
const syncing = new Set<string>();

export const listBots = createServerFn({ method: "GET" }).handler(async () => {
  const sql = await getSql();
  return sql<BotRow>`
    select b.id, b.name, b.host_name, b.system_prompt, b.threshold, b.namespace,
           b.created_at::text as created_at,
           (select count(*)::int from chunks c where c.bot_id = b.id) as chunk_count,
           (select count(*)::int from sources s where s.bot_id = b.id) as source_count
    from bots b
    order by b.created_at asc
  `;
});

export const getDesk = createServerFn({ method: "GET" })
  .validator((input: { botId: string }) => {
    if (!input?.botId) throw new Error("Missing bot.");
    return { botId: String(input.botId) };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const bots = await sql<BotRow>`
      select b.id, b.name, b.host_name, b.system_prompt, b.threshold, b.namespace,
             b.created_at::text as created_at,
             (select count(*)::int from chunks c where c.bot_id = b.id) as chunk_count,
             (select count(*)::int from sources s where s.bot_id = b.id) as source_count
      from bots b where b.id = ${data.botId} limit 1
    `;
    const bot = bots[0];
    if (!bot) return null;
    const sources = await sql<SourceRow>`
      select id, url, kind, title, status, detail, chunk_count, synced_at::text as synced_at
      from sources where bot_id = ${bot.id} order by created_at asc
    `;
    const messages = await sql<MessageRow>`
      select id, role, content, citations, refused, score, created_at::text as created_at
      from messages where bot_id = ${bot.id}
      order by created_at asc
      limit 80
    `;
    return {
      bot,
      sources,
      messages: messages.map((message) => ({
        ...message,
        citations: message.citations ? (JSON.parse(message.citations) as Citation[]) : [],
      })),
    };
  });

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  hostName: z.string().trim().min(1).max(80),
  systemPrompt: z.string().trim().min(1).max(4000),
  threshold: z.number().min(0.05).max(0.95).optional(),
  urls: z.array(z.string()).max(12).optional(),
});

export const createBot = createServerFn({ method: "POST" })
  .validator((input: unknown) => readInput(createSchema, input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    const namespace = await uniqueNamespace(data.hostName);
    const threshold = data.threshold ?? 0.72;
    const urls = cleanUrls(data.urls ?? []);
    await sql`
      insert into bots (id, name, host_name, system_prompt, threshold, namespace)
      values (${id}, ${data.name}, ${data.hostName}, ${data.systemPrompt}, ${threshold}, ${namespace})
    `;
    for (const url of urls) {
      await sql`
        insert into sources (id, bot_id, url, kind, status)
        values (${crypto.randomUUID()}, ${id}, ${url}, ${kindFor(url)}, 'pending')
      `;
    }
    return { id, namespace };
  });

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(80),
  hostName: z.string().trim().min(1).max(80),
  systemPrompt: z.string().trim().min(1).max(4000),
  threshold: z.number().min(0.05).max(0.95),
});

export const updateBot = createServerFn({ method: "POST" })
  .validator((input: unknown) => readInput(updateSchema, input))
  .handler(async ({ data }) => {
    const sql = await getSql();
    const rows = await sql<{ id: string }>`
      update bots
      set name = ${data.name},
          host_name = ${data.hostName},
          system_prompt = ${data.systemPrompt},
          threshold = ${data.threshold},
          updated_at = now()
      where id = ${data.id}
      returning id
    `;
    if (!rows.length) throw new Error("That desk no longer exists.");
    return { ok: true as const };
  });

export const deleteBot = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing bot.");
    return { id: String(input.id) };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from bots where id = ${data.id}`;
    return { ok: true as const };
  });

export const addSource = createServerFn({ method: "POST" })
  .validator((input: { botId: string; url: string }) => {
    if (!input?.botId) throw new Error("Missing bot.");
    const [url] = cleanUrls([input.url || ""]);
    if (!url) throw new Error("Add a YouTube or transcript URL.");
    return { botId: String(input.botId), url };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const id = crypto.randomUUID();
    await sql`
      insert into sources (id, bot_id, url, kind, status)
      values (${id}, ${data.botId}, ${data.url}, ${kindFor(data.url)}, 'pending')
    `;
    return { id };
  });

export const removeSource = createServerFn({ method: "POST" })
  .validator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing source.");
    return { id: String(input.id) };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from sources where id = ${data.id}`;
    return { ok: true as const };
  });

export const clearChat = createServerFn({ method: "POST" })
  .validator((input: { botId: string }) => {
    if (!input?.botId) throw new Error("Missing bot.");
    return { botId: String(input.botId) };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    await sql`delete from messages where bot_id = ${data.botId}`;
    return { ok: true as const };
  });

const pasteSchema = z.object({
  botId: z.string().min(1),
  videoUrl: z.string().trim().min(1).max(500),
  title: z.string().trim().max(180).optional(),
  transcript: z.string().trim().min(40).max(200000),
});

export const pasteTranscript = createServerFn({ method: "POST" })
  .validator((input: unknown) => readInput(pasteSchema, input))
  .handler(async ({ data }) => {
    const [videoUrl] = cleanUrls([data.videoUrl]);
    const sql = await getSql();
    const bots = await sql<{ id: string }>`select id from bots where id = ${data.botId} limit 1`;
    if (!bots.length) throw new Error("That desk no longer exists.");
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
    for (const passage of passages) {
      await sql`
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
    }
    return { chunks: passages.length };
  });

export const syncBot = createServerFn({ method: "POST" })
  .validator((input: { botId: string }) => {
    if (!input?.botId) throw new Error("Missing bot.");
    return { botId: String(input.botId) };
  })
  .handler(async ({ data }) => {
    if (syncing.has(data.botId)) throw new Error("This desk is already syncing.");
    if (!allowSync()) throw new Error("Sync limit reached. Wait a few minutes and try again.");
    syncing.add(data.botId);
    try {
      const sql = await getSql();
      const bots = await sql<{ id: string; host_name: string }>`
        select id, host_name from bots where id = ${data.botId} limit 1
      `;
      const bot = bots[0];
      if (!bot) throw new Error("That desk no longer exists.");
      const sources = await sql<{ id: string; url: string }>`
        select id, url from sources where bot_id = ${bot.id} and kind <> 'paste' order by created_at asc
      `;
      await sql`delete from chunks where bot_id = ${bot.id} and origin <> 'paste'`;
      const errors: string[] = [];
      const notes: string[] = [];
      let chunkCount = 0;
      let tapeCount = 0;
      for (const source of sources) {
        try {
          const result = await ingestUrl(source.url, bot.host_name);
          notes.push(...result.notes);
          errors.push(...result.errors);
          let sourceChunks = 0;
          const titles: string[] = [];
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
          const detail = [...new Set([result.tapes[0]?.detail, ...result.notes, ...result.errors])]
            .filter(Boolean)
            .join(" ")
            .slice(0, 500);
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
      }
      const pasted = await sql<{ count: number }>`
        select count(*)::int as count from chunks where bot_id = ${bot.id} and origin = 'paste'
      `;
      return {
        chunks: chunkCount + (pasted[0]?.count || 0),
        tapes: tapeCount,
        notes: [...new Set(notes)].slice(0, 6),
        errors: [...new Set(errors)].slice(0, 6),
      };
    } finally {
      syncing.delete(data.botId);
    }
  });

async function askModel(system: string, user: string): Promise<string> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("AI is not available in this environment.");
  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`The model returned ${response.status}. Try again in a moment.`);
  }
  const body = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return body.choices?.[0]?.message?.content?.trim() || "";
}

export const askBot = createServerFn({ method: "POST" })
  .validator((input: { botId: string; question: string }) => {
    const question = String(input?.question || "").trim();
    if (!input?.botId) throw new Error("Missing bot.");
    if (question.length < 2) throw new Error("Ask a question first.");
    if (question.length > 2000) throw new Error("That question is too long.");
    return { botId: String(input.botId), question };
  })
  .handler(async ({ data }) => {
    if (!allowChat()) throw new Error("Too many questions at once. Wait a minute.");
    const sql = await getSql();
    const bots = await sql<{
      id: string;
      system_prompt: string;
      threshold: number;
      host_name: string;
    }>`
      select id, system_prompt, threshold, host_name from bots where id = ${data.botId} limit 1
    `;
    const bot = bots[0];
    if (!bot) throw new Error("That desk no longer exists.");
    const userId = crypto.randomUUID();
    await sql`
      insert into messages (id, bot_id, role, content)
      values (${userId}, ${bot.id}, 'user', ${data.question})
    `;

    const prior = await sql<{ role: string; content: string }>`
      select role, content from messages
      where bot_id = ${bot.id} and id <> ${userId}
      order by created_at desc
      limit 6
    `;
    const history = prior.reverse();
    const contentTokens = data.question.split(/\s+/).filter((word) => word.length > 3);
    const previousUser = history.filter((message) => message.role === "user").at(-1);
    const retrievalQuery =
      contentTokens.length < 3 && previousUser ? `${previousUser.content}\n${data.question}` : data.question;

    const rows = await sql<{
      video_id: string;
      video_title: string;
      source_url: string;
      origin: string;
      start_sec: number;
      text: string;
      embedding: string;
    }>`
      select video_id, video_title, source_url, origin, start_sec, text, embedding
      from chunks where bot_id = ${bot.id}
    `;

    const library = rows
      .map((row) => {
        try {
          return { ...row, embedding: JSON.parse(row.embedding) as number[] };
        } catch {
          return null;
        }
      })
      .filter((row): row is NonNullable<typeof row> => row != null && Array.isArray(row.embedding));

    const finish = async (content: string, refused: boolean, score: number | null, citations: Citation[]) => {
      const id = crypto.randomUUID();
      await sql`
        insert into messages (id, bot_id, role, content, citations, refused, score)
        values (
          ${id}, ${bot.id}, 'assistant', ${content}, ${JSON.stringify(citations)}, ${refused}, ${score}
        )
      `;
      return { id, content, refused, score, citations };
    };

    if (!library.length) {
      return finish("This desk has no library yet. Add a YouTube link and sync it.", false, null, []);
    }

    const ranked = rankBySimilarity(retrievalQuery, library);
    const top = ranked[0];
    const threshold = Number(bot.threshold) || 0.72;
    if (!top || top.score < threshold) {
      return finish(REFUSE_LINE, true, top ? Math.round(top.score * 1000) / 1000 : 0, []);
    }

    const picked = ranked.filter((row) => row.score >= Math.max(0.45, threshold * 0.75)).slice(0, 5);
    const excerpts = picked
      .map((row, index) => {
        const stamp = row.item.start_sec;
        return `[${index + 1}] ${row.item.video_title} @ ${stamp}s (${row.item.origin})\n${row.item.text.slice(0, 1800)}`;
      })
      .join("\n\n");
    const historyBlock = history
      .map((message) => `${message.role === "user" ? "Listener" : "Desk"}: ${message.content.slice(0, 500)}`)
      .join("\n");

    let answer = "";
    try {
      answer = await askModel(
        `${bot.system_prompt}\n\n${GROUNDING}`,
        `${historyBlock ? `Recent conversation:\n${historyBlock}\n\n` : ""}Excerpts:\n${excerpts}\n\nQuestion: ${data.question}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "The model could not answer.";
      return finish(message, false, top.score, []);
    }
    if (!answer) answer = "The model returned an empty reply. Ask again.";
    const refused = answer.trim() === REFUSE_LINE || answer.trim().startsWith(REFUSE_LINE);
    const used = new Set<number>();
    for (const match of answer.matchAll(/\[(\d+)\]/g)) {
      const index = Number(match[1]);
      if (index >= 1 && index <= picked.length) used.add(index);
    }
    const chosen = used.size ? [...used] : refused ? [] : picked.map((_, index) => index + 1);
    const citations: Citation[] = chosen.map((index) => {
      const row = picked[index - 1];
      return {
        index,
        videoId: row.item.video_id,
        title: row.item.video_title,
        startSec: row.item.start_sec,
        url: citeUrl(row.item.video_id, row.item.source_url, row.item.start_sec),
        origin: row.item.origin,
        quote: row.item.text.slice(0, 220),
      };
    });
    return finish(answer, refused, Math.round(top.score * 1000) / 1000, citations);
  });
