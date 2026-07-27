# 🚀 FundoraX — Backend API Server

FundoraX Server powers the backend of the **FundoraX Crowdfunding Platform**, delivering a secure and scalable REST API for authentication, campaign management, payments, notifications, and administrative operations.

Built with **Node.js, Express.js, MongoDB, and JWT**, the server supports role-based access control for **Supporters**, **Creators**, and **Admins**, while integrating **Google OAuth 2.0**, **Stripe Test Mode**, and real-time notification workflows.

---

# 🌍 Live Links

| Resource                | URL                                            |
| ----------------------- | ---------------------------------------------- |
| 🌐 Backend API          | https://fundorax-server.onrender.com           |
| 💻 Frontend Application | https://fundorax-iota.vercel.app               |
| 📦 Server Repository    | https://github.com/Safa-Anan08/FundoraX-Server |
| 🎨 Client Repository    | https://github.com/Safa-Anan08/FundoraX        |

---

# 🔐 Demo Accounts

| Role         | Email                    | Password       | Default Credits |
| ------------ | ------------------------ | -------------- | --------------: |
| 👑 Admin     | `admin@fundorax.com`     | `admin123`     |          10,000 |
| 🚀 Creator   | `creator@fundorax.com`   | `creator123`   |              20 |
| ❤️ Supporter | `supporter@fundorax.com` | `supporter123` |              50 |

---

# ✨ Backend Features

* 🔐 JWT Authentication & Authorization
* 🔑 Google OAuth 2.0 Login
* 👥 Role-Based Access Control (Admin, Creator, Supporter)
* 📢 Notification Management System
* 🎯 Campaign Approval Workflow
* 💰 Stripe Test Mode Payment Integration
* 🔄 Stripe Webhook Verification
* 💳 Credit Purchase & Wallet Management
* 🤝 Contribution Approval & Refund System
* 💵 Creator Withdrawal Management
* 🛡️ Secure Protected API Routes
* 📊 Dashboard Statistics APIs
* 🚨 Campaign Report & Moderation System
* ⚡ RESTful API Architecture
* 🌐 Production-ready CORS Configuration

---

# 🛠 Tech Stack

### Backend

* Node.js
* Express.js
* MongoDB
* Mongoose
* JWT
* bcryptjs

### Authentication

* Email & Password Authentication
* Google OAuth 2.0

### Payment

* Stripe Payment Intents
* Stripe Webhooks

### Utilities

* Cookie Parser
* CORS
* dotenv

---

# 📂 Environment Variables

Create a `.env` file inside the **server** directory.

```env
PORT=5000

MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/fundorax?retryWrites=true&w=majority

JWT_SECRET=your_jwt_secret

CLIENT_URL=http://localhost:3000

STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
```

> **Important:** Never commit your real environment variables or secret keys to GitHub.

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/Safa-Anan08/FundoraX-Server.git
```

Move into the project:

```bash
cd FundoraX-Server
```

Install dependencies:

```bash
npm install
```

Create your `.env` file.

Start the development server:

```bash
npm run dev
```

The API will be available at:

```text
http://localhost:5000
```

---

# 🩺 Health Check

Verify that the server is running correctly:

```http
GET /api/health
```

Expected response:

```json
{
  "status": "ok",
  "app": "FundoraX API Server"
}
```

---

# 📌 API Modules

* Authentication
* Users
* Campaigns
* Contributions
* Payments
* Withdrawals
* Notifications
* Reports
* Admin Management

---

# 🔒 Security

* Passwords encrypted using **bcryptjs**
* JWT-based authentication
* Role-based authorization middleware
* Protected admin routes
* Secure Stripe webhook signature verification
* Environment variables for all sensitive credentials
* Production-ready CORS configuration

---

# 👨‍💻 Developed By

**Safa Anan**

* GitHub: https://github.com/Safa-Anan08
* LinkedIn: https://linkedin.com/in/safa-anan
