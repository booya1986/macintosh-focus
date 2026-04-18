# Mac Focus — Web UI

Mobile-first PWA that controls the pixel-Mac creature on the Pi. State lives
in Vercel KV (Upstash Redis); the Pi polls it once a second.

## Local development

```bash
pnpm install
pnpm dev      # http://localhost:3000
```

Without KV configured the app falls back to in-process memory, so the local
dev server is fully usable on its own (state resets on restart).

## Deploy to Vercel

1. **Create a Vercel project** pointing at this directory:
   ```bash
   pnpm dlx vercel --cwd .
   ```
2. **Add Vercel KV** to the project (Vercel dashboard → Storage → Create
   Database → KV). It auto-injects:
   - `KV_REST_API_URL`
   - `KV_REST_API_TOKEN`
3. **Deploy:**
   ```bash
   pnpm dlx vercel --prod
   ```
4. Copy the production URL (e.g. `https://mac-focus.vercel.app`).

## Connect the Pi

On the Raspberry Pi, set the same KV credentials as environment variables for
the systemd service so the Pi reads from the same store:

```bash
sudo systemctl edit macintosh-focus.service
# add:
[Service]
Environment=CLOUD_URL=https://mac-focus.vercel.app
Environment=POLL_MODE=cloud
```

Then restart it:
```bash
sudo systemctl daemon-reload
sudo systemctl restart macintosh-focus.service
```

## Architecture

```
phone (PWA on Vercel)  ──┐                    ┌── Pi (focus_app.py)
                         │                    │
                         ▼                    ▼
                    Vercel API routes  ── Vercel KV ──  shared state
                    (Next.js)          (Upstash Redis)
```

- `GET  /api/state`        → returns full state (used by phone + Pi)
- `POST /api/command`      → dispatches a command, mutates state, returns it
- `PUT  /api/state`        → optional heartbeat from the Pi

The Pi is a pure consumer/displayer once `POLL_MODE=cloud` is set.
