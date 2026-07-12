# Git basics — first time setup

You said you have empty GitHub repos already, so I'll assume you've made an
account and created an empty repo called (for example) `poondu-ledger` on
github.com. If not: go to github.com → the "+" icon top-right → New
repository → name it `poondu-ledger` → **do not** check "add a README" (we
already have one) → Create repository.

## The mental model, in one paragraph

Git tracks changes to files on your computer. "Committing" is saving a
checkpoint with a message describing what changed. "Pushing" sends those
checkpoints to GitHub, which is just a remote copy. That's really it —
everything else is a variation on "make a change, commit it, push it."

## One-time setup on your computer

Install git if you don't have it (check first: open a terminal and type
`git --version`). If it's missing, install from git-scm.com.

Tell git who you are (only needs doing once, ever, per computer):

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Getting this project onto GitHub

You already have the files locally. From inside the `poondu-ledger` folder:

```bash
git init
git add .
git commit -m "Initial commit: poondu ledger app"
```

What just happened:
- `git init` — turns this folder into a git project (creates a hidden
  `.git` folder that stores all history).
- `git add .` — stages every file in the folder, meaning "include these in
  the next checkpoint."
- `git commit -m "..."` — actually saves the checkpoint, with a short
  message describing it. The message is for future-you, so make it
  readable.

Now connect it to the empty GitHub repo and push:

```bash
git remote add origin https://github.com/<your-username>/poondu-ledger.git
git branch -M main
git push -u origin main
```

- `git remote add origin <url>` — tells your local project where its GitHub
  copy lives. You only do this once per repo.
- `git branch -M main` — names your main line of work `main` (GitHub's
  default name).
- `git push -u origin main` — uploads everything. The `-u` remembers this
  pairing so future pushes can just be `git push`.

It'll likely ask you to log in — GitHub now requires a **personal access
token** instead of your password for this. GitHub will prompt with a link
to generate one the first time; follow it, generate a token, paste it in
when asked for a password. This is one-time per computer.

## Your everyday workflow, going forward

Every time you (or a partner) change a file:

```bash
git add .
git commit -m "describe what changed, e.g. 'fix sale kg auto-fill'"
git push
```

Three commands, every time. That's genuinely most of what you need day to
day.

## Checking what's changed before committing

```bash
git status
```

Shows which files you've edited since the last commit. Good habit to run
this before `git add .` so you know what you're about to save.

```bash
git log --oneline
```

Shows your history of checkpoints — useful when you want to remember what
changed and when.

## If something goes wrong

The single most useful safety net: **your commits are never lost** unless
you explicitly delete them. If a change breaks the app, you can see exactly
what changed:

```bash
git diff HEAD~1
```

...and if needed, undo it:

```bash
git revert HEAD
```

This creates a *new* commit that undoes the last one — safer than trying to
rewrite history, especially while you're still learning.

## Working with your two partners

Simplest approach for a 3-person project: agree that only one person pushes
changes at a time, and always `git pull` before you start editing, to make
sure you have the latest version:

```bash
git pull
```

If you outgrow this (e.g. two of you editing the same file at once
regularly), the next step up is each partner making changes on a separate
"branch" and using GitHub's **Pull Request** feature to merge — but don't
worry about that yet. For three people making occasional changes, `git pull`
before you start and `git push` when you're done is enough.
