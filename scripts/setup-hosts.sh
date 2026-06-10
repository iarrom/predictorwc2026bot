#!/usr/bin/env bash
set -euo pipefail

HOSTS_LINE="127.0.0.1 wcbot.localhost"

if grep -q 'wcbot.localhost' /etc/hosts; then
  echo "wcbot.localhost already in /etc/hosts"
  exit 0
fi

echo "Adding ${HOSTS_LINE} to /etc/hosts (requires sudo)..."
echo "${HOSTS_LINE}" | sudo tee -a /etc/hosts >/dev/null
echo "Done. Open https://wcbot.localhost:1355"
