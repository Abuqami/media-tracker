# عبودكا للافلام · Media Tracker

A personal + social media tracking platform for **Movies, TV Shows, and Anime** (Japanese & American).
Search 500+ titles, track what you're watching, rate and review them, mark favorites, and see what
your friends think — all in a sleek cinematic dark UI with full Arabic / RTL support.

Built with **React + Vite + Tailwind** on the frontend and **Express + SQLite** on the backend.

---

## ✨ Features

- **Email-only sign in** — no passwords. Your email loads your profile and lists.
- **Arabic / RTL** — type your name in Arabic and it automatically displays right-to-left. Arabic comments render correctly too.
- **500+ titles** from TMDB: popular movies, TV shows, Japanese anime, and Japanese films.
- **Personal tracking** — Plan to Watch · Currently Watching · Watched, per title.
- **Ratings & reviews** — give a 1–10 score, write your thoughts, mark favorites.
- **Social** — everyone can see each other's favorites, ratings, and opinions.
- **Profiles** — each user has a profile with stats, favorites, and review history.
- **Community feed** — a live feed of everyone's recent activity.
- **Detail view** — posters, backdrops, cast, genres, runtime, and synopsis for every title.

---

## 🚀 Running it on your computer

```bash
npm install        # one time
npm run dev        # starts the app (frontend + backend together)
```

Then open **http://localhost:5173**.

The database is a single file — `server/media-tracker.db` — created automatically on first run.
It lives on your computer; nothing is sent to the cloud.

### Add a shared TMDB key (recommended)

So your friends don't each need their own movie-database key:

1. Get a free key at <https://www.themoviedb.org/settings/api>
2. Copy `.env.example` to `.env`
3. Put your key in it: `TMDB_API_KEY=your_key_here`

---

## 👫 Sharing it with friends (local database)

Because the database lives on **your** laptop, your friends connect to **your** running server.
Run the app, then expose it with a tunnel:

```bash
npm run share          # builds the app and starts the server on one port (3001)
npx ngrok http 3001    # in a second terminal — gives you a public https URL
```

Share the `https://….ngrok-free.app` link with your friends. While your laptop is on and these two
commands are running, everyone uses the same shared lists, ratings, and reviews.

> Close your laptop or stop the commands and the link goes offline — that's the trade-off of keeping
> the database on your own machine.

---

## 🧩 Tech

| Layer    | Stack                                                  |
|----------|--------------------------------------------------------|
| Frontend | React 19, Vite, Tailwind CSS, lucide-react             |
| Backend  | Express 5, better-sqlite3                              |
| Data     | TMDB (metadata/cast) · Watchmode (where-to-watch links)|

---

## 🚧 Future enhancements

Already shipped: episode-progress tracking (where you've reached per show), a pressable
jumping-gecko loader, and "Where to watch" buttons that open the **exact title** on each service.

Next up — **reliable "open in the installed app" on mobile:**

- The watch buttons use the free Watchmode plan, which returns **web** links and is locked to the
  **UAE (AE)** region. On a phone this opens the app's home (or the browser) rather than the exact
  title, because the AE title-id may not match the viewer's regional catalog.
- The fix is a **paid Watchmode tier**, which returns the real `ios_url` / `android_url` app
  deep-links and the viewer's own region. Once on a paid key, switch the mobile watch buttons to use
  those deep-link fields (see `src/components/DetailModal.jsx` → the provider links, and
  `server/index.js` → `fetchWatchmodeSources`).
