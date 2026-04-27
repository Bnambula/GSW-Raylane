# Raylane Express

**Uganda's First Vertically Integrated Transport Technology Platform**

> *Tusimbudde — We travel together*

## What is Raylane Express?

Raylane Express is three businesses on one technical foundation:

1. **Passenger Marketplace** — Book bus seats, send parcels, charter coaches. Pay via MTN MoMo in 60 seconds. Works on any phone including 2G feature phones.
2. **Operator SaaS Platform** — Full business management dashboard for bus companies: trip submissions, seat bookings, parcel deliveries, driver records, fleet compliance, payroll, insurance, and GAAP-compliant financial statements.
3. **Internal Fleet** — Raylane's own coaches (UBF 001K, 002K, 003K) managed through the Super Admin dashboard.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Pure HTML, CSS, JavaScript — no framework, no build step |
| Hosting | Vercel (static) |
| Database | Supabase PostgreSQL with Row Level Security |
| Payments | DPO Group (MTN MoMo, Airtel Money, Visa, Mastercard) |
| SMS | Africa's Talking (RAYLANE sender ID, UGX 25/SMS) |
| Maps | Google Maps API |
| Fonts | Barlow Condensed + Barlow + DM Sans |

## Colours

- **Royal Blue** `#0B2FA0` — Primary
- **Warriors Gold** `#E8A800` — Accent
- **Deep Navy** `#040E35` — Dark surfaces

## File Structure

```
raylane/
├── index.html              ← Homepage (passenger-facing)
├── vercel.json             ← Routing + headers config
├── .gitignore
├── README.md
└── pages/
    ├── book.html           ← Trip search & booking flow
    ├── parcels.html        ← Parcel delivery + charter
    ├── group.html          ← Group bookings
    ├── account.html        ← Passenger login/account
    ├── partner.html        ← Operator onboarding
    ├── operator.html       ← Operator SaaS dashboard
    ├── admin.html          ← Super Admin console
    ├── routes.html         ← Routes & timetables
    ├── about.html          ← About / careers / press
    ├── contact.html        ← Contact page
    ├── safety.html         ← Safety page
    ├── terms.html          ← Terms of service
    ├── privacy.html        ← Privacy policy
    └── refund.html         ← Refund policy
```

## Portals

| Portal | URL | Purpose |
|--------|-----|---------|
| Passenger Website | `/` | Book seats, parcels, charter |
| Booking Flow | `/book` | Search + seat selection + payment |
| Parcel Delivery | `/parcels` | Send packages |
| Group Bookings | `/group` | 10+ passenger groups |
| Passenger Account | `/account` | Login, tickets, loyalty |
| Partner Portal | `/partner` | Operator onboarding |
| Operator Dashboard | `/operator` | Business SaaS dashboard |
| Super Admin | `/admin` | Platform control |

## Payment Flows

### MTN Mobile Money
1. Dial `*165*3#`
2. Select **Pay Goods/Services**
3. Merchant Code: **RAYLANE EXPRESS**
4. Enter amount
5. Enter **booking name as reference** (must match exactly)
6. Enter MoMo PIN
7. USSD push confirms in ~8 seconds

### Airtel Money
1. Dial `*185*9#`
2. Select **Pay Goods/Services**
3. Merchant Code: **RAYLANE EXPRESS**
4. Enter amount + reference name
5. Enter PIN

### Parcel Payments
Use **Parcel ID (PKL-XXXXXX)** as reference — NOT passenger name.

## Subscription Plans

| Plan | Monthly | Commission |
|------|---------|-----------|
| Starter | Free | 8% |
| Standard | UGX 200,000 | 8% |
| Professional | UGX 450,000 | 6% |
| Enterprise | UGX 900,000 | 5% |

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy from project root
vercel --prod
```

Or connect this GitHub repo to Vercel and it auto-deploys on every push.

## Environment Variables (Production)

Set these in Vercel dashboard under Settings > Environment Variables:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
DPO_COMPANY_TOKEN=your_dpo_token
AFRICASTALKING_API_KEY=your_at_key
AFRICASTALKING_USERNAME=raylane
GOOGLE_MAPS_API_KEY=your_maps_key
```

## Compliance

- Data Protection and Privacy Act Uganda 2019
- ICPAU / IFRS financial standards
- URA VAT at 18% (quarterly returns)
- PAYE per Uganda Revenue Authority bands
- NSSF: 10% employer + 5% employee
- PCI-DSS Level 1 via DPO Group (card data never stored by Raylane)

---

*Kampala, Uganda 🇺🇬 · Tusimbudde!*
