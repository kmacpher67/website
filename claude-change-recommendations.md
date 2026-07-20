# Claude Change Review and Recommendation

This note reviews the current edits in `README.md` and `.github/workflows/deploywebsite.yml` and turns them into a copy-paste handoff for a future coding agent.

## What changed

- The workflow now detects whether an active nginx config under `sites-available/*.conf` changed.
- Nginx symlinks are created remotely with `ln -sf`, which makes the enable step idempotent.
- Nginx restart is now gated so content-only pushes should not bounce nginx.
- The README explains the new `sites-available/deprecated/` convention for retired domains.

## What still looks risky or incomplete

- The workflow still copies most or all site content on every run, so the deploy is not really incremental yet.
- The workflow still triggers on pull requests, which is usually not desirable for a production deploy path.
- The `copy website nginx conf file` step is still broad, and the deploy logic is spread across many repetitive hardcoded steps.
- The README still reads like a manual deployment guide in several places, even though CI now handles the symlink step.

## Recommendation

Refactor the workflow so it only deploys what changed:

- if a top-level site folder changed, copy only that folder
- if an active nginx config changed, copy only that config
- if nothing deploy-relevant changed, do nothing
- keep the remote `ln -sf` and `nginx -t` flow, but only run it when needed

For a public repo, keep the result simple and low-risk. Avoid adding any secrets handling or server-specific details beyond what is already in the workflow.

## Copy-paste instructions for a new coding agent

Use this prompt verbatim if you want another agent to implement the follow-up:

```text
Review `.github/workflows/deploywebsite.yml` and `README.md` in this repository.

Goal:
Refactor the deployment workflow so CI/CD only deploys changed website folders and changed nginx configs, instead of copying every site on every push.

Requirements:
1. Keep the remote nginx symlink flow idempotent with `ln -sf`.
2. Run `nginx -t` and restart nginx only when an active config under `sites-available/*.conf` changes.
3. Do not deploy on pull request events; deploy only on push to the release branch or an equivalent production trigger.
4. Detect changed top-level site folders and deploy only those folders.
5. Detect changed nginx config files and deploy only those configs.
6. Skip the deploy entirely when nothing relevant changed.
7. Preserve the public-repo safety posture: no new secrets, no scary server commands, and no destructive cleanup.
8. Update `README.md` so the deployment behavior is documented clearly.

Implementation guidance:
- Prefer a small, readable shell-based change-detection step over a large rewrite.
- Keep the workflow idempotent.
- Keep logs readable by printing which site folders and configs changed.
- If any nginx config validation fails, stop before restart.

Acceptance criteria:
- A commit that changes one site folder deploys only that site folder.
- A commit that changes one nginx config deploys only that config and validates nginx.
- A commit with unrelated changes performs no deploy actions.
- The workflow remains safe to rerun.
```

## Claude review of the above (2026-07-20)

Checked these notes against the current `deploywebsite.yml` and `README.md`. Agreeing and disagreeing in places:

**Confirmed accurate:**
- The `pull_request` trigger (`deploywebsite.yml:10-11`) is real and higher priority than it reads here: any push to a PR branch against `master` from within the repo runs the full deploy job with live SSH secrets. This is a security-relevant one-liner, not just a style issue — worth fixing on its own before any bigger refactor.
- Every push does still SCP all ~17 site folders and all of `sites-available/*` unconditionally — confirmed, no change detection gates those steps today (only the nginx restart is gated).
- The README problems are worse than stated: there are two duplicate `### 5.` headers (`README.md:77` and `README.md:99`), and the entire "create a new host symbolic link on remote server" section (`README.md:119-138`) is dead — CI now auto-symlinks everything, per the README's own earlier paragraph.

**Where I'd revise the plan:**
- Per-file granularity ("a config change deploys only that config") is more machinery than this scp-action-based workflow comfortably supports without scripting individual per-file scp calls. Given nginx confs are small text files, syncing all of `sites-available/*` whenever *anything* under it changed (skip entirely otherwise) gets most of the benefit with far less new surface area to get wrong on a production deploy path.
- The highest-value version of "only deploy what changed" is really a maintainability fix: collapse the 17 near-duplicate `copy <site> via ssh password` steps into one loop over changed top-level site directories. That solves the copy-paste-growth problem in the workflow (the thing that makes `add-site.sh` need to touch this file at all) and gets folder-level incrementality as a side effect.
- Sequence as three separable changes rather than one big refactor, since this deploys real production domains:
  1. Drop (or scope down) the `pull_request` trigger — small, isolated, security-relevant.
  2. Consolidate the per-site scp steps into a loop over changed top-level folders — the main maintainability + incrementality win.
  3. README cleanup — fix duplicate `### 5.`, delete the dead manual-symlink section, trim the `errors:` scratch notes. Low risk, no workflow behavior change.
- Config-level incrementality (only copy the specific changed `.conf` file) I'd leave out of scope unless it becomes an actual pain point — current cost of "copy all confs every time something in that dir changed" is low.
