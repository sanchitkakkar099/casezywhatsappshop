// Validated environment config — fails fast if required vars are missing.

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { ENV_MAP } from "@/lib/integration-keys";

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string = ""): string {
  return process.env[key] ?? fallback;
}

export const config = {
  // App
  appUrl: optional("APP_URL", "http://localhost:3000"),
  nodeEnv: optional("NODE_ENV", "development"),
  whatsappIntakeApiKey: required("WHATSAPP_INTAKE_API_KEY"),

  // NextAuth
  nextAuthUrl: optional("NEXTAUTH_URL", "http://localhost:3000"),
  nextAuthSecret: required("NEXTAUTH_SECRET"),

  // Cashfree
  cashfree: {
    appId: required("CASHFREE_APP_ID"),
    secretKey: required("CASHFREE_SECRET_KEY"),
    webhookSecret: required("CASHFREE_WEBHOOK_SECRET"),
    env: optional("CASHFREE_ENV", "sandbox") as "sandbox" | "production",
    get baseUrl() {
      return this.env === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";
    },
  },

  // Shopify
  shopify: {
    storeDomain: required("SHOPIFY_STORE_DOMAIN"),
    accessToken: required("SHOPIFY_ACCESS_TOKEN"),
    webhookSecret: required("SHOPIFY_WEBHOOK_SECRET"),
    apiVersion: optional("SHOPIFY_API_VERSION", "2024-01"),
    get baseUrl() {
      return `https://${this.storeDomain}/admin/api/${this.apiVersion}`;
    },
  },

  // ChatMint (WhatsApp)
  chatmint: {
    apiUrl: optional("CHATMINT_API_URL", "https://backend.chatmint.in/api"),
    apiKey: required("CHATMINT_API_KEY"),
    senderNumber: required("CHATMINT_SENDER_NUMBER"),
  },
} as const;

// ============================================================
// DB-backed config with env fallback + caching
// ============================================================

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const configCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Get an integration config value. Checks DB first, falls back to env var.
 * Results are cached for 60 seconds.
 */
export async function getIntegrationConfig(
  integration: string,
  key: string
): Promise<string> {
  const cacheKey = `${integration}:${key}`;

  // Check cache
  const cached = configCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  // Check DB
  try {
    const setting = await db.integrationSetting.findUnique({
      where: { integration_key: { integration, key } },
    });

    if (setting) {
      const value = decrypt(setting.encryptedValue);
      configCache.set(cacheKey, {
        value,
        expiresAt: Date.now() + CACHE_TTL_MS,
      });
      return value;
    }
  } catch {
    // DB not available, fall through to env
  }

  // Fall back to env var
  const envKey = ENV_MAP[integration]?.[key];
  const envValue = envKey ? process.env[envKey] : undefined;

  if (envValue) {
    configCache.set(cacheKey, {
      value: envValue,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return envValue;
  }

  throw new Error(
    `Missing config: ${integration}.${key} (not in DB or env)`
  );
}

/**
 * Clear the config cache. Call after settings are updated.
 */
export function clearConfigCache(): void {
  configCache.clear();
}
