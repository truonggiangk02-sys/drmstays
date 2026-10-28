declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_PASSWORD?: string;
    SITE_URL?: string;
    WHATSAPP_NUMBER?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    STAYDESK_CATALOG_URL?: string;
    STAYDESK_CATALOG_SECRET?: string;
    PREVIEW_DEMO?: string;
    OPENAI_API_KEY?: string;
    HERE_API_KEY?: string;
  }
}
