import { Page, Locator } from 'playwright';

import { Selector } from '../types';

/**
 * ARIA roles supported by Playwright's getByRole.
 * This allows dynamic role strings while maintaining type safety.
 */
type AriaRole =
  | 'alert'
  | 'alertdialog'
  | 'application'
  | 'article'
  | 'banner'
  | 'blockquote'
  | 'button'
  | 'caption'
  | 'cell'
  | 'checkbox'
  | 'code'
  | 'columnheader'
  | 'combobox'
  | 'complementary'
  | 'contentinfo'
  | 'definition'
  | 'deletion'
  | 'dialog'
  | 'directory'
  | 'document'
  | 'emphasis'
  | 'feed'
  | 'figure'
  | 'form'
  | 'generic'
  | 'grid'
  | 'gridcell'
  | 'group'
  | 'heading'
  | 'img'
  | 'insertion'
  | 'link'
  | 'list'
  | 'listbox'
  | 'listitem'
  | 'log'
  | 'main'
  | 'marquee'
  | 'math'
  | 'meter'
  | 'menu'
  | 'menubar'
  | 'menuitem'
  | 'menuitemcheckbox'
  | 'menuitemradio'
  | 'navigation'
  | 'none'
  | 'note'
  | 'option'
  | 'paragraph'
  | 'presentation'
  | 'progressbar'
  | 'radio'
  | 'radiogroup'
  | 'region'
  | 'row'
  | 'rowgroup'
  | 'rowheader'
  | 'scrollbar'
  | 'search'
  | 'searchbox'
  | 'separator'
  | 'slider'
  | 'spinbutton'
  | 'status'
  | 'strong'
  | 'subscript'
  | 'superscript'
  | 'switch'
  | 'tab'
  | 'table'
  | 'tablist'
  | 'tabpanel'
  | 'term'
  | 'textbox'
  | 'time'
  | 'timer'
  | 'toolbar'
  | 'tooltip'
  | 'tree'
  | 'treegrid'
  | 'treeitem';

/**
 * Resolves a Selector from the Journey DSL to a Playwright Locator.
 *
 * Priority order (per spec):
 * 1. Accessibility: role/name, label/placeholder, text
 * 2. Test IDs: data-testid
 * 3. CSS/XPath fallback
 */
export function resolveSelector(page: Page, selector: Selector): Locator {
  // Handle explicit 'by' field
  if (selector.by) {
    switch (selector.by) {
      case 'role':
        return page.getByRole(selector.value as AriaRole, {
          name: selector.name,
        });

      case 'label':
        return page.getByLabel(selector.value!);

      case 'placeholder':
        return page.getByPlaceholder(selector.value!);

      case 'text':
        return page.getByText(selector.value!);

      case 'testid':
        return page.getByTestId(selector.value!);

      case 'css':
        return page.locator(selector.value!);

      case 'xpath':
        return page.locator(`xpath=${selector.value!}`);

      default:
        throw new Error(`Unknown selector type: ${selector.by}`);
    }
  }

  // Handle shorthand properties (priority order from spec)

  // 1. Role with optional name (accessibility first)
  if (selector.role) {
    return page.getByRole(selector.role as AriaRole, {
      name: selector.name,
    });
  }

  // 2. Placeholder (accessibility)
  if (selector.placeholder) {
    return page.getByPlaceholder(selector.placeholder);
  }

  // 3. Text content (accessibility)
  if (selector.text) {
    return page.getByText(selector.text);
  }

  // 4. Value as fallback (try to infer type)
  if (selector.value) {
    // If it looks like a CSS selector or XPath
    if (selector.value.startsWith('/') || selector.value.startsWith('(')) {
      return page.locator(`xpath=${selector.value}`);
    }
    if (
      selector.value.startsWith('.') ||
      selector.value.startsWith('#') ||
      selector.value.includes('[')
    ) {
      return page.locator(selector.value);
    }
    // Default to text
    return page.getByText(selector.value);
  }

  throw new Error(`Invalid selector: ${JSON.stringify(selector)}`);
}

/**
 * Creates a human-readable description of a selector for logging/debugging.
 */
export function describeSelector(selector: Selector): string {
  if (selector.by) {
    const name = selector.name ? ` "${selector.name}"` : '';
    return `${selector.by}="${selector.value}"${name}`;
  }

  if (selector.role) {
    const name = selector.name ? ` "${selector.name}"` : '';
    return `role="${selector.role}"${name}`;
  }

  if (selector.placeholder) {
    return `placeholder="${selector.placeholder}"`;
  }

  if (selector.text) {
    return `text="${selector.text}"`;
  }

  if (selector.value) {
    return `"${selector.value}"`;
  }

  return JSON.stringify(selector);
}
