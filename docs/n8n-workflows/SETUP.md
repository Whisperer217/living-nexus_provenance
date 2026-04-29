# Living Nexus — N8N Orchestration Setup Guide

**Author:** BDDT Publishing / Command Domains, LLC  
**Version:** 1.0 — April 2026

---

## Overview

This directory contains three N8N workflows that form the Living Nexus multi-Manus development pipeline. Together they allow multiple Manus AI instances to work on the codebase in parallel, using GitHub as the shared source of truth, with N8N as the coordination layer.

```
You (task input)
    ↓
01-task-router      ← receives task, creates branch, spawns Manus, opens PR
    ↓
GitHub (feature branch)
    ↓
02-pr-monitor       ← polls every 5 min, notifies when PR is ready for review
    ↓
You (approve & merge PR)
    ↓
GitHub (main)
    ↓
03-deploy-notifier  ← fires on push to main, triggers deploy, notifies team
    ↓
www.livingnexus.org
```

---

## Workflow Files

| File | Name | Purpose |
|---|---|---|
| `01-task-router.json` | Task Router | Receives task, creates branch, spawns Manus, opens draft PR |
| `02-pr-monitor.json` | PR Monitor | Polls open PRs, notifies when tests pass and ready to merge |
| `03-deploy-notifier.json` | Deploy Notifier | Fires on push to `main`, triggers deploy hook, notifies team |

---

## Step 1 — Import Workflows into N8N

1. Open your N8N instance
2. Click **Workflows → Import from File**
3. Import each `.json` file in order (01, 02, 03)
4. Activate each workflow after configuring credentials (Step 2)

---

## Step 2 — Configure Credentials

### GitHub API
1. In N8N: **Credentials → New → GitHub API**
2. Generate a Personal Access Token at `github.com/settings/tokens`
3. Scopes required: `repo`, `pull_requests`, `contents`
4. Name it `GitHub API` (matches the credential name in the workflows)

### Environment Variables
Set these in N8N under **Settings → Environment Variables**:

| Variable | Value | Used In |
|---|---|---|
| `GITHUB_OWNER` | Your GitHub username or org | 01, 02, 03 |
| `GITHUB_REPO` | `living-nexus` (or your repo name) | 01, 02, 03 |
| `SLACK_WEBHOOK_URL` | Slack incoming webhook URL | 02, 03 |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL (optional) | 02, 03 |
| `DEPLOY_WEBHOOK_URL` | Railway/Render/Fly deploy hook URL | 03 |
| `MANUS_PROJECT_ID` | Living Nexus project ID in Manus | 01 |
| `MANUS_API_URL` | Manus API base URL (when available) | 01 |

---

## Step 3 — Register GitHub Webhook (for Deploy Notifier)

1. Go to your GitHub repo → **Settings → Webhooks → Add webhook**
2. Payload URL: `https://your-n8n-instance.com/webhook/living-nexus/deploy-hook`
3. Content type: `application/json`
4. Events: **Just the push event**
5. Save

---

## Step 4 — Sending Tasks to the Router

POST to your N8N webhook URL:

```bash
curl -X POST https://your-n8n-instance.com/webhook/living-nexus/task \
  -H "Content-Type: application/json" \
  -d '{
    "task": "Split MobilePlayerLayer.tsx into MiniPlayer, ExpandedPlayer, CinematicPlayer, and BottomNavBar components — each under 300 lines",
    "files": ["client/src/components/player/MobilePlayerLayer.tsx"],
    "branch": "refactor/split-mobile-player",
    "priority": "high"
  }'
```

The router will:
1. Create the branch `refactor/split-mobile-player` from `main`
2. Build a Manus task prompt with full context
3. Open a draft PR titled `refactor/split-mobile-player`
4. Return `{ status: "queued", branch: "...", pr_url: "..." }`

---

## Step 5 — Manus Instance Task Prompt (Manual Until API Available)

Until Manus exposes a public API for spawning instances, the Task Router logs the full prompt. Copy it and open a new Manus chat session with it. The prompt will look like:

```
You are working on the Living Nexus platform (GitHub: livingnexus repo).
Clone the repo, checkout branch: refactor/split-mobile-player (create from main if it doesn't exist).
Task: Split MobilePlayerLayer.tsx into MiniPlayer, ExpandedPlayer, CinematicPlayer, and BottomNavBar components — each under 300 lines
Focus files: client/src/components/player/MobilePlayerLayer.tsx
When done: commit all changes with a clear message and push branch refactor/split-mobile-player.
Do NOT push to main. Do NOT merge. Push only to refactor/split-mobile-player.
Run pnpm test before pushing. If tests fail, fix them first.
```

---

## Step 6 — PR Review and Merge

1. N8N notifies you (Slack/Discord) when a PR has the `tests-pass` label
2. Review the PR on GitHub
3. If approved: **Squash and merge** into `main`
4. The Deploy Notifier fires automatically and triggers the deploy

---

## Recommended Parallel Workstreams

These tasks are ready to run in parallel right now:

| Branch | Task | Priority |
|---|---|---|
| `refactor/split-mobile-player` | Break 1,850-line MobilePlayerLayer into 4 components | High |
| `refactor/split-creator-profile` | Break CreatorProfilePage into section components | High |
| `feat/error-boundaries` | Wrap player + pages in React ErrorBoundary | High |
| `fix/mobile-qa-pass` | Full mobile checklist — all pages, all interactions | High |
| `feat/wid-modal-width` | WID modal max-w-[95vw] on mobile | Normal |
| `feat/project-sticky-bar` | Sticky Donate/Follow/Share bar on project page mobile | Normal |

---

## Notes

- **Never push directly to `main`** from a worker Manus instance — always feature branches + PR
- **This Manus instance (control arm)** stays on `main` and handles reviews, merges, and architecture decisions
- **Database changes** (`pnpm db:push`) must be reviewed by the control arm before merging — schema changes are not reversible
- **Secrets** are managed via Manus project settings — worker instances inherit them from the project context
