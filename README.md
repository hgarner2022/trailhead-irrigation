# Trailhead Lawn & Irrigation LLC

Marketing website for **Trailhead Lawn & Irrigation LLC** — a professional lawn care and irrigation services company serving Erie, Longmont, and Weld County, Colorado.

**Live site:** [trailheadirrigation.com](https://trailheadirrigation.com)

## Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Email:** Resend
- **Hosting:** Vercel

## Pages

- **Home** — Hero, services overview, testimonials, CTA
- **Services** — Detailed service offerings with FAQ
- **Pricing** — Full pricing breakdown with FAQ
- **Blog** — Irrigation tips and lawn care articles
- **Contact** — Contact form (sends email via Resend) + business info

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Create a `.env.local` file:

```
RESEND_API_KEY=your_resend_api_key
```

## Deploy

```bash
vercel --prod
```
