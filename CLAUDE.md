# densanon-site

Static marketing and product site for Densanon LLC. Hosted on GitHub Pages at **densanon.com**.

## Stack

Plain HTML/CSS/JS — no build step, no framework, no npm. `js/layout.js` handles shared header/footer injection.

## Key Files

- `d-brief-version.json` — **Source of truth** for the current D-Brief app version. The mobile app fetches this on startup to check for updates. When releasing a new version, update `version`, `versionCode`, `releaseDate`, and `changelog` here.
- `d-brief.html` — D-Brief product/download page. Shows version and download count (from GitHub Releases API, cached in localStorage).
- `quote.html` — Pricing calculator that posts to Google Sheets via Apps Script.
- `scrapers/` — Python digest pipeline (AI, Robotics, Computation, Game Dev). See `scrapers/` for details.
- `daigest.html` / `daigest-success.html` — Redirects to new D-Brief URLs (old branding).

## Release Workflow (D-Brief)

When shipping a new D-Brief APK:

1. Build the APK in DigestEngine repo
2. Create a GitHub Release on this repo with the APK attached
3. Update `d-brief-version.json` with the new version, versionCode, date, and changelog
4. Commit and push — GitHub Pages deploys automatically
5. Users on old versions will see an update prompt on next app launch

## Integrations

- **Google Sheets** — quote form submissions (via Apps Script endpoint)
- **Stripe** — D-Brief Pro checkout ($9.99 one-time)
- **GitHub Releases API** — download counter on d-brief.html
