# LoanSwift: A Next.js Loan Management System

This is a comprehensive loan management application built with Next.js, Firebase, and Genkit. It provides a full suite of tools for loan officers, managers, and administrators to manage borrowers, loans, payments, and financial accounting.

## Key Features

- **Role-Based Access Control:** Differentiated dashboards and capabilities for Loan Officers, CFOs, CEOs, HR, and Admins.
- **Portfolio Management:** Track borrowers, loans, payments, and collateral.
- **Full Accounting Suite:** Includes a Chart of Accounts, General Journal, and automated accounting entries for loan disbursement and payments.
- **AI-Powered Financial Analysis:** Generate deep financial insights and forecasts using Genkit and Google's Gemini models.
- **Secure by Design:** Utilizes Firebase Security Rules, server-side actions, schema validation with Zod, and a detailed audit trail for critical actions.
- **Modern UI/UX:** Built with ShadCN UI, Tailwind CSS, and includes features like skeleton loading, a global search command palette, and a responsive, mobile-first design.

## Tech Stack

- **Framework:** Next.js (with App Router)
- **Styling:** Tailwind CSS, ShadCN UI
- **Database:** Cloud Firestore
- **Authentication:** Firebase Authentication
- **Generative AI:** Google Genkit
- **State Management:** TanStack Query (React Query)
- **Form Handling:** React Hook Form, Zod

## Getting Started

First, ensure you have Node.js and npm installed.

### 1. Install Dependencies

Install the project dependencies:

```bash
npm install
```

### 2. Configure Environment Variables

This project uses Firebase. You will need to create a `.env` file in the root of the project and add your Firebase project credentials. You can get these from your Firebase project settings.

```
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-...@your-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Initial Admin User for Seeding
# Change these to your desired initial admin credentials.
ADMIN_EMAIL="admin@example.com"
ADMIN_PASSWORD="your-secure-password"
```

**Important**: The `FIREBASE_PRIVATE_KEY` must have its newline characters escaped as `\n`.

### 3. Seed the Admin User

Before running the application, you must seed the initial administrator account. This script creates the user in Firebase Authentication, sets their custom role to 'admin', and creates their user document in Firestore.

Run the following command:

```bash
npm run seed:admin
```

You can verify the admin user was created correctly by running:

```bash
npm run check:admin
```

### 4. Run the Development Server

Now, you can run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. You can log in using the admin credentials you configured in your `.env` file.
