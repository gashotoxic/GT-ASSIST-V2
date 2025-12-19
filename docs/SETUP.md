# GT Assistant Setup Guide

Complete setup instructions for GT Assistant including environment configuration, API keys, and deployment.

## 🛠️ Prerequisites

Before you begin, ensure you have the following:

1. **Node.js** (v18 or higher)
2. **GitHub Account**
3. **Vercel Account** (for deployment)
4. **Chutes.ai API Key** (Required for all AI inference)
5. **Supabase Account** (Optional, for Cloud Sync)
6. **Clerk Account** (Required for authentication)
7. **Stripe Account** (Optional, for payments)

---

## 🔑 Environment Variables

Create a `.env.local` file in the root directory:

```env
# REQUIRED: Chutes.ai API Key
VITE_CHUTES_API_KEY=your_chutes_key_here

# REQUIRED: Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# OPTIONAL: For Web Search
VITE_TAVILY_API_KEY=your_tavily_key
# OR
VITE_BRAVE_API_KEY=your_brave_key

# OPTIONAL: For Cloud Database (Users can also enter in UI)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_anon_key

# OPTIONAL: For Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## 🗄️ Supabase Configuration

### Initial Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the **SQL Editor** in your dashboard
3. Run the initial schema setup from [docs/DATABASE.md](DATABASE.md)

### Project Settings

Go to **Project Settings > API** and note down:
- **Project URL**
- **anon public key**

Add these to your `.env.local` file.

---

## 🔐 Clerk Configuration

### Setup Steps

1. Create account at [clerk.com](https://clerk.com)
2. Create a new application
3. Go to **API Keys** in Clerk dashboard
4. Copy the **Publishable Key** (starts with `pk_`)
5. Add to `.env.local`: `VITE_CLERK_PUBLISHABLE_KEY=your_key`

### Webhook Configuration (Optional)

For production, set up Clerk webhooks to sync user data to Supabase:
- Endpoint: `https://your-app.vercel.app/api/webhooks/clerk`
- Events: `user.created`, `user.updated`

---

## 💳 Stripe Configuration (Optional)

### For Payment Integration

1. Create account at [stripe.com](https://stripe.com)
2. Go to **Developers > API Keys**
3. Use **Publishable Key** for frontend
4. Set up webhook endpoint for payment processing
5. Configure pricing plans in Stripe dashboard

---

## 🚀 Local Development

### 1. Clone Repository
```bash
git clone https://github.com/your-username/gt-assistant.git
cd gt-assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Create Environment File
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

### 4. Run Development Server
```bash
npm run dev
```

Access at `http://localhost:5173`

---

## ☁️ Production Deployment (Vercel)

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### Step 2: Import to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Select your `gt-assistant` repository

### Step 3: Configure Build Settings

Vercel usually auto-detects Vite, but verify:
- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`

### Step 4: Add Environment Variables

In Vercel dashboard, add these environment variables:

| Variable Name | Description | Required |
| --- | --- | --- |
| `VITE_CHUTES_API_KEY` | Chutes.ai API Key | ✅ YES |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key | ✅ YES |
| `VITE_SUPABASE_URL` | Supabase Project URL | Optional |
| `VITE_SUPABASE_KEY` | Supabase Anon Key | Optional |
| `VITE_TAVILY_API_KEY` | Tavily Search API Key | Optional |
| `VITE_BRAVE_API_KEY` | Brave Search API Key | Optional |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe Publishable Key | Optional |

**⚠️ Important**: These variables will be bundled into the client-side code. Only include keys that are safe to expose.

### Step 5: Deploy

Click **Deploy**. Vercel will provide a live URL (e.g., `https://gt-assistant.vercel.app`).

---

## 🧪 Testing Your Setup

### Verify Configuration

1. **Start the app**: `npm run dev`
2. **Open browser console**: Check for errors
3. **Test chat**: Send a message (should use Chutes API)
4. **Test authentication**: Click Sign In (should show Clerk modal)
5. **Test media generation**: Try image generation
6. **Test cloud sync**: Enable Supabase in Settings

### Troubleshooting

- **"Invalid API key"**: Check `VITE_CHUTES_API_KEY` in `.env.local`
- **"Clerk error"**: Verify `VITE_CLERK_PUBLISHABLE_KEY` is correct
- **"Database error"**: Check Supabase URL and key, ensure tables exist

---

## 🔄 Next Steps

- [ ] Create Clerk account and get API keys
- [ ] Set up Supabase project (optional)
- [ ] Configure environment variables
- [ ] Start development: `npm run dev`
- [ ] Test all features

For implementation details, see [IMPLEMENTATION_STATUS.md](../IMPLEMENTATION_STATUS.md)

---

**Last Updated**: December 17, 2025  
**Version**: 1.0