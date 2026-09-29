import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Library,
  Menu,
  Plus,
  RefreshCw,
  Send,
  Settings,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  addSource,
  askBot,
  clearChat,
  createBot,
  deleteBot,
  getDesk,
  listBots,
  pasteTranscript,
  removeSource,
  syncBot,
  updateBot,
} from "@/lib/booth/server";
import { cn } from "@/lib/utils";

const routeApi = getRouteApi("/");

type Bot = Awaited<ReturnType<typeof listBots>>[number];
type Desk = NonNullable<Awaited<ReturnType<typeof getDesk>>>;

const STARTERS = [
  {
    host: "David Senra",
    name: "Founders desk",
    urls: "https://www.youtube.com/@DavidSenra",
    blurb: "Biographies, obsession, and how operators actually worked.",
    asks: [
      "What does he take from the latest founder he read?",
      "How does he talk about reading and obsession?",
      "What does this show say about quantum computing?",
    ],
    prompt:
      "You are the research desk for David Senra of Founders. He reads biographies and keeps only what an operator can use: obsession, simplicity, and the long grind. Answer in that register — short, forceful, specific.",
  },
  {
    host: "Lex Fridman",
    name: "Lex desk",
    urls: "https://www.youtube.com/watch?v=s7d2d8FhevU",
    blurb: "Long conversations. This desk starts on the psychiatry episode.",
    asks: [
      "What is said about the ice pick lobotomy?",
      "How does the guest describe Freud and psychoanalysis?",
      "What does this episode say about the stock market?",
    ],
    prompt:
      "You are the research desk for the Lex Fridman Podcast. Lex speaks carefully with scientists, builders, and historians. Answer with that calm precision. Name the speaker when the excerpt does.",
  },
  {
    host: "Nikhil Kamath",
    name: "Nikhil desk",
    urls: "https://www.youtube.com/@nikhilkamathcio",
    blurb: "Plain questions about capital, companies, and building in India.",
    asks: [
      "What does he ask operators about building a company?",
      "How does he talk about money and risk?",
      "What does this show say about ancient Rome?",
    ],
    prompt:
      "You are the research desk for Nikhil Kamath. He asks operators plain questions about building businesses, capital, and India. Be direct and commercial.",
  },
  {
    host: "Raj Shamani",
    name: "Raj desk",
    urls: "https://www.youtube.com/@RajShamani",
    blurb: "Figuring Out — careers, companies, and how money actually moves.",
    asks: [
      "What does the latest guest say about building a business?",
      "How does Raj push on money and careers?",
      "What does this podcast say about particle physics?",
    ],
    prompt:
      "You are the research desk for Raj Shamani of Figuring Out. He presses guests on how money, careers, and companies actually work. Be concrete.",
  },
] as const;

function defaultPrompt(host: string) {
  return `You are the research desk for ${host}. Answer in a concrete voice. Never go past the excerpts.`;
}

function monogram(host: string) {
  const parts = host.trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "?") + (parts[1]?.[0] || "");
  return letters.toUpperCase();
}

function formatStamp(sec: number) {
  const safe = Math.max(0, Math.floor(sec));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function messageOf(error: unknown) {
  if (error instanceof Error && error.message) return error.message.replace(/^Error:\s*/, "");
  return "Something went wrong.";
}

export function Studio() {
  const search = routeApi.useSearch();
  const navigate = routeApi.useNavigate();
  const queryClient = useQueryClient();
  const [rail, setRail] = useState(false);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState("");
  const [asking, setAsking] = useState(false);

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: () => listBots() });
  const bots = botsQuery.data ?? [];
  const activeId = search.bot && bots.some((bot) => bot.id === search.bot) ? search.bot : undefined;

  const deskQuery = useQuery({
    queryKey: ["desk", activeId],
    queryFn: () => getDesk({ data: { botId: activeId! } }),
    enabled: Boolean(activeId),
  });
  const desk = deskQuery.data ?? null;

  const refresh = async (botId?: string) => {
    await queryClient.invalidateQueries({ queryKey: ["bots"] });
    if (botId) await queryClient.invalidateQueries({ queryKey: ["desk", botId] });
  };

  const select = (botId?: string, settings = false) => {
    setRail(false);
    void navigate({ search: { bot: botId, settings: settings || undefined } });
  };

  const sync = useMutation({
    mutationFn: (botId: string) => syncBot({ data: { botId } }),
    onSuccess: async (result, botId) => {
      await refresh(botId);
      if (result.errors.length && !result.tapes) toast.error(result.errors[0]);
      else if (result.errors.length) toast.message(`Indexed with gaps. ${result.errors[0]}`);
      else toast.success(`Library updated · ${result.chunks} passages`);
    },
    onError: (error) => toast.error(messageOf(error)),
  });

  const openStarter = async (starter: (typeof STARTERS)[number]) => {
    try {
      const created = await createBot({
        data: {
          name: starter.name,
          hostName: starter.host,
          systemPrompt: starter.prompt,
          threshold: 0.72,
          urls: starter.urls.split("\n"),
        },
      });
      await refresh(created.id);
      select(created.id);
      sync.mutate(created.id);
    } catch (error) {
      toast.error(messageOf(error));
    }
  };

  const send = async (text: string) => {
    if (!activeId || asking) return;
    const question = text.trim();
    if (!question) return;
    setDraft("");
    setAsking(true);
    try {
      await askBot({ data: { botId: activeId, question } });
      await queryClient.invalidateQueries({ queryKey: ["desk", activeId] });
    } catch (error) {
      toast.error(messageOf(error));
      setDraft(question);
    } finally {
      setAsking(false);
    }
  };

  const asks = useMemo(() => {
    const host = desk?.bot.host_name ?? "";
    return STARTERS.find((starter) => starter.host === host)?.asks ?? [
      "What does this host actually say about their work?",
      "Which story do they keep coming back to?",
      "What does this podcast say about medieval farming?",
    ];
  }, [desk?.bot.host_name]);

  return (
    <div className="flex h-dvh overflow-hidden bg-studio text-studio-fg">
      {rail ? (
        <button
          type="button"
          aria-label="Close desk list"
          className="fixed inset-0 z-30 bg-ink/50 md:hidden"
          onClick={() => setRail(false)}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line-dark bg-studio sm:w-80 md:static md:translate-x-0",
          rail ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <p className="font-display text-3xl leading-none tracking-tight text-studio-fg">Booth</p>
            <p className="mt-2 text-sm text-mist">One host. Only what they said.</p>
          </div>
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-mist md:hidden"
            onClick={() => setRail(false)}
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-4">
          <button
            type="button"
            onClick={() => {
              setRail(false);
              setCreating(true);
            }}
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brass px-4 text-sm font-semibold text-studio"
          >
            <Plus className="size-4" />
            Create new bot
          </button>
        </div>
        <div className="desk-scroll mt-4 flex-1 overflow-y-auto px-3 pb-6">
          {botsQuery.isLoading ? (
            <p className="px-2 py-4 text-sm text-mist">Opening the studio…</p>
          ) : bots.length === 0 ? (
            <p className="px-2 py-4 text-sm leading-relaxed text-mist">
              No desks yet. Start from a host, or build an empty one and add links yourself.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {bots.map((bot) => (
                <li key={bot.id}>
                  <button
                    type="button"
                    onClick={() => select(bot.id)}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left",
                      bot.id === activeId ? "bg-studio-2" : "hover:bg-studio-2",
                    )}
                  >
                    <Mark host={bot.host_name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-studio-fg">{bot.name}</span>
                      <span className="block truncate text-sm text-mist">
                        {bot.host_name}
                        {bot.chunk_count ? ` · ${bot.chunk_count} passages` : " · empty"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col bg-paper text-ink">
        <header className="flex min-h-16 items-center gap-3 border-b border-line px-3 md:px-6">
          <button
            type="button"
            className="grid size-11 place-items-center rounded-full text-ink md:hidden"
            onClick={() => setRail(true)}
            aria-label="Open desks"
          >
            <Menu className="size-5" />
          </button>
          {desk ? (
            <>
              <div className="min-w-0 flex-1">
                <h1 className="truncate font-display text-xl text-ink md:text-2xl">{desk.bot.name}</h1>
                <p className="truncate text-sm text-mist">
                  {desk.bot.host_name} · {desk.bot.namespace} · threshold {Number(desk.bot.threshold).toFixed(2)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => select(desk.bot.id, true)}
                className="grid size-11 place-items-center rounded-full text-ink"
                aria-label="Desk settings"
              >
                <Settings className="size-5" />
              </button>
            </>
          ) : (
            <p className="font-display text-xl text-ink">The studio</p>
          )}
        </header>

        {!activeId ? (
          <Lobby
            bots={bots}
            busy={sync.isPending}
            onStarter={(starter) => void openStarter(starter)}
            onOpen={(id) => select(id)}
            onCreate={() => setCreating(true)}
          />
        ) : desk ? (
          <Chat
            desk={desk}
            asks={asks}
            draft={draft}
            setDraft={setDraft}
            asking={asking}
            syncing={sync.isPending}
            onSend={(text) => void send(text)}
            onSync={() => sync.mutate(desk.bot.id)}
          />
        ) : (
          <div className="grid flex-1 place-items-center text-sm text-mist">Loading this desk…</div>
        )}
      </main>

      {creating ? (
        <CreateDialog
          onClose={() => setCreating(false)}
          onCreated={async (id) => {
            setCreating(false);
            await refresh(id);
            select(id, true);
          }}
        />
      ) : null}
      {search.settings && desk ? (
        <SettingsSheet
          desk={desk}
          syncing={sync.isPending}
          onClose={() => select(desk.bot.id)}
          onSync={() => sync.mutate(desk.bot.id)}
          onChanged={() => void refresh(desk.bot.id)}
          onDeleted={async () => {
            await refresh();
            select(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

function Mark({ host }: { host: string }) {
  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-full border border-brass font-display text-sm text-brass">
      {monogram(host)}
    </span>
  );
}

function Lobby({
  bots,
  busy,
  onStarter,
  onOpen,
  onCreate,
}: {
  bots: Bot[];
  busy: boolean;
  onStarter: (starter: (typeof STARTERS)[number]) => void;
  onOpen: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="desk-scroll flex-1 overflow-y-auto px-4 py-8 md:px-10">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-medium tracking-wide text-brass-deep uppercase">Private desks</p>
        <h2 className="mt-2 font-display text-4xl text-ink md:text-5xl">
          Ask the host. Never the whole internet.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-mist">
          Each bot keeps its own library. A question is answered only from that creator’s transcripts,
          and if the closest passage misses the bar, the desk refuses.
        </p>
        {bots.length > 0 ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {bots.map((bot) => (
              <button
                key={bot.id}
                type="button"
                onClick={() => onOpen(bot.id)}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-3 text-left"
              >
                <Mark host={bot.host_name} />
                <span>
                  <span className="block font-medium">{bot.name}</span>
                  <span className="text-sm text-mist">{bot.chunk_count} passages in the library</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {STARTERS.map((starter) => (
            <button
              key={starter.host}
              type="button"
              disabled={busy}
              onClick={() => onStarter(starter)}
              className="rounded-2xl border border-line bg-paper p-4 text-left disabled:opacity-60"
            >
              <span className="flex items-center gap-3">
                <Mark host={starter.host} />
                <span>
                  <span className="block font-display text-xl text-ink">{starter.host}</span>
                  <span className="text-sm text-mist">{starter.name}</span>
                </span>
              </span>
              <span className="mt-3 block text-sm leading-relaxed text-ink">{starter.blurb}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCreate}
          className="mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brass-deep"
        >
          <Plus className="size-4" />
          Or create an empty desk
        </button>
      </div>
    </div>
  );
}

function Chat({
  desk,
  asks,
  draft,
  setDraft,
  asking,
  syncing,
  onSend,
  onSync,
}: {
  desk: Desk;
  asks: readonly string[];
  draft: string;
  setDraft: (value: string) => void;
  asking: boolean;
  syncing: boolean;
  onSend: (text: string) => void;
  onSync: () => void;
}) {
  useEffect(() => {
    const node = document.getElementById("desk-thread");
    if (node) node.scrollTop = node.scrollHeight;
  }, [desk.messages.length, asking]);

  const empty = desk.bot.chunk_count === 0;

  return (
    <>
      <div id="desk-thread" className="desk-scroll flex-1 overflow-y-auto px-4 py-6 md:px-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          {syncing ? <Sweep label="Pulling transcripts into this namespace…" /> : null}
          {empty && !syncing ? (
            <div className="rounded-2xl border border-line bg-paper-2 p-5">
              <Library className="size-5 text-brass-deep" />
              <h2 className="mt-3 font-display text-2xl text-ink">This desk is still quiet.</h2>
              <p className="mt-2 text-sm leading-relaxed text-mist">
                Sync the saved links, or paste a transcript in settings. Until passages land in{" "}
                {desk.bot.namespace}, the desk will not guess.
              </p>
              <button
                type="button"
                onClick={onSync}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper"
              >
                <RefreshCw className="size-4" />
                Sync transcripts
              </button>
            </div>
          ) : null}
          {desk.messages.length === 0 && !empty ? (
            <div>
              <p className="text-sm text-mist">Try a question the library can actually hold.</p>
              <div className="mt-3 flex flex-col gap-2">
                {asks.map((ask) => (
                  <button
                    key={ask}
                    type="button"
                    onClick={() => onSend(ask)}
                    className="min-h-11 rounded-2xl border border-line px-4 py-3 text-left text-sm text-ink"
                  >
                    {ask}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {desk.messages.map((message) =>
            message.role === "user" ? (
              <div key={message.id} className="ml-auto max-w-[85%] rounded-2xl bg-paper-2 px-4 py-3 text-ink">
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
              </div>
            ) : (
              <article key={message.id} className="max-w-2xl">
                <p className="text-xs font-medium tracking-wide text-brass-deep uppercase">
                  {message.refused ? "Outside the library" : desk.bot.host_name}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-base leading-relaxed text-ink">{message.content}</p>
                {message.score != null ? (
                  <p className="mt-2 text-xs text-mist tabular-nums">
                    Closest passage {Number(message.score).toFixed(2)} · threshold{" "}
                    {Number(desk.bot.threshold).toFixed(2)}
                  </p>
                ) : null}
                {message.citations?.length ? (
                  <ul className="mt-3 flex flex-col gap-2">
                    {message.citations.map((citation) => (
                      <li key={`${message.id}-${citation.index}`}>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex min-h-11 items-start gap-3 rounded-2xl border border-line px-3 py-2 text-sm"
                        >
                          <span className="font-medium text-brass-deep tabular-nums">
                            [{citation.index}] {formatStamp(citation.startSec)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-ink">{citation.title}</span>
                            <span className="line-clamp-2 text-mist">{citation.quote}</span>
                          </span>
                          <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-mist" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ),
          )}
          {asking ? <Sweep label="Reading only this host…" /> : null}
        </div>
      </div>
      <form
        className="border-t border-line px-3 py-3 md:px-10"
        onSubmit={(event) => {
          event.preventDefault();
          onSend(draft);
        }}
      >
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <label className="sr-only" htmlFor="ask">
            Ask {desk.bot.host_name}
          </label>
          <textarea
            id="ask"
            rows={1}
            value={draft}
            disabled={asking}
            placeholder={empty ? "Sync a library before asking" : `Ask ${desk.bot.host_name}`}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                onSend(draft);
              }
            }}
            className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink outline-none focus:border-brass"
          />
          <button
            type="submit"
            disabled={asking || !draft.trim()}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-40"
            aria-label="Send"
          >
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </>
  );
}

function Sweep({ label }: { label: string }) {
  return (
    <div>
      <p className="text-sm text-mist">{label}</p>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-2">
        <div className="booth-sweep h-full w-1/3 rounded-full bg-brass" />
      </div>
    </div>
  );
}

function CreateDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [host, setHost] = useState("");
  const [prompt, setPrompt] = useState("");
  const [threshold, setThreshold] = useState(0.72);
  const [urls, setUrls] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-6">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-title"
        className="desk-scroll max-h-dvh w-full overflow-y-auto rounded-t-2xl bg-paper p-5 text-ink sm:max-w-lg sm:rounded-2xl"
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          try {
            const created = await createBot({
              data: {
                name: name.trim(),
                hostName: host.trim(),
                systemPrompt: (prompt || defaultPrompt(host)).trim(),
                threshold,
                urls: urls.split("\n"),
              },
            });
            toast.success(`Desk opened · ${created.namespace}`);
            onCreated(created.id);
          } catch (error) {
            toast.error(messageOf(error));
            setPending(false);
          }
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="create-title" className="font-display text-3xl">
              Create new bot
            </h2>
            <p className="mt-1 text-sm text-mist">Its library never mixes with another host.</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <Field label="Bot name" value={name} onChange={setName} placeholder="Founders desk" />
        <Field label="Host / creator name" value={host} onChange={setHost} placeholder="David Senra" />
        <label className="mt-4 block text-sm font-medium">
          Custom system prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={host ? defaultPrompt(host) : "How this desk should sound"}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
          />
        </label>
        <Threshold value={threshold} onChange={setThreshold} />
        <label className="mt-4 block text-sm font-medium">
          YouTube channel or video URLs
          <textarea
            value={urls}
            onChange={(event) => setUrls(event.target.value)}
            placeholder={"One link per line\nhttps://www.youtube.com/watch?v=…"}
            rows={4}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
          />
        </label>
        <button
          type="submit"
          disabled={pending || !name.trim() || !host.trim()}
          className="mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper disabled:opacity-40"
        >
          {pending ? "Opening…" : "Save desk"}
        </button>
      </form>
    </div>
  );
}

function SettingsSheet({
  desk,
  syncing,
  onClose,
  onSync,
  onChanged,
  onDeleted,
}: {
  desk: Desk;
  syncing: boolean;
  onClose: () => void;
  onSync: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(desk.bot.name);
  const [host, setHost] = useState(desk.bot.host_name);
  const [prompt, setPrompt] = useState(desk.bot.system_prompt);
  const [threshold, setThreshold] = useState(() => Math.round(Number(desk.bot.threshold) * 100) / 100);
  const [url, setUrl] = useState("");
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteBody, setPasteBody] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(desk.bot.name);
    setHost(desk.bot.host_name);
    setPrompt(desk.bot.system_prompt);
    setThreshold(Math.round(Number(desk.bot.threshold) * 100) / 100);
  }, [desk.bot.id, desk.bot.name, desk.bot.host_name, desk.bot.system_prompt, desk.bot.threshold]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/40">
      <button type="button" aria-label="Close settings" className="hidden flex-1 sm:block" onClick={onClose} />
      <form
        className="desk-scroll h-full w-full overflow-y-auto bg-paper p-5 text-ink sm:max-w-md"
        onSubmit={async (event) => {
          event.preventDefault();
          setSaving(true);
          try {
            await updateBot({
              data: {
                id: desk.bot.id,
                name: name.trim(),
                hostName: host.trim(),
                systemPrompt: prompt.trim(),
                threshold,
              },
            });
            toast.success("Desk saved");
            onChanged();
          } catch (error) {
            toast.error(messageOf(error));
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-3xl">Settings</h2>
            <p className="mt-1 text-sm text-mist">Namespace {desk.bot.namespace}</p>
          </div>
          <button type="button" onClick={onClose} className="grid size-11 place-items-center" aria-label="Close">
            <X className="size-5" />
          </button>
        </div>
        <Field label="Bot name" value={name} onChange={setName} />
        <Field label="Host / creator name" value={host} onChange={setHost} />
        <label className="mt-4 block text-sm font-medium">
          Custom system prompt
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            className="mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
          />
        </label>
        <p className="mt-2 text-xs leading-relaxed text-mist">
          A grounding contract is always added after this prompt: temperature 0, citations, and the refusal line
          when the library does not cover the question.
        </p>
        <Threshold value={threshold} onChange={setThreshold} />
        <button
          type="submit"
          disabled={saving}
          className="mt-4 min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>

        <div className="mt-8 border-t border-line pt-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-xl">Library</h3>
            <button
              type="button"
              disabled={syncing}
              onClick={onSync}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brass-deep"
            >
              <RefreshCw className={cn("size-4", syncing && "booth-sweep")} />
              Re-sync
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {desk.sources.length === 0 ? <li className="text-sm text-mist">No links yet.</li> : null}
            {desk.sources.map((source) => (
              <li key={source.id} className="rounded-2xl border border-line p-3">
                <p className="text-sm break-all text-ink">{source.title || source.url}</p>
                <p className="mt-1 text-xs text-mist">
                  {source.kind} · {source.status}
                  {source.chunk_count ? ` · ${source.chunk_count} passages` : ""}
                </p>
                {source.detail ? <p className="mt-1 text-xs leading-relaxed text-mist">{source.detail}</p> : null}
                <button
                  type="button"
                  className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-brass-deep"
                  onClick={async () => {
                    try {
                      await removeSource({ data: { id: source.id } });
                      onChanged();
                    } catch (error) {
                      toast.error(messageOf(error));
                    }
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove link
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="YouTube or transcript URL"
              className="min-h-11 flex-1 rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
            />
            <button
              type="button"
              className="min-h-11 rounded-full bg-studio px-4 text-sm font-semibold text-studio-fg"
              onClick={async () => {
                try {
                  await addSource({ data: { botId: desk.bot.id, url } });
                  setUrl("");
                  onChanged();
                  toast.success("Link saved. Sync to index it.");
                } catch (error) {
                  toast.error(messageOf(error));
                }
              }}
            >
              Add
            </button>
          </div>
        </div>

        <div className="mt-8 border-t border-line pt-5">
          <h3 className="font-display text-xl">Paste a transcript</h3>
          <p className="mt-1 text-sm leading-relaxed text-mist">
            If YouTube blocks captions, paste the transcript here. Lines may start with a timestamp such as
            12:04 or (01:02:03). Plain text gets estimated timestamps.
          </p>
          <input
            value={pasteUrl}
            onChange={(event) => setPasteUrl(event.target.value)}
            placeholder="https://youtu.be/…"
            className="mt-3 min-h-11 w-full rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
          />
          <input
            value={pasteTitle}
            onChange={(event) => setPasteTitle(event.target.value)}
            placeholder="Episode title"
            className="mt-2 min-h-11 w-full rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
          />
          <textarea
            value={pasteBody}
            onChange={(event) => setPasteBody(event.target.value)}
            rows={6}
            placeholder="Paste the transcript"
            className="mt-2 w-full rounded-2xl border border-line px-3 py-3 text-base outline-none focus:border-brass"
          />
          <button
            type="button"
            className="mt-3 min-h-11 rounded-full border border-ink px-4 text-sm font-semibold"
            onClick={async () => {
              try {
                const result = await pasteTranscript({
                  data: {
                    botId: desk.bot.id,
                    videoUrl: pasteUrl,
                    title: pasteTitle,
                    transcript: pasteBody,
                  },
                });
                setPasteBody("");
                toast.success(`Pasted ${result.chunks} passages`);
                onChanged();
              } catch (error) {
                toast.error(messageOf(error));
              }
            }}
          >
            Index paste
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-line pt-5">
          <button
            type="button"
            className="min-h-11 text-sm text-mist"
            onClick={async () => {
              try {
                await clearChat({ data: { botId: desk.bot.id } });
                onChanged();
              } catch (error) {
                toast.error(messageOf(error));
              }
            }}
          >
            Clear chat
          </button>
          {confirmDelete ? (
            <button
              type="button"
              className="min-h-11 rounded-full bg-brass-deep px-4 text-sm font-semibold text-paper"
              onClick={async () => {
                try {
                  await deleteBot({ data: { id: desk.bot.id } });
                  toast.success("Desk removed");
                  onDeleted();
                } catch (error) {
                  toast.error(messageOf(error));
                }
              }}
            >
              Confirm delete
            </button>
          ) : (
            <button
              type="button"
              className="min-h-11 text-sm font-semibold text-brass-deep"
              onClick={() => setConfirmDelete(true)}
            >
              Delete this desk
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="mt-4 block text-sm font-medium">
      {label}
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3 text-base outline-none focus:border-brass"
      />
    </label>
  );
}

function Threshold({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <label className="mt-4 block text-sm font-medium">
      <span className="flex items-center justify-between">
        Similarity threshold
        <span className="tabular-nums text-brass-deep">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={0.35}
        max={0.9}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-brass"
      />
      <span className="mt-1 block text-xs font-normal text-mist">
        If the best passage scores below this, the desk answers: “This podcast hasn’t covered this topic yet.”
      </span>
    </label>
  );
}
