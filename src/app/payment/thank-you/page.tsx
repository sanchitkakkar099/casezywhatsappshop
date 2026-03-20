"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get("ref") ?? "";

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">Payment Successful!</h1>

        <p className="text-gray-600">
          Thank you for your payment. Your order is being processed.
        </p>

        {orderRef && (
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-500">Order Reference</p>
            <p className="text-lg font-semibold text-gray-900 mt-1">{orderRef}</p>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left space-y-2">
          <p className="text-sm text-emerald-800 font-medium">What happens next?</p>
          <ul className="text-sm text-emerald-700 space-y-1">
            <li>✅ Payment confirmation sent to your WhatsApp</li>
            <li>📦 Your order will be shipped shortly</li>
            <li>🚚 Tracking details will be shared on WhatsApp</li>
          </ul>
        </div>

        <p className="text-xs text-gray-400">
          You can close this page. All updates will be sent to your WhatsApp.
        </p>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}
