# Gym Log Landing Page & Support Site

This is the landing page and support site for the **Gym Log** iOS app, built with **Astro 6** and hosted on **Cloudflare Pages**.

## 🚀 Features

- **Home / App Overview**: Highlights the main features of Gym Log.
- **Privacy Policy**: Meets Apple App Store requirements for health data apps.
- **Support**: FAQ and contact options.
- **Contact Form**: Integrated via Astro API routes (Cloudflare Functions).
- **Cloudflare Integration**: Pre-configured with the `@astrojs/cloudflare` adapter.

## 🛠 Setup & Development

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Run locally:**
   ```bash
   pnpm dev
   ```

3. **Build for production:**
   ```bash
   pnpm build
   ```

## ☁️ Cloudflare Configuration

### Email Routing
To set up the email aliases (e.g., `support@gym-log-app.com`):
1. Go to the **Cloudflare Dashboard**.
2. Select your domain.
3. Go to **Email > Email Routing**.
4. Enable the service and add your destination email (e.g., your Gmail).
5. Create a **Routing Rule** for `support` (and `contact`) to forward to your destination.

### Contact Form
The contact form uses an API route at `src/pages/api/contact.ts`. 
To make it functional:
1. Choose an email service (e.g., **Resend**, **SendGrid**, or **Mailgun**).
2. Update the `POST` handler in `src/pages/api/contact.ts` with your API key and logic.
3. (Optional) Add **Cloudflare Turnstile** for bot protection by following the [Astro + Turnstile guide](https://docs.astro.build/en/guides/integrations-guide/cloudflare/#turnstile).

### Deployment
1. Connect this repository to **Cloudflare Pages**.
2. Use the following build settings:
   - **Framework preset**: `Astro`
   - **Build command**: `pnpm build`
   - **Output directory**: `dist`
   - **Environment variables**: Add any API keys (e.g., `RESEND_API_KEY`) in the Cloudflare Dashboard.
