export interface OfferPayload {
  id: string;
  bookingId: string;
  senderId: string;
  senderName: string;
  amount: number;
  message?: string;
  type: "INITIAL_OFFER" | "COUNTER_OFFER" | "ACCEPTANCE" | "REJECTION";
  createdAt: string;
}

export interface BookingStatusPayload {
  bookingId: string;
  status: string;
  totalPrice?: number;
}

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: string;
  createdAt: string;
}

export interface ServerToClientEvents {
  "offer:new": (payload: OfferPayload) => void;
  "booking:status": (payload: BookingStatusPayload) => void;
  "notification:new": (payload: NotificationPayload) => void;
}

export interface ClientToServerEvents {
  "booking:join": (bookingId: string) => void;
  "booking:leave": (bookingId: string) => void;
  "user:join": (userId: string) => void;
}
