"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Script from "next/script";

interface PaymentInfo {
  status: string;
  orderRef: string;
  checkoutId: string;
  cashfreeOrderId: string;
  cashfreeSessionId: string;
  amount: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  message?: string;
}

declare global {
  interface Window {
    Cashfree: {
      PG: {
        new (options: { mode: string }): {
          checkout: (options: {
            paymentSessionId: string;
            redirectTarget: string;
          }) => Promise<{ error?: { message: string }; paymentDetails?: unknown }>;
        };
      };
    };
  }
}

export default function PaymentPage() {
  const params = useParams();
  const ref = params.ref as string;
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const checkoutTriggered = useRef(false);

  useEffect(() => {
    async function loadPayment() {
      try {
        const res = await fetch(`/api/pay/${ref}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Order not found");
          return;
        }

        setInfo(data);
      } catch {
        setError("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [ref]);

  // Trigger checkout once SDK is loaded and info is available
  useEffect(() => {
    if (
      sdkLoaded &&
      info?.status === "pending" &&
      info.cashfreeSessionId &&
      !checkoutTriggered.current
    ) {
      checkoutTriggered.current = true;
      triggerCheckout(info.cashfreeSessionId);
    }
  }, [sdkLoaded, info]);

  async function triggerCheckout(sessionId: string) {
    try {
      const cashfree = new window.Cashfree.PG({ mode: "PRODUCTION" });
      const result = await cashfree.checkout({
        paymentSessionId: sessionId,
        redirectTarget: "_self",
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to open payment page"
      );
    }
  }

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        onLoad={() => setSdkLoaded(true)}
        strategy="afterInteractive"
      />

      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
          {(loading || (info?.status === "pending" && !error)) && (
            <div>
              <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
              <h1 className="text-lg font-bold text-gray-900 mb-2">
                {loading ? "Loading..." : "Opening Payment..."}
              </h1>
              {info && (
                <p className="text-gray-500 text-sm mb-4">
                  {info.productName} &mdash; &#8377;
                  {Number(info.amount).toFixed(2)}
                </p>
              )}
              <p className="text-xs text-gray-400">
                Please wait while we redirect you to the payment page.
              </p>
            </div>
          )}

          {error && (
            <div>
              <div className="text-4xl mb-4">&#9888;</div>
              <h1 className="text-xl font-bold text-red-600 mb-2">
                Payment Error
              </h1>
              <p className="text-gray-500 text-sm mb-4">{error}</p>
              {info?.cashfreeSessionId && (
                <button
                  onClick={() => {
                    setError(null);
                    checkoutTriggered.current = false;
                    triggerCheckout(info.cashfreeSessionId);
                  }}
                  className="px-6 py-2 bg-black text-white text-sm font-medium rounded hover:bg-gray-800"
                >
                  Try Again
                </button>
              )}
            </div>
          )}

          {info?.status === "already_paid" && (
            <div>
              <div className="text-4xl mb-4">&#10003;</div>
              <h1 className="text-xl font-bold text-green-700 mb-2">
                Already Paid
              </h1>
              <p className="text-gray-500 text-sm">
                Order {info.orderRef} has already been paid. Thank you!
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
