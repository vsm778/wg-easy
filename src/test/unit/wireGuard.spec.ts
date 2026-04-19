import { beforeAll, describe, expect, test } from 'vitest';

let wireGuardTestExports: typeof import('../../server/utils/WireGuard').wireGuardTestExports;

beforeAll(async () => {
  (
    globalThis as typeof globalThis & {
      OLD_ENV?: { PASSWORD?: string; PASSWORD_HASH?: string };
    }
  ).OLD_ENV = {};

  ({ wireGuardTestExports } = await import('../../server/utils/WireGuard'));
});

describe('WireGuard', () => {
  test('generates four non-overlapping header ranges', () => {
    const headers = wireGuardTestExports.generateHeaderRanges();

    expect(headers).toHaveLength(4);
    headers.forEach((header) => {
      expect(wireGuardTestExports.isHeaderRange(header)).toBe(true);
    });

    const parsed = headers.map((header) => {
      const [start, end] = header.split('-').map(Number);
      return { start: start!, end: end! };
    });

    parsed.forEach(({ start, end }) => {
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end).toBeLessThanOrEqual(4294967295);
      expect(start).toBeLessThanOrEqual(end);
    });

    const sorted = [...parsed].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.start).toBeGreaterThan(sorted[i - 1]!.end);
    }
  });

  test('normalizes old interface parameters to AmneziaWG 2.0 ranges', () => {
    const normalized = wireGuardTestExports.normalizeInterfaceParameters({
      name: 'wg0',
      device: 'eth0',
      port: 51820,
      privateKey: 'server-private',
      publicKey: 'server-public',
      ipv4Cidr: '10.10.10.0/24',
      ipv6Cidr: 'fdcc:ad94:bacf:61a4::/64',
      mtu: 1420,
      jC: 7,
      jMin: 10,
      jMax: 1000,
      s1: 128,
      s2: 56,
      s3: null,
      s4: null,
      h1: '1024665731',
      h2: '2028756915',
      h3: '989538304',
      h4: '995305716',
      i1: null,
      i2: null,
      i3: null,
      i4: null,
      i5: null,
      enabled: true,
      firewallEnabled: false,
      createdAt: '2026-04-05 00:00:00',
      updatedAt: '2026-04-05 00:00:00',
    });

    expect(normalized.jC).toBe(7);
    expect(normalized.jMin).toBeGreaterThanOrEqual(64);
    expect(normalized.jMin).toBeLessThanOrEqual(1024);
    expect(normalized.jMax).toBeGreaterThanOrEqual(normalized.jMin);
    expect(normalized.jMax).toBeLessThanOrEqual(1024);
    expect(normalized.s1).toBe(64);
    expect(normalized.s2).toBe(56);
    expect(normalized.s3).toBe(null);
    expect(normalized.s4).toBe(null);
  });
});
