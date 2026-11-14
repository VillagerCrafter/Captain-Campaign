# Captain Campaign

A Jekyll site for Captain Campaign brand activations, event marketing, hosting, and content — created by Liam Bennicoff. It deploys through GitHub Pages.

**Live URL (no custom domain yet):** [https://VillagerCrafter.github.io/Captain-Campaign/](https://VillagerCrafter.github.io/Captain-Campaign/)

To use a real `captaincampaign.com` address later: buy the domain, add it in the GitHub repo **Settings → Pages → Custom domain**, then clear `baseurl` in `_config.yml`.

## Safety backup

Before the Captain Campaign editor revamp, a restore point was saved on branch `backup/pre-captain-campaign-revamp`.

```powershell
git switch backup/pre-captain-campaign-revamp
```

## Editing the site

- Update project cards in `_data/projects.yml` and services in `_data/services.yml`.
- Contact email, booking embed, and socials stay as Liam’s personal bylines in `_config.yml`.
- Site title / brand is **Captain Campaign**; logo lives at `assets/images/captain-campaign-logo.png`.
- Optional GA4: set `ga4_measurement_id` in `_config.yml`, and/or save a measurement ID in the editor **Analytics** panel then publish.

## Local preview

```powershell
bundle install
bundle exec jekyll serve
```

On Windows with RubyInstaller, run `ridk install 3` first if native gems fail to build.

## Local administrator editor

Run `.\Launch-Website-Editor.ps1` in PowerShell. The Canva-style editor includes:

- Left icon rail: Design, Elements, Text, Uploads, Brand, Layers, Pages, SEO, Analytics
- Moveable drag / resize / rotate with snap guides, aspect lock, and element lock
- Layers panel (reorder, rename, hide, lock)
- SEO metadata + Analytics connection helpers
- Brand kit swatches (navy / gold) and Captain Campaign theme accents
- Existing Openverse import, Google Fonts, AI copy assist, sections, and publish flow

Drafts stay in the browser until **Update website** writes `site-content.json` and `uploads/`. Push those files to deploy via GitHub Pages.

**Local-only security:** the admin password is held in memory for the WEBrick process on `127.0.0.1`. GitHub Pages cannot protect the editor; never commit secrets.
