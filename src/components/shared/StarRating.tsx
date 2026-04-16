"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: number;       // supports 0.5 increments for half-star display
  max?: number;
  size?: "sm" | "md" | "lg";
  onChange?: (value: number) => void;
  readonly?: boolean;
}

export default function StarRating({ value, max = 5, size = "md", onChange, readonly = false }: Props) {
  const sizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-6 h-6" };

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => {
        const starPos = i + 1;
        const isFull = value >= starPos;
        const isHalf = !isFull && value >= starPos - 0.5;

        if (readonly) {
          return (
            <span key={i} className="relative inline-flex flex-shrink-0">
              {/* Gray base star */}
              <Star className={cn(sizes[size], "fill-gray-200 text-gray-200")} />
              {/* Amber overlay — full or clipped to left half */}
              {(isFull || isHalf) && (
                <span
                  className={cn(
                    "absolute inset-0 overflow-hidden",
                    isHalf ? "w-1/2" : "w-full"
                  )}
                >
                  <Star className={cn(sizes[size], "fill-amber-400 text-amber-400")} />
                </span>
              )}
            </span>
          );
        }

        // Interactive mode — whole-star steps only
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange?.(starPos)}
            className={cn("transition-colors hover:scale-110 cursor-pointer")}
          >
            <Star
              className={cn(
                sizes[size],
                starPos <= Math.round(value) ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
