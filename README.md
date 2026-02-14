# RegImpact

AI-powered compliance management platform for tracking regulatory changes and deadlines.

## Features

- **Regulation Tracking**: Monitor federal, state, and local regulations across multiple jurisdictions
- **Policy Diff Analysis**: AI-powered comparison of regulation versions with significance scoring
- **Deadline Management**: Automated extraction and risk categorization of compliance deadlines
- **Calendar Export**: Export deadlines to ICS format for integration with any calendar app
- **Cost Estimation**: Calculate compliance costs based on company size and requirements

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: NextAuth v5
- **Database**: PostgreSQL with Prisma ORM
- **AI**: OpenAI GPT-4o for extraction and analysis
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest (unit/integration), Playwright (E2E)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- OpenAI API key

### Environment Setup

Create `.env` file:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"
OPENAI_API_KEY="sk-..."
```

### Installation

```bash
npm install
npx prisma generate
npx prisma migrate deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
