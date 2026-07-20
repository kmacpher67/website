# Repo conventions for AI agents

## Commit message prefix for per-site changes

This repo hosts many independent static websites as top-level subfolders
(e.g. `oakland.center/`, `warren.fyi/`, `kmac-dogs.com/`). Each subfolder
name is a hostname.

When a commit's changes are scoped to a single site's subfolder (content,
layout, assets, or that site's `sites-available/*.conf`), prefix the
commit message with the hostname followed by ` - `:

```
oakland.center - redesign hero section with purple/gold theme
warren.fyi - fix broken footer link
```

This lets `git log --grep '^oakland.center - '` (or scanning by eye)
quickly find every commit for a given host, since one repo mixes commits
for dozens of unrelated sites.

Rules:
- Use the exact folder/hostname as it appears in the repo (matches the
  domain, e.g. `oakland.center`, not `Oakland Center` or `oakland`).
- If a commit touches multiple sites, either split it into per-site
  commits or list each host prefix, e.g. `oakland.center, warren.fyi - ...`.
- Commits that touch shared/repo-wide files only (root `README.md`,
  `nginx.conf`, `scripts/`, `.github/workflows/`, top-level `index.html`)
  don't need a host prefix — describe the change normally.
