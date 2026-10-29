#!/usr/bin/env bash
# Packs a dump made by dump.sh and encrypts it for the owner's public key, then deletes the
# plaintext. Refuses to run if ops/backup-public-key.asc isn't the key pinned in
# BACKUP_KEY_FINGERPRINT, so swapping the key file alone can't redirect backups.
#
# Usage: BACKUP_KEY_FINGERPRINT=<fingerprint> encrypt.sh <dump-dir> <output.tar.gz.gpg>
set -euo pipefail

dir="$1"
output="$2"
key="$(cd "$(dirname "$0")/../.." && pwd)/ops/backup-public-key.asc"

actual=$(gpg --batch --with-colons --show-keys "$key" | awk -F: '/^fpr:/ { print $10; exit }')
if [ -z "${BACKUP_KEY_FINGERPRINT:-}" ] || [ "$actual" != "$BACKUP_KEY_FINGERPRINT" ]; then
  echo "ops/backup-public-key.asc is not the pinned backup key (got ${actual:-none})."
  exit 1
fi

tarball="${output%.gpg}"
tar -czf "$tarball" -C "$dir" roles.sql schema.sql data.sql expected-counts.txt
gpg --batch --yes --recipient-file "$key" --output "$output" --encrypt "$tarball"
rm -rf "$dir" "$tarball"
ls -l "$output"
