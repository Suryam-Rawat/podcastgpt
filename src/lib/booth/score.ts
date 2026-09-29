const STOP = new Set(
  `a an the of to and or in on for with from by at as is are was were be been being it this that those these i you he she they we me my your his her their our what how why when who whom which did do does about into over just not but if so than then there here also very really say said says saying think thinks thought tell told talk talks talking podcast episode host guest please can could would should something anything everything`.split(
    " ",
  ),
);

const SYN: Record<string, string> = {
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
  investment: "investor",
};

const DIM = 192;

function stem(word: string): string {
  if (word.length > 5 && word.endsWith("ing")) return word.slice(0, -3);
  if (word.length > 4 && word.endsWith("ed")) return word.slice(0, -2);
  if (word.length > 4 && word.endsWith("es")) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

export function tokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP.has(word))
    .map((word) => {
      const stemmed = stem(word);
      return SYN[stemmed] || SYN[word] || stemmed;
    });
}

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** L2-normalized feature-hash embedding. Stored per chunk; namespace is bot_id. */
export function embed(text: string): number[] {
  const vec = new Float64Array(DIM);
  const counts = new Map<string, number>();
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
  return Array.from(vec, (value) => Math.round((value / norm) * 10000) / 10000);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += a[i] * b[i];
  return sum;
}

export type Ranked<T> = { item: T; score: number };

/**
 * Grounded similarity in [0, 1]: the IDF-weighted share of the question's
 * content terms that appear in a passage. 0.72 means most of the question
 * is actually in the best passage. Vector cosine only breaks ties.
 */
export function rankBySimilarity<T extends { text: string; embedding: number[] }>(
  query: string,
  items: T[],
): Ranked<T>[] {
  const queryTokens = [...new Set(tokens(query))];
  if (!queryTokens.length || !items.length) return [];
  const sets = items.map((item) => new Set(tokens(item.text)));
  const df = new Map<string, number>();
  for (const set of sets) {
    for (const term of set) df.set(term, (df.get(term) || 0) + 1);
  }
  const n = items.length;
  const weight = (term: string) => Math.max(0.35, Math.log((n + 1) / ((df.get(term) || 0) + 0.5)));
  const queryVec = embed(query);
  const ranked = items.map((item, index) => {
    let matched = 0;
    let total = 0;
    for (const term of queryTokens) {
      const w = weight(term);
      total += w;
      if (sets[index].has(term)) matched += w;
    }
    const coverage = total ? matched / total : 0;
    const tie = Math.max(0, cosine(queryVec, item.embedding));
    return { item, score: coverage, tie };
  });
  ranked.sort((a, b) => b.score - a.score || b.tie - a.tie);
  return ranked.map(({ item, score }) => ({ item, score }));
}
