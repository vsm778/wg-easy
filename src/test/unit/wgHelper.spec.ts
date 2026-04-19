import { beforeAll, describe, expect, test } from 'vitest';

beforeAll(() => {
  (globalThis as typeof globalThis & { WG_ENV?: { WG_EXECUTABLE: 'awg' } })
    .WG_ENV = {
    WG_EXECUTABLE: 'awg',
  };

  (
    globalThis as typeof globalThis & {
      iptablesTemplate?: (templ: string, wgInterface: { ipv4Cidr: string; ipv6Cidr: string; device: string; port: number }) => string;
    }
  ).iptablesTemplate = (templ, wgInterface) =>
    templ
      .replaceAll('{{ipv4Cidr}}', wgInterface.ipv4Cidr)
      .replaceAll('{{ipv6Cidr}}', wgInterface.ipv6Cidr)
      .replaceAll('{{device}}', wgInterface.device)
      .replaceAll('{{port}}', String(wgInterface.port));
});

describe('wgHelper', () => {
  test('generates server config with AmneziaWG 2.0 parameters', async () => {
    const { wg } = await import('../../server/utils/wgHelper');

    const serverConfig = wg.generateServerInterface(
      {
        name: 'wg0',
        device: 'eth0',
        port: 51820,
        privateKey: 'server-private',
        publicKey: 'server-public',
        ipv4Cidr: '10.10.10.0/24',
        ipv6Cidr: 'fdcc:ad94:bacf:61a4::/64',
        mtu: 1420,
        jC: 7,
        jMin: 64,
        jMax: 1000,
        s1: 52,
        s2: 56,
        s3: 12,
        s4: 8,
        h1: '100-200',
        h2: '300-400',
        h3: '500-600',
        h4: '700-800',
        i1: null,
        i2: null,
        i3: null,
        i4: null,
        i5: null,
        enabled: true,
        firewallEnabled: false,
        createdAt: '2026-04-05 00:00:00',
        updatedAt: '2026-04-05 00:00:00',
      },
      {
        id: 'wg0',
        preUp: '',
        postUp: 'iptables -t nat -A POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE',
        preDown: '',
        postDown:
          'iptables -t nat -D POSTROUTING -s {{ipv4Cidr}} -o {{device}} -j MASQUERADE',
        createdAt: '2026-04-05 00:00:00',
        updatedAt: '2026-04-05 00:00:00',
      },
      { enableIpv6: true }
    );

    expect(serverConfig).toContain('Jc = 7');
    expect(serverConfig).toContain('Jmin = 64');
    expect(serverConfig).toContain('Jmax = 1000');
    expect(serverConfig).toContain('S1 = 52');
    expect(serverConfig).toContain('S2 = 56');
    expect(serverConfig).toContain('S3 = 12');
    expect(serverConfig).toContain('S4 = 8');
    expect(serverConfig).toContain('H1 = 100-200');
    expect(serverConfig).toContain('H2 = 300-400');
    expect(serverConfig).toContain('H3 = 500-600');
    expect(serverConfig).toContain('H4 = 700-800');
    expect(serverConfig).toContain('Address = 10.10.10.1/24, fdcc:ad94:bacf:61a4::1/64');
    expect(serverConfig).toContain(
      'PostUp = iptables -t nat -A POSTROUTING -s 10.10.10.0/24 -o eth0 -j MASQUERADE'
    );
  });

  test('generates client config with AmneziaWG 2.0 parameters', async () => {
    const { wg } = await import('../../server/utils/wgHelper');

    const clientConfig = wg.generateClientConfig(
      {
        name: 'wg0',
        device: 'eth0',
        port: 51820,
        privateKey: 'server-private',
        publicKey: 'server-public',
        ipv4Cidr: '10.10.10.0/24',
        ipv6Cidr: 'fdcc:ad94:bacf:61a4::/64',
        mtu: 1420,
        jC: 7,
        jMin: 64,
        jMax: 1000,
        s1: 52,
        s2: 56,
        s3: 12,
        s4: 8,
        h1: '100-200',
        h2: '300-400',
        h3: '500-600',
        h4: '700-800',
        i1: null,
        i2: null,
        i3: null,
        i4: null,
        i5: null,
        enabled: true,
        firewallEnabled: false,
        createdAt: '2026-04-05 00:00:00',
        updatedAt: '2026-04-05 00:00:00',
      },
      {
        id: 'wg0',
        defaultMtu: 1420,
        defaultPersistentKeepalive: 0,
        defaultDns: ['1.1.1.1'],
        defaultAllowedIps: ['0.0.0.0/0'],
        defaultJC: 7,
        defaultJMin: 64,
        defaultJMax: 1000,
        defaultI1: null,
        defaultI2: null,
        defaultI3: null,
        defaultI4: null,
        defaultI5: null,
        host: 'vpn.example.com',
        port: 51820,
        createdAt: '2026-04-05 00:00:00',
        updatedAt: '2026-04-05 00:00:00',
      },
      {
        id: 1,
        userId: 1,
        interfaceId: 'wg0',
        name: 'client-1',
        ipv4Address: '10.10.10.2',
        ipv6Address: 'fdcc:ad94:bacf:61a4::2',
        preUp: '',
        postUp: '',
        preDown: '',
        postDown: '',
        privateKey: 'client-private',
        publicKey: 'client-public',
        preSharedKey: 'client-psk',
        expiresAt: null,
        allowedIps: ['0.0.0.0/0'],
        serverAllowedIps: [],
        firewallIps: null,
        persistentKeepalive: 0,
        mtu: 1420,
        jC: 7,
        jMin: 64,
        jMax: 1000,
        i1: '0x01',
        i2: null,
        i3: null,
        i4: null,
        i5: null,
        dns: ['1.1.1.1'],
        serverEndpoint: null,
        enabled: true,
        createdAt: '2026-04-05 00:00:00',
        updatedAt: '2026-04-05 00:00:00',
      },
      { enableIpv6: true }
    );

    expect(clientConfig).toContain('Address = 10.10.10.2/32, fdcc:ad94:bacf:61a4::2/128');
    expect(clientConfig).toContain('DNS = 1.1.1.1');
    expect(clientConfig).toContain('Jc = 7');
    expect(clientConfig).toContain('Jmin = 64');
    expect(clientConfig).toContain('Jmax = 1000');
    expect(clientConfig).toContain('S1 = 52');
    expect(clientConfig).toContain('S2 = 56');
    expect(clientConfig).toContain('S3 = 12');
    expect(clientConfig).toContain('S4 = 8');
    expect(clientConfig).toContain('H1 = 100-200');
    expect(clientConfig).toContain('H2 = 300-400');
    expect(clientConfig).toContain('H3 = 500-600');
    expect(clientConfig).toContain('H4 = 700-800');
    expect(clientConfig).toContain('I1 = 0x01');
    expect(clientConfig).toContain('Endpoint = vpn.example.com:51820');
  });
});
