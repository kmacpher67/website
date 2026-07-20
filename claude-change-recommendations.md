# Claude Change Review and Recommendation

This note documents the current GitHub Actions deployment behavior.

## Implemented

- The deploy workflow now runs only on `push` to `master`.
- It detects changed top-level site folders and uploads only those folders.
- `index.html` is uploaded only when it changes.
- `nginx.conf` is uploaded only when it changes.
- Changed active configs under `sites-available/*.conf` are uploaded only when they change.
- Remote nginx symlinks still use `ln -sf`, so reruns stay idempotent.
- `nginx -t` and `systemctl restart nginx` run only when nginx-relevant files changed.

## Notes

- The workflow now uses direct `scp` and `ssh` commands from the GitHub runner instead of a long list of repeated upload steps.
- The README links back here so the deployment behavior is easier to find.
- Atlantic.Net also exposes a REST API, so instance automation could follow the same pattern later if needed.
