/**
 * The cryptography behind unlock codes, on WebCrypto (`crypto.subtle`), which
 * browsers and Node 20 and later both have.
 *
 * A code is never stored and never shipped. From a code, PBKDF2-SHA256 makes
 * a 32-byte proof, slowly on purpose. Two keys come from the proof through
 * HKDF-SHA256 with different labels: one is the unlock's public `hash`, and
 * the other is the AES-GCM key its locked content is encrypted with. Knowing
 * the hash gives neither the proof nor the key, so the hash can ship in the
 * game. The proof is what the player's profile keeps once a code has worked.
 */

/** What this file needs of WebCrypto's `SubtleCrypto`, typed here because the packages build without the DOM's types. */
type Subtle = {
  importKey(format: 'raw', data: Uint8Array, algorithm: unknown, extractable: boolean, uses: string[]): Promise<unknown>
  deriveBits(algorithm: unknown, key: unknown, length: number): Promise<ArrayBuffer>
  encrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
  decrypt(algorithm: unknown, key: unknown, data: Uint8Array): Promise<ArrayBuffer>
}

type Crypto = { subtle?: Subtle; getRandomValues<T extends Uint8Array>(array: T): T }

function webCrypto(): Crypto & { subtle: Subtle } {
  const found = (globalThis as { crypto?: Crypto }).crypto
  if (!found?.subtle) throw new Error('Unlock codes need WebCrypto (crypto.subtle): a browser on https or a file, or Node 20 or later.')
  return found as Crypto & { subtle: Subtle }
}

/** PBKDF2's rounds when an unlock doesn't say: slow enough that guessing codes one by one takes a long time. */
export const ITERATIONS = 600_000

/** UTF-8 bytes of a string, without the DOM's `TextEncoder`. */
export function utf8(text: string): Uint8Array {
  const out: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0)!
    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 63))
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63))
  }
  return new Uint8Array(out)
}

/** A string from UTF-8 bytes. */
export function fromUtf8(bytes: Uint8Array): string {
  let out = ''
  for (let at = 0; at < bytes.length; ) {
    const first = bytes[at]
    const extra = first >= 0xf0 ? 3 : first >= 0xe0 ? 2 : first >= 0xc0 ? 1 : 0
    let code = extra === 0 ? first : first & (0x3f >> extra)
    for (let i = 1; i <= extra; i++) code = (code << 6) | (bytes[at + i] & 63)
    out += String.fromCodePoint(code)
    at += extra + 1
  }
  return out
}

export function toHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/[0-9a-f]{2}/gi) ?? []
  return new Uint8Array(pairs.map((pair) => parseInt(pair, 16)))
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function toBase64(bytes: Uint8Array): string {
  let out = ''
  for (let at = 0; at < bytes.length; at += 3) {
    const [a, b = 0, c = 0] = [bytes[at], bytes[at + 1], bytes[at + 2]]
    const n = (a << 16) | (b << 8) | c
    out += ALPHABET[(n >> 18) & 63] + ALPHABET[(n >> 12) & 63]
    out += at + 1 < bytes.length ? ALPHABET[(n >> 6) & 63] : '='
    out += at + 2 < bytes.length ? ALPHABET[n & 63] : '='
  }
  return out
}

/** Bytes from base64; undefined if it isn't base64. */
export function fromBase64(text: string): Uint8Array | undefined {
  const clean = text.replace(/=+$/, '')
  if (/[^A-Za-z0-9+/]/.test(clean) || clean.length % 4 === 1) return undefined
  const out: number[] = []
  let buffer = 0
  let bits = 0
  for (const char of clean) {
    buffer = (buffer << 6) | ALPHABET.indexOf(char)
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out.push((buffer >> bits) & 255)
    }
  }
  return new Uint8Array(out)
}

/**
 * A code as it is checked: Unicode-normalised, with spaces and hyphens taken
 * out, in capitals. So `bread-2026`, `BREAD 2026` and `Bread2026` are one code.
 */
export function normaliseCode(code: string): string {
  return code.normalize('NFKC').replace(/[\s\-‐-―]+/g, '').toUpperCase()
}

/** What a code is salted with: the game, the unlock and the unlock's own `salt`, so one code hashes differently in each. */
export function saltOf(game: string, unlock: string, salt?: string): string {
  return `ifloom-unlock:${game}:${unlock}${salt ? `:${salt}` : ''}`
}

/** The 32-byte proof a code makes for one unlock: the slow step. */
export async function proofOf(code: string, salt: string, iterations: number): Promise<Uint8Array> {
  const { subtle } = webCrypto()
  const key = await subtle.importKey('raw', utf8(normaliseCode(code)), 'PBKDF2', false, ['deriveBits'])
  return new Uint8Array(await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: utf8(salt), iterations }, key, 256))
}

async function expand(proof: Uint8Array, label: string): Promise<Uint8Array> {
  const { subtle } = webCrypto()
  const key = await subtle.importKey('raw', proof, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: utf8(label) }, key, 256))
}

/** The public hash of a proof, in hex: what an unlock's `hash` holds. */
export async function hashOfProof(proof: Uint8Array): Promise<string> {
  return toHex(await expand(proof, 'ifloom-unlock-hash'))
}

async function contentKey(proof: Uint8Array, use: 'encrypt' | 'decrypt'): Promise<unknown> {
  const { subtle } = webCrypto()
  return subtle.importKey('raw', await expand(proof, 'ifloom-unlock-content'), 'AES-GCM', false, [use])
}

/** Encrypt text under a proof's content key with AES-GCM, binding `bound` (the game and unlock) to it. */
export async function seal(proof: Uint8Array, text: string, bound: string): Promise<{ iv: string; data: string }> {
  const crypto = webCrypto()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: utf8(bound) }, await contentKey(proof, 'encrypt'), utf8(text))
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) }
}

/** Decrypt what `seal` made; undefined if the proof is wrong or the data was changed. */
export async function unseal(proof: Uint8Array, sealed: { iv: string; data: string }, bound: string): Promise<string | undefined> {
  const iv = fromBase64(sealed.iv)
  const data = fromBase64(sealed.data)
  if (!iv || !data || iv.length !== 12) return undefined
  try {
    const { subtle } = webCrypto()
    return fromUtf8(new Uint8Array(await subtle.decrypt({ name: 'AES-GCM', iv, additionalData: utf8(bound) }, await contentKey(proof, 'decrypt'), data)))
  } catch {
    return undefined
  }
}
