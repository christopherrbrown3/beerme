// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  findingAliases,
  getBlockingFindings,
  getUnexceptedFindings,
  validateExceptions,
} from './security-audit.mjs';

const NOW = new Date('2026-07-21T12:00:00.000Z');

function exception(overrides = {}) {
  return {
    id: 'SEC-2026-001',
    tool: 'npm-audit',
    finding: 'GHSA-abcd-1234-5678',
    owner: '@maintainer',
    rationale: 'Upgrade is blocked while the upstream patch is reviewed.',
    expires: '2026-07-28',
    ...overrides,
  };
}

describe('security exception validation', () => {
  it('accepts a complete, unexpired exception', () => {
    expect(() => validateExceptions([exception()], NOW)).not.toThrow();
  });

  it.each([
    ['missing ownership', { owner: '' }, 'non-empty owner'],
    ['an impossible date', { expires: '2026-02-31' }, 'invalid expiry date'],
    ['an expired date', { expires: '2026-07-20' }, 'expired on 2026-07-20'],
    ['an unsupported scanner', { tool: 'unknown' }, 'unsupported tool unknown'],
  ])('rejects %s', (_name, overrides, message) => {
    expect(() => validateExceptions([exception(overrides)], NOW)).toThrow(message);
  });

  it('rejects duplicate exception ids', () => {
    expect(() => validateExceptions([exception(), exception()], NOW)).toThrow(
      'Duplicate security exception id',
    );
  });
});

describe('npm audit finding policy', () => {
  const report = {
    vulnerabilities: {
      direct: {
        severity: 'high',
        via: [
          {
            source: 123456,
            url: 'https://github.com/advisories/GHSA-abcd-1234-5678',
          },
        ],
      },
      transitive: { severity: 'critical', via: ['direct'] },
      moderate: { severity: 'moderate', via: [] },
    },
  };

  it('selects only high and critical findings', () => {
    expect(getBlockingFindings(report).map(([packageName]) => packageName)).toEqual([
      'direct',
      'transitive',
    ]);
  });

  it('blocks findings without a matching exception', () => {
    expect(getUnexceptedFindings(getBlockingFindings(report), [])).toHaveLength(2);
  });

  it('matches exact GHSA ids, source ids, and package names', () => {
    const directAliases = findingAliases('direct', report.vulnerabilities.direct);
    expect(directAliases).toEqual(
      new Set([
        'direct',
        '123456',
        'https://github.com/advisories/GHSA-abcd-1234-5678',
        'GHSA-abcd-1234-5678',
      ]),
    );

    const exceptions = [exception(), exception({ id: 'SEC-2026-002', finding: 'transitive' })];
    expect(getUnexceptedFindings(getBlockingFindings(report), exceptions)).toEqual([]);
  });
});
