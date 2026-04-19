SHELL := /bin/sh

-include deploy.mk

COMPOSE_FILE ?= docker-compose.yml
INSTALL_DIR ?= /opt/wg-easy
RENDERED_COMPOSE_FILE := $(INSTALL_DIR)/docker-compose.yml
RENDERED_PORTS_TMP := /tmp/wg-easy.rendered.ports
RENDERED_COMPOSE_TMP := /tmp/wg-easy.rendered.compose.yml

export IMAGE
export INSTALL_DIR
export INIT_ENABLED
export INIT_IPV4_CIDR
export INIT_IPV6_CIDR
export INSECURE
export WEB_PORT
export AWG_PORT
export WG_IPV4_SUBNET
export WG_IPV4_ADDRESS
export WG_IPV6_SUBNET
export WG_IPV6_ADDRESS

.PHONY: help host-user host-dirs host-setup build up redeploy down restart logs ps config admin-create destroy clean-hosts

help:
	@printf '%s\n' \
	'host-user    Create a dedicated system user and add it to the docker group' \
	'host-dirs    Create $(INSTALL_DIR), $(INSTALL_DIR)/db and $(INSTALL_DIR)/config/wireguard owned by APP_USER' \
	'host-setup   Run host-user and host-dirs' \
	'build        Build the production Docker image' \
	'config       Generate $(RENDERED_COMPOSE_FILE)' \
	'admin-create Create the initial admin user in the SQLite database' \
	'destroy      Stop wg-easy and delete $(INSTALL_DIR) after confirmation' \
	'up           Run docker compose from $(INSTALL_DIR)' \
	'redeploy     Recreate the container from the current image' \
	'down         Stop docker compose from $(INSTALL_DIR)' \
	'restart      Restart docker compose from $(INSTALL_DIR)' \
	'logs         Tail docker compose logs from $(INSTALL_DIR)' \
	'ps           Show docker compose status from $(INSTALL_DIR)' \
	'clean-hosts  Remove generated temporary files' \
	'' \
	'Required variables for config:' \
	'  APP_USER' \
	'  IMAGE, INIT_ENABLED, INIT_IPV4_CIDR, INIT_IPV6_CIDR, INSECURE, WEB_PORT, AWG_PORT' \
	'  WG_IPV4_SUBNET, WG_IPV4_ADDRESS, WG_IPV6_SUBNET, WG_IPV6_ADDRESS' \
	'  WEB_PUBLISH_HOSTS, AWG_PUBLISH_HOSTS' \
	'  INIT_IPV4_CIDR and INIT_IPV6_CIDR configure the initial wg0 client CIDR before setup is completed' \
	'' \
	'Required variables for host-user/host-dirs/host-setup:' \
	'  APP_USER' \
	'' \
	'Required variables for up/down/logs/ps:' \
	'  APP_USER' \
	'' \
	'Required variables for redeploy:' \
	'  APP_USER' \
	'' \
	'Required variables for admin-create:' \
	'  APP_USER, ADMIN_USERNAME, ADMIN_PASSWORD' \
	'' \
	'Required variables for destroy:' \
	'  APP_USER' \
	'' \
	'Examples:' \
	'  make host-setup APP_USER=wg-easy' \
	'  make build IMAGE=wg-easy:local' \
	'  make config APP_USER=wg-easy IMAGE=wg-easy:local INIT_ENABLED=true INIT_IPV4_CIDR=10.10.10.0/24 INIT_IPV6_CIDR=fdcc:ad94:bacf:61a4::/64 INSECURE=true WEB_PORT=51821 AWG_PORT=51820 WG_IPV4_SUBNET=10.10.0.0/24 WG_IPV4_ADDRESS=10.10.0.10 WG_IPV6_SUBNET=fdcc:ad94:bacf:61a3::/64 WG_IPV6_ADDRESS=fdcc:ad94:bacf:61a3::2a WEB_PUBLISH_HOSTS="192.168.1.10" AWG_PUBLISH_HOSTS="10.10.0.10 192.168.1.10"' \
	'  make admin-create APP_USER=wg-easy ADMIN_USERNAME=admin ADMIN_PASSWORD=change-me-now' \
	'  make redeploy APP_USER=wg-easy' \
	'  make destroy APP_USER=wg-easy' \
	'  make up APP_USER=wg-easy'

define require_nonempty
	@if [ -z "$($1)" ]; then \
	  echo "Missing required variable: $1" >&2; \
	  exit 1; \
	fi
endef

define require_publish_config
	@if [ -z "$(strip $(WEB_PUBLISH_HOSTS))" ]; then \
	  echo "Missing required variable: WEB_PUBLISH_HOSTS" >&2; \
	  exit 1; \
	fi
	@if [ -z "$(strip $(AWG_PUBLISH_HOSTS))" ]; then \
	  echo "Missing required variable: AWG_PUBLISH_HOSTS" >&2; \
	  exit 1; \
	fi
endef

validate-build:
	$(call require_nonempty,IMAGE)

validate-host:
	$(call require_nonempty,APP_USER)

validate-admin-create:
	$(call require_nonempty,APP_USER)
	$(call require_nonempty,ADMIN_USERNAME)
	$(call require_nonempty,ADMIN_PASSWORD)

validate-compose:
	$(call require_nonempty,APP_USER)
	$(call require_nonempty,IMAGE)
	$(call require_nonempty,INIT_ENABLED)
	$(call require_nonempty,INIT_IPV4_CIDR)
	$(call require_nonempty,INIT_IPV6_CIDR)
	$(call require_nonempty,INSECURE)
	$(call require_nonempty,WEB_PORT)
	$(call require_nonempty,AWG_PORT)
	$(call require_nonempty,WG_IPV4_SUBNET)
	$(call require_nonempty,WG_IPV4_ADDRESS)
	$(call require_nonempty,WG_IPV6_SUBNET)
	$(call require_nonempty,WG_IPV6_ADDRESS)
	$(call require_publish_config)

host-user: validate-host
	@if getent group docker >/dev/null 2>&1; then :; else echo "Missing required host group: docker" >&2; exit 1; fi
	@if id -u "$(APP_USER)" >/dev/null 2>&1; then \
	  echo "User $(APP_USER) already exists"; \
	else \
	  sudo useradd --system --create-home --shell /bin/sh "$(APP_USER)"; \
	fi
	sudo usermod -aG docker "$(APP_USER)"

host-dirs: validate-host
	sudo install -d -m 0750 -o "$(APP_USER)" -g "$(APP_USER)" "$(INSTALL_DIR)"
	sudo install -d -m 0750 -o "$(APP_USER)" -g "$(APP_USER)" "$(INSTALL_DIR)/db"
	sudo install -d -m 0750 -o "$(APP_USER)" -g "$(APP_USER)" "$(INSTALL_DIR)/config"
	sudo install -d -m 0750 -o "$(APP_USER)" -g "$(APP_USER)" "$(INSTALL_DIR)/config/wireguard"

host-setup: host-user host-dirs

build: validate-build
	docker build -t "$(IMAGE)" -f Dockerfile .

clean-hosts:
	rm -f "$(RENDERED_PORTS_TMP)" "$(RENDERED_COMPOSE_TMP)"

define generate_ports_block
rm -f "$(RENDERED_PORTS_TMP)"; \
printf '%s\n' '    ports:' > "$(RENDERED_PORTS_TMP)"; \
for host in $(AWG_PUBLISH_HOSTS); do \
	  printf '      - "%s:%s:%s/udp"\n' "$$host" "$(AWG_PORT)" "$(AWG_PORT)" >> "$(RENDERED_PORTS_TMP)"; \
done; \
for host in $(WEB_PUBLISH_HOSTS); do \
	  printf '      - "%s:%s:%s/tcp"\n' "$$host" "$(WEB_PORT)" "$(WEB_PORT)" >> "$(RENDERED_PORTS_TMP)"; \
	done
endef

config: validate-compose host-dirs
	@$(generate_ports_block)
	awk -v image="$(IMAGE)" \
	  -v init_enabled="$(INIT_ENABLED)" \
	  -v init_ipv4_cidr="$(INIT_IPV4_CIDR)" \
	  -v init_ipv6_cidr="$(INIT_IPV6_CIDR)" \
	  -v insecure="$(INSECURE)" \
	  -v web_port="$(WEB_PORT)" \
	  -v awg_port="$(AWG_PORT)" \
	  -v wg_ipv4_subnet="$(WG_IPV4_SUBNET)" \
	  -v wg_ipv4_address="$(WG_IPV4_ADDRESS)" \
	  -v wg_ipv6_subnet="$(WG_IPV6_SUBNET)" \
	  -v wg_ipv6_address="$(WG_IPV6_ADDRESS)" \
	  'BEGIN { inserted = 0 } \
	  /^    restart: unless-stopped$$/ && !inserted { \
	    while ((getline line < "$(RENDERED_PORTS_TMP)") > 0) print line; \
	    close("$(RENDERED_PORTS_TMP)"); \
	    inserted = 1; \
	  } \
	  { \
	    gsub(/\$$\{IMAGE:\?IMAGE is required\}/, image); \
	    gsub(/\$$\{INIT_ENABLED:\?INIT_ENABLED is required\}/, init_enabled); \
	    gsub(/\$$\{INIT_IPV4_CIDR:\?INIT_IPV4_CIDR is required\}/, init_ipv4_cidr); \
	    gsub(/\$$\{INIT_IPV6_CIDR:\?INIT_IPV6_CIDR is required\}/, init_ipv6_cidr); \
	    gsub(/\$$\{INSECURE:\?INSECURE is required\}/, insecure); \
	    gsub(/\$$\{WEB_PORT:\?WEB_PORT is required\}/, web_port); \
	    gsub(/\$$\{AWG_PORT:\?AWG_PORT is required\}/, awg_port); \
	    gsub(/\$$\{WG_IPV4_SUBNET:\?WG_IPV4_SUBNET is required\}/, wg_ipv4_subnet); \
	    gsub(/\$$\{WG_IPV4_ADDRESS:\?WG_IPV4_ADDRESS is required\}/, wg_ipv4_address); \
	    gsub(/\$$\{WG_IPV6_SUBNET:\?WG_IPV6_SUBNET is required\}/, wg_ipv6_subnet); \
	    gsub(/\$$\{WG_IPV6_ADDRESS:\?WG_IPV6_ADDRESS is required\}/, wg_ipv6_address); \
	  } \
	  { print }' "$(COMPOSE_FILE)" > "$(RENDERED_COMPOSE_TMP)"
	sudo install -m 0640 -o "$(APP_USER)" -g "$(APP_USER)" "$(RENDERED_COMPOSE_TMP)" "$(RENDERED_COMPOSE_FILE)"

admin-create: validate-admin-create
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" exec -T wg-easy cli db:admin:create --username "$(ADMIN_USERNAME)" --password "$(ADMIN_PASSWORD)"; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi

destroy: validate-host
	@printf '%s\n' 'This will stop wg-easy and permanently delete $(INSTALL_DIR).' ; \
	printf '%s' 'Type DELETE to continue: ' ; \
	read confirm ; \
	if [ "$$confirm" != "DELETE" ]; then \
	  echo 'Aborted.' ; \
	  exit 1 ; \
	fi
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" down || exit $$?; \
	fi
	sudo rm -rf "$(INSTALL_DIR)"

up: validate-host
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" up -d; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi

redeploy: validate-host
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" up -d --force-recreate; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi

down: validate-host
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" down; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi

restart: down up

logs: validate-host
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" logs -f; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi

ps: validate-host
	@if sudo -u "$(APP_USER)" test -f "$(RENDERED_COMPOSE_FILE)"; then \
	  sudo -u "$(APP_USER)" docker compose -f "$(RENDERED_COMPOSE_FILE)" ps; \
	else \
	  echo "Missing rendered compose file: $(RENDERED_COMPOSE_FILE)" >&2; \
	  exit 1; \
	fi
