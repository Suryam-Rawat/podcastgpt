import { o as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, i as useQueryClient, n as useQuery, o as require_react, t as useMutation } from "../_libs/react+tanstack__react-query.mjs";
import { b as getRouteApi } from "../_libs/@tanstack/react-router+[...].mjs";
import { a as string, i as object, r as number, t as array } from "../_libs/zod.mjs";
import { a as Send, c as Menu, i as Settings, l as Library, o as RefreshCw, r as Trash2, s as Plus, t as X, u as ArrowUpRight } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { t as clsx } from "../_libs/clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-BrPcSkPJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function readInput(schema, input) {
	const parsed = schema.safeParse(input);
	if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Check that form and try again.");
	return parsed.data;
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
var listBots = createServerFn({ method: "GET" }).handler(createSsrRpc("17ed49ddc197083260b59942eb32b890712b8ac290c8eabf6d006b255e7d7451"));
var getDesk = createServerFn({ method: "GET" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(createSsrRpc("dd101ca7c2485ee01bd2ef862a979299253e13925b1931aa73b0a1b9aee15d45"));
var createSchema = object({
	name: string().trim().min(1).max(80),
	hostName: string().trim().min(1).max(80),
	systemPrompt: string().trim().min(1).max(4e3),
	threshold: number().min(.05).max(.95).optional(),
	urls: array(string()).max(12).optional()
});
var createBot = createServerFn({ method: "POST" }).validator((input) => readInput(createSchema, input)).handler(createSsrRpc("e6291160de7b5172f3c47ecd974feb4eaff463b0cee2a66c04c1b5d02d3704af"));
var updateSchema = object({
	id: string().min(1),
	name: string().trim().min(1).max(80),
	hostName: string().trim().min(1).max(80),
	systemPrompt: string().trim().min(1).max(4e3),
	threshold: number().min(.05).max(.95)
});
var updateBot = createServerFn({ method: "POST" }).validator((input) => readInput(updateSchema, input)).handler(createSsrRpc("09573bd431ddf3bad55b131d54837fe6e361ca3760ee19e7e4110300b1e7642b"));
var deleteBot = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.id) throw new Error("Missing bot.");
	return { id: String(input.id) };
}).handler(createSsrRpc("117aa6cf7e1485a07fb8405ddbe855f9d3e14c47612df17b9fc47b1e96f11d94"));
var addSource = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	const [url] = cleanUrls([input.url || ""]);
	if (!url) throw new Error("Add a YouTube or transcript URL.");
	return {
		botId: String(input.botId),
		url
	};
}).handler(createSsrRpc("05e11b7a12104bdf7d627af2230a0f337a1d0bbe050ba601e2f08461fdd264f5"));
var removeSource = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.id) throw new Error("Missing source.");
	return { id: String(input.id) };
}).handler(createSsrRpc("88b4ed6fe22df935a5cb4d9cdfadc7b07c7a857a8dcd4996302f75dc9fb6ffb4"));
var clearChat = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(createSsrRpc("b98f9f76478d9f6d4588ab2a5801200711a277f01ef38378531fae04bd94d927"));
var pasteSchema = object({
	botId: string().min(1),
	videoUrl: string().trim().min(1).max(500),
	title: string().trim().max(180).optional(),
	transcript: string().trim().min(40).max(2e5)
});
var pasteTranscript = createServerFn({ method: "POST" }).validator((input) => readInput(pasteSchema, input)).handler(createSsrRpc("cac8a1cd0f8ef7509ccea2a7537ffd0cf8bafb9b06f6a7fee623e2677b0d9a58"));
var syncBot = createServerFn({ method: "POST" }).validator((input) => {
	if (!input?.botId) throw new Error("Missing bot.");
	return { botId: String(input.botId) };
}).handler(createSsrRpc("146f62ac43dfc601a85d40927fe2e4040f6e2af647d8f158c32a6a45f666ce73"));
var askBot = createServerFn({ method: "POST" }).validator((input) => {
	const question = String(input?.question || "").trim();
	if (!input?.botId) throw new Error("Missing bot.");
	if (question.length < 2) throw new Error("Ask a question first.");
	if (question.length > 2e3) throw new Error("That question is too long.");
	return {
		botId: String(input.botId),
		question
	};
}).handler(createSsrRpc("9e076d0fd0164bee56046dc6ff9a84e17bb82a2a725ca78a025443578d93bff5"));
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
var routeApi = getRouteApi("/");
var STARTERS = [
	{
		host: "David Senra",
		name: "Founders desk",
		urls: "https://www.youtube.com/@DavidSenra",
		blurb: "Biographies, obsession, and how operators actually worked.",
		asks: [
			"What does he take from the latest founder he read?",
			"How does he talk about reading and obsession?",
			"What does this show say about quantum computing?"
		],
		prompt: "You are the research desk for David Senra of Founders. He reads biographies and keeps only what an operator can use: obsession, simplicity, and the long grind. Answer in that register — short, forceful, specific."
	},
	{
		host: "Lex Fridman",
		name: "Lex desk",
		urls: "https://www.youtube.com/watch?v=s7d2d8FhevU",
		blurb: "Long conversations. This desk starts on the psychiatry episode.",
		asks: [
			"What is said about the ice pick lobotomy?",
			"How does the guest describe Freud and psychoanalysis?",
			"What does this episode say about the stock market?"
		],
		prompt: "You are the research desk for the Lex Fridman Podcast. Lex speaks carefully with scientists, builders, and historians. Answer with that calm precision. Name the speaker when the excerpt does."
	},
	{
		host: "Nikhil Kamath",
		name: "Nikhil desk",
		urls: "https://www.youtube.com/@nikhilkamathcio",
		blurb: "Plain questions about capital, companies, and building in India.",
		asks: [
			"What does he ask operators about building a company?",
			"How does he talk about money and risk?",
			"What does this show say about ancient Rome?"
		],
		prompt: "You are the research desk for Nikhil Kamath. He asks operators plain questions about building businesses, capital, and India. Be direct and commercial."
	},
	{
		host: "Raj Shamani",
		name: "Raj desk",
		urls: "https://www.youtube.com/@RajShamani",
		blurb: "Figuring Out — careers, companies, and how money actually moves.",
		asks: [
			"What does the latest guest say about building a business?",
			"How does Raj push on money and careers?",
			"What does this podcast say about particle physics?"
		],
		prompt: "You are the research desk for Raj Shamani of Figuring Out. He presses guests on how money, careers, and companies actually work. Be concrete."
	}
];
function defaultPrompt(host) {
	return `You are the research desk for ${host}. Answer in a concrete voice. Never go past the excerpts.`;
}
function monogram(host) {
	const parts = host.trim().split(/\s+/).filter(Boolean);
	return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}
function formatStamp(sec) {
	const safe = Math.max(0, Math.floor(sec));
	const h = Math.floor(safe / 3600);
	const m = Math.floor(safe % 3600 / 60);
	const s = safe % 60;
	const pad = (n) => String(n).padStart(2, "0");
	return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
function messageOf(error) {
	if (error instanceof Error && error.message) return error.message.replace(/^Error:\s*/, "");
	return "Something went wrong.";
}
function Studio() {
	const search = routeApi.useSearch();
	const navigate = routeApi.useNavigate();
	const queryClient = useQueryClient();
	const [rail, setRail] = (0, import_react.useState)(false);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [asking, setAsking] = (0, import_react.useState)(false);
	const botsQuery = useQuery({
		queryKey: ["bots"],
		queryFn: () => listBots()
	});
	const bots = botsQuery.data ?? [];
	const activeId = search.bot && bots.some((bot) => bot.id === search.bot) ? search.bot : void 0;
	const desk = useQuery({
		queryKey: ["desk", activeId],
		queryFn: () => getDesk({ data: { botId: activeId } }),
		enabled: Boolean(activeId)
	}).data ?? null;
	const refresh = async (botId) => {
		await queryClient.invalidateQueries({ queryKey: ["bots"] });
		if (botId) await queryClient.invalidateQueries({ queryKey: ["desk", botId] });
	};
	const select = (botId, settings = false) => {
		setRail(false);
		navigate({ search: {
			bot: botId,
			settings: settings || void 0
		} });
	};
	const sync = useMutation({
		mutationFn: (botId) => syncBot({ data: { botId } }),
		onSuccess: async (result, botId) => {
			await refresh(botId);
			if (result.errors.length && !result.tapes) toast.error(result.errors[0]);
			else if (result.errors.length) toast.message(`Indexed with gaps. ${result.errors[0]}`);
			else toast.success(`Library updated · ${result.chunks} passages`);
		},
		onError: (error) => toast.error(messageOf(error))
	});
	const openStarter = async (starter) => {
		try {
			const created = await createBot({ data: {
				name: starter.name,
				hostName: starter.host,
				systemPrompt: starter.prompt,
				threshold: .72,
				urls: starter.urls.split("\n")
			} });
			await refresh(created.id);
			select(created.id);
			sync.mutate(created.id);
		} catch (error) {
			toast.error(messageOf(error));
		}
	};
	const send = async (text) => {
		if (!activeId || asking) return;
		const question = text.trim();
		if (!question) return;
		setDraft("");
		setAsking(true);
		try {
			await askBot({ data: {
				botId: activeId,
				question
			} });
			await queryClient.invalidateQueries({ queryKey: ["desk", activeId] });
		} catch (error) {
			toast.error(messageOf(error));
			setDraft(question);
		} finally {
			setAsking(false);
		}
	};
	const asks = (0, import_react.useMemo)(() => {
		const host = desk?.bot.host_name ?? "";
		return STARTERS.find((starter) => starter.host === host)?.asks ?? [
			"What does this host actually say about their work?",
			"Which story do they keep coming back to?",
			"What does this podcast say about medieval farming?"
		];
	}, [desk?.bot.host_name]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex h-dvh overflow-hidden bg-studio text-studio-fg",
		children: [
			rail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				"aria-label": "Close desk list",
				className: "fixed inset-0 z-30 bg-ink/50 md:hidden",
				onClick: () => setRail(false)
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: cn("fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-line-dark bg-studio sm:w-80 md:static md:translate-x-0", rail ? "translate-x-0" : "-translate-x-full md:translate-x-0"),
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center justify-between px-5 pt-5 pb-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "font-display text-3xl leading-none tracking-tight text-studio-fg",
							children: "Booth"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-sm text-mist",
							children: "One host. Only what they said."
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "grid size-11 place-items-center rounded-full text-mist md:hidden",
							onClick: () => setRail(false),
							"aria-label": "Close",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "px-4",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: () => {
								setRail(false);
								setCreating(true);
							},
							className: "flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brass px-4 text-sm font-semibold text-studio",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Create new bot"]
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "desk-scroll mt-4 flex-1 overflow-y-auto px-3 pb-6",
						children: botsQuery.isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-2 py-4 text-sm text-mist",
							children: "Opening the studio…"
						}) : bots.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "px-2 py-4 text-sm leading-relaxed text-mist",
							children: "No desks yet. Start from a host, or build an empty one and add links yourself."
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "flex flex-col gap-1",
							children: bots.map((bot) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => select(bot.id),
								className: cn("flex min-h-11 w-full items-center gap-3 rounded-2xl px-2 py-2 text-left", bot.id === activeId ? "bg-studio-2" : "hover:bg-studio-2"),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { host: bot.host_name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "block truncate font-medium text-studio-fg",
										children: bot.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "block truncate text-sm text-mist",
										children: [bot.host_name, bot.chunk_count ? ` · ${bot.chunk_count} passages` : " · empty"]
									})]
								})]
							}) }, bot.id))
						})
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex min-w-0 flex-1 flex-col bg-paper text-ink",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
					className: "flex min-h-16 items-center gap-3 border-b border-line px-3 md:px-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "grid size-11 place-items-center rounded-full text-ink md:hidden",
						onClick: () => setRail(true),
						"aria-label": "Open desks",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "size-5" })
					}), desk ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "truncate font-display text-xl text-ink md:text-2xl",
							children: desk.bot.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "truncate text-sm text-mist",
							children: [
								desk.bot.host_name,
								" · ",
								desk.bot.namespace,
								" · threshold ",
								Number(desk.bot.threshold).toFixed(2)
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => select(desk.bot.id, true),
						className: "grid size-11 place-items-center rounded-full text-ink",
						"aria-label": "Desk settings",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "size-5" })
					})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-display text-xl text-ink",
						children: "The studio"
					})]
				}), !activeId ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lobby, {
					bots,
					busy: sync.isPending,
					onStarter: (starter) => void openStarter(starter),
					onOpen: (id) => select(id),
					onCreate: () => setCreating(true)
				}) : desk ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chat, {
					desk,
					asks,
					draft,
					setDraft,
					asking,
					syncing: sync.isPending,
					onSend: (text) => void send(text),
					onSync: () => sync.mutate(desk.bot.id)
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid flex-1 place-items-center text-sm text-mist",
					children: "Loading this desk…"
				})]
			}),
			creating ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CreateDialog, {
				onClose: () => setCreating(false),
				onCreated: async (id) => {
					setCreating(false);
					await refresh(id);
					select(id, true);
				}
			}) : null,
			search.settings && desk ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SettingsSheet, {
				desk,
				syncing: sync.isPending,
				onClose: () => select(desk.bot.id),
				onSync: () => sync.mutate(desk.bot.id),
				onChanged: () => void refresh(desk.bot.id),
				onDeleted: async () => {
					await refresh();
					select(void 0);
				}
			}) : null
		]
	});
}
function Mark({ host }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "grid size-11 shrink-0 place-items-center rounded-full border border-brass font-display text-sm text-brass",
		children: monogram(host)
	});
}
function Lobby({ bots, busy, onStarter, onOpen, onCreate }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "desk-scroll flex-1 overflow-y-auto px-4 py-8 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-3xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-medium tracking-wide text-brass-deep uppercase",
					children: "Private desks"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-4xl text-ink md:text-5xl",
					children: "Ask the host. Never the whole internet."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-4 max-w-xl text-base leading-relaxed text-mist",
					children: "Each bot keeps its own library. A question is answered only from that creator’s transcripts, and if the closest passage misses the bar, the desk refuses."
				}),
				bots.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 grid gap-3 sm:grid-cols-2",
					children: bots.map((bot) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => onOpen(bot.id),
						className: "flex min-h-11 items-center gap-3 rounded-2xl border border-line bg-paper px-3 py-3 text-left",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { host: bot.host_name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "block font-medium",
							children: bot.name
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "text-sm text-mist",
							children: [bot.chunk_count, " passages in the library"]
						})] })]
					}, bot.id))
				}) : null,
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 grid gap-3 sm:grid-cols-2",
					children: STARTERS.map((starter) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						disabled: busy,
						onClick: () => onStarter(starter),
						className: "rounded-2xl border border-line bg-paper p-4 text-left disabled:opacity-60",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "flex items-center gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mark, { host: starter.host }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block font-display text-xl text-ink",
								children: starter.host
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-sm text-mist",
								children: starter.name
							})] })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "mt-3 block text-sm leading-relaxed text-ink",
							children: starter.blurb
						})]
					}, starter.host))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: onCreate,
					className: "mt-6 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brass-deep",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "size-4" }), "Or create an empty desk"]
				})
			]
		})
	});
}
function Chat({ desk, asks, draft, setDraft, asking, syncing, onSend, onSync }) {
	(0, import_react.useEffect)(() => {
		const node = document.getElementById("desk-thread");
		if (node) node.scrollTop = node.scrollHeight;
	}, [desk.messages.length, asking]);
	const empty = desk.bot.chunk_count === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		id: "desk-thread",
		className: "desk-scroll flex-1 overflow-y-auto px-4 py-6 md:px-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-2xl flex-col gap-6",
			children: [
				syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sweep, { label: "Pulling transcripts into this namespace…" }) : null,
				empty && !syncing ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-line bg-paper-2 p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Library, { className: "size-5 text-brass-deep" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "mt-3 font-display text-2xl text-ink",
							children: "This desk is still quiet."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-sm leading-relaxed text-mist",
							children: [
								"Sync the saved links, or paste a transcript in settings. Until passages land in",
								" ",
								desk.bot.namespace,
								", the desk will not guess."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							type: "button",
							onClick: onSync,
							className: "mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-paper",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "size-4" }), "Sync transcripts"]
						})
					]
				}) : null,
				desk.messages.length === 0 && !empty ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-mist",
					children: "Try a question the library can actually hold."
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-3 flex flex-col gap-2",
					children: asks.map((ask) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => onSend(ask),
						className: "min-h-11 rounded-2xl border border-line px-4 py-3 text-left text-sm text-ink",
						children: ask
					}, ask))
				})] }) : null,
				desk.messages.map((message) => message.role === "user" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "ml-auto max-w-[85%] rounded-2xl bg-paper-2 px-4 py-3 text-ink",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "whitespace-pre-wrap text-sm leading-relaxed",
						children: message.content
					})
				}, message.id) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "max-w-2xl",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium tracking-wide text-brass-deep uppercase",
							children: message.refused ? "Outside the library" : desk.bot.host_name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 whitespace-pre-wrap text-base leading-relaxed text-ink",
							children: message.content
						}),
						message.score != null ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 text-xs text-mist tabular-nums",
							children: [
								"Closest passage ",
								Number(message.score).toFixed(2),
								" · threshold",
								" ",
								Number(desk.bot.threshold).toFixed(2)
							]
						}) : null,
						message.citations?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 flex flex-col gap-2",
							children: message.citations.map((citation) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href: citation.url,
								target: "_blank",
								rel: "noopener noreferrer",
								className: "flex min-h-11 items-start gap-3 rounded-2xl border border-line px-3 py-2 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "font-medium text-brass-deep tabular-nums",
										children: [
											"[",
											citation.index,
											"] ",
											formatStamp(citation.startSec)
										]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "block truncate text-ink",
											children: citation.title
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "line-clamp-2 text-mist",
											children: citation.quote
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "mt-0.5 size-4 shrink-0 text-mist" })
								]
							}) }, `${message.id}-${citation.index}`))
						}) : null
					]
				}, message.id)),
				asking ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sweep, { label: "Reading only this host…" }) : null
			]
		})
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
		className: "border-t border-line px-3 py-3 md:px-10",
		onSubmit: (event) => {
			event.preventDefault();
			onSend(draft);
		},
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-2xl items-end gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "sr-only",
					htmlFor: "ask",
					children: ["Ask ", desk.bot.host_name]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					id: "ask",
					rows: 1,
					value: draft,
					disabled: asking,
					placeholder: empty ? "Sync a library before asking" : `Ask ${desk.bot.host_name}`,
					onChange: (event) => setDraft(event.target.value),
					onKeyDown: (event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							onSend(draft);
						}
					},
					className: "max-h-36 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-paper px-4 py-3 text-base text-ink outline-none focus:border-brass"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: asking || !draft.trim(),
					className: "grid size-11 shrink-0 place-items-center rounded-full bg-ink text-paper disabled:opacity-40",
					"aria-label": "Send",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "size-4" })
				})
			]
		})
	})] });
}
function Sweep({ label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm text-mist",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-2 h-1 overflow-hidden rounded-full bg-paper-2",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "booth-sweep h-full w-1/3 rounded-full bg-brass" })
	})] });
}
function CreateDialog({ onClose, onCreated }) {
	const [name, setName] = (0, import_react.useState)("");
	const [host, setHost] = (0, import_react.useState)("");
	const [prompt, setPrompt] = (0, import_react.useState)("");
	const [threshold, setThreshold] = (0, import_react.useState)(.72);
	const [urls, setUrls] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const onKey = (event) => {
			if (event.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			role: "dialog",
			"aria-modal": "true",
			"aria-labelledby": "create-title",
			className: "desk-scroll max-h-dvh w-full overflow-y-auto rounded-t-2xl bg-paper p-5 text-ink sm:max-w-lg sm:rounded-2xl",
			onSubmit: async (event) => {
				event.preventDefault();
				setPending(true);
				try {
					const created = await createBot({ data: {
						name: name.trim(),
						hostName: host.trim(),
						systemPrompt: (prompt || defaultPrompt(host)).trim(),
						threshold,
						urls: urls.split("\n")
					} });
					toast.success(`Desk opened · ${created.namespace}`);
					onCreated(created.id);
				} catch (error) {
					toast.error(messageOf(error));
					setPending(false);
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						id: "create-title",
						className: "font-display text-3xl",
						children: "Create new bot"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-mist",
						children: "Its library never mixes with another host."
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "grid size-11 place-items-center",
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Bot name",
					value: name,
					onChange: setName,
					placeholder: "Founders desk"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Host / creator name",
					value: host,
					onChange: setHost,
					placeholder: "David Senra"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 block text-sm font-medium",
					children: ["Custom system prompt", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						onChange: (event) => setPrompt(event.target.value),
						placeholder: host ? defaultPrompt(host) : "How this desk should sound",
						rows: 4,
						className: "mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Threshold, {
					value: threshold,
					onChange: setThreshold
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 block text-sm font-medium",
					children: ["YouTube channel or video URLs", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: urls,
						onChange: (event) => setUrls(event.target.value),
						placeholder: "One link per line\nhttps://www.youtube.com/watch?v=…",
						rows: 4,
						className: "mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: pending || !name.trim() || !host.trim(),
					className: "mt-5 flex min-h-11 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper disabled:opacity-40",
					children: pending ? "Opening…" : "Save desk"
				})
			]
		})
	});
}
function SettingsSheet({ desk, syncing, onClose, onSync, onChanged, onDeleted }) {
	const [name, setName] = (0, import_react.useState)(desk.bot.name);
	const [host, setHost] = (0, import_react.useState)(desk.bot.host_name);
	const [prompt, setPrompt] = (0, import_react.useState)(desk.bot.system_prompt);
	const [threshold, setThreshold] = (0, import_react.useState)(() => Math.round(Number(desk.bot.threshold) * 100) / 100);
	const [url, setUrl] = (0, import_react.useState)("");
	const [pasteUrl, setPasteUrl] = (0, import_react.useState)("");
	const [pasteTitle, setPasteTitle] = (0, import_react.useState)("");
	const [pasteBody, setPasteBody] = (0, import_react.useState)("");
	const [confirmDelete, setConfirmDelete] = (0, import_react.useState)(false);
	const [saving, setSaving] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setName(desk.bot.name);
		setHost(desk.bot.host_name);
		setPrompt(desk.bot.system_prompt);
		setThreshold(Math.round(Number(desk.bot.threshold) * 100) / 100);
	}, [
		desk.bot.id,
		desk.bot.name,
		desk.bot.host_name,
		desk.bot.system_prompt,
		desk.bot.threshold
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "fixed inset-0 z-50 flex justify-end bg-ink/40",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
			type: "button",
			"aria-label": "Close settings",
			className: "hidden flex-1 sm:block",
			onClick: onClose
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			className: "desk-scroll h-full w-full overflow-y-auto bg-paper p-5 text-ink sm:max-w-md",
			onSubmit: async (event) => {
				event.preventDefault();
				setSaving(true);
				try {
					await updateBot({ data: {
						id: desk.bot.id,
						name: name.trim(),
						hostName: host.trim(),
						systemPrompt: prompt.trim(),
						threshold
					} });
					toast.success("Desk saved");
					onChanged();
				} catch (error) {
					toast.error(messageOf(error));
				} finally {
					setSaving(false);
				}
			},
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-start justify-between",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "font-display text-3xl",
						children: "Settings"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "mt-1 text-sm text-mist",
						children: ["Namespace ", desk.bot.namespace]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "grid size-11 place-items-center",
						"aria-label": "Close",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Bot name",
					value: name,
					onChange: setName
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Host / creator name",
					value: host,
					onChange: setHost
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
					className: "mt-4 block text-sm font-medium",
					children: ["Custom system prompt", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
						value: prompt,
						onChange: (event) => setPrompt(event.target.value),
						rows: 5,
						className: "mt-1 w-full rounded-2xl border border-line bg-paper px-3 py-3 text-base outline-none focus:border-brass"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-xs leading-relaxed text-mist",
					children: "A grounding contract is always added after this prompt: temperature 0, citations, and the refusal line when the library does not cover the question."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Threshold, {
					value: threshold,
					onChange: setThreshold
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: saving,
					className: "mt-4 min-h-11 rounded-full bg-ink px-5 text-sm font-semibold text-paper",
					children: saving ? "Saving…" : "Save changes"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 border-t border-line pt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between gap-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-display text-xl",
								children: "Library"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								disabled: syncing,
								onClick: onSync,
								className: "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brass-deep",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: cn("size-4", syncing && "booth-sweep") }), "Re-sync"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-3 flex flex-col gap-2",
							children: [desk.sources.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
								className: "text-sm text-mist",
								children: "No links yet."
							}) : null, desk.sources.map((source) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
								className: "rounded-2xl border border-line p-3",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm break-all text-ink",
										children: source.title || source.url
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "mt-1 text-xs text-mist",
										children: [
											source.kind,
											" · ",
											source.status,
											source.chunk_count ? ` · ${source.chunk_count} passages` : ""
										]
									}),
									source.detail ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "mt-1 text-xs leading-relaxed text-mist",
										children: source.detail
									}) : null,
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										type: "button",
										className: "mt-2 inline-flex min-h-11 items-center gap-2 text-sm text-brass-deep",
										onClick: async () => {
											try {
												await removeSource({ data: { id: source.id } });
												onChanged();
											} catch (error) {
												toast.error(messageOf(error));
											}
										},
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "size-4" }), "Remove link"]
									})
								]
							}, source.id))]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-3 flex gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: url,
								onChange: (event) => setUrl(event.target.value),
								placeholder: "YouTube or transcript URL",
								className: "min-h-11 flex-1 rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								type: "button",
								className: "min-h-11 rounded-full bg-studio px-4 text-sm font-semibold text-studio-fg",
								onClick: async () => {
									try {
										await addSource({ data: {
											botId: desk.bot.id,
											url
										} });
										setUrl("");
										onChanged();
										toast.success("Link saved. Sync to index it.");
									} catch (error) {
										toast.error(messageOf(error));
									}
								},
								children: "Add"
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 border-t border-line pt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-display text-xl",
							children: "Paste a transcript"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm leading-relaxed text-mist",
							children: "If YouTube blocks captions, paste the transcript here. Lines may start with a timestamp such as 12:04 or (01:02:03). Plain text gets estimated timestamps."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: pasteUrl,
							onChange: (event) => setPasteUrl(event.target.value),
							placeholder: "https://youtu.be/…",
							className: "mt-3 min-h-11 w-full rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							value: pasteTitle,
							onChange: (event) => setPasteTitle(event.target.value),
							placeholder: "Episode title",
							className: "mt-2 min-h-11 w-full rounded-2xl border border-line px-3 text-base outline-none focus:border-brass"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: pasteBody,
							onChange: (event) => setPasteBody(event.target.value),
							rows: 6,
							placeholder: "Paste the transcript",
							className: "mt-2 w-full rounded-2xl border border-line px-3 py-3 text-base outline-none focus:border-brass"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							type: "button",
							className: "mt-3 min-h-11 rounded-full border border-ink px-4 text-sm font-semibold",
							onClick: async () => {
								try {
									const result = await pasteTranscript({ data: {
										botId: desk.bot.id,
										videoUrl: pasteUrl,
										title: pasteTitle,
										transcript: pasteBody
									} });
									setPasteBody("");
									toast.success(`Pasted ${result.chunks} passages`);
									onChanged();
								} catch (error) {
									toast.error(messageOf(error));
								}
							},
							children: "Index paste"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-8 flex flex-wrap gap-3 border-t border-line pt-5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 text-sm text-mist",
						onClick: async () => {
							try {
								await clearChat({ data: { botId: desk.bot.id } });
								onChanged();
							} catch (error) {
								toast.error(messageOf(error));
							}
						},
						children: "Clear chat"
					}), confirmDelete ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 rounded-full bg-brass-deep px-4 text-sm font-semibold text-paper",
						onClick: async () => {
							try {
								await deleteBot({ data: { id: desk.bot.id } });
								toast.success("Desk removed");
								onDeleted();
							} catch (error) {
								toast.error(messageOf(error));
							}
						},
						children: "Confirm delete"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						className: "min-h-11 text-sm font-semibold text-brass-deep",
						onClick: () => setConfirmDelete(true),
						children: "Delete this desk"
					})]
				})
			]
		})]
	});
}
function Field({ label, value, onChange, placeholder }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "mt-4 block text-sm font-medium",
		children: [label, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			value,
			placeholder,
			onChange: (event) => onChange(event.target.value),
			className: "mt-1 min-h-11 w-full rounded-2xl border border-line bg-paper px-3 text-base outline-none focus:border-brass"
		})]
	});
}
function Threshold({ value, onChange }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
		className: "mt-4 block text-sm font-medium",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: "flex items-center justify-between",
				children: ["Similarity threshold", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "tabular-nums text-brass-deep",
					children: value.toFixed(2)
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				type: "range",
				min: .35,
				max: .9,
				step: .01,
				value,
				onChange: (event) => onChange(Number(event.target.value)),
				className: "mt-3 w-full accent-brass"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: "mt-1 block text-xs font-normal text-mist",
				children: "If the best passage scores below this, the desk answers: “This podcast hasn’t covered this topic yet.”"
			})
		]
	});
}
var SplitComponent = Studio;
//#endregion
export { SplitComponent as component };
