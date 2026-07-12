# Deployment guide

There are two independent things to deploy:

1. The **front end** (`frontend/index.html`) → GitHub Pages
2. The **back end** (`backend/Code.gs`) → Google Apps Script, via `clasp`

You only need to redo the relevant one when you change that part.

---

## 1. Front end — GitHub Pages

One-time setup:

1. Push this repo to GitHub (see `docs/GIT_GUIDE.md` if you haven't done this
   before).
2. On GitHub, go to your repo → **Settings → Pages**.
3. Under "Build and deployment", set **Source: Deploy from a branch**.
4. Set **Branch: main**, folder: **/frontend**. Save.
5. GitHub gives you a URL like
   `https://<your-username>.github.io/poondu-ledger/`. That's the link to
   share with Nagaraj and Senthil.

After that, every time you `git push` a change to `frontend/index.html`,
GitHub Pages redeploys automatically within a minute or two. Nothing else to
run.

---

## 2. Back end — Apps Script via clasp

`clasp` is Google's command-line tool that lets `Code.gs` live in this repo
instead of only in the browser-based Apps Script editor.

### One-time setup

```bash
npm install -g @google/clasp
clasp login
```

This opens a browser window to authorize clasp with your Google account —
use the same account that owns the Google Sheet.

Then link this repo's `backend/` folder to your existing Apps Script project:

```bash
cd backend
clasp clone <SCRIPT_ID>
```

You can find `<SCRIPT_ID>` in the Apps Script editor under
**Project Settings → Script ID**. This creates a `.clasp.json` file linking
this folder to that project — commit that file, it's not a secret.

### Every time you change Code.gs

```bash
cd backend
clasp push
```

That's it — this overwrites the Apps Script project with your local file.
No need to redeploy the web app URL unless you're changing *who can access*
it; pushed code takes effect on the existing `/exec` URL immediately.

If you ever do need a fresh deployment (e.g. you changed access permissions):

```bash
clasp deploy
```

### Sanity check after any backend change

1. In the Apps Script editor (or via `clasp open`), run the `setupSheets`
   function once if you added any new sheet.
2. Open the app and add a test lot/sale — confirm the sync badge shows
   "synced," and check the Google Sheet to see the row landed.
