export type SendEmailInput = {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  text: string;
};

export interface EmailTransport {
  readonly name: string;
  send(input: SendEmailInput): Promise<{ id: string }>;
}

// Logs instead of sending. Used until RESEND_API_KEY is configured so the whole
// pipeline (query → interpolate → mark sent → log event) can be exercised end
// to end without delivering real email.
class DryRunTransport implements EmailTransport {
  readonly name = "dry-run";
  async send(input: SendEmailInput): Promise<{ id: string }> {
    console.log(
      `[dry-run email] to=${input.to} from="${input.from}" reply-to=${input.replyTo ?? "-"} subject="${input.subject}"`,
    );
    return { id: `dryrun_${crypto.randomUUID()}` };
  }
}

class ResendTransport implements EmailTransport {
  readonly name = "resend";
  constructor(private readonly apiKey: string) {}

  async send(input: SendEmailInput): Promise<{ id: string }> {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: input.from,
        to: input.to,
        reply_to: input.replyTo,
        subject: input.subject,
        text: input.text,
      }),
    });

    if (!res.ok) {
      throw new Error(`Resend ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as { id: string };
    return { id: data.id };
  }
}

// Picks the transport from the environment. Real sending kicks in automatically
// once RESEND_API_KEY is present — no code change needed.
export function getTransport(): EmailTransport {
  const key = process.env.RESEND_API_KEY;
  return key ? new ResendTransport(key) : new DryRunTransport();
}
