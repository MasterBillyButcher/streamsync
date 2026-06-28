# StreamSync — Multi-Stream Watch Party

A production-ready web application for watching multiple video streams simultaneously. Create and share complete watch-party layouts through a single URL.

## Features

- 🎬 **1–12 simultaneous players** with auto-calculated responsive grid
- 📺 **Universal video support** — YouTube, Twitch (live/VOD/clips), Vimeo, MP4, WebM, HLS, custom iframes
- 🔗 **One-click sharing** — encode entire session into a single URL
- 💾 **Auto-save** — restores your session via localStorage
- 🖱️ **Drag & drop** reordering — preserved in shared links
- 📤 **Import/Export** — JSON configuration round-trip
- 🔒 **XSS-safe** — iframe sanitization, no script injection
- 🌑 **Dark mode** glassmorphism UI

## Tech Stack

- **Next.js 15** (App Router)
- **React 19**
- **TypeScript** (strict mode)
- **Tailwind CSS**
- **Lucide React**

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Push this repo to GitHub
2. Import into Vercel
3. Deploy — zero configuration needed

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build

```bash
npm run build
npm run start
```

## Supported Providers

| Provider | Live | VOD | Clips |
|---|---|---|---|
| YouTube | ✅ | ✅ | ✅ |
| Twitch | ✅ | ✅ | ✅ |
| Vimeo | ✅ | ✅ | — |
| Direct MP4/WebM/HLS | ✅ | ✅ | — |
| Custom iframe | ✅ | ✅ | ✅ |

## License

MIT
