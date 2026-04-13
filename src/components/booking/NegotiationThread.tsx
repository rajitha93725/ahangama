"use client";

import { useState } from "react";
import { formatCurrency, timeAgo, getInitials } from "@/lib/utils";
import { CheckCircle, XCircle, RefreshCw, ArrowUpDown } from "lucide-react";
import BookingStatusBadge from "./BookingStatusBadge";

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
  offers: Offer[];
  status: string;
  nights: number;
  isGuest: boolean;
  isHost: boolean;
  currentUserId: string;
  onOfferSent: (offer: Offer) => void;
  onStatusChange: (status: string, totalPrice?: number) => void;
}

const OFFER_ICONS: Record<string, React.ReactNode> = {
  INITIAL_OFFER: <ArrowUpDown className="w-4 h-4 text-blue-500" />,
  COUNTER_OFFER: <RefreshCw className="w-4 h-4 text-amber-500" />,
  ACCEPTANCE: <CheckCircle className="w-4 h-4 text-green-500" />,
  REJECTION: <XCircle className="w-4 h-4 text-red-500" />,
};

const OFFER_LABELS: Record<string, string> = {
  INITIAL_OFFER: "Offer sent",
  COUNTER_OFFER: "Counter offer",
  ACCEPTANCE: "Accepted",
  REJECTION: "Declined",
};

export default function NegotiationThread({
  bookingId, offers, status, nights, isGuest, isHost,
  currentUserId, onOfferSent, onStatusChange,
}: Props) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canNegotiate = ["PENDING_OFFER", "COUNTERED"].includes(status) && (isGuest || isHost);

  const sendOffer = async (type: "COUNTER_OFFER" | "ACCEPTANCE" | "REJECTION") => {
    const offerAmount = type === "REJECTION" ? (offers[offers.length - 1]?.amount || 0) : parseFloat(amount);
    if (type !== "REJECTION" && (!offerAmount || offerAmount <= 0)) {
      setError("Please enter a valid amount");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: offerAmount, message, type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send offer");
      onOfferSent(data);
      const newStatus = type === "ACCEPTANCE" ? "ACCEPTED" : type === "REJECTION" ? "REJECTED" : "COUNTERED";
      onStatusChange(newStatus, type === "ACCEPTANCE" ? offerAmount * nights : undefined);
      setAmount("");
      setMessage("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSubmitting(false);
    }
  };

  const lastOffer = offers[offers.length - 1];
  // It's my turn when the last offer was sent by someone else — works for any chain of counter-offers
  const isMyTurn =
    canNegotiate && !!lastOffer && lastOffer.senderId !== currentUserId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Negotiation History</h3>
        <BookingStatusBadge status={status} size="sm" />
      </div>

      {/* Offers timeline */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {offers.map((offer) => {
          const isMe = offer.senderId === currentUserId;
          return (
            <div key={offer.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
              <div className="flex-shrink-0">
                {offer.sender.image ? (
                  <img src={offer.sender.image} alt="" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-semibold">
                    {getInitials(offer.sender.name)}
                  </div>
                )}
              </div>
              <div className={`max-w-xs ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 ${isMe ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-900"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    {OFFER_ICONS[offer.type]}
                    <span className={`text-xs font-medium ${isMe ? "text-teal-100" : "text-gray-500"}`}>
                      {OFFER_LABELS[offer.type]}
                    </span>
                  </div>
                  {offer.type !== "REJECTION" && (
                    <p className="text-lg font-bold">
                      {formatCurrency(offer.amount)}
                      <span className="text-sm font-normal"> total</span>
                    </p>
                  )}
                  {offer.message && <p className={`text-sm mt-1 ${isMe ? "text-teal-100" : "text-gray-600"}`}>{offer.message}</p>}
                </div>
                <p className="text-xs text-gray-400 mt-1 px-1">
                  {offer.sender.name?.split(" ")[0]} · {timeAgo(offer.createdAt)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Action area */}
      {canNegotiate && isMyTurn && (
        <div className="border-t border-gray-100 pt-4 space-y-3">
          {lastOffer && (
            <p className="text-sm text-gray-600">
              Current offer: <strong>{formatCurrency(lastOffer.amount)} total</strong>
              {nights > 0 && (
                <span className="text-gray-400"> · {formatCurrency(lastOffer.amount / nights)}/night × {nights} nights</span>
              )}
            </p>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Your counter offer (total amount)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={lastOffer ? String(Math.floor(lastOffer.amount * 0.9)) : "Total offer"}
                className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Optional message..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={() => sendOffer("COUNTER_OFFER")}
              disabled={submitting}
              className="flex-1 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              Counter Offer
            </button>
            <button
              onClick={() => { setAmount(String(lastOffer?.amount || "")); sendOffer("ACCEPTANCE"); }}
              disabled={submitting}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Accept
            </button>
            <button
              onClick={() => sendOffer("REJECTION")}
              disabled={submitting}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {canNegotiate && !isMyTurn && (
        <p className="text-sm text-gray-500 text-center py-2">Waiting for the {isGuest ? "host" : "guest"} to respond…</p>
      )}
    </div>
  );
}
