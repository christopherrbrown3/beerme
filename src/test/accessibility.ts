import axe, { type Result } from 'axe-core';
import { expect } from 'vitest';

const BLOCKING_IMPACTS = new Set(['serious', 'critical']);

function summarizeViolation(violation: Result) {
  return {
    rule: violation.id,
    impact: violation.impact,
    help: violation.help,
    targets: violation.nodes.map((node) => node.target.join(' ')),
  };
}

export async function expectNoBlockingAccessibilityViolations(
  container: Element | Document = document.body,
) {
  const results = await axe.run(container, {
    resultTypes: ['violations'],
    rules: {
      // JSDOM has no layout or rendered color information. Playwright owns this rule.
      'color-contrast': { enabled: false },
    },
  });
  const blocking = results.violations
    .filter((violation) => violation.impact && BLOCKING_IMPACTS.has(violation.impact))
    .map(summarizeViolation);

  expect(blocking).toEqual([]);
}
