"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

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

export default function PaymentPage() {
  const params = useParams();
  const ref = params.ref as string;
  const [info, setInfo] = useState<PaymentInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

        if (data.status === "pending" && data.cashfreeSessionId) {
          // Load Cashfree SDK and redirect
          loadCashfreeCheckout(data);
        }
      } catch {
        setError("Failed to load payment details");
      } finally {
        setLoading(false);
      }
    }

    loadPayment();
  }, [ref]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8 text-center">
        {loading && (
          <div>
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
            <p className="text-gray-500 text-sm">Loading payment...</p>
          </div>
        )}

        {error && (
          <div>
            <div className="text-4xl mb-4">:(</div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              Payment Not Found
            </h1>
            <p className="text-gray-500 text-sm">{error}</p>
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

        {info?.status === "pending" && !loading && (
          <div>
            <div className="animate-spin h-8 w-8 border-2 border-gray-300 border-t-black rounded-full mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-900 mb-2">
              Redirecting to Payment...
            </h1>
            <p className="text-gray-500 text-sm mb-4">
              {info.productName} &mdash; {info.currency}{" "}
              {Number(info.amount).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400">
              If you are not redirected,{" "}
              <button
                onClick={() => info && loadCashfreeCheckout(info)}
                className="text-blue-600 underline"
              >
                click here
              </button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function loadCashfreeCheckout(info: PaymentInfo) {
  // Redirect to Cashfree's hosted checkout page
  const checkoutUrl = `https://payments.cashfree.com/pg/view/order/${info.cashfreeOrderId}`;
  window.location.href = checkoutUrl;
}
