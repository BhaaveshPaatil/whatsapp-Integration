<div align="center">

# 🚀 TaskFlow AI

### Transform WhatsApp conversations into actionable tasks with AI.

An AI-powered, multi-tenant SaaS platform that automatically converts WhatsApp messages into structured tasks using the **Official WhatsApp Cloud API**, **Google Gemini AI**, and **Firebase**.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase)
![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=for-the-badge&logo=google)
![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud_API-25D366?style=for-the-badge&logo=whatsapp)

</div>

---

# 📖 Overview

TaskFlow AI is an intelligent productivity platform that bridges WhatsApp communication with modern task management.

Instead of manually reading chats and creating tasks, the platform automatically receives incoming WhatsApp messages, understands user intent using Google Gemini AI, extracts actionable information such as tasks, priorities, due dates, and assignees, and organizes everything into a collaborative dashboard.

Designed with a multi-tenant architecture, TaskFlow AI enables multiple organizations to securely manage their own WhatsApp integrations, teams, and AI-generated tasks from a single platform.

---

# ✨ Features

## 🤖 AI Powered

- Automatic task extraction using Google Gemini
- Natural language understanding
- Due date recognition
- Priority detection
- Context-aware processing
- AI extraction logs

---

## 💬 WhatsApp Integration

- Official WhatsApp Cloud API
- Secure webhook verification
- Real-time message processing
- Automatic message normalization
- Asynchronous processing pipeline
- Message queue architecture

---

## 📋 Task Management

- AI-generated tasks
- Manual task management
- Status tracking
- Priority levels
- Due dates
- Team assignments

---

## 👥 Collaboration

- Multi-tenant organizations
- Team management
- Role-Based Access Control (RBAC)
- Organization invitations
- Secure data isolation

---

## 🔒 Security

- Firebase Authentication
- Firestore Security Rules
- Secure API routes
- Webhook verification
- Environment-based configuration
- Organization isolation

---

# 🏗 System Architecture

```text
WhatsApp User
      │
      ▼
WhatsApp Cloud API
      │
      ▼
Webhook Endpoint
      │
      ▼
Normalize Incoming Message
      │
      ▼
Firestore Database
      │
      ▼
Processing Queue
      │
      ▼
Background Worker
      │
      ▼
Google Gemini AI
      │
      ▼
Extract Structured Task
      │
      ▼
Task Dashboard
```

---

# 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | Next.js 15 |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Firebase Firestore |
| Authentication | Firebase Authentication |
| AI | Google Gemini |
| Messaging | WhatsApp Cloud API |
| Hosting | Vercel |

---

# 📂 Project Structure

```text
src/
│
├── app/
│   ├── api/
│   ├── dashboard/
│   └── auth/
│
├── components/
│
├── lib/
│   ├── firebase/
│   ├── pipeline/
│   ├── services/
│   └── utils/
│
├── hooks/
│
├── store/
│
└── types/
```

---

# 🔥 Firestore Collections

| Collection | Description |
|------------|-------------|
| organizations | Organization information |
| users | User profiles |
| tasks | Task management |
| conversations | WhatsApp conversations |
| whatsappMessages | Incoming WhatsApp messages |
| processingQueue | Background processing queue |
| processingLogs | Worker execution logs |
| whatsappConnections | WhatsApp phone mappings |
| aiExtractions | AI extraction history |
| organizationInvites | Team invitations |

---

# ⚙️ Environment Variables

```env
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

# 🚀 Getting Started

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Open

```
http://localhost:3000
```

---

# 📈 Current Progress

| Module | Status |
|---------|--------|
| Authentication | ✅ Complete |
| Multi-Tenant Organizations | ✅ Complete |
| Team Management | ✅ Complete |
| WhatsApp Cloud API | ✅ Complete |
| Webhook Integration | ✅ Complete |
| AI Extraction | ✅ Complete |
| Firestore Integration | 🚧 In Progress |
| Background Worker | 🚧 In Progress |
| Automatic Task Creation | 🚧 In Progress |
| Analytics | 🚧 In Progress |

---

# 🎯 Roadmap

### ✅ Completed

- Firebase Authentication
- Team Management
- RBAC
- WhatsApp Cloud API Integration
- Webhook Verification
- Gemini AI Integration
- Task Dashboard

### 🚧 In Progress

- Automatic task creation
- Firestore optimization
- Background workers
- Connection management

### 🔮 Planned

- Voice message transcription
- Image OCR
- Calendar integration
- Email integration
- Slack integration
- Microsoft Teams integration
- Mobile application
- Advanced analytics

---

# 🤝 Contributing

Contributions, bug reports, and feature requests are welcome.

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push your branch
5. Open a Pull Request

---

# 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

### Built with ❤️ using Next.js, Firebase, Google Gemini and the WhatsApp Cloud API.

**TaskFlow AI © 2026**

</div>