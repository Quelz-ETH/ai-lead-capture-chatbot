# AI Lead Capture Chatbot

A lightweight, AI-powered lead capture chatbot built with Netlify Functions, OpenAI, and Supabase.

## Features

- 🤖 **AI-Powered Chat** - GPT-4o-mini for natural conversations
- 📝 **Smart Lead Capture** - Automatically prompts for contact info after engagement
- 📊 **Admin Dashboard** - Simple analytics page to view leads
- 📧 **Automated Emails** - Thank you emails via Resend
- ⚡ **Serverless** - Runs on Netlify's free tier

## Setup Instructions

### 1. Supabase Database Setup

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to SQL Editor and run this query to create the leads table:

```sql
CREATE TABLE leads (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  session_id TEXT,
  message_count INTEGER,
  conversation_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional but recommended)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create a policy to allow inserts from the anon key
CREATE POLICY "Allow anonymous inserts" ON leads
  FOR INSERT TO anon
  WITH CHECK (true);

-- Create a policy to allow reads (for admin dashboard)
CREATE POLICY "Allow anonymous reads" ON leads
  FOR SELECT TO anon
  USING (true);
```

4. Get your Supabase URL and anon key from Settings > API

### 2. OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Add billing (pay-as-you-go, ~$0.01 per 20-30 messages)

### 3. Resend Email Setup (Optional)

1. Create account at [resend.com](https://resend.com)
2. Verify your domain or use their test domain
3. Get your API key

### 4. Netlify Deployment

1. Push this repo to GitHub
2. Connect to Netlify
3. Add environment variables in Netlify dashboard:

```
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
RESEND_API_KEY=re_... (optional)
FROM_EMAIL=noreply@yourdomain.com (optional)
```

4. Deploy!

## File Structure

```
├── index.html              # Main page with chat widget
├── admin.html              # Admin dashboard (password: admin123)
├── netlify.toml            # Netlify configuration
├── package.json            # Dependencies
├── netlify/
│   └── functions/
│       ├── chat.js         # OpenAI chat endpoint
│       └── save-lead.js    # Lead storage + email
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes | Your OpenAI API key |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |
| `RESEND_API_KEY` | No | Resend API key for emails |
| `FROM_EMAIL` | No | Email sender address |

## Admin Dashboard

Access the admin dashboard at `/admin.html`

Default password: `admin123` (change this in admin.html!)

## Cost Estimate

- **Netlify**: Free tier (125k function invocations/month)
- **Supabase**: Free tier (500MB database, 50k API requests/month)
- **OpenAI**: ~$0.01 per 20-30 messages with GPT-4o-mini
- **Resend**: Free tier (100 emails/day)

## Customization

### Change the AI Personality

Edit the `SYSTEM_PROMPT` in `netlify/functions/chat.js` to customize how the AI responds.

### Change Admin Password

Edit the `ADMIN_PASSWORD` constant in `admin.html`.

### Styling

The frontend uses Tailwind CSS via CDN. Edit the colors in the `tailwind.config` object in `index.html`.

## License

MIT
