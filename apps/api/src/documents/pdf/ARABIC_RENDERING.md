# Arabic rendering in the PDF pipeline

PDFKit embeds fonts but does **no complex-script processing**. `arabic-text.ts` closes that gap as a
pure text-preprocessing step (`shapeForPdf`) applied to every string the renderer draws:

1. **NFC normalization** – decomposed sequences compose to the precomposed letters we map.
2. **Contextual glyph shaping** – base letters → Arabic Presentation Forms (isolated/initial/medial/
   final) + lam-alef ligatures, honouring **ZWJ/ZWNJ** and skipping transparent harakat.
3. **Bidirectional reordering** – logical → visual order via `bidi-js` (UAX #9), applied **per line**.
4. **Double-shape protection** – code points already in the Presentation Forms blocks pass through, so
   shaping is idempotent.

Coverage includes standard Arabic plus common Persian/Urdu letters (peh, tcheh, gaf, keheh, farsi yeh,
tteh, ddal, jeh, rreh, noon ghunna, heh doachashmee, …). The public API — `containsArabic`,
`shapeArabic`, `shapeForPdf`, `baseDirection` — and the `DocumentLayout`/renderer contracts are
unchanged; Latin/numeric strings take a fast path and are returned byte-identical.

## Logical text layer (copy / search / accessibility)

Because Arabic is handed to PDFKit already shaped and in **visual** (bidi-reordered) order — the only
way to make the glyphs display correctly, since PDFKit draws code points left-to-right with no bidi —
that same visual-order string would otherwise become the PDF's text layer, so copy/search/screen-reader
extraction returned reversed, presentation-form text (e.g. `ةيقافتاليجستلا` for `اتفاقية التسجيل`).

The renderer fixes this without changing the drawn glyphs: `drawText` wraps every Arabic run in an
`/ActualText` marked-content span (`U+2066`-free UTF-16BE) carrying the **original logical** Unicode.
Conforming consumers — Adobe Acrobat, Chrome/Edge (pdf.js), poppler `pdftotext`, and PDF/UA screen
readers — return the logical text; the painted glyphs are unchanged. Verified by decoding the spans out
of a rendered agreement (`أكاديمية مناكسة الدولية`, `أحمد محمد الخطيب`, …) and by a unit test that
inflates the content streams and asserts the logical UTF-16BE string is present and the reversed form is
not. **Caveat:** extractors that ignore `/ActualText` (e.g. PyMuPDF's default `get_text`) still return
the visual glyph order — that is a limitation of those tools, not of the document.

## Known limitations (require replacing PDFKit's text engine to fully fix)

These are inherent to doing shaping/bidi as a **preprocessing** step in front of a renderer that owns
its own text layout. They are documented rather than worked around, per the project's "no
architectural changes to the renderer" constraint.

### 1. Automatic width-wrapping of long Arabic paragraphs
Bidi reordering is line-relative and must run **after** line breaking. We reorder per **explicit**
newline (`\n`), but when a long Arabic paragraph has no newlines, PDFKit performs width-based line
breaking *internally, after* `shapeForPdf` has already produced one visual-ordered line. The result is
that a paragraph which wraps onto several lines is ordered as a whole rather than per visual line, so
the line breaks read in the wrong order.

- **Not affected:** single-line values — titles, headings, table cells, fields, meta, signatures,
  footers (the overwhelming majority of document text), and any multi-line text that carries explicit
  `\n` line breaks (each line is shaped and reordered correctly).
- **Affected:** a long, un-broken Arabic paragraph (e.g. free-form legal wording) that relies on
  PDFKit's automatic wrapping.
- **Mitigation without re-architecting:** insert explicit `\n` at intended break points in the source
  text (the data layer already controls this wording); each line then reorders correctly.
- **Full fix:** measure and break lines ourselves against PDFKit metrics and reorder each line before
  drawing — i.e. take over text layout from PDFKit, which is out of scope, or move to an engine with
  native shaping (HarfBuzz/browser).

### 2. Space-separated identifiers — solved with LRI/PDI isolation
Per UAX #9, whitespace-separated numeric runs in an RTL paragraph are ordered right-to-left, so a phone
number typed with spaces (`+962 79 123 4567`) would display as `4567 123 79 962+`. This is
standards-correct bidi, but not what a reader expects of an identifier.

`shapeForPdf` fixes it the standards-compliant way: it wraps each run of two-or-more space-separated
ASCII tokens **that contains a digit** in a **LEFT-TO-RIGHT ISOLATE** (`U+2066 … U+2069`, UAX #9 §2.4)
before reordering, then strips the isolate controls from the visual output so PDFKit never sees a
formatting code point (which could otherwise render as a `.notdef` box). This covers phone numbers,
national IDs, grouped IBANs and reference numbers (`+962 79 123 4567`, `1234 5678 9012`,
`JO94 CBJO 0010 …`, `REF 2026 00125`).

Scope and safety of the heuristic:
- It only fires on Arabic-bearing lines (English-only text takes the byte-identical fast path).
- Wrapping already-LTR content is a visual no-op, so emails, URLs, single numbers, decimals
  (`1025.000`) and prose are unaffected; only genuinely reversible multi-group identifiers change.
- It is **detection-based**: an identifier with no digit (rare) or split by non-space punctuation is not
  isolated. Callers that need a guaranteed isolate can still insert `U+2066…U+2069` themselves — the
  post-reorder strip cleans those up too.
- Residual UAX #9 behaviour: the isolate keeps the run left-to-right; it does not re-group tokens, which
  is the correct outcome for identifiers.

### 3. No GPOS mark positioning / no kashida justification
Presentation Forms give correct letter **shapes** but not advanced glyph **positioning**. Precise
stacking of multiple harakat (which needs the font's GPOS table) and kashida elongation are not
performed — PDFKit applies neither. Unvocalized text (names, amounts, most official wording) is
unaffected; heavily vocalized Quranic-style text may show marks at default positions.

### 4. Font requirement
Glyphs only appear when `PDF_ARABIC_FONT_PATH` points to a TTF that contains the Arabic Presentation
Forms (`U+FB50–U+FEFF`); most Arabic fonts (Amiri, Cairo, Noto Naskh, …) do. PDFKit's built-in
Helvetica has no Arabic glyphs, so without an embedded font Arabic will not render regardless of
shaping.

**Do not register the Arabic font under the name `Helvetica`.** PDFKit pre-caches its default font
under that exact name at document construction, so `registerFont('Helvetica', …)` is silently ignored
(the cache wins) — regular-weight text then keeps the standard WinAnsi font and emits each 16-bit
Arabic code unit as two Latin-1 bytes (`þ®…` mojibake), while bold text (an unreserved name) renders
correctly. The renderer therefore binds its own aliases (`DocBody` / `DocBody-Bold`, see
`pdf-renderer.ts`) that PDFKit has not reserved, so the configured font backs every weight. This is
covered by a regression test that asserts no Type1 Helvetica is embedded when a font is configured.

### 5. Paragraph alignment
The renderer keeps its existing left alignment; RTL text is shaped and correctly ordered but not
right-aligned. Right-aligning RTL blocks would require renderer/layout changes and is intentionally
left out to preserve backward compatibility.
