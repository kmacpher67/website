# Cloudflare SSL/TLS — end-to-end encryption plan (paused)

**Status: paused, not implemented.** No site in this repo currently has a
`443 ssl` block or an Origin CA cert. This doc records the plan and the
reasoning behind it so it doesn't need to be re-derived next time it's
picked up. Every site currently runs exactly as it did before this plan
existed — `listen 80` only, Cloudflare in "Flexible" mode.

## Background

This repo hosts many independent static sites behind Cloudflare, which
proxies every site. There are two legs to secure: **visitor → Cloudflare**,
and **Cloudflare → origin server**. Cloudflare's "Flexible" mode (the
default here today) only encrypts the first leg — traffic from Cloudflare
to the origin is plain HTTP.

## The four Cloudflare SSL/TLS modes

| Mode | Visitor → Cloudflare | Cloudflare → Origin |
|---|---|---|
| Off | Plaintext | Plaintext |
| Flexible (current) | Encrypted | Plaintext |
| Full | Encrypted | Encrypted, cert not validated |
| Full (strict) | Encrypted | Encrypted, cert validated |

Only **Full (strict)** is genuine end-to-end encryption.

## The plan, if resumed

1. Issue a free Cloudflare **Origin CA certificate** per hostname (valid up
   to 15 years, trusted by Cloudflare's edge natively — no Let's Encrypt
   needed). Private key is generated locally/in CI and never sent to
   Cloudflare, only the CSR.
2. Add a `listen 443 ssl` server block to that site's
   [`sites-available/*.conf`](../sites-available/), pointing at the cert/key
   **paths** on the origin (e.g. `/etc/ssl/cloudflare/<host>.pem`) —
   alongside the existing `listen 80` block, never replacing it.
3. Flip that zone's Cloudflare SSL/TLS mode to Full (strict).

The private key/cert files and any Cloudflare API tokens are never
committed to this repo — only file *paths* are, flowing through the
existing [`deploywebsite.yml`](../.github/workflows/deploywebsite.yml)
pipeline like any other conf change. A `workflow_dispatch`-only workflow,
[`issue-origin-cert.yml`](../.github/workflows/issue-origin-cert.yml), was
drafted for issuing certs via this repo's existing SSH deploy secrets, but
it has **no `CF_API_TOKEN` secret configured**, so it cannot currently run.

## Fail-safe (important if resumed)

Cloudflare does **not** fall back to HTTP on its own if Full (strict) is
set and the origin's HTTPS breaks — it shows visitors a 521/526 error
instead, even if port 80 still works. Two things prevent that:

1. Never remove the `listen 80` block when adding `443 ssl` — keep both.
2. The zone's SSL/TLS mode can be dropped back to Flexible instantly and
   independent of the origin, via a small API script kept outside this
   repo. That's the actual "undo" if something breaks — not anything in
   this repo.

## Known gotcha for next time

Cloudflare API tokens for this need **Zone-type** permissions, not
Account-type — `Zone → SSL and Certificates → Edit` and `Zone → Zone →
Read`, scoped to the relevant zone(s). Account-scoped permissions of the
same-sounding name (e.g. "Account: SSL and Certificates") do not grant
access to per-zone operations like cert issuance or reading a zone's
SSL/TLS setting, even though Cloudflare's UI lets you create a token with
the wrong resource type without complaint — it just fails at request time.

## What's public vs. private

- **Public (this repo)**: nginx configs, cert/key *file paths* once
  issued, this plan.
- **Private (kept elsewhere)**: origin server IP/SSH access, Cloudflare API
  tokens, the actual private key and certificate files, and the
  step-by-step issuance/rollback runbooks.
