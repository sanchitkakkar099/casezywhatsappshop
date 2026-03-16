"use client";

import { useEffect, useState } from "react";

interface ToastProps {
  type: "success" | "error" | "info";
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ type, message, duration = 4000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const styles = {
    success: "border-emerald-500 bg-emerald-50 text-emerald-700",
    error: "border-red-500 bg-red-50 text-red-700",
    info: "border-blue-500 bg-blue-50 text-blue-700",
  };

  const icons = {
    success: (
      <svg className="h-5 w-5 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    info: (
      <svg className="h-5 w-5 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 flex items-center gap-3 border-l-4 px-5 py-3.5 shadow-lg text-sm transition-all duration-300 ${
        styles[type]
      } ${exiting ? "opacity-0 translate-x-4" : "animate-slide-in-right"}`}
    >
      {icons[type]}
      <span className="font-medium">{message}</span>
      <button
        onClick={() => {
          setExiting(true);
          setTimeout(() => {
            setVisible(false);
            onClose?.();
          }, 300);
        }}
        className="ml-2 opacity-50 hover:opacity-100 transition-opacity"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

/**
 * Hook for managing toast state in any component.
 */
export function useToast() {
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showToast = (type: "success" | "error" | "info", message: string) => {
    setToast({ type, message });
  };

  const clearToast = () => setToast(null);

  return { toast, showToast, clearToast };
}

/**
 * Full-page loading overlay — use for blocking operations like Shopify sync.
 */
export function LoadingOverlay({ message = "Processing..." }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-8 w-8 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm font-medium text-gray-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner for buttons and small areas.
 */
export function Spinner({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" };
  return (
    <svg className={`animate-spin ${sizes[size]}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/**
 * Table skeleton loader — use when loading tabular data.
 */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3 flex gap-8">
        {[...Array(cols)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: `${60 + Math.random() * 40}px` }} />
        ))}
      </div>
      <div className="divide-y divide-gray-50">
        {[...Array(rows)].map((_, row) => (
          <div key={row} className="px-5 py-4 flex gap-8">
            {[...Array(cols)].map((_, col) => (
              <div key={col} className="h-3.5 bg-gray-100 rounded" style={{ width: `${80 + Math.random() * 60}px` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Detail page skeleton — use for order detail, product edit etc.
 */
export function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-24 bg-gray-200 rounded" />
      <div className="card p-6 space-y-4">
        <div className="h-5 w-48 bg-gray-200 rounded" />
        <div className="grid grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-20 bg-gray-100 rounded" />
              <div className="h-4 w-36 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6 space-y-3">
        <div className="h-5 w-32 bg-gray-200 rounded" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="h-3.5 w-24 bg-gray-100 rounded" />
            <div className="h-3.5 w-40 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
