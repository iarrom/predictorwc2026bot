#!/usr/bin/env bash
# Regenerate wcbot.localhost TLS cert in portless-compatible format (EC, not RSA).
set -euo pipefail

STATE_DIR="${PORTLESS_STATE_DIR:-$HOME/.portless}"
HOST_DIR="$STATE_DIR/host-certs"
SAFE_NAME="wcbot_localhost"

rm -f "$HOST_DIR/${SAFE_NAME}.pem" "$HOST_DIR/${SAFE_NAME}-key.pem" \
  "$HOST_DIR/${SAFE_NAME}.csr" "$HOST_DIR/${SAFE_NAME}-ext.cnf"

openssl ecparam -genkey -name prime256v1 -noout -out "$HOST_DIR/${SAFE_NAME}-key.pem"
openssl req -new -key "$HOST_DIR/${SAFE_NAME}-key.pem" \
  -out "$HOST_DIR/${SAFE_NAME}.csr" -subj "/CN=wcbot.localhost"

cat > "$HOST_DIR/${SAFE_NAME}-ext.cnf" <<'EOF'
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage=digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:wcbot.localhost,DNS:*.localhost
EOF

SERIAL_FILE="$(mktemp)"
echo 01 > "$SERIAL_FILE"
openssl x509 -req -sha256 -in "$HOST_DIR/${SAFE_NAME}.csr" \
  -CA "$STATE_DIR/ca.pem" -CAkey "$STATE_DIR/ca-key.pem" \
  -CAserial "$SERIAL_FILE" -out "$HOST_DIR/${SAFE_NAME}.pem" \
  -days 397 -extfile "$HOST_DIR/${SAFE_NAME}-ext.cnf"
rm -f "$SERIAL_FILE"

chmod 600 "$HOST_DIR/${SAFE_NAME}-key.pem"
chmod 644 "$HOST_DIR/${SAFE_NAME}.pem"
rm -f "$HOST_DIR/${SAFE_NAME}.csr" "$HOST_DIR/${SAFE_NAME}-ext.cnf"

echo "Regenerated $HOST_DIR/${SAFE_NAME}.pem"
echo "Restart proxy: pnpm proxy:stop && pnpm proxy:start:https"
