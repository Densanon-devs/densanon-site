# densanon-site

Static marketing and product site for Densanon LLC. Hosted on GitHub Pages at **densanon.com**.

## Stack

Plain HTML/CSS/JS — no build step, no framework, no npm. `js/layout.js` handles shared header/footer injection.

`.nojekyll` at the repo root turns Jekyll **off**. Keep it there. The site uses no Jekyll features (no front matter, no Liquid, no `_layouts`/`_includes`), but Jekyll silently deletes any file or directory whose name starts with `_` from the published site. That is not a build error — the deploy goes green and the files just 404. It already cost us `table-of-war/play/assets/nodes/_bg.jpg` and `.../ui/glyph/_map.json`.

Consequence for anyone dropping in build output (e.g. the Table of War web demo under `table-of-war/play/`): `_`-prefixed assets are fine now, but only because `.nojekyll` exists. Deleting it re-breaks them silently.

## Key Files

- `d-brief-version.json` — **Source of truth** for the current D-Brief app version. The mobile app fetches this on startup to check for updates. When releasing a new version, update `version`, `versionCode`, `releaseDate`, and `changelog` here.
- `d-brief.html` — D-Brief product/download page. Shows version and download count (from GitHub Releases API, cached in localStorage).
- `quote.html` — Pricing calculator that posts to Google Sheets via Apps Script.
- `scrapers/` — Python digest pipeline (AI, Robotics, Computation, Game Dev). See `scrapers/` for details.
- `daigest.html` / `daigest-success.html` — Redirects to new D-Brief URLs (old branding).

## Never commit app binaries

APKs, EXEs and DMGs go on **GitHub Releases**, never in the repo — `releases/` is
gitignored. Two D-Brief APKs used to be committed there behind Git LFS, and because the
Pages build checks out without LFS, densanon.com served 134-byte **LFS pointer stubs**
under an `application/vnd.android.package-archive` content type. Every download was a
corrupt file.

## Always pin release tags in download URLs — never `/releases/latest/`

Every product (D-Brief, DensAssistant, Table of War, Bible Timeline) ships from *this one
repo's* Releases, so `latest` means "whatever shipped most recently across all of them" —
in practice Table of War, which ships weekly. Both the D-Brief and Bible Timeline download
buttons were 404ing for exactly this reason.

Use the full tag: `.../releases/download/<tag>/<asset>`. Note the asset name has to match
too — Bible Timeline's button asked for `bible-timeline-release.apk` when the asset is
`bible-timeline-v0.1.0.apk`.

## Release Workflow (D-Brief)

When shipping a new D-Brief APK:

1. Build the APK in DigestEngine repo
2. Create a GitHub Release on this repo with the APK attached
3. Update `d-brief-version.json` — version, versionCode, date, changelog, **and the pinned
   `downloadUrl` tag**
4. Update the pinned tag in the `d-brief.html` download button to match
5. Commit and push — GitHub Pages deploys automatically
6. Users on old versions will see an update prompt on next app launch

## Integrations

- **Google Sheets** — quote form submissions (via Apps Script endpoint)
- **Stripe** — D-Brief Pro checkout ($9.99 one-time)
- **GitHub Releases API** — download counter on d-brief.html
