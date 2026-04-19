---
title: AmneziaWG
---

## Introduction

**AmneziaWG** is a modified version of the WireGuard protocol with enhanced traffic obfuscation capabilities. AmneziaWG's primary goal is to counter deep packet inspection (DPI) systems and bypass VPN blocking.

AmneziaWG adds multi-level transport-layer obfuscation by:

- Modifying packet headers
- Randomizing handshake message sizes
- Disguising traffic to resemble popular UDP protocols

These measures make it harder for third parties to analyze or identify your traffic, enhancing both privacy and security.

## Activating AmneziaWG

You must install the [AmneziaWG kernel module](https://github.com/amnezia-vpn/amneziawg-linux-kernel-module) on the host system.

wg-easy uses AmneziaWG as the default and permanent WireGuard backend.

## AmneziaWG Parameters

Parameter descriptions can be found in the [AmneziaWG documentation](https://docs.amnezia.org/documentation/amnezia-wg) and on the [self-hosted AmneziaWG 2.0 guide](https://docs.amnezia.org/ru/documentation/instructions/new-amneziawg-selfhosted/).

AmneziaWG 2.0 adds `S3` and `S4`, and `H1-H4` are configured as numeric ranges.

According to the AmneziaWG 2.0 documentation:

- `Jc` range is `0-10`
- `Jmin` and `Jmax` range is `64-1024`
- `S1-S3` range is `0-64`
- `S4` range is `0-32`
- `H1-H4` range is `0-4294967295`

The official AmneziaWG 2.0 documentation also notes:

- AmneziaVPN client version `4.8.12.9` or newer is required for AmneziaWG 2.0.
- Existing AmneziaWG 1.0 configurations are treated as `Legacy`.
- Migrating from 1.0 to 2.0 requires generating a new configuration.

All parameters except I1-I5 will be set at first startup. For information on how to set I1-I5 parameters, refer to the [AmneziaWG documentation](https://docs.amnezia.org/ru/documentation/instructions/new-amneziawg-selfhosted/).

If a parameter is not set, it will not be added to the configuration. If all AmneziaWG-specific parameters are absent, AmneziaWG will be fully compatible with standard WireGuard.

### Parameter Compatibility Table

| Parameter | Can differ between server and client | Configurable on server | Configurable on client  |
| --------- | ------------------------------------ | ---------------------- | ----------------------- |
| Jc        | ✅ Yes                               | ✅                     | ✅                      |
| Jmin      | ✅ Yes                               | ✅                     | ✅                      |
| Jmax      | ✅ Yes                               | ✅                     | ✅                      |
| S1-S4     | ❌ No, must match                    | ✅                     | ❌ (copied from server) |
| H1-H4     | ❌ No, must match                    | ✅                     | ❌ (copied from server) |
| I1-I5     | ✅ Yes                               | ✅                     | ✅                      |

## Client Applications

To be able to connect to wg-easy if AmneziaWG is enabled, you must have an AmneziaWG-compatible client. Where an AmneziaWG app is available for your platform, it is recommended to use it rather than Amnezia VPN.

Android:

- [AmneziaWG](https://play.google.com/store/apps/details?id=org.amnezia.awg) - AmneziaWG Official Client
- [WG Tunnel](https://play.google.com/store/apps/details?id=com.zaneschepke.wireguardautotunnel) - Third Party Client
- [Amnezia VPN](https://play.google.com/store/apps/details?id=org.amnezia.vpn) - Amnezia VPN Official Client

iOS and macOS:

- [AmneziaWG](https://apps.apple.com/us/app/amneziawg/id6478942365) - AmneziaWG Official Client
- [Amnezia VPN](https://apps.apple.com/us/app/amneziavpn/id1600529900) - Amnezia VPN Official Client

Windows:

- [AmneziaWG](https://github.com/amnezia-vpn/amneziawg-windows-client/releases) - AmneziaWG Official Client (Requires building from source code)
- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client

Linux:

- [Amnezia VPN](https://amnezia.org/downloads) - Amnezia VPN Official Client
- [amneziawg-tools](https://github.com/amnezia-vpn/amneziawg-tools) - AmneziaWG Tools

OpenWRT:

- [AmneziaWG OpenWRT](https://github.com/Slava-Shchipunov/awg-openwrt) - AmneziaWG OpenWRT Packages
- [AmneziaWG OpenWRT](https://github.com/lolo6oT/awg-openwrt) - AmneziaWG OpenWRT Packages
