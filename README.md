# ScholarHub MVP

Next.js 16 scholarship application platform with public student applications, admin review workflows, document uploads via S3, and email notifications.

## Features

- Public scholarship catalog with open/closed status
- Public application form (no student login required)
- Required document uploads and direct submission flow
- Admin scholarship management and application review queue
- Status transitions with audit history
- Email notifications for submission and status changes

## Stack

- Next.js App Router + TypeScript
- NextAuth (credentials)
- Postgres + Kysely
- AWS S3 signed upload URLs
- Nodemailer (SMTP)

## Environment

Copy `.env.example` to `.env.local` and set real values.

## Database Setup

```bash
npm run db:migrate
npm run db:seed-admin -- admin@example.com StrongPass123!
```

## Run

```bash
npm run dev
```

Open `http://localhost:3000`.

## API Endpoints

- `GET /api/scholarships`
- `GET /api/scholarships/:slug`
- `POST /api/public/upload-url`
- `POST /api/public/applications`
- `POST /api/admin/scholarships`
- `PATCH /api/admin/scholarships/:id`
- `POST /api/student/applications`
- `PATCH /api/student/applications/:id`
- `GET /api/student/applications`
- `GET /api/student/applications/:id`
- `POST /api/student/applications/:id/upload-url`
- `POST /api/student/applications/:id/documents/confirm`
- `POST /api/student/applications/:id/submit`
- `GET /api/admin/applications`
- `GET /api/admin/applications/:id`
- `POST /api/admin/applications/:id/status`
- `POST /api/admin/applications/:id/reopen`
