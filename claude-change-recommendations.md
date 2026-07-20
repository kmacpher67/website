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

## Copilot review of the Codex refactor, and Claude's fixes (2026-07-20)

Copilot reviewed the Codex-generated workflow above and flagged two High and one
Medium finding. Claude checked each against the actual workflow file before
fixing anything; all three held up.

**High — multi-commit push range (confirmed, fixed).** The detect step diffed
`HEAD~1 HEAD`, which only covers the last commit in a push. A push bundling
several commits could silently skip deploying changes from the earlier ones.
Fixed by diffing `${{ github.event.before }}..HEAD` (the full pushed range)
with a fallback chain: `event.before` if it resolves, else `HEAD~1`, else
"treat everything as changed" for a repo's first commit. `actions/checkout`
now uses `fetch-depth: 0` so `event.before` is guaranteed to be present to
diff against.

**High — deleted/renamed conf crashes the job (confirmed, fixed defensively —
not fully implemented as Copilot framed it).** The old upload step ran
`scp "$conf" ...` for every path git reported as changed, including deletions,
under `set -euo pipefail`. Retiring a site (the repo's actual `deprecate-site.sh`
workflow moves a conf into `sites-available/deprecated/`) reports the old path
as deleted, so the very next deprecation would have failed the whole deploy job.

Fixed the crash: the detect step now classifies `git diff --name-status`
output by change type (`D`, `R###`, plain) instead of just listing changed
paths, so deleted confs land in a separate `removed_confs` bucket and are
never handed to `scp`. The upload steps also got a defensive `[ -f "$conf" ]`
/ `[ -d "$site_dir" ]` guard as a second line of defense.

What's deliberately *not* done: Copilot's fix suggestion also floated
"optional remote cleanup" (deleting the stale conf and `sites-enabled`
symlink on the server when a conf is removed locally). That's a genuinely
separate decision — it means CI running `rm` against a production box based
on git history — and shouldn't piggyback on a bug fix. Left as a manual step
for now (same as before this refactor); worth a dedicated look if orphaned
confs on the remote actually become a problem.

**Medium — no concurrency guard (confirmed, fixed).** Two quick pushes could
run overlapping deploy jobs and race on uploads/restart. Added a
workflow-level `concurrency` group keyed on `github.ref`, with
`cancel-in-progress: false` so pushes still deploy in order rather than the
newest one preempting an in-flight deploy.

**Low — doc drift (confirmed, fixed).** `README.md` still promised "a
copy-paste handoff prompt" from this note after the note had already been
rewritten to a plain implementation summary. Reworded that line to match what
this file actually contains.

All changes verified by parsing the workflow YAML (`python3 -c "import yaml;
yaml.safe_load(...)"`) and dry-running the new detection loop's bash logic
against a simulated `git diff --name-status` covering a modify, a delete, a
rename into `deprecated/`, and root-file changes — output matched expectations
in each case. Not run through actual GitHub Actions; that's the remaining
check on a real push.
