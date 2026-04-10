import { BOOKING_STATUS_LABELS, BOOKING_STATUS_COLORS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface Props {
  status: string;
  size?: "sm" | "md";
}

export default function BookingStatusBadge({ status, size = "md" }: Props) {
  const label = BOOKING_STATUS_LABELS[status] || status;
  const color = BOOKING_STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
  return (
    <span className={cn("inline-flex items-center rounded-full font-medium", color, size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm")}>
      {label}
    </span>
  );
}
