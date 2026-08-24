"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function GenerateReportButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/closing-reports", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Closing report generated", {
          description: `Report for ${new Date().toLocaleDateString()} created successfully`,
        });
        router.refresh();
      } else {
        toast.error("Failed to generate report", { description: data.error });
      }
    } catch (error: any) {
      toast.error("Error generating report", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
      Generate Today's Report
    </button>
  );
}
