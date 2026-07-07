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
  });
});
