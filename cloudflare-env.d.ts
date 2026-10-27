declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ADMIN_PASSWORD?: string;
    WHATSAPP_NUMBER?: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHAT_ID?: string;
    STAYDESK_CATALOG_URL?: string;
    STAYDESK_CATALOG_SECRET?: string;
  }
}
