import { env } from "cloudflare:workers";

export function telegramConfigured(): boolean {
  return /^\d+:[A-Za-z0-9_-]+$/.test(String(env.TELEGRAM_BOT_TOKEN || "")) && !!String(env.TELEGRAM_CHAT_ID || "");
}

/** Sends a plain-text alert to the owner chat. Throws if Telegram rejects it or times out. */
export async function sendTelegram(text: string): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${String(env.TELEGRAM_BOT_TOKEN || "")}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: String(env.TELEGRAM_CHAT_ID || ""), text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(8000),
  });
  const result = await response.json() as { ok?: boolean };
  if (!response.ok || !result.ok) throw new Error(`Telegram API returned ${response.status}`);
}
