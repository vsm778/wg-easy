---
title: Installation with Makefile
---

## Overview

This repository includes a `Makefile` that can:

1. Create a dedicated host user for Docker access
2. Create `INSTALL_DIR`, `INSTALL_DIR/db`, and `INSTALL_DIR/config/wireguard`
3. Build a Docker image
4. Generate a rendered `docker-compose.yml`
5. Start `wg-easy` from `INSTALL_DIR`
6. Create the initial admin user in the SQLite database
7. Remove the deployment with explicit confirmation
8. Recreate the container after rebuilding the image

No defaults are assumed. If a required variable is missing, `make` will fail immediately.

You can keep deployment variables in a local `deploy.mk` file. The repository `Makefile` automatically includes it when present. A tracked example is provided as `deploy.mk.example`.

## Host Preparation

Create a dedicated user and the deployment directory:

```shell
make host-setup APP_USER=wg-easy
```

This creates:

1. A system user named `wg-easy`
2. Membership in the `docker` group
3. The directories `INSTALL_DIR`, `INSTALL_DIR/db`, and `INSTALL_DIR/config/wireguard`

## Deployment Flow

The intended flow is:

1. `make host-setup APP_USER=wg-easy`
2. `make build IMAGE=wg-easy:local`
3. `make config ...`
4. `make up APP_USER=wg-easy`
5. `make admin-create ...`

`make config` renders the final Docker Compose file to:

```text
INSTALL_DIR/docker-compose.yml
```

`make up` then runs Docker Compose using that rendered file as `APP_USER`.

The SQLite database for the Web UI and admin login is stored separately at:

```text
INSTALL_DIR/db/wg-easy.db
```

WireGuard configuration files remain under `/etc/wireguard` inside the container.
On the host, those files are stored in:

```text
INSTALL_DIR/config/wireguard
```

The rendered Compose file uses relative bind mounts:

```yaml
- ./db:/db
- ./config/wireguard:/etc/wireguard
```

Because `make config` writes the final Compose file to `INSTALL_DIR/docker-compose.yml`, those paths resolve to `INSTALL_DIR/db` and `INSTALL_DIR/config/wireguard` on the host.

The generated Compose file also includes:

```yaml
devices:
  - /dev/net/tun:/dev/net/tun
```

This is required for the `amneziawg-go` userspace fallback when the host kernel does not provide the AmneziaWG kernel module.

## Required Variables

| Variable | Description |
| -------- | ----------- |
| `APP_USER` | System user that owns `INSTALL_DIR` and runs Docker Compose |
| `IMAGE` | Docker image tag to build and run |
| `INSTALL_DIR` | Base deployment directory on the host |
| `INIT_ENABLED` | Enables initial setup values such as the interface CIDR |
| `INIT_IPV4_CIDR` | Initial IPv4 CIDR for the `wg0` interface stored in the database |
| `INIT_IPV6_CIDR` | Initial IPv6 CIDR for the `wg0` interface stored in the database |
| `INSECURE` | Must be `true` for HTTP login without HTTPS |
| `WEB_PORT` | TCP port for the Web UI |
| `AWG_PORT` | UDP port for AmneziaWG |
| `WG_IPV4_SUBNET` | Docker IPv4 subnet |
| `WG_IPV4_ADDRESS` | Container IPv4 address inside that subnet |
| `WG_IPV6_SUBNET` | Docker IPv6 subnet |
| `WG_IPV6_ADDRESS` | Container IPv6 address inside that subnet |
| `WEB_PUBLISH_HOSTS` | One or more host IP addresses where the Web UI should be published |
| `AWG_PUBLISH_HOSTS` | One or more host IP addresses where AmneziaWG should be published |

## Build the Image

```shell
make build IMAGE=wg-easy:local
```

## Deployment Config File

Create a local `deploy.mk` from the example:

```shell
cp deploy.mk.example deploy.mk
```

Then edit the values in `deploy.mk`.

By default the example uses:

```make
INSTALL_DIR := /opt/wg-easy
```

## Render the Compose File

```shell
make config
```

`INIT_IPV4_CIDR` and `INIT_IPV6_CIDR` are applied through the initial setup logic before setup is completed. If the database has already finished setup, changing these variables alone will not rewrite the existing interface CIDR.

In practice, these two variables replace the built-in initial `10.8.0.0/24` and matching IPv6 CIDR only for a new or not-yet-finished setup flow.

## Start the Stack

```shell
make up APP_USER=wg-easy
```

## Create the Initial Admin User

```shell
make admin-create \
  APP_USER=wg-easy \
  ADMIN_USERNAME=admin \
  ADMIN_PASSWORD='change-me-now'
```

## Helpful Commands

Stop the stack:

```shell
make down APP_USER=wg-easy
```

Show status:

```shell
make ps APP_USER=wg-easy
```

Tail logs:

```shell
make logs APP_USER=wg-easy
```

Restart the stack:

```shell
make restart APP_USER=wg-easy
```

Recreate the container from the current image after `make build`:

```shell
make redeploy APP_USER=wg-easy
```

Destroy the deployment and delete `/opt/wg-easy`:

```shell
make destroy APP_USER=wg-easy
```

This command asks you to type `DELETE` before it:

- stops the Docker Compose stack
- deletes `/opt/wg-easy`
- removes the rendered Compose file, the SQLite database, and the WireGuard config directory
