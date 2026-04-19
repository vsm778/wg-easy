---
title: CLI
---

If you want to use the CLI, you can run it with

### Docker Compose

```shell
cd /etc/docker/containers/wg-easy
docker compose exec -it wg-easy cli
```

### Docker Run

```shell
docker run --rm -it \
    -v ~/.wg-easy:/etc/wireguard \
    -v ~/.wg-easy-db:/db \
    ghcr.io/wg-easy/wg-easy:15 \
    cli
```

### Create Initial Admin User

If you want to create the initial admin directly in the SQLite database, you can run:

```shell
docker compose exec -it wg-easy cli db:admin:create --username <admin_username> --password <admin_password>
```

This creates the initial admin user and advances the setup flow to step `3`.

### Reset Password

If you want to reset the password for the admin user, you can run the following command:

#### By Prompt

```shell
cd /etc/docker/containers/wg-easy
docker compose exec -it wg-easy cli db:admin:reset
```

You are asked to provide the new password

#### By Argument

```shell
cd /etc/docker/containers/wg-easy
docker compose exec -it wg-easy cli db:admin:reset --password <new_password>
```

This will reset the password for the admin user to the new password you provided. If you include special characters in the password, make sure to escape them properly.

### Show Clients

List all clients that are currently configured with details such as client ID, Name, Public Key, and enabled status.

```shell
cli clients:list
```

### Show Client QR Code

Display the QR code for a specific client, which can be scanned by a compatible app to import the client's configuration.

```shell
cli clients:qr <client_id>
```

Replace `<client_id>` with the actual client ID you want to show the QR code for.

/// warning | IPv6 Support

IPv6 support is enabled by default, even if you disabled it using environment variables. To disable it pass the `--no-ipv6` flag when running the CLI.

```shell
cli clients:qr <client_id> --no-ipv6
```

///
