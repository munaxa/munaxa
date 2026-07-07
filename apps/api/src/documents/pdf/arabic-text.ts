import bidiFactory from 'bidi-js';

/**
 * Arabic text preprocessing for PDFKit (Part 3 follow-up).
 *
 * PDFKit embeds fonts but performs **no complex-script processing**: it draws code points in logical
 * order, one glyph per code point, left-to-right. That is fine for Latin but produces unreadable
 * Arabic, which requires two transformations that a browser/HarfBuzz would normally do:
 *
 *   1. **Glyph shaping** — Arabic letters change shape depending on their neighbours (isolated,
 *      initial, medial, final) and some pairs form mandatory ligatures (lam-alef). Unicode encodes
 *      every contextual glyph in the *Arabic Presentation Forms* blocks, so we can map each letter to
 *      the correct presentation form up-front.
 *   2. **Bidirectional reordering** — mixed Arabic/Latin/number text must be reordered from logical
 *      order to visual (display) order per the Unicode Bidirectional Algorithm (UAX #9) before it is
 *      handed to a left-to-right renderer.
 *
 * The public entry point is {@link shapeForPdf}: it is a pure string→string function that leaves
 * Latin text, digits and punctuation untouched, so wrapping it around every draw call is safe and
 * backward compatible. Order matters — we shape first (joining is computed in logical order) and then
 * reorder, which is sound because the Presentation Forms produced by shaping are themselves classified
 * as strong RTL (AL) by the bidi algorithm, so the reorder step treats them exactly like raw letters.
 */

// bidi-js is a faithful UAX #9 implementation; instantiate once (it is stateless per call).
const bidi = bidiFactory();

// Arabic-bearing Unicode ranges: Arabic block, Supplement, Extended-A, and Presentation Forms A/B.
// Written with \u escapes so no literal (and no stray U+FEFF) sits in the source.
const ARABIC_PATTERN = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

/** True when the string contains at least one Arabic-script character. */
export function containsArabic(text: string): boolean {
  return ARABIC_PATTERN.test(text);
}

type JoiningType = 'D' | 'R' | 'U';

/**
 * Per-letter shaping data. `forms` is `[isolated, final, initial, medial]` as Unicode code points;
 * `0` means the letter has no such form (right-joining letters have no initial/medial) and the
 * shaper falls back to the nearest available form. `join` is the joining type: dual (both sides),
 * right (connects only to the preceding letter), or non-joining.
 */
interface LetterData {
  forms: [number, number, number, number];
  join: JoiningType;
}

// prettier-ignore
const LETTERS: Record<number, LetterData> = {
  0x0621: { forms: [0xfe80, 0, 0, 0], join: 'U' },                 // HAMZA
  0x0622: { forms: [0xfe81, 0xfe82, 0, 0], join: 'R' },            // ALEF WITH MADDA
  0x0623: { forms: [0xfe83, 0xfe84, 0, 0], join: 'R' },            // ALEF WITH HAMZA ABOVE
  0x0624: { forms: [0xfe85, 0xfe86, 0, 0], join: 'R' },            // WAW WITH HAMZA
  0x0625: { forms: [0xfe87, 0xfe88, 0, 0], join: 'R' },            // ALEF WITH HAMZA BELOW
  0x0626: { forms: [0xfe89, 0xfe8a, 0xfe8b, 0xfe8c], join: 'D' },  // YEH WITH HAMZA
  0x0627: { forms: [0xfe8d, 0xfe8e, 0, 0], join: 'R' },            // ALEF
  0x0628: { forms: [0xfe8f, 0xfe90, 0xfe91, 0xfe92], join: 'D' },  // BEH
  0x0629: { forms: [0xfe93, 0xfe94, 0, 0], join: 'R' },            // TEH MARBUTA
  0x062a: { forms: [0xfe95, 0xfe96, 0xfe97, 0xfe98], join: 'D' },  // TEH
  0x062b: { forms: [0xfe99, 0xfe9a, 0xfe9b, 0xfe9c], join: 'D' },  // THEH
  0x062c: { forms: [0xfe9d, 0xfe9e, 0xfe9f, 0xfea0], join: 'D' },  // JEEM
  0x062d: { forms: [0xfea1, 0xfea2, 0xfea3, 0xfea4], join: 'D' },  // HAH
  0x062e: { forms: [0xfea5, 0xfea6, 0xfea7, 0xfea8], join: 'D' },  // KHAH
  0x062f: { forms: [0xfea9, 0xfeaa, 0, 0], join: 'R' },            // DAL
  0x0630: { forms: [0xfeab, 0xfeac, 0, 0], join: 'R' },            // THAL
  0x0631: { forms: [0xfead, 0xfeae, 0, 0], join: 'R' },            // REH
  0x0632: { forms: [0xfeaf, 0xfeb0, 0, 0], join: 'R' },            // ZAIN
  0x0633: { forms: [0xfeb1, 0xfeb2, 0xfeb3, 0xfeb4], join: 'D' },  // SEEN
  0x0634: { forms: [0xfeb5, 0xfeb6, 0xfeb7, 0xfeb8], join: 'D' },  // SHEEN
  0x0635: { forms: [0xfeb9, 0xfeba, 0xfebb, 0xfebc], join: 'D' },  // SAD
  0x0636: { forms: [0xfebd, 0xfebe, 0xfebf, 0xfec0], join: 'D' },  // DAD
  0x0637: { forms: [0xfec1, 0xfec2, 0xfec3, 0xfec4], join: 'D' },  // TAH
  0x0638: { forms: [0xfec5, 0xfec6, 0xfec7, 0xfec8], join: 'D' },  // ZAH
  0x0639: { forms: [0xfec9, 0xfeca, 0xfecb, 0xfecc], join: 'D' },  // AIN
  0x063a: { forms: [0xfecd, 0xfece, 0xfecf, 0xfed0], join: 'D' },  // GHAIN
  0x0640: { forms: [0x0640, 0x0640, 0x0640, 0x0640], join: 'D' },  // TATWEEL (kashida)
  0x0641: { forms: [0xfed1, 0xfed2, 0xfed3, 0xfed4], join: 'D' },  // FEH
  0x0642: { forms: [0xfed5, 0xfed6, 0xfed7, 0xfed8], join: 'D' },  // QAF
  0x0643: { forms: [0xfed9, 0xfeda, 0xfedb, 0xfedc], join: 'D' },  // KAF
  0x0644: { forms: [0xfedd, 0xfede, 0xfedf, 0xfee0], join: 'D' },  // LAM
  0x0645: { forms: [0xfee1, 0xfee2, 0xfee3, 0xfee4], join: 'D' },  // MEEM
  0x0646: { forms: [0xfee5, 0xfee6, 0xfee7, 0xfee8], join: 'D' },  // NOON
  0x0647: { forms: [0xfee9, 0xfeea, 0xfeeb, 0xfeec], join: 'D' },  // HEH
  0x0648: { forms: [0xfeed, 0xfeee, 0, 0], join: 'R' },            // WAW
  0x0649: { forms: [0xfeef, 0xfef0, 0, 0], join: 'R' },            // ALEF MAKSURA
  0x064a: { forms: [0xfef1, 0xfef2, 0xfef3, 0xfef4], join: 'D' },  // YEH
};

/** Lam-Alef mandatory ligatures, keyed by the following alef variant. `[isolated, final]`. */
const LAM_ALEF: Record<number, [number, number]> = {
  0x0622: [0xfef5, 0xfef6], // LAM + ALEF WITH MADDA
  0x0623: [0xfef7, 0xfef8], // LAM + ALEF WITH HAMZA ABOVE
  0x0625: [0xfef9, 0xfefa], // LAM + ALEF WITH HAMZA BELOW
  0x0627: [0xfefb, 0xfefc], // LAM + ALEF
};

const LAM = 0x0644;

/** Combining marks (harakat, superscript alef …) are transparent to joining but kept in output. */
function isTransparent(cp: number): boolean {
  return (
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    cp === 0x0670 ||
    (cp >= 0x06d6 && cp <= 0x06dc) ||
    (cp >= 0x06df && cp <= 0x06e4) ||
    (cp >= 0x06e7 && cp <= 0x06e8) ||
    (cp >= 0x06ea && cp <= 0x06ed)
  );
}

const canJoinForward = (l: LetterData | undefined): boolean => l?.join === 'D';
// Every real letter (dual or right-joining) can connect to the preceding letter.
const canJoinBackward = (l: LetterData | undefined): boolean => l?.join === 'D' || l?.join === 'R';

/**
 * Replace Arabic base letters with their contextual presentation forms and collapse lam-alef pairs
 * into their mandatory ligature. Non-Arabic code points are copied through untouched. Operates in
 * logical order; the resulting code points are all in the Presentation Forms blocks.
 */
export function shapeArabic(text: string): string {
  const cps = Array.from(text, (c) => c.codePointAt(0)!);
  const letters = cps.map((cp) => LETTERS[cp]);

  // Nearest non-transparent neighbour indices, so harakat between two letters don't break joining.
  const prevLetter = (i: number): LetterData | undefined => {
    for (let j = i - 1; j >= 0; j -= 1) {
      if (isTransparent(cps[j]!)) continue;
      return letters[j];
    }
    return undefined;
  };
  const nextIndex = (i: number): number => {
    for (let j = i + 1; j < cps.length; j += 1) {
      if (isTransparent(cps[j]!)) continue;
      return j;
    }
    return -1;
  };

  const out: number[] = [];
  let skip = -1;

  for (let i = 0; i < cps.length; i += 1) {
    if (i === skip) continue;
    const cp = cps[i]!;
    const data = letters[i];

    if (!data) {
      out.push(cp); // non-Arabic (or unsupported) — pass through verbatim
      continue;
    }

    const prev = prevLetter(i);
    const connectPrev = canJoinForward(prev) && canJoinBackward(data);

    // Lam-Alef ligature: a LAM immediately followed (ignoring marks) by an alef variant.
    if (cp === LAM) {
      const ni = nextIndex(i);
      const ligature = ni >= 0 ? LAM_ALEF[cps[ni]!] : undefined;
      if (ligature) {
        out.push(connectPrev ? ligature[1] : ligature[0]);
        skip = ni; // consume the alef
        continue;
      }
    }

    const ni = nextIndex(i);
    const next = ni >= 0 ? letters[ni] : undefined;
    const connectNext = canJoinForward(data) && canJoinBackward(next);

    // Choose form with graceful fallback for letters lacking initial/medial variants.
    const [iso, fin, ini, med] = data.forms;
    let form: number;
    if (connectPrev && connectNext) form = med || fin || iso;
    else if (connectPrev) form = fin || iso;
    else if (connectNext) form = ini || iso;
    else form = iso;
    out.push(form || cp);
  }

  return String.fromCodePoint(...out);
}

/**
 * Full logical→visual transform for PDFKit: shape Arabic letters, then reorder the whole string to
 * display order with the Unicode Bidi Algorithm (base direction auto-detected from the first strong
 * character). Pure Latin/numeric/punctuation strings are returned unchanged (fast path), so this is
 * safe to apply to every string the renderer draws.
 */
export function shapeForPdf(text: string): string {
  if (!text || !containsArabic(text)) return text;
  const shaped = shapeArabic(text);
  const embeddingLevels = bidi.getEmbeddingLevels(shaped);
  return bidi.getReorderedString(shaped, embeddingLevels);
}

/** Base paragraph direction of a string per the bidi algorithm ('rtl' when it leads with Arabic). */
export function baseDirection(text: string): 'ltr' | 'rtl' {
  if (!containsArabic(text)) return 'ltr';
  const { paragraphs } = bidi.getEmbeddingLevels(text);
  return paragraphs.length > 0 && paragraphs[0]!.level % 2 === 1 ? 'rtl' : 'ltr';
}
