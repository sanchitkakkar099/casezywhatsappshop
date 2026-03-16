"use client";

import { useEffect, useState, useCallback } from "react";
import {
  INTEGRATION_KEYS,
  INTEGRATION_LABELS,
  type IntegrationField,
} from "@/lib/integration-keys";

type Tab = "chatmint" | "cashfree" | "shopify";

interface FieldState {
  value: string;
  isSecret: boolean;
  isSet: boolean;
}

type SettingsData = Record<string, Record<string, FieldState>>;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chatmint");
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const tabs: Tab[] = ["chatmint", "cashfree", "shopify"];

  const fetchSettings = useCallback(() => {
    fetch("/api/admin/settings")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setSettings)
      .catch(() =>
        setToast({ type: "error", message: "Failed to load settings" })
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-xl font-bold text-black">Settings</h1>
        <p className="mt-0.5 text-sm text-gray-400">
          Manage integration API keys, templates, and configuration
        </p>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`animate-slide-in-right border-l-4 px-4 py-3 text-sm ${
            toast.type === "success"
              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
              : "border-red-500 bg-red-50 text-red-700"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "border-b-2 border-brand-400 text-black"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {INTEGRATION_LABELS[tab]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
          Loading settings...
        </div>
      ) : (
        <div className="space-y-8">
          <IntegrationForm
            integration={activeTab}
            fields={INTEGRATION_KEYS[activeTab]}
            currentValues={settings?.[activeTab] ?? {}}
            saving={saving}
            onSave={async (values) => {
              setSaving(true);
              try {
                const res = await fetch("/api/admin/settings", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    integration: activeTab,
                    settings: values,
                  }),
                });
                if (!res.ok) {
                  const err = await res.json();
                  throw new Error(err.error || "Save failed");
                }
                const data = await res.json();
                setToast({
                  type: "success",
                  message: `Saved ${data.updated} setting${data.updated !== 1 ? "s" : ""} for ${INTEGRATION_LABELS[activeTab]}`,
                });
                fetchSettings();
              } catch (err) {
                setToast({
                  type: "error",
                  message:
                    err instanceof Error ? err.message : "Save failed",
                });
              } finally {
                setSaving(false);
              }
            }}
          />

          {/* Collapsible guide */}
          <details className="card">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-gray-500 hover:text-black transition-colors">
              Setup Guide &mdash; {INTEGRATION_LABELS[activeTab]}
            </summary>
            <div className="border-t border-gray-100 px-6 py-5">
              {activeTab === "chatmint" && <ChatMintGuide />}
              {activeTab === "cashfree" && <CashfreeGuide />}
              {activeTab === "shopify" && <ShopifyGuide />}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

/* ─── Integration Form with Group Support ─── */

function IntegrationForm({
  integration,
  fields,
  currentValues,
  saving,
  onSave,
}: {
  integration: string;
  fields: IntegrationField[];
  currentValues: Record<string, FieldState>;
  saving: boolean;
  onSave: (values: Record<string, string>) => Promise<void>;
}) {
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setFormValues({});
  }, [integration]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formValues);
    setFormValues({});
  };

  const hasChanges = Object.values(formValues).some((v) => v.trim() !== "");

  // Group fields
  const groups: { name: string; fields: IntegrationField[] }[] = [];
  const ungrouped: IntegrationField[] = [];

  for (const field of fields) {
    if (field.group) {
      const existing = groups.find((g) => g.name === field.group);
      if (existing) {
        existing.fields.push(field);
      } else {
        groups.push({ name: field.group, fields: [field] });
      }
    } else {
      ungrouped.push(field);
    }
  }

  const renderField = (field: IntegrationField) => {
    const current = currentValues[field.key];
    const isSet = current?.isSet ?? false;

    return (
      <div key={field.key}>
        <div className="mb-1.5 flex items-center justify-between">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {field.label}
            </label>
            {field.description && (
              <p className="text-[11px] text-gray-400 mt-0.5 normal-case tracking-normal">
                {field.description}
              </p>
            )}
          </div>
          {isSet && (
            <span className="flex items-center gap-1 text-[11px] text-emerald-500">
              <svg
                className="h-3 w-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
              Configured
            </span>
          )}
        </div>

        {field.type === "select" ? (
          <select
            value={formValues[field.key] ?? current?.value ?? ""}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }))
            }
            className="input-field"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        ) : (
          <input
            type={field.isSecret ? "password" : "text"}
            value={formValues[field.key] ?? ""}
            onChange={(e) =>
              setFormValues((prev) => ({
                ...prev,
                [field.key]: e.target.value,
              }))
            }
            placeholder={
              isSet && current?.isSecret
                ? current.value
                : isSet && !current?.isSecret
                ? current.value
                : field.placeholder ??
                  `Enter ${field.label.toLowerCase()}`
            }
            className="input-field"
          />
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-display text-base font-bold text-black">
            {INTEGRATION_LABELS[integration]} Configuration
          </h3>
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span className="text-xs text-gray-400">Encrypted at rest</span>
          </div>
        </div>

        {/* Ungrouped fields */}
        {ungrouped.length > 0 && (
          <div className="space-y-4">{ungrouped.map(renderField)}</div>
        )}

        {/* Grouped fields */}
        {groups.map((group, i) => (
          <div
            key={group.name}
            className={`${i > 0 || ungrouped.length > 0 ? "mt-6 border-t border-gray-100 pt-6" : ""}`}
          >
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
              {group.name}
            </h4>
            <div className="space-y-4">{group.fields.map(renderField)}</div>
          </div>
        ))}

        <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-5">
          <p className="text-xs text-gray-400">
            {hasChanges
              ? "Only filled fields will be updated"
              : "Enter new values to update"}
          </p>
          <button
            type="submit"
            disabled={saving || !hasChanges}
            className="btn-primary"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Settings"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ─── Guide Helpers ─── */

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center bg-brand-400 text-xs font-bold text-black">
        {number}
      </div>
      <div className="flex-1 pt-0.5">
        <h4 className="text-sm font-semibold text-black">{title}</h4>
        <div className="mt-1 text-sm text-gray-500 leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

function TemplateCard({
  name,
  settingKey,
  purpose,
  variables,
}: {
  name: string;
  settingKey: string;
  purpose: string;
  variables: string[];
}) {
  return (
    <div className="border border-gray-100 p-4">
      <div className="flex items-start justify-between">
        <h5 className="text-sm font-semibold text-black">{name}</h5>
        <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 text-gray-500">
          {settingKey}
        </code>
      </div>
      <p className="mt-0.5 text-xs text-gray-400">{purpose}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {variables.map((v) => (
          <span
            key={v}
            className="bg-brand-50 border border-brand-200 px-2 py-0.5 text-[11px] font-mono text-brand-800"
          >
            {`{{${v}}}`}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Guides ─── */

function ChatMintGuide() {
  return (
    <div className="space-y-8">
      {/* How it works — visual flow */}
      <div className="border border-brand-200 bg-brand-50 p-5">
        <h4 className="text-sm font-bold text-black mb-3">How the System Works</h4>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-brand-400 text-[10px] font-bold text-black">1</div>
            <p className="text-gray-600">Customer clicks <span className="font-medium text-black">&quot;Shop Now&quot;</span> on WhatsApp or messages your business number</p>
          </div>
          <div className="ml-3 border-l-2 border-brand-300 h-3" />
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-brand-400 text-[10px] font-bold text-black">2</div>
            <p className="text-gray-600"><span className="font-medium text-black">ChatMint bot</span> asks customer for: name, email, phone, address, product choice</p>
          </div>
          <div className="ml-3 border-l-2 border-brand-300 h-3" />
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-brand-400 text-[10px] font-bold text-black">3</div>
            <p className="text-gray-600">ChatMint sends collected data to <span className="font-medium text-black">your webhook URL</span> (see Step 4 below)</p>
          </div>
          <div className="ml-3 border-l-2 border-brand-300 h-3" />
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center bg-brand-400 text-[10px] font-bold text-black">4</div>
            <p className="text-gray-600"><span className="font-medium text-black">This system takes over</span> &mdash; creates payment link, sends it to customer, tracks payment, creates Shopify order, sends tracking</p>
          </div>
        </div>
        <div className="mt-4 border-t border-brand-200 pt-3">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-black">ChatMint</span> = the messenger (talks to customers, collects info) &nbsp;&bull;&nbsp;
            <span className="font-medium text-black">This system</span> = the brain (payments, orders, notifications) &nbsp;&bull;&nbsp;
            <span className="font-medium text-black">The bridge</span> = ChatMint&apos;s webhook sending data to your API
          </p>
        </div>
      </div>

      {/* Setup steps */}
      <div>
        <h4 className="mb-5 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Setup Steps
        </h4>
        <div className="space-y-6">
          <Step number={1} title="Create a ChatMint Account">
            Sign up at{" "}
            <span className="font-medium text-black">chatmint.in</span>. Verify
            a phone number to use as the WhatsApp Business sender.
          </Step>

          <Step number={2} title="Get API Credentials">
            In the ChatMint dashboard:{" "}
            <span className="font-medium text-black">
              Settings &rarr; API Keys
            </span>
            . Copy your API Key and note your sender number. Enter them in the API Configuration section above.
          </Step>

          <Step number={3} title="Create a WhatsApp Bot Flow in ChatMint">
            In ChatMint, create a new bot flow that collects customer info when they message you or click &quot;Shop Now&quot;. The bot should ask for:
            <ul className="mt-2 list-inside list-disc space-y-1 text-gray-500">
              <li><span className="font-medium text-black">Full Name</span></li>
              <li><span className="font-medium text-black">Email</span></li>
              <li><span className="font-medium text-black">Phone Number</span> (with country code)</li>
              <li><span className="font-medium text-black">Shipping Address</span> (line1, city, state, pincode)</li>
              <li><span className="font-medium text-black">Product Selection</span> (which product they want to buy)</li>
              <li><span className="font-medium text-black">Quantity</span></li>
            </ul>
          </Step>

          <Step number={4} title="Configure Webhook in ChatMint Bot Flow">
            At the end of your bot flow, add a <span className="font-medium text-black">Webhook / API Call</span> action with these settings:
          </Step>
        </div>
      </div>

      {/* Webhook config card */}
      <div className="ml-11 border border-gray-200 bg-gray-50 p-5 space-y-4">
        <h5 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Webhook Configuration</h5>
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Method</p>
            <code className="mt-1 block bg-white border border-gray-200 px-3 py-2 text-sm font-mono">POST</code>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">URL</p>
            <code className="mt-1 block bg-white border border-gray-200 px-3 py-2 text-sm font-mono break-all">
              https://your-domain.com/api/whatsapp/checkout
            </code>
            <p className="mt-1 text-[11px] text-gray-400">Replace &quot;your-domain.com&quot; with your actual domain</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Headers</p>
            <div className="mt-1 bg-white border border-gray-200 px-3 py-2 font-mono text-sm space-y-1">
              <p><span className="text-gray-500">Content-Type:</span> application/json</p>
              <p><span className="text-gray-500">x-api-key:</span> <span className="text-brand-700">your-intake-api-key</span></p>
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              The x-api-key value is your <code className="bg-gray-100 px-1">WHATSAPP_INTAKE_API_KEY</code> from your .env file
            </p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Body (JSON) &mdash; Map these fields from your bot flow</p>
            <pre className="mt-1 bg-white border border-gray-200 px-3 py-3 text-xs font-mono overflow-x-auto">{`{
  "full_name": "{{customer_name}}",
  "email": "{{customer_email}}",
  "phone": "{{customer_phone}}",
  "shipping_address": {
    "line1": "{{address_line1}}",
    "line2": "{{address_line2}}",
    "city": "{{city}}",
    "state": "{{state}}",
    "pincode": "{{pincode}}",
    "country": "India"
  },
  "billing_address": {
    "line1": "{{address_line1}}",
    "city": "{{city}}",
    "state": "{{state}}",
    "pincode": "{{pincode}}",
    "country": "India"
  },
  "product_id": "{{selected_product_id}}",
  "quantity": 1
}`}</pre>
            <p className="mt-2 text-[11px] text-gray-400">
              Replace <code className="bg-gray-100 px-1">{`{{variable}}`}</code> with the actual variable names from your ChatMint bot flow.
              The <code className="bg-gray-100 px-1">product_id</code> should match a product ID from your Products page.
            </p>
          </div>
        </div>
      </div>

      {/* Continue steps */}
      <div className="space-y-6">
        <Step number={5} title="Create WhatsApp Message Templates in ChatMint">
          These templates are used by the system to send automated messages back to the customer.
          Go to <span className="font-medium text-black">ChatMint &rarr; Templates</span> and create each one below.
          They need Meta approval (24-48 hours).
        </Step>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 ml-11">
        <TemplateCard
          name="Payment Link"
          settingKey="tplPaymentLink"
          purpose="Sent when checkout is created — includes Cashfree payment link"
          variables={[
            "customer_name",
            "product_name",
            "amount",
            "payment_link",
          ]}
        />
        <TemplateCard
          name="Payment Confirmation"
          settingKey="tplPaymentConfirmation"
          purpose="Sent after payment success + Shopify order created"
          variables={["customer_name", "amount", "order_ref"]}
        />
        <TemplateCard
          name="Tracking Info"
          settingKey="tplTrackingInfo"
          purpose="Sent when tracking is added to a shipped order"
          variables={[
            "customer_name",
            "order_ref",
            "courier_name",
            "tracking_number",
            "tracking_url",
          ]}
        />
        <TemplateCard
          name="Abandoned Cart"
          settingKey="tplAbandonedCart"
          purpose="Auto-sent when customer doesn't pay (1hr, 6hr, 24hr)"
          variables={[
            "customer_name",
            "product_name",
            "amount",
            "payment_link",
          ]}
        />
      </div>

      <div className="space-y-6">
        <Step number={6} title="Configure Template Names Above">
          Enter the exact template names (as created in ChatMint) in the
          WhatsApp Templates section above. The system will use these names
          when triggering messages at each stage.
        </Step>

        <Step number={7} title="Test the Full Flow">
          <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-500">
            <li>Send a message to your WhatsApp Business number</li>
            <li>Complete the bot flow (enter name, address, product)</li>
            <li>Check this dashboard &mdash; a new order should appear</li>
            <li>Check WhatsApp &mdash; you should receive a payment link</li>
            <li>Complete the payment &mdash; order should update to &quot;Paid&quot;</li>
            <li>Check Shopify &mdash; order should appear there too</li>
          </ol>
        </Step>
      </div>

      {/* What happens after */}
      <div className="border border-gray-200 bg-white p-5">
        <h4 className="text-sm font-bold text-black mb-3">What Happens Automatically After Setup</h4>
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            Customer messages you &rarr; bot collects info &rarr; order created here
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            Payment link sent to customer on WhatsApp automatically
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            Customer pays &rarr; payment confirmation sent on WhatsApp
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            Shopify order created automatically (you just fulfill it)
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
            You ship in Shopify &rarr; tracking info sent to customer on WhatsApp
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand-400" />
            Customer doesn&apos;t pay? &rarr; automatic reminders at 1hr, 6hr, 24hr
          </div>
        </div>
      </div>
    </div>
  );
}

function CashfreeGuide() {
  return (
    <div className="space-y-6">
      <Step number={1} title="Create a Cashfree Account">
        Sign up at{" "}
        <span className="font-medium text-black">
          merchant.cashfree.com
        </span>
        . Complete KYC for production access.
      </Step>
      <Step number={2} title="Get API Credentials">
        <span className="font-medium text-black">
          Developers &rarr; API Keys
        </span>
        . Generate App ID and Secret Key.
      </Step>
      <Step number={3} title="Configure Webhook">
        Add webhook endpoint:{" "}
        <code className="bg-gray-100 px-1.5 py-0.5 text-xs">
          https://your-domain.com/api/webhooks/cashfree
        </code>
        <br />
        Events:{" "}
        <code className="bg-gray-100 px-1 text-xs">PAYMENT_SUCCESS</code>,{" "}
        <code className="bg-gray-100 px-1 text-xs">PAYMENT_FAILED</code>.
        Copy the Webhook Secret.
      </Step>
      <Step number={4} title="Save Credentials Above">
        Enter all credentials in the form above. Set environment to
        &quot;sandbox&quot; for testing.
      </Step>
      <Step number={5} title="Test &amp; Go Live">
        Test with sandbox, then switch to production keys and set environment
        to &quot;production&quot;.
      </Step>
    </div>
  );
}

function ShopifyGuide() {
  return (
    <div className="space-y-6">
      <Step number={1} title="Create a Custom App">
        In Shopify admin:{" "}
        <span className="font-medium text-black">
          Settings &rarr; Apps &rarr; Develop apps &rarr; Create an app
        </span>
        . Name it something like &quot;Casezy WhatsApp Orders&quot;.
      </Step>
      <Step number={2} title="Configure API Scopes">
        In the app settings, go to{" "}
        <span className="font-medium text-black">
          Configuration &rarr; Admin API integration
        </span>{" "}
        and enable these scopes:
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-500">
          <li><code className="bg-gray-100 px-1 text-xs">write_orders</code> — Create orders</li>
          <li><code className="bg-gray-100 px-1 text-xs">read_orders</code> — Read order status</li>
          <li><code className="bg-gray-100 px-1 text-xs">write_products</code> — Manage products</li>
          <li><code className="bg-gray-100 px-1 text-xs">read_products</code> — Read product data (needed for sync)</li>
          <li><code className="bg-gray-100 px-1 text-xs">read_fulfillments</code> — Read tracking info</li>
        </ul>
      </Step>
      <Step number={3} title="Install &amp; Get Access Token">
        Click <span className="font-medium text-black">Install app</span>. Copy the{" "}
        <span className="font-medium text-black">Admin API access token</span> — it is shown only once, so save it immediately.
      </Step>
      <Step number={4} title="Save Credentials Above">
        Enter these 3 values in the form above:
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-500">
          <li><span className="font-medium text-black">Store Domain</span> — your Shopify store URL (e.g., casezy-store.myshopify.com)</li>
          <li><span className="font-medium text-black">Access Token</span> — the Admin API token you just copied</li>
          <li><span className="font-medium text-black">Webhook Secret</span> — found in Settings &rarr; Notifications &rarr; Webhooks</li>
        </ul>
      </Step>
      <Step number={5} title="Set Up Fulfillment Webhook (Optional)">
        To get automatic tracking updates, go to{" "}
        <span className="font-medium text-black">
          Settings &rarr; Notifications &rarr; Webhooks
        </span>{" "}
        and add:
        <div className="mt-2">
          <code className="block bg-gray-100 px-3 py-2 text-xs font-mono">
            https://your-domain.com/api/webhooks/shopify/fulfillment
          </code>
        </div>
        <div className="mt-1 text-xs">
          Event: <code className="bg-gray-100 px-1 text-xs">orders/fulfilled</code>
        </div>
      </Step>
      <Step number={6} title="Sync Products">
        Go to the <span className="font-medium text-black">Products</span> page and click{" "}
        <span className="font-medium text-black">Sync from Shopify</span>. This will automatically import all your products with their Shopify IDs — no manual mapping needed.
      </Step>
      <Step number={7} title="Test the Integration">
        Create a test checkout, complete payment, and verify:
        <ul className="mt-2 list-inside list-disc space-y-1 text-gray-500">
          <li>A corresponding order appears in Shopify admin</li>
          <li>Customer details and line items are correct</li>
          <li>The order is marked as paid</li>
          <li>Check the <span className="font-medium text-black">Logs</span> page for any sync errors</li>
        </ul>
      </Step>
    </div>
  );
}
