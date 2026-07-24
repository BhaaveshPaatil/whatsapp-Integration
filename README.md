::: {align="center"}
🚀 WhatsApp Task Manager
Transform WhatsApp conversations into actionable tasks with AI.
An enterprise-ready, multi-tenant SaaS that automatically converts
WhatsApp messages into structured tasks using the Official WhatsApp
Cloud API, Google Gemini AI, and Firebase.
![Next.js](https://img.shields.io/badge/Next.js-15-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud_API-25D366)
![License](https://img.shields.io/badge/License-MIT-green)
:::
---
✨ Overview
WhatsApp Task Manager helps teams capture work directly from WhatsApp.
Instead of manually copying messages into a task manager, the platform
automatically receives incoming WhatsApp messages, extracts actionable
tasks using AI, and organizes them inside a collaborative dashboard.
Key Features
---
AI                      WhatsApp                Collaboration
---
Gemini-powered task     Official WhatsApp Cloud Multi-tenant
extraction              API                     organizations
Intent detection        Webhook integration     Team management
Priority & due-date     Real-time message sync  RBAC
extraction
Productivity      Platform
---
Task management   Firebase Authentication
AI Logs           Firestore Database
Analytics         Vercel Deployment
---
🏗 Architecture
``` mermaid
flowchart LR
A[WhatsApp User]
-->B[WhatsApp Cloud API]
-->C[Webhook]
-->D[Firestore]
-->E[Processing Queue]
-->F[Worker]
-->G[Google Gemini]
-->H[Task Creation]
-->I[Dashboard]
```
---
🛠 Tech Stack
Layer            Technology
---
Frontend         Next.js, React, TypeScript
Styling          Tailwind CSS
Backend          Next.js API Routes
Database         Firebase Firestore
Authentication   Firebase Authentication
AI               Google Gemini
Messaging        WhatsApp Cloud API
Hosting          Vercel
---
📁 Project Structure
``` text
src/
 ├── app/
 ├── components/
 ├── lib/
 │   ├── pipeline/
 │   ├── services/
 │   └── firebase/
 ├── hooks/
 ├── types/
 └── utils/
```
---
⚙️ Environment Variables
``` env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

FIREBASE_SERVICE_ACCOUNT_JSON=
GEMINI_API_KEY=

WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_VERIFY_TOKEN=

PIPELINE_WORKER_SECRET=
DEFAULT_ORG_ID=
```
---
🔥 Firestore Collections
Collection            Purpose
---
organizations         Multi-tenant organizations
users                 User profiles
tasks                 AI-generated tasks
conversations         Chat threads
whatsappMessages      Incoming messages
processingQueue       Worker queue
processingLogs        Pipeline logs
whatsappConnections   Phone number mappings
aiExtractions         AI extraction history
organizationInvites   Team invitations
---
🚦 Processing Pipeline
``` text
WhatsApp
      │
      ▼
Webhook
      │
      ▼
Normalize Message
      │
      ▼
Firestore
      │
      ▼
Queue
      │
      ▼
Worker
      │
      ▼
Gemini AI
      │
      ▼
Structured Task
      │
      ▼
Dashboard
```
---
🚀 Getting Started
``` bash
git clone <repository-url>
cd whatsapp-task-manager
npm install
npm run dev
```
Open:
    http://localhost:3000

---
📸 Screenshots
Dashboard       WhatsApp Hub
---
Coming Soon   Coming Soon
AI Logs         Analytics
---
Coming Soon   Coming Soon
---
🔒 Security
Firebase Authentication
Role-Based Access Control (RBAC)
Webhook verification
Secure server-side API routes
Firestore Security Rules
Environment-based secrets
---
🗺 Roadmap
✅ Completed
Firebase Authentication
Multi-tenant Organizations
Team Management
WhatsApp Cloud API Integration
Webhook Support
Gemini Integration
AI Extraction Pipeline
Task Dashboard
🚧 In Progress
End-to-end task automation
Firestore index optimization
WhatsApp onboarding wizard
Production monitoring
📌 Planned
Calendar integration
Email support
Voice message transcription
File attachment extraction
Slack & Teams integrations
---
🤝 Contributing
Contributions, feature requests, and bug reports are welcome.
Fork the repository
Create a feature branch
Commit your changes
Open a Pull Request
---
📄 License
This project is licensed under the MIT License.
---
::: {align="center"}
Built with ❤️ using Next.js, Firebase, Gemini AI and the WhatsApp Cloud
API.
:::