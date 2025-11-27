import { colorToASS } from '../postprod/captions/colors';

describe('colorToASS', () => {
  describe('named colors', () => {
    it('should convert white', () => {
      expect(colorToASS('white')).toBe('&H00FFFFFF');
    });

    it('should convert black', () => {
      expect(colorToASS('black')).toBe('&H00000000');
    });

    it('should convert red', () => {
      expect(colorToASS('red')).toBe('&H000000FF');
    });

    it('should convert green', () => {
      expect(colorToASS('green')).toBe('&H0000FF00');
    });

    it('should convert blue', () => {
      expect(colorToASS('blue')).toBe('&H00FF0000');
    });

    it('should convert yellow', () => {
      expect(colorToASS('yellow')).toBe('&H0000FFFF');
    });

    it('should convert cyan', () => {
      expect(colorToASS('cyan')).toBe('&H00FFFF00');
    });

    it('should convert magenta', () => {
      expect(colorToASS('magenta')).toBe('&H00FF00FF');
    });

    it('should convert black@0.5 (semi-transparent)', () => {
      expect(colorToASS('black@0.5')).toBe('&H80000000');
    });

    it('should convert black@0.7 (70% transparent)', () => {
      expect(colorToASS('black@0.7')).toBe('&H4D000000');
    });
  });

  describe('hex colors without hash', () => {
    it('should convert 6-digit hex to ASS format (BGR)', () => {
      // Red in RGB (#FF0000) becomes Blue in BGR (&H000000FF)
      expect(colorToASS('FF0000')).toBe('&H000000FF');
    });

    it('should convert another hex color', () => {
      // Green in RGB (#00FF00) becomes Green in BGR
      expect(colorToASS('00FF00')).toBe('&H0000FF00');
    });

    it('should convert complex hex color', () => {
      // #AABBCC -> R=AA, G=BB, B=CC -> ASS: &H00CCBBAA
      expect(colorToASS('AABBCC')).toBe('&H00CCBBAA');
    });
  });

  describe('hex colors with hash', () => {
    it('should convert 6-digit hex with hash', () => {
      expect(colorToASS('#FF0000')).toBe('&H000000FF');
    });

    it('should convert lowercase hex', () => {
      expect(colorToASS('#aabbcc')).toBe('&H00CCBBAA');
    });
  });

  describe('hex colors with alpha', () => {
    it('should convert 8-digit hex (with alpha)', () => {
      // #80FF0000 -> A=80, R=FF, G=00, B=00 -> ASS: &H8000FFFF... wait
      // Format is AARRGGBB -> ASS: &HAABBGGRR
      expect(colorToASS('#80AABBCC')).toBe('&H80CCBBAA');
    });

    it('should convert fully opaque 8-digit hex', () => {
      expect(colorToASS('00FF0000')).toBe('&H000000FF');
    });

    it('should convert semi-transparent hex', () => {
      expect(colorToASS('7F00FF00')).toBe('&H7F00FF00');
    });
  });

  describe('unknown colors', () => {
    it('should return white for unknown named color', () => {
      expect(colorToASS('unknown')).toBe('&H00FFFFFF');
    });

    it('should return white for invalid format', () => {
      expect(colorToASS('notacolor')).toBe('&H00FFFFFF');
    });

    it('should return white for invalid hex', () => {
      expect(colorToASS('#GGG')).toBe('&H00FFFFFF');
    });
  });
});
