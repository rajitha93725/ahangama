"use client";

import { useState, useEffect } from "react";
import NegotiationThread from "@/components/booking/NegotiationThread";
import { useBookingSocket } from "@/hooks/useSocket";
import type { OfferPayload, BookingStatusPayload } from "@/types/socket";

interface Offer {
  id: string;
  senderId: string;
  amount: number;
  message?: string | null;
  type: string;
  createdAt: string;
  sender: { id: string; name?: string | null; image?: string | null; role: string };
}

interface Props {
  bookingId: string;
  initialOffers: Offer[];
  initialStatus: string;
  nights: number;
  isGuest: boolean;
  isHost: boolean;
  currentUserId: string;
}

export default function BookingDetailClient({
  bookingId, initialOffers, initialStatus, nights, isGuest, isHost, currentUserId,
}: Props) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [status, setStatus] = useState(initialStatus);

  useBookingSocket(bookingId, {
    "offer:new": (payload: OfferPayload) => {
      setOffers((prev) => {
        if (prev.some((o) => o.id === payload.id)) return prev;
        return [...prev, {
          id: payload.id,
          bookingId: payload.bookingId,
          senderId: payload.senderId,
          amount: payload.amount,
          message: payload.message,
          type: payload.type,
          createdAt: payload.createdAt,
          sender: { id: payload.senderId, name: payload.senderName, image: null, role: "GUEST" },
        }];
      });
    },
    "booking:status": (payload: BookingStatusPayload) => {
      setStatus(payload.status);
    },
  });

  return (
    <NegotiationThread
      bookingId={bookingId}
      offers={offers}
      status={status}
      nights={nights}
      isGuest={isGuest}
      isHost={isHost}
      currentUserId={currentUserId}
      onOfferSent={(offer) => {
        setOffers((prev) => {
          if (prev.some((o) => o.id === offer.id)) return prev;
          return [...prev, {
            ...offer,
            sender: { ...offer.sender, role: offer.sender.role as string },
          }];
        });
      }}
      onStatusChange={(newStatus) => setStatus(newStatus)}
    />
  );
}
