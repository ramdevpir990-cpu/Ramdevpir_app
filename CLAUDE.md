# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — start the server locally (listens on `PORT`, default 5000).
- `npm run dev` — auto-reload via nodemon.
- No test runner or linter is configured.

## Required environment (`.env`)

`MONGO_URI`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, optional `PORT`. Loaded via `dotenv` at the top of `server.js`; missing values fail at startup or first upload.

## Architecture

Single-process Express 5 + MongoDB app for uploading images/videos to Cloudinary and tracking them in Mongo. The upload pipeline is the load-bearing part — three pieces have to agree on `resource_type`:

1. `middleware/upload.js` — `multer-storage-cloudinary` inspects `file.mimetype`, sets `folder` to `videos`/`images` and `resource_type` accordingly, then streams directly to Cloudinary. `req.file.path` is the resulting Cloudinary URL; `req.file.filename` is the `public_id`.
2. `routes/media.routes.js` `POST /api/upload` — persists `{ url, public_id, type }` to Mongo after multer succeeds. `type` ("image" | "video") must match what was used at upload time because…
3. `DELETE /api/media/:id` passes `media.type` as `resource_type` to `cloudinary.uploader.destroy`. **If the stored `type` doesn't match the actual Cloudinary resource type, the delete silently no-ops on Cloudinary while still removing the Mongo document** — orphaning the asset. Preserve this invariant when changing upload logic.

### Model naming quirk

The Mongoose model is registered as `ramdevpir_wallpaper` (see `models/Ramdevpir_wallpaper.js`), so the underlying MongoDB collection is `ramdevpir_wallpapers` — not `media` despite the routes and frontend using "media" terminology.

### Routes

Mounted at `/api` from `server.js`:
- `POST /api/upload` — multipart field name **must** be `file`.
- `GET /api/media?page=&limit=` — paginated, sorted by `createdAt` desc, returns `{ success, page, limit, total, totalPages, data: [{id, url, type}] }`.
- `DELETE /api/media/:id` — deletes from Cloudinary first, then Mongo.

### Frontend

`public/index.html` is served via `express.static("public")` at `/`. It's a single-file vanilla JS page that calls the `/api/*` endpoints — no build step.

### Error handling

Global error handler at the bottom of `server.js` catches anything `next(err)`'d and returns `{ success: false, message }`. Route handlers currently use local `try/catch` and respond directly instead of forwarding to it, so the global handler mostly catches multer/middleware failures.

## Deployment (Vercel)

The repo is set up for zero-config Vercel deployment via the GitHub integration:

- `server.js` **exports the Express app** (`module.exports = app`) so Vercel can wrap it as a single serverless function. The `app.listen()` call is guarded by `require.main === module`, so it only runs under `node server.js` locally — not on Vercel.
- A connection-cache helper (`connectMongo` in `server.js`) reuses the Mongoose connection across warm invocations and lazily reconnects on cold starts. Don't replace this with a bare `mongoose.connect()` at module top-level — that will leak connections and exhaust the Atlas pool.
- `express.static("public")` is a no-op on Vercel — files in `public/**` are served directly by Vercel's CDN. The line is kept so local dev still works.
- No `vercel.json` is needed. If a route ever needs more than the default function timeout (e.g. large video uploads), add one with `functions: { "server.js": { "maxDuration": 60 } }`.
- Environment variables (`MONGO_URI`, `CLOUDINARY_*`, `PORT`) must be set in the Vercel project Settings → Environment Variables. `.env` is gitignored and never deployed.

### Upload size caveat

Vercel serverless functions cap request body size (~4.5 MB by default). Large video uploads through `POST /api/upload` will fail. For bigger files, switch the frontend to a **direct unsigned Cloudinary upload** from the browser and only POST the resulting `public_id`/`url` to the backend.
