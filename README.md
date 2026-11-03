# Health First

A gentle self-care and wellness app for tracking goals, moods, and small daily wins, with a supportive AI chat companion.

## Features

- **Goals** – daily, weekly, monthly, and yearly goals, with a limit on "main" goals to help prevent burnout
- **Mood tracking** – log how you feel each day
- **Wins** – record small daily wins
- **Self-care habits** – build and check off healthy routines
- **Progress** – charts for the last 7/30/75 days or a custom range
- **Affirmations** – a daily affirmation plus a full list
- **Letters** – write private letters to yourself
- **Wellness chat** – a supportive AI companion (powered by Groq)
- **Bad Day Mode** – switches the app to a calmer, rest-focused view
- **Light/dark mode** and local-first storage with optional account sync and JSON backup

## Tech stack

- [Next.js 15](https://nextjs.org/) (App Router) + React 19 + TypeScript
- [Prisma](https://www.prisma.io/) with PostgreSQL for accounts and sync
- IndexedDB for local-first data
- [Groq](https://groq.com/) (`llama-3.1-8b-instant`) for the chat companion

## Getting started

### Prerequisites

- Node.js 20
- A PostgreSQL database
- A Groq API key

### Setup

```bash
git clone https://github.com/GodFather1180/Health-First.git
cd Health-First
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME"
JWT_SECRET="a-long-random-string"
GROQ_API_KEY="your-groq-api-key"
```

Apply the database migrations and start the dev server:

```bash
npx prisma migrate deploy
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

## Project structure

```
prisma/            Database schema and migrations
public/            Static assets
src/app/           Pages and API routes (App Router)
src/components/    Shared UI components
src/lib/           Local storage, auth, preferences, and helpers
src/types/         Shared TypeScript types
```

## Disclaimer

Health First is a self-care tool, not a substitute for professional medical or mental health care. If you are in crisis or danger, contact your local emergency services or a crisis line.
