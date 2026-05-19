"use client";

import { useEffect, useRef } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

export type ConfirmVariant = "approve" | "reject" | "deactivate" | "activate" | "warning";

interface Props {
  open: boolean;
  variant: ConfirmVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  btnBg: string;
  btnHover: string;
  defaultLabel: string;
}> = {
  approve: {
    icon: CheckCircle2,
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    btnBg: "bg-green-600",
    btnHover: "hover:bg-green-700",
    defaultLabel: "Approve",
  },
  activate: {
    icon: CheckCircle2,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
    btnBg: "bg-teal-600",
    btnHover: "hover:bg-teal-700",
    defaultLabel: "Activate",
  },
  reject: {
    icon: XCircle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    btnBg: "bg-red-600",
    btnHover: "hover:bg-red-700",
    defaultLabel: "Reject",
  },
  deactivate: {
    icon: XCircle,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    btnBg: "bg-red-600",
    btnHover: "hover:bg-red-700",
    defaultLabel: "Deactivate",
  },
  warning: {
    icon: AlertTriangle,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
    btnBg: "bg-orange-600",
    btnHover: "hover:bg-orange-700",
    defaultLabel: "Confirm",
  },
};

export default function ConfirmDialog({
  open, variant, title, message, confirmLabel, loading = false, onConfirm, onCancel,
}: Props) {
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) cancelRef.current?.focus();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onCancel(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => { if (!loading) onCancel(); }}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-150">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl ${cfg.iconBg} flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`w-7 h-7 ${cfg.iconColor}`} />
        </div>

        {/* Text */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">{title}</h2>
        <p className="text-sm text-gray-500 text-center leading-relaxed mb-6">{message}</p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            ref={cancelRef}
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white ${cfg.btnBg} ${cfg.btnHover} disabled:opacity-50 transition-colors flex items-center justify-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel ?? cfg.defaultLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
