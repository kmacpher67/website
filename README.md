# website
ken macpherson public static website named hosting system
- SSL is typically handled by cloudflare.com front end.
- Every site runs in Cloudflare's **Flexible** SSL/TLS mode: visitor to
  Cloudflare is encrypted, Cloudflare to this origin server is plain
  HTTP (`listen 80` only, no `443 ssl` block in any `sites-available/*.conf`).
  See [Configure Cloudflare for a new domain](#configure-cloudflare-for-a-new-domain-flexible-ssl-no-origin-ssl)
  below and [docs/cloudflare-ssl.md](docs/cloudflare-ssl.md) for the
  paused end-to-end (Full strict) plan.

## Commit message note
- For commits that change a specific site folder, prefix the commit subject with the site host name and ` - `.
- Required format: `<hostname> - <short summary>`.
- Example: `oakland.center - update hero copy`
- This makes it easy to find all commits for a given host later.

See [the GitHub Actions plan](claude-change-recommendations.md) for a review of the current deployment workflow behavior.

Atlantic.Net also has a REST API for managing cloud services programmatically. See the [FAQ](https://www.atlantic.net/faq/) and the [API introduction](https://www.atlantic.net/docs/api/#introduction).

## How to add a new website and host it: 

Steps 1-2 and part of 5-6 below (site scaffold, nginx conf, workflow scp
step, README symlink line) can be generated with:
```
scripts/add-site.sh newwebsite.com
```
Review the diff, commit, and push. The "shell run ssh remote command"
step in `deploywebsite.yml` symlinks every conf under `sites-available/`
into `sites-enabled/` on the remote server (`ln -sf`, so it's safe to
re-run), then runs `nginx -t` and restarts nginx — but only when a
push actually touches an active conf (a `detect nginx conf changes` step
diffs `sites-available/*.conf`, excluding `deprecated/`, against the
previous commit and skips the restart step otherwise). Content-only
pushes no longer bounce nginx. Step 6's manual `ln -s` on the remote
server is no longer required for new sites — CI does it automatically
whenever the conf changes.

## Deprecated sites

A domain that's no longer live but worth keeping the conf for (history /
possible revival) goes in `sites-available/deprecated/`. Confs there are
plain files, not `.conf` files directly under `sites-available/`, so:
- the CI auto-symlink loop (`sites-available/*.conf`) skips them, and
- they never get enabled or copied by the deploy workflow.

If a domain is retiring, remove its scp-action step from
`deploywebsite.yml`, `git mv` its conf into `sites-available/deprecated/`,
and drop its `ln -s` line from the list below. If it's still symlinked on
the remote server, remove that manually:
```
rm -f /etc/nginx/sites-enabled/<domain>.conf
```

If you rename a host, treat the old name the same way. A renamed vhost can
leave behind an orphaned active config in `sites-enabled/` that still claims
the old `server_name` and root path, which can keep serving stale content or
404s. After a rename, make sure the old file is removed from
`sites-enabled/`, and either delete it or move it into
`sites-available/deprecated/` if you want to keep it for history.

## Configure Cloudflare for a new domain (Flexible SSL, no origin SSL)

This repo's nginx confs only ever `listen 80` — there is no `443 ssl`
block anywhere, and no origin certificate exists on the server. TLS for
visitors is provided entirely by Cloudflare sitting in front, in
**Flexible** mode. This step happens in the Cloudflare dashboard, not in
this repo, and is required for every new domain or the site will not be
reachable over `https://`.

1. **Add the domain as a Cloudflare site** (if not already a zone) and
   point its registrar nameservers at Cloudflare.
2. **DNS tab** — add an `A` record for the bare domain and one for `www`,
   both pointing at this origin server's IP, both **proxied** (orange
   cloud, not grey/DNS-only). Match the pattern of every other domain in
   `sites-available/`.
3. **SSL/TLS tab → Overview** — set the encryption mode to **Flexible**.
   This is the mode every other site here uses today. Do **not** pick
   Full or Full (strict) — there is no cert on the origin to satisfy
   them, and Cloudflare will serve visitors a 521/526 error instead of
   falling back to plain HTTP.
4. **SSL/TLS tab → Edge Certificates** — leave "Always Use HTTPS" on if
   you want `http://` visitors redirected to `https://` at Cloudflare's
   edge (this doesn't touch the origin leg, still plain HTTP behind it).
5. Confirm `curl -I https://<domain>/` returns `200`/`301` from
   Cloudflare once DNS has propagated.

See [docs/cloudflare-ssl.md](docs/cloudflare-ssl.md) for the paused plan
to move to Full (strict) end-to-end encryption (per-domain Origin CA
cert + `443 ssl` block) — not implemented for any site yet, deadpool.fyi
included.

### 1. Create the website files in the local development environment 

```
mkdir -p ~/personal/website/{newwebsite.com}
touch ~/personal/website/{newwebsite.com}/index.html
cat > ~/personal/website/{newwebsite.com}/index.html <<EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
</head>
<body>
    
</body>
</html>
EOF
```

### 2. Create the nginx configuration file

```
cp /etc/nginx/sites-available/wealthstrategyguy.com.conf /etc/nginx/sites-available/newwebsite.com.conf
```

### 3. Edit the nginx configuration file

```
nano /etc/nginx/sites-available/newwebsite.com.conf
```
Edit:  line 1: comment with the new website name
Edit:  server_name to {newwebsite.com} and {www.newwebsite.com} 
Edit:  root to {/var/www/newwebsite.com}
Edit:  access_log to {/var/log/nginx/newwebsite.com-access.log}

### 5. .github/workflows/deploywebsite.yml — no manual edit needed

`deploywebsite.yml` auto-detects any top-level folder that has a matching
`sites-available/<domain>.conf` and scp's it to `/var/www/` on push — the
old per-site `copy <domain> via ssh password` step (shown further below,
kept only as a historical example) is **not required** for new sites
anymore.

### 6. Enable the website on the remote server machine & update the section of the README.md file

```
ln -s /etc/nginx/sites-available/newwebsite.com.conf /etc/nginx/sites-enabled/
```

### 5. Test the nginx configuration

```
nginx -t
```
Should show: 
```
root@canvas:~# nginx -t
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 6. Reload nginx

```
systemctl reload nginx
tail -f /var/log/nginx/error.log
```


## create a new host symbolic link on remote server
- Update this section witht he symbolic link command for the new website
```
ln -s /etc/nginx/sites-available/howlandrotary.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/tcpanthers.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/heavensentdoula.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kenmacpherson.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/vibrant-auto.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/customcoatedglass.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/joryanpizzulo.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/warrendeservesbetter.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/jp2m.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/kmac-dogs.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/lenamasonchristian.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/repealtheraises.org.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/adzispeppers.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/defendwarren.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/wealthstrategyguy.com.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/oakland.center.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/churchoflightandsound.net.conf /etc/nginx/sites-enabled/
ln -s /etc/nginx/sites-available/deadpool.fyi.conf /etc/nginx/sites-enabled/
```

## Verify the new changes of newwebsitename.com on the remote server

# make sure new name is there (git added it and commit and pushed)
ls -ltr /etc/nginx/sites-available/defendwarren.com.conf
ln -s /etc/nginx/sites-available/defendwarren.com.conf /etc/nginx/sites-enabled/

/etc/init.d/nginx restart
### why doesn't his work>>>    systemctl restart nginx
```


## errors: 

```
# tail /var/log/nginx/error.log
2023/08/01 14:54:44 [emerg] 26308#26308: open() "/etc/nginx/sites-enabled/tcpanthers.org.conf" failed (2: No such file or directory) in /etc/nginx/nginx.conf:62

```
2025/05/08 19:36:13 [alert] 10670#10670: *36 open socket #24 left in connection 3
2025/05/08 19:36:13 [alert] 10670#10670: aborting
```
Open files issue. 


```

# update  modified:   .github/workflows/deploywebsite.yml
Make sure you update the 
`.github/workflows/deploywebsite.yml`
```- name: copy website nginx conf file```

```
    - name: copy customcoatedglass.com via ssh password
      uses: appleboy/scp-action@v0.1.1
      with:
        host: ${{ secrets.HOST }}
        username: ${{ secrets.USERNAME }}
        key: ${{ secrets.KEY }}
        port: ${{ secrets.PORT }}
        source: "customcoatedglass.com/"
        target: "/var/www"      


```
