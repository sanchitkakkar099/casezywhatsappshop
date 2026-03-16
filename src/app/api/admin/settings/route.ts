import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { encrypt, decrypt, maskValue } from "@/lib/encryption";
import { INTEGRATION_KEYS, ENV_MAP } from "@/lib/integration-keys";
import { errorResponse, UnauthorizedError } from "@/lib/errors";

/**
 * GET /api/admin/settings
 *
 * Returns all integration settings grouped by integration.
 * Secret values are masked (last 4 chars only).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const dbSettings = await db.integrationSetting.findMany();

    // Build a lookup: integration -> key -> record
    const lookup = new Map<string, Map<string, typeof dbSettings[0]>>();
    for (const setting of dbSettings) {
      if (!lookup.has(setting.integration)) {
        lookup.set(setting.integration, new Map());
      }
      lookup.get(setting.integration)!.set(setting.key, setting);
    }

    // Build response grouped by integration
    const result: Record<string, Record<string, {
      value: string;
      isSecret: boolean;
      isSet: boolean;
    }>> = {};

    for (const [integration, fields] of Object.entries(INTEGRATION_KEYS)) {
      result[integration] = {};

      for (const field of fields) {
        const dbRecord = lookup.get(integration)?.get(field.key);

        if (dbRecord) {
          // Value exists in DB
          const decryptedValue = decrypt(dbRecord.encryptedValue);
          result[integration][field.key] = {
            value: field.isSecret ? maskValue(decryptedValue) : decryptedValue,
            isSecret: field.isSecret,
            isSet: true,
          };
        } else {
          // Check env fallback
          const envKey = ENV_MAP[integration]?.[field.key];
          const envValue = envKey ? process.env[envKey] : undefined;

          const isRealValue = envValue
            && !envValue.includes("placeholder")
            && !envValue.includes("your_")
            && !envValue.includes("your-")
            && !envValue.includes("generate-")
            && !envValue.includes("xxxxx");

          if (isRealValue) {
            result[integration][field.key] = {
              value: field.isSecret ? maskValue(envValue) : envValue,
              isSecret: field.isSecret,
              isSet: true,
            };
          } else {
            result[integration][field.key] = {
              value: "",
              isSecret: field.isSecret,
              isSet: false,
            };
          }
        }
      }
    }

    return Response.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * PUT /api/admin/settings
 *
 * Update integration settings. Only non-empty values are saved.
 * Values are encrypted before storage.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) throw new UnauthorizedError();

    const body = await request.json();
    const { integration, settings } = body as {
      integration: string;
      settings: Record<string, string>;
    };

    // Validate integration
    if (!INTEGRATION_KEYS[integration]) {
      return Response.json(
        { error: `Invalid integration: ${integration}` },
        { status: 400 }
      );
    }

    // Validate keys
    const validKeys = INTEGRATION_KEYS[integration].map((f) => f.key);
    const fieldMap = new Map(
      INTEGRATION_KEYS[integration].map((f) => [f.key, f])
    );

    const updatedKeys: string[] = [];

    for (const [key, value] of Object.entries(settings)) {
      if (!validKeys.includes(key)) {
        return Response.json(
          { error: `Invalid key "${key}" for integration "${integration}"` },
          { status: 400 }
        );
      }

      if (typeof value !== "string" || value.trim() === "") {
        continue; // Skip empty values
      }

      const field = fieldMap.get(key)!;
      const encryptedValue = encrypt(value.trim());

      await db.integrationSetting.upsert({
        where: {
          integration_key: { integration, key },
        },
        create: {
          integration,
          key,
          encryptedValue,
          isSecret: field.isSecret,
          updatedBy: session.user?.email ?? "unknown",
        },
        update: {
          encryptedValue,
          isSecret: field.isSecret,
          updatedBy: session.user?.email ?? "unknown",
        },
      });

      updatedKeys.push(key);
    }

    // Audit log (log keys changed, never values)
    if (updatedKeys.length > 0) {
      await db.auditLog.create({
        data: {
          actor: session.user?.email ?? "unknown",
          action: "settings.update",
          entity: "IntegrationSetting",
          entityId: integration,
          details: { keys: updatedKeys },
        },
      });
    }

    return Response.json({
      success: true,
      updated: updatedKeys.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
