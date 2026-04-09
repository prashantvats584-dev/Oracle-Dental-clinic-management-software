# Oracle Dental Clinic Management System

A professional dental clinic management system built with React, Vite, and Firebase.

## Features

- **Multi-Doctor Support**: Independent data scoping for each doctor.
- **Patient Management**: Auto-dentition selection based on age.
- **Appointment Scheduling**: Real-time updates and WhatsApp confirmations.
- **Prescription & Invoice Generation**: AI-powered suggestions and PDF export.
- **Financial Tracking**: Expense management and lab billing.
- **Admin Dashboard**: Role-based access control and doctor management.

## Performance Optimized

- **Code Splitting**: Lazy loading of pages for fast initial load.
- **Optimized Build**: Manual chunk splitting for better caching.
- **Mobile First**: Responsive design with optimized touch targets.

## Deployment to GitHub Pages

This project is configured for easy deployment to GitHub Pages.

### 1. Setup

Ensure you have your Firebase configuration in `src/lib/firebase.ts` or a `.env` file.

### 2. Install Dependencies

```bash
npm install
```

### 3. Deploy

Run the following command to build and deploy to the `gh-pages` branch:

```bash
npm run deploy
```

The app will be available at `https://<your-username>.github.io/<repo-name>/`.

## Local Development

```bash
npm run dev
```

## Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS, Motion
- **Backend**: Firebase (Auth, Firestore)
- **Icons**: Lucide React
- **PDF**: jsPDF
