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

### 2. Space-separated digit groups reorder in RTL context
Per UAX #9, whitespace-separated number runs in an RTL paragraph are ordered right-to-left. A phone
number typed with spaces (`+962 79 123 4567`) therefore displays as `4567 123 79 962+`. This is
**standards-correct** bidi (browsers do the same) — it is not a shaping bug. Emails, URLs, IBANs and
invoice numbers are unaffected because they contain no internal spaces and stay contiguous LTR.

- **Mitigation:** store such numbers without internal spaces, or wrap them in a directional isolate at
  the data layer if grouped display is required.

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

### 5. Paragraph alignment
The renderer keeps its existing left alignment; RTL text is shaped and correctly ordered but not
right-aligned. Right-aligning RTL blocks would require renderer/layout changes and is intentionally
left out to preserve backward compatibility.
