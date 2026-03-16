"use client";

import { useState } from "react";

interface ExportButtonProps {
  filters?: Record<string, string>;
}

export function ExportButton({ filters = {} }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(filters);
      const response = await fetch(`/api/admin/export/orders?${params}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `orders-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export orders. Please try again.");
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleExport}
        disabled={loading}
        className="btn-secondary"
      >
        {loading ? "Exporting..." : "Export CSV"}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-2 w-64 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700 shadow-lg z-10">
          {error}
        </div>
      )}
    </div>
  );
}
