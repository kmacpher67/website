#!/usr/bin/env bash
# Retire a site: move its conf into sites-available/deprecated/, strip its
# scp-action step from deploywebsite.yml, and drop its ln -s line from the
# README. Does not touch the remote server or delete the site's content
# folder (kept for history) - review the diff and commit yourself.
#
# Usage: scripts/deprecate-site.sh <domain>

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <domain>" >&2
  exit 1
fi

domain="$1"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

conf_file="sites-available/${domain}.conf"
deprecated_dir="sites-available/deprecated"
deprecated_conf="${deprecated_dir}/${domain}.conf"
workflow_file=".github/workflows/deploywebsite.yml"
readme_file="README.md"

if [ -e "$deprecated_conf" ]; then
  echo "$domain is already deprecated (${deprecated_conf})" >&2
  exit 0
fi
if [ ! -e "$conf_file" ]; then
  echo "Error: $conf_file not found" >&2
  exit 1
fi

mkdir -p "$deprecated_dir"
git mv "$conf_file" "$deprecated_conf"

workflow_result=$(python3 - "$workflow_file" "$domain" <<'PY'
import re, sys
path, domain = sys.argv[1], sys.argv[2]
with open(path) as f:
    text = f.read()
pattern = re.compile(
    r"\n *- name: copy " + re.escape(domain) + r" via ssh password\n(?:.*\n)*?(?= *- name:| *#|\Z)"
)
new_text, n = pattern.subn("\n", text, count=1)
if n:
    with open(path, "w") as f:
        f.write(new_text)
    print("removed")
else:
    print("not-found")
PY
)
if [ "$workflow_result" = "removed" ]; then
  echo "removed workflow step for ${domain}"
else
  echo "no workflow step found for ${domain} (nothing to remove)"
fi

if grep -qF "sites-available/${domain}.conf /etc/nginx/sites-enabled/" "$readme_file"; then
  sed -i "\|sites-available/${domain}\.conf /etc/nginx/sites-enabled/|d" "$readme_file"
  echo "removed README symlink line for ${domain}"
else
  echo "no README symlink line found for ${domain} (nothing to remove)"
fi

cat <<EOF

Deprecated ${domain}. Review the diff, then commit.

Remote cleanup (run once over SSH - the deploy workflow only ever adds
conf files, it never deletes ones removed from the repo, so the old file
has to be removed by hand or the CI auto-symlink loop will keep
re-enabling it):
  rm -f /etc/nginx/sites-enabled/${domain}.conf
  rm -f /etc/nginx/sites-available/${domain}.conf
  nginx -t && systemctl reload nginx
EOF
