import { describeSelector } from '../utils/selector';
import { Selector } from '../types';

describe('Selector Utils', () => {
  describe('describeSelector', () => {
    it('should describe a role selector', () => {
      const selector: Selector = { role: 'button', name: 'Submit' };
      expect(describeSelector(selector)).toBe('role="button" "Submit"');
    });

    it('should describe a role selector without name', () => {
      const selector: Selector = { role: 'link' };
      expect(describeSelector(selector)).toBe('role="link"');
    });

    it('should describe a placeholder selector', () => {
      const selector: Selector = { placeholder: 'Enter email' };
      expect(describeSelector(selector)).toBe('placeholder="Enter email"');
    });

    it('should describe a text selector', () => {
      const selector: Selector = { text: 'Click me' };
      expect(describeSelector(selector)).toBe('text="Click me"');
    });

    it('should describe a selector with explicit by field', () => {
      const selector: Selector = { by: 'testid', value: 'submit-btn' };
      expect(describeSelector(selector)).toBe('testid="submit-btn"');
    });

    it('should describe a selector with by and name', () => {
      const selector: Selector = { by: 'role', value: 'button', name: 'Save' };
      expect(describeSelector(selector)).toBe('role="button" "Save"');
    });

    it('should describe a value-only selector', () => {
      const selector: Selector = { value: '.my-class' };
      expect(describeSelector(selector)).toBe('".my-class"');
    });

    it('should handle empty selector', () => {
      const selector: Selector = {};
      expect(describeSelector(selector)).toBe('{}');
    });
  });
});
