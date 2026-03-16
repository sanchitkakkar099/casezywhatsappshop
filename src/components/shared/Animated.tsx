"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animated counter — counts from 0 to target value.
 */
export function CountUp({
  value,
  duration = 800,
  prefix = "",
  suffix = "",
  className = "",
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }
    hasAnimated.current = true;

    const start = performance.now();
    const from = 0;
    const to = value;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

/**
 * Animated currency counter.
 */
export function CountUpCurrency({
  value,
  duration = 800,
  className = "",
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) {
      setDisplay(value);
      return;
    }
    hasAnimated.current = true;

    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [value, duration]);

  return (
    <span className={className}>
      {new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(display)}
    </span>
  );
}

/**
 * Skeleton loading placeholder.
 */
export function Skeleton({
  className = "",
  width,
  height = "1rem",
}: {
  className?: string;
  width?: string;
  height?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width: width ?? "100%", height }}
    />
  );
}

/**
 * Skeleton loading for dashboard.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <Skeleton width="140px" height="1.5rem" />
        <div className="mt-2">
          <Skeleton width="200px" height="0.875rem" />
        </div>
      </div>

      {/* Revenue skeleton */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5">
            <Skeleton width="80px" height="0.75rem" />
            <div className="mt-3">
              <Skeleton width="120px" height="1.75rem" />
            </div>
            <div className="mt-2">
              <Skeleton width="60px" height="0.75rem" />
            </div>
          </div>
        ))}
      </div>

      {/* Status skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card p-4">
            <Skeleton width="60px" height="0.75rem" />
            <div className="mt-2">
              <Skeleton width="40px" height="1.5rem" />
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div>
        <Skeleton width="100px" height="0.875rem" className="mb-4" />
        <div className="card p-5 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton width="80px" height="0.875rem" />
              <Skeleton width="120px" height="0.875rem" />
              <Skeleton width="100px" height="0.875rem" />
              <Skeleton width="60px" height="0.875rem" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Page wrapper that animates content on mount.
 */
export function PageTransition({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`animate-fade-up ${className}`}>
      {children}
    </div>
  );
}

/**
 * Staggered children wrapper — each child fades up with a delay.
 */
export function StaggerChildren({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const items = Array.isArray(children) ? children : [children];

  return (
    <div className={className}>
      {items.map((child, i) => (
        <div
          key={i}
          className="animate-fade-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
