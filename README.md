# RishabhOS

Personal digital world built with Vite, React and Three.js.

## Routes
- `/` — home / living tree
- `/work` — professional experience
- `/lab` — experiment archive
- `/life` — travel, photography and interests
- `/now` — current snapshot
- `/private` — future private-app shell; protect this path with Cloudflare Access before adding sensitive data

## Local
```bash
npm install
npm run dev
npm run build
npm run preview
```

## Cloudflare
Build command: `npm run build`
Output directory: `dist`

For the private area, configure Cloudflare Zero Trust Access for `your-domain.com/private/*` before putting any sensitive data behind it.
