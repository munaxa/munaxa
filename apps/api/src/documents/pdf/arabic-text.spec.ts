import { baseDirection, containsArabic, shapeArabic, shapeForPdf } from './arabic-text';

/** Convenience: render a string as space-separated lowercase hex code points for exact assertions. */
const hex = (s: string): string => Array.from(s, (c) => c.codePointAt(0)!.toString(16)).join(' ');

describe('arabic-text', () => {
  describe('containsArabic', () => {
    it('detects Arabic base letters', () => {
      expect(containsArabic('أحمد')).toBe(true);
      expect(containsArabic('Receipt رقم 125')).toBe(true);
    });

    it('is false for English, numbers and punctuation only', () => {
      expect(containsArabic('Invoice INV-1025')).toBe(false);
      expect(containsArabic('1,000.000 JOD')).toBe(false);
      expect(containsArabic('')).toBe(false);
    });

    it('detects already-shaped presentation forms', () => {
      expect(containsArabic('ﺍ')).toBe(true); // ALEF, isolated form
    });
  });

  describe('shapeArabic (contextual glyph shaping)', () => {
    it('shapes an Arabic-only word using initial/medial/final forms', () => {
      // محمد = MEEM(initial) HAH(medial) MEEM(medial) DAL(final)
      expect(hex(shapeArabic('محمد'))).toBe('fee3 fea4 fee4 feaa');
    });

    it('keeps right-joining letters isolated when they cannot join forward', () => {
      // أحمد: ALEF-HAMZA is right-joining, so the following HAH takes an *initial* (not medial) form.
      expect(hex(shapeArabic('أحمد'))).toBe('fe83 fea3 fee4 feaa');
    });

    it('forms the lam-alef ligature and consumes the alef', () => {
      // لا collapses two code points into one ligature glyph (FEFB, isolated lam-alef).
      expect(hex(shapeArabic('لا'))).toBe('fefb');
    });

    it('leaves English text exactly as-is', () => {
      expect(shapeArabic('Invoice INV-1025')).toBe('Invoice INV-1025');
    });

    it('leaves numbers and punctuation untouched', () => {
      expect(shapeArabic('125 - 1,000.000 (JOD)')).toBe('125 - 1,000.000 (JOD)');
    });

    it('shapes Arabic while passing embedded Latin/numbers through unchanged', () => {
      const out = shapeArabic('رقم 125');
      // رقم shaped + space + untouched digits
      expect(hex(out)).toBe('fead fed7 fee2 20 31 32 35');
    });

    it('treats harakat as transparent to joining', () => {
      // بَ (BEH + FATHA): the mark must not break the letter; BEH still shapes as isolated here.
      expect(hex(shapeArabic('بَ'))).toBe('fe8f 64e');
    });
  });

  describe('robustness: NFC normalization', () => {
    it('composes decomposed alef + combining hamza before shaping', () => {
      // U+0627 ALEF + U+0654 COMBINING HAMZA ABOVE --NFC--> U+0623, shaped isolated = FE83.
      expect(hex(shapeArabic('أ'))).toBe('fe83');
      // …and it equals shaping the already-composed character.
      expect(shapeArabic('أ')).toBe(shapeArabic('أ'));
    });
  });

  describe('robustness: ZWJ / ZWNJ join controls', () => {
    it('ZWNJ breaks a join that would otherwise happen', () => {
      // MEEM + FARSI YEH normally joins (initial + final); a ZWNJ between them forces isolated forms.
      expect(hex(shapeArabic('می'))).toBe('fee3 fbfd'); // joined
      expect(hex(shapeArabic('م‌ی'))).toBe('fee1 fbfc'); // ZWNJ → both isolated
    });

    it('ZWJ forces a medial form in isolation and is not drawn', () => {
      // ZWJ + BEH + ZWJ makes BEH connect on both sides → medial FE92, with no extra output glyphs.
      expect(hex(shapeArabic('‍ب‍'))).toBe('fe92');
    });

    it('ZWNJ between LAM and ALEF prevents the lam-alef ligature', () => {
      expect(hex(shapeArabic('لا'))).toBe('fefb'); // ligature
      expect(hex(shapeArabic('ل‌ا'))).toBe('fedd fe8d'); // LAM isolated + ALEF isolated
    });
  });

  describe('robustness: no double-shaping of presentation forms', () => {
    it('passes already-shaped presentation forms through untouched', () => {
      expect(hex(shapeArabic('ﺑ'))).toBe('fe91'); // BEH initial form stays as-is
    });

    it('is idempotent — shaping shaped text is a no-op', () => {
      const once = shapeArabic('محمد');
      expect(shapeArabic(once)).toBe(once);
    });
  });

  describe('extended coverage: Persian / Urdu letters', () => {
    it('detects Persian/Urdu letters as Arabic script', () => {
      expect(containsArabic('گچپ')).toBe(true); // gaf, tcheh, peh
      expect(containsArabic('ٹڈ')).toBe(true); // tteh, ddal
    });

    it('shapes Persian letters contextually (peh initial, gaf final)', () => {
      expect(hex(shapeArabic('پگ'))).toBe('fb58 fb93');
    });

    it('shapes the Farsi yeh (U+06CC) with proper initial/final forms', () => {
      // MEEM + FARSI YEH → MEEM initial FEE3, FARSI YEH final FBFD.
      expect(hex(shapeArabic('می'))).toBe('fee3 fbfd');
    });

    it('shapes an Urdu retroflex letter (tteh) joined to the next letter', () => {
      // TTEH (U+0679, dual) + BEH → TTEH initial FB68, BEH final FE90.
      expect(hex(shapeArabic('ٹب'))).toBe('fb68 fe90');
    });
  });

  describe('baseDirection', () => {
    it('is rtl when the string leads with Arabic', () => {
      expect(baseDirection('رقم Invoice')).toBe('rtl');
    });
    it('is ltr when the string leads with Latin', () => {
      expect(baseDirection('Receipt رقم 125')).toBe('ltr');
      expect(baseDirection('Invoice INV-1025')).toBe('ltr');
    });
  });

  describe('shapeForPdf (shape + bidirectional reorder)', () => {
    it('returns English unchanged (fast path, no reordering)', () => {
      expect(shapeForPdf('Invoice INV-1025')).toBe('Invoice INV-1025');
    });

    it('returns empty string unchanged', () => {
      expect(shapeForPdf('')).toBe('');
    });

    it('reorders an Arabic-only phrase to visual order', () => {
      // Logical أحمد محمد -> visual order places محمد first (leftmost) then أحمد.
      expect(hex(shapeForPdf('أحمد محمد'))).toBe('feaa fee4 fea4 fee3 20 feaa fee4 fea3 fe83');
    });

    it('keeps Latin words and numbers in reading order inside an RTL phrase', () => {
      // رقم Invoice INV-1025 (RTL base): the Latin run stays LTR, the Arabic word moves to the right.
      expect(shapeForPdf('رقم Invoice INV-1025')).toBe('Invoice INV-1025 ﻢﻗﺭ');
    });

    it('handles Latin-led mixed text with an embedded Arabic word', () => {
      // Student: أحمد محمد (LTR base) keeps the label first, Arabic name shaped + reordered.
      expect(shapeForPdf('Student: أحمد محمد')).toBe('Student: ﺪﻤﺤﻣ ﺪﻤﺣﺃ');
    });

    it('preserves digits inside a mixed Arabic + number string', () => {
      const out = shapeForPdf('Receipt رقم 125');
      expect(out).toContain('Receipt');
      expect(out).toContain('125');
      // The Arabic word is shaped to presentation forms and reversed for display.
      expect(out).toContain('ﻢﻗﺭ');
    });

    it('reorders each line independently and keeps newlines in place', () => {
      // A single reorder over multi-line text would drag the newline out of place; per-line reorder
      // must preserve one '\n' with each line reversed on its own.
      const out = shapeForPdf('السطر الأول\nالسطر الثاني');
      expect(out.split('\n')).toHaveLength(2);
      expect(out).toBe('ﻝﻭﻷﺍ ﺮﻄﺴﻟﺍ\nﻲﻧﺎﺜﻟﺍ ﺮﻄﺴﻟﺍ');
    });
  });
});
