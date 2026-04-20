# 🚌 Raylane Express — Deployment Guide

## Deploy to raylaneexpress.com in 15 minutes

### Prerequisites
- GitHub account
- Vercel account (free tier works)
- Domain: `raylaneexpress.com` (add in Vercel dashboard)

---

## Step 1 — Push to GitHub

```bash
# Clone or init the repo
git init
git add .
git commit -m "feat: Raylane Express MVP v2 launch"
git branch -M main
git remote add origin https://github.com/YOUR_ORG/raylane-express.git
git push -u origin main
```

---

## Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. **Framework Preset**: `Other` (static HTML)
4. **Build Command**: leave empty
5. **Output Directory**: `.` (root)
6. Click **Deploy**

Vercel auto-reads `vercel.json` for routing rules.

---

## Step 3 — Add GitHub Secrets (for CI/CD)

In your GitHub repo → Settings → Secrets → Actions:

| Secret Name | Where to find it |
|-------------|-----------------|
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel → Team Settings → General |
| `VERCEL_PROJECT_ID` | Vercel → Project → Settings → General |

---

## Step 4 — Add Custom Domain

1. Vercel → Project → Settings → Domains
2. Add `raylaneexpress.com` and `www.raylaneexpress.com`
3. Update DNS at your registrar:
   - `A` record: `76.76.21.21`
   - `CNAME` (www): `cname.vercel-dns.com`

SSL is issued automatically within minutes.

---

## Step 5 — Set Environment Variables

In Vercel → Project → Settings → Environment Variables:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=your_key
DPO_MERCHANT_TOKEN=your_token
AFRICA_TALKING_API_KEY=your_key
AFRICA_TALKING_USERNAME=raylane
GOOGLE_MAPS_API_KEY=your_key
MTN_MOMO_SUBSCRIPTION_KEY=your_key
AIRTEL_MONEY_CLIENT_ID=your_key
```

---

## File Structure

```
raylane-express/
├── index.html              ← Homepage (/)
├── vercel.json             ← Routing, headers, redirects
├── manifest.json           ← PWA manifest
├── sw.js                   ← Service worker (offline)
├── robots.txt              ← SEO
├── pages/
│   ├── book.html           ← /book — Booking flow
│   ├── operator.html       ← /operator — Operator dashboard
│   ├── admin.html          ← /admin — Super admin console
│   ├── partner.html        ← /partner — Apply to join
│   ├── account.html        ← /account — Passenger account
│   ├── routes.html         ← /routes — All routes
│   ├── terms.html          ← /terms
│   ├── privacy.html        ← /privacy
│   ├── refund.html         ← /refund
│   ├── about.html          ← /about
│   ├── contact.html        ← /contact
│   └── safety.html         ← /safety
├── assets/
│   ├── logo.png            ← Raylane Express logo
│   ├── icon-192.png        ← PWA icon
│   ├── icon-512.png        ← PWA icon large
│   └── og-image.png        ← Social share image
└── .github/
    └── workflows/
        └── deploy.yml      ← Auto-deploy on push to main
```

---

## URL Routes (from vercel.json)

| URL | File |
|-----|------|
| `/` | `index.html` |
| `/book` | `pages/book.html` |
| `/operator` | `pages/operator.html` |
| `/admin` | `pages/admin.html` |
| `/partner` | `pages/partner.html` |
| `/account` | `pages/account.html` |
| `/routes` | `pages/routes.html` |
| `/terms` | `pages/terms.html` |
| `/privacy` | `pages/privacy.html` |

---

## Week 1 Checklist

- [ ] Push code to GitHub
- [ ] Connect Vercel, deploy to `raylaneexpress.com`
- [ ] Add logo to `/assets/logo.png`
- [ ] Set all environment variables in Vercel
- [ ] Apply for Africa's Talking account (SMS gateway)
- [ ] Apply for DPO Group merchant account (payments)
- [ ] Register Google Maps API key (terminal finder)
- [ ] Create Supabase project, run `setup.sql`
- [ ] Test MTN MoMo payment end-to-end
- [ ] Test booking → QR ticket → SMS flow

---

## Portal Access

| Portal | URL | Access |
|--------|-----|--------|
| Passenger Website | `raylaneexpress.com` | Public |
| Booking | `raylaneexpress.com/book` | Public |
| Operator Dashboard | `raylaneexpress.com/operator` | Operator login |
| Super Admin | `raylaneexpress.com/admin` | Raylane staff only |
| Partner Onboarding | `raylaneexpress.com/partner` | Public |
| Passenger Account | `raylaneexpress.com/account` | Phone OTP |

---

*Tusimbudde! — Raylane Express, Kampala, Uganda*
