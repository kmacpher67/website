#!/usr/bin/env bash
# Scaffold a new static site into this repo: site dir + index.html,
# nginx sites-available conf, deploywebsite.yml scp step, and README
# symlink line. Review the diff and commit yourself; this does not touch
# the remote server.
#
# Usage: scripts/add-site.sh newwebsite.com

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <domain>" >&2
  exit 1
fi

domain="$1"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

site_dir="$domain"
conf_file="sites-available/${domain}.conf"
workflow_file=".github/workflows/deploywebsite.yml"
readme_file="README.md"

if [ -e "$conf_file" ]; then
  echo "Error: $conf_file already exists" >&2
  exit 1
fi
if grep -qF "copy ${domain} via ssh password" "$workflow_file"; then
  echo "Error: $workflow_file already has a step for $domain" >&2
  exit 1
fi

mkdir -p "$site_dir"

index_created=0
if [ ! -e "$site_dir/index.html" ]; then
  index_created=1
  cat > "$site_dir/index.html" <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${domain}</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
    <div class="container py-5">
        <h1>${domain}</h1>
        <p class="lead">Welcome to ${domain}.</p>
    </div>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
EOF
fi

cat > "$conf_file" <<EOF
# ${domain} nginx config
server {
    listen 80;
    server_name ${domain} www.${domain};
    root /var/www/${domain};
    index index.html index.htm;

    access_log /var/log/nginx/${domain}.access.log;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

cat >> "$workflow_file" <<EOF

    - name: copy ${domain} via ssh password
      uses: appleboy/scp-action@v0.1.1
      with:
        host: \${{ secrets.HOST }}
        username: \${{ secrets.USERNAME }}
        key: \${{ secrets.KEY }}
        port: \${{ secrets.PORT }}
        source: "${domain}/"
        target: "/var/www"
EOF

# Insert the symlink line right before the closing fence of the code
# block that follows the "create a new host symbolic link on remote
# server" heading in README.
awk -v domain="$domain" '
  /^## create a new host symbolic link on remote server$/ { after_heading = 1 }
  after_heading && /^```$/ { fence_count++; if (fence_count == 2 && !inserted) {
    print "ln -s /etc/nginx/sites-available/" domain ".conf /etc/nginx/sites-enabled/"
    inserted = 1
  } }
  { print }
' "$readme_file" > "${readme_file}.tmp" && mv "${readme_file}.tmp" "$readme_file"

if [ "$index_created" -eq 1 ]; then
  index_line="  - ${site_dir}/index.html (created, Bootstrap starter)"
else
  index_line="  - ${site_dir}/index.html (already existed, left untouched)"
fi

cat <<EOF
Scaffolded ${domain}:
${index_line}
  - ${conf_file}
  - appended scp step to ${workflow_file}
  - appended symlink line to ${readme_file}

Remaining manual steps (still require the remote server):
  1. Review/edit ${site_dir}/index.html
  2. git add/commit/push
  3. On the remote server: ln -s /etc/nginx/sites-available/${domain}.conf /etc/nginx/sites-enabled/
  4. On the remote server: nginx -t && systemctl reload nginx (or /etc/init.d/nginx restart)
EOF
