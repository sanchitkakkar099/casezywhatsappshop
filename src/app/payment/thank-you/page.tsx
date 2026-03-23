"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderRef = searchParams.get("ref") ?? "";
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = "https://casezy.in";
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
          Redirecting to casezy.in in {countdown} seconds...
        </p>

        <div className="mt-8 space-y-1.5">
          <a href="https://chatmint.in" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80">
            <span className="text-[10px] text-gray-400">Product Extension of Chatmint</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://cloudmediastorage.s3.ap-south-1.amazonaws.com/white-label/logo/chatmint.in/30c1e327-f8ac-4965-8309-a0664dbf054b-Green%20Minimalist%20Chat%20Logo%20Design%20(7).png" alt="Chatmint" className="h-4" />
          </a>
          <a href="https://xava.co.in" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 transition-opacity hover:opacity-80">
            <span className="text-[10px] text-gray-300">Powered by Xava Web Services Pvt Ltd</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://xava.co.in/wp-content/uploads/2021/10/logoxavanew.png" alt="Xava" className="h-4" />
          </a>
        </div>
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
