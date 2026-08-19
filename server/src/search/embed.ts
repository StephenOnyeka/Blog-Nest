/**
 * search/embed.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Deterministic, dependency-free text embeddings used to power Orama's vector &
 * hybrid search. Uses a signed hashing trick over tokenized text, so two
 * documents sharing words land near each other in the vector space while still
 * producing stable embeddings (no external model / API needed).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export const EMBEDDING_DIM = 384;

/** cyrb53 — fast, well-distributed 53-bit string hash */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Strip HTML, then split into lowercase alphanumeric tokens */
function tokenize(text: string): string[] {
  const cleaned = (text ?? '')
    .toLowerCase()
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ');
  return cleaned.split(/[^a-z0-9]+/).filter((t) => t.length > 0);
}

/** Embed an arbitrary text blob into an L2-normalized vector of EMBEDDING_DIM */
export function embedText(text: string): number[] {
  const vec = new Float64Array(EMBEDDING_DIM);
  for (const token of tokenize(text)) {
    const h = cyrb53(token);
    const idx = h % EMBEDDING_DIM;
    const sign = ((h >> 31) & 1) === 1 ? 1 : -1;
    vec[idx] += sign;
  }

  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm === 0) return new Array<number>(EMBEDDING_DIM).fill(0);
  return Array.from(vec, (v) => v / norm);
}

/** Embed a whole article (title + subtitle + body + tags) for the index */
export function embedDocument(
  title: string,
  subtitle: string,
  body: string,
  tags: string[],
): number[] {
  return embedText([title, subtitle, body, (tags ?? []).join(' ')].join(' '));
}
