import type { APIRoute } from 'astro';

type ContactEnv = {
  TURNSTILE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  CONTACT_TO_EMAIL: string;
  CONTACT_FROM_EMAIL: string;
};

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const RESEND_EMAIL_URL = 'https://api.resend.com/emails';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: Record<string, unknown>, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...init?.headers,
    },
  });

const getClientIp = (request: Request) =>
  request.headers.get('CF-Connecting-IP') ||
  request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim();

const verifyTurnstile = async (token: string, request: Request, secret: string) => {
  const verification = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      secret,
      response: token,
      remoteip: getClientIp(request),
    }),
    signal: AbortSignal.timeout(8000),
  });

  return verification.json() as Promise<{ success: boolean; 'error-codes'?: string[] }>;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return replacements[character];
  });

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const env = (locals as any).runtime?.env as ContactEnv;
  const acceptsJson = request.headers.get('accept')?.includes('application/json') ||
                      request.headers.get('x-requested-with') === 'fetch';

  const fail = (message: string, status = 400) =>
    acceptsJson
      ? json({ message }, { status })
      : redirect(`/contact?error=${encodeURIComponent(message)}`, 303);

  try {
    const data = await request.formData();
    const name = data.get('name')?.toString().trim();
    const email = data.get('email')?.toString().trim();
    const message = data.get('message')?.toString().trim();
    const turnstileToken = data.get('cf-turnstile-response')?.toString();

    if (!name || !email || !message) {
      return fail('Please complete all fields.');
    }

    if (!emailPattern.test(email)) {
      return fail('Please enter a valid email address.');
    }

    if (!turnstileToken) {
      return fail('Please complete the verification challenge.');
    }

    if (!env?.TURNSTILE_SECRET_KEY) {
      console.error('TURNSTILE_SECRET_KEY is not configured');
      return fail('Server configuration error.', 500);
    }

    const turnstile = await verifyTurnstile(turnstileToken, request, env.TURNSTILE_SECRET_KEY);

    if (!turnstile.success) {
      console.warn('Turnstile validation rejected submission', turnstile['error-codes']);
      return fail('Verification failed. Please try again.');
    }

    // Send email via Resend
    if (env.RESEND_API_KEY && env.CONTACT_TO_EMAIL && env.CONTACT_FROM_EMAIL) {
      const subject = `Gym Log Contact from ${name}`;
      const html = `
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Message:</strong></p>
        <p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>
      `;

      const res = await fetch(RESEND_EMAIL_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: env.CONTACT_FROM_EMAIL,
          to: [env.CONTACT_TO_EMAIL],
          subject,
          html,
          reply_to: email,
        }),
      });

      if (!res.ok) {
        throw new Error(`Resend failed: ${await res.text()}`);
      }
    } else {
      console.log('Form submission (Email not sent - missing config):', { name, email, message });
    }

    return acceptsJson
      ? json({ message: 'Thanks, your message has been sent.' })
      : redirect('/support?success=true', 303);

  } catch (error) {
    console.error('Contact form error:', error);
    return fail('Something went wrong. Please try again later.', 500);
  }
};
