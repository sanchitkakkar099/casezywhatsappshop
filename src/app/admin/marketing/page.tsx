"use client";

import { useEffect, useState, useCallback } from "react";
import { friendlyError } from "@/lib/friendly-errors";

interface Campaign {
  id: string;
  name: string;
  templateName: string;
  audience: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

const AUDIENCES = [
  { value: "all", label: "All Customers", desc: "Every customer in your database" },
  { value: "paid", label: "Paid Customers", desc: "Customers who completed at least 1 payment" },
  { value: "unpaid", label: "Never Paid", desc: "Customers who never completed a payment" },
  { value: "repeat", label: "Repeat Buyers", desc: "Customers with 2+ successful orders" },
];

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [audience, setAudience] = useState("all");

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/marketing/campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns ?? []);
    } catch {
      setToast({ type: "error", message: "Could not load campaigns" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !templateName.trim()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/admin/marketing/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, templateName, audience }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      setToast({
        type: "success",
        message: `Campaign "${name}" created with ${data.recipients} recipients. Click Send to start.`,
      });
      setShowCreate(false);
      setName("");
      setTemplateName("");
      setAudience("all");
      fetchCampaigns();
    } catch (err) {
      setToast({ type: "error", message: friendlyError(err) });
    } finally {
      setCreating(false);
    }
  };

  const handleSend = async (campaignId: string, campaignName: string) => {
    if (!confirm(`Send campaign "${campaignName}" to all recipients now? This will send WhatsApp messages immediately.`)) return;

    setSending(campaignId);
    try {
      const res = await fetch(`/api/admin/marketing/campaigns/${campaignId}/send`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const data = await res.json();
      setToast({
        type: "success",
        message: `Campaign sent! ${data.sentCount} messages delivered${data.failedCount > 0 ? `, ${data.failedCount} failed` : ""}.`,
      });
      fetchCampaigns();
    } catch (err) {
      setToast({ type: "error", message: friendlyError(err) });
    } finally {
      setSending(null);
    }
  };

  const statusStyle = (status: string) => {
    switch (status) {
      case "DRAFT": return "bg-gray-100 text-gray-600";
      case "SENDING": return "bg-amber-100 text-amber-700";
      case "COMPLETED": return "bg-emerald-100 text-emerald-700";
      case "FAILED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const audienceLabel = (a: string) =>
    AUDIENCES.find((x) => x.value === a)?.label ?? a;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-black">Marketing</h1>
          <p className="mt-0.5 text-sm text-gray-400">
            Send WhatsApp campaigns to your customers
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">
          + New Campaign
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`animate-slide-in-right border-l-4 px-4 py-3 text-sm ${
          toast.type === "success"
            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
            : "border-red-500 bg-red-50 text-red-700"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Abandoned cart info */}
      <div className="card border-l-[3px] border-brand-400 p-5">
        <div className="flex items-start gap-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-black">Abandoned Cart Recovery</p>
            <p className="mt-0.5 text-xs text-gray-500">
              Automatic reminders are sent to customers who don&apos;t complete payment.
              3 reminders are sent: after 1 hour, 6 hours, and 24 hours.
              Configure the template name in Settings &rarr; WhatsApp Templates &rarr; &quot;Abandoned Cart Template&quot;.
            </p>
          </div>
        </div>
      </div>

      {/* Create Campaign Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="card p-6">
          <h3 className="font-display text-base font-bold text-black mb-5">
            Create New Campaign
          </h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Campaign Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekend Sale Announcement"
                required
                className="input-field mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                WhatsApp Template Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name from ChatMint"
                required
                className="input-field mt-1"
              />
              <p className="mt-1 text-[11px] text-gray-400">
                Must be an approved template in your ChatMint account
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block">
                Target Audience
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {AUDIENCES.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setAudience(a.value)}
                    className={`p-3 text-left transition-colors ${
                      audience === a.value
                        ? "border-2 border-brand-400 bg-brand-50"
                        : "border-2 border-gray-100 hover:border-gray-200"
                    }`}
                  >
                    <p className="text-sm font-medium text-black">{a.label}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">{a.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <button type="submit" disabled={creating} className="btn-primary">
              {creating ? "Creating..." : "Create Campaign"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Campaign List */}
      {loading ? (
        <div className="flex h-32 items-center justify-center text-gray-400 text-sm">
          Loading campaigns...
        </div>
      ) : campaigns.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-sm text-gray-400">
            No campaigns yet. Create your first campaign to start reaching customers on WhatsApp.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-black">{c.name}</h3>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusStyle(c.status)}`}>
                      {c.status}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                    <span>Template: <span className="text-gray-600">{c.templateName}</span></span>
                    <span>Audience: <span className="text-gray-600">{audienceLabel(c.audience)}</span></span>
                    <span>Recipients: <span className="text-gray-600">{c.totalRecipients}</span></span>
                    <span>{new Date(c.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Stats */}
                  {c.status !== "DRAFT" && (
                    <div className="flex gap-3 text-xs">
                      <span className="text-emerald-600 font-medium">{c.sentCount} sent</span>
                      {c.failedCount > 0 && (
                        <span className="text-red-500 font-medium">{c.failedCount} failed</span>
                      )}
                    </div>
                  )}

                  {/* Send button */}
                  {c.status === "DRAFT" && (
                    <button
                      onClick={() => handleSend(c.id, c.name)}
                      disabled={sending === c.id}
                      className="btn-primary text-xs"
                    >
                      {sending === c.id ? (
                        <span className="flex items-center gap-1.5">
                          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Sending...
                        </span>
                      ) : (
                        "Send Now"
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Marketing Ideas */}
      <div className="card p-5">
        <h3 className="font-display text-sm font-semibold text-black mb-3">
          Campaign Ideas to Boost Revenue
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="border border-gray-100 p-4">
            <p className="text-sm font-medium text-black">Weekly New Arrivals</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Send new product launches to all customers every week. Use audience: &quot;All Customers&quot;.
            </p>
          </div>
          <div className="border border-gray-100 p-4">
            <p className="text-sm font-medium text-black">Win-Back Unpaid Customers</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Offer a discount to customers who browsed but never paid. Use audience: &quot;Never Paid&quot;.
            </p>
          </div>
          <div className="border border-gray-100 p-4">
            <p className="text-sm font-medium text-black">VIP Repeat Buyer Offers</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Exclusive deals for loyal customers. Use audience: &quot;Repeat Buyers&quot;.
            </p>
          </div>
          <div className="border border-gray-100 p-4">
            <p className="text-sm font-medium text-black">Flash Sale Alert</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Limited-time offers sent to all customers. Create urgency with countdown messaging.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
