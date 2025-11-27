import { Page, Locator } from 'playwright';

import { resolveSelector, describeSelector } from '../utils/selector';
import { Selector } from '../types';

// Create mock functions for all Page locator methods
const mockLocator = {} as Locator;

const createMockPage = () =>
  ({
    getByRole: jest.fn().mockReturnValue(mockLocator),
    getByLabel: jest.fn().mockReturnValue(mockLocator),
    getByPlaceholder: jest.fn().mockReturnValue(mockLocator),
    getByText: jest.fn().mockReturnValue(mockLocator),
    getByTestId: jest.fn().mockReturnValue(mockLocator),
    locator: jest.fn().mockReturnValue(mockLocator),
  }) as unknown as Page;

describe('Selector Utils', () => {
  describe('resolveSelector', () => {
    let mockPage: Page;

    beforeEach(() => {
      mockPage = createMockPage();
    });

    describe('explicit by field', () => {
      it('should handle by=role with value and name', () => {
        const selector: Selector = { by: 'role', value: 'button', name: 'Submit' };
        const result = resolveSelector(mockPage, selector);

        expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
        expect(result).toBe(mockLocator);
      });

      it('should handle by=role without name', () => {
        const selector: Selector = { by: 'role', value: 'heading' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByRole).toHaveBeenCalledWith('heading', { name: undefined });
      });

      it('should handle by=label', () => {
        const selector: Selector = { by: 'label', value: 'Email' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByLabel).toHaveBeenCalledWith('Email');
      });

      it('should handle by=placeholder', () => {
        const selector: Selector = { by: 'placeholder', value: 'Enter email' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByPlaceholder).toHaveBeenCalledWith('Enter email');
      });

      it('should handle by=text', () => {
        const selector: Selector = { by: 'text', value: 'Click here' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByText).toHaveBeenCalledWith('Click here');
      });

      it('should handle by=testid', () => {
        const selector: Selector = { by: 'testid', value: 'submit-btn' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByTestId).toHaveBeenCalledWith('submit-btn');
      });

      it('should handle by=css', () => {
        const selector: Selector = { by: 'css', value: '.submit-button' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('.submit-button');
      });

      it('should handle by=xpath', () => {
        const selector: Selector = { by: 'xpath', value: '//button[@type="submit"]' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('xpath=//button[@type="submit"]');
      });

      it('should throw for unknown by type', () => {
        const selector = { by: 'unknown', value: 'test' } as unknown as Selector;

        expect(() => resolveSelector(mockPage, selector)).toThrow('Unknown selector type: unknown');
      });
    });

    describe('shorthand properties', () => {
      it('should handle role shorthand with name', () => {
        const selector: Selector = { role: 'button', name: 'Submit' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByRole).toHaveBeenCalledWith('button', { name: 'Submit' });
      });

      it('should handle role shorthand without name', () => {
        const selector: Selector = { role: 'textbox' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByRole).toHaveBeenCalledWith('textbox', { name: undefined });
      });

      it('should handle placeholder shorthand', () => {
        const selector: Selector = { placeholder: 'Enter your name' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByPlaceholder).toHaveBeenCalledWith('Enter your name');
      });

      it('should handle text shorthand', () => {
        const selector: Selector = { text: 'Welcome' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByText).toHaveBeenCalledWith('Welcome');
      });
    });

    describe('value fallback', () => {
      it('should treat value starting with / as xpath', () => {
        const selector: Selector = { value: '/html/body/div' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('xpath=/html/body/div');
      });

      it('should treat value starting with ( as xpath', () => {
        const selector: Selector = { value: '(//button)[1]' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('xpath=(//button)[1]');
      });

      it('should treat value starting with . as CSS selector', () => {
        const selector: Selector = { value: '.my-class' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('.my-class');
      });

      it('should treat value starting with # as CSS selector', () => {
        const selector: Selector = { value: '#my-id' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('#my-id');
      });

      it('should treat value containing [ as CSS selector', () => {
        const selector: Selector = { value: 'button[type="submit"]' };
        resolveSelector(mockPage, selector);

        expect(mockPage.locator).toHaveBeenCalledWith('button[type="submit"]');
      });

      it('should treat plain value as text', () => {
        const selector: Selector = { value: 'Click me' };
        resolveSelector(mockPage, selector);

        expect(mockPage.getByText).toHaveBeenCalledWith('Click me');
      });
    });

    describe('error handling', () => {
      it('should throw for empty selector', () => {
        const selector = {} as Selector;

        expect(() => resolveSelector(mockPage, selector)).toThrow('Invalid selector');
      });
    });
  });

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
