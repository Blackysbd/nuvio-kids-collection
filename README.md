# My Kids Collection — Nuvio

Eight curated folders: Netflix Kids, Nickelodeon, Cartoon Network, DreamWorks, Illumination, Disney+, Walt Disney, Studio Ghibli.

## Deploy on Render
1. Put these files in a new GitHub repository (for example `nuvio-kids-collection`).
2. On Render, create a new Web Service, connect the repo, use Node runtime with build `npm install` and start `npm start` (or import `render.yaml`).
3. Set `TMDB_API_KEY` to your TMDB v3 API key, or `TMDB_READ_ACCESS_TOKEN` to a TMDB v4 bearer token. Do not commit keys into GitHub.
4. Let the service deploy. Visit `https://YOUR-RENDER-SERVICE.onrender.com/health` and check `tmdbConfigured` is true.
5. In Nuvio, install `https://YOUR-RENDER-SERVICE.onrender.com/manifest.json` as an addon **before** importing the collection.
6. Import `https://YOUR-RENDER-SERVICE.onrender.com/collections.json` in **Settings → Content & Discovery → Collections → Import → URL** (menu names vary by build). Pin Kids to your home screen if necessary.

## Notes
- This pack is a ready-to-deploy **catalogue addon**, not a hosted working service. Until you deploy and install it, catalogues have no source.
- Film and series posters come from TMDB. Search is performed against curated title names on first request, cached for 24 hours. If TMDB has no exact match, the title is skipped rather than returning the wrong one.
- **Illumination** has movies only: no unverified TV series have been attributed to the studio. **Studio Ghibli** contains one series (*Ronja the Robber's Daughter*, associated with Ghibli). The remaining folders have both.
- Streaming availability is not guaranteed: Netflix Kids and Disney+ mean brand/curated content, not a live UK licensing checker.
- Nuvio's own metadata or another TMDB-aware addon may provide richer series seasons and episodes. This addon only provides basic metadata, not streams or season videos.
- You can add or remove titles in `titles.json`, redeploy, and the same eight folders remain.
- Folder covers currently use their **text titles** rather than external images. Custom images can later be set via Nuvio or added as `coverImageUrl` to each collection folder.
- The title `The Mandalorian` is more suited to older children; Disney+ is curated family content, not a strict pre-school filter. Review selections for your children's ages.
