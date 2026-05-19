"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X,
  CalendarDays, Home, Users, LayoutDashboard, AlertCircle,
  ExternalLink, AlertTriangle, CheckCircle2, ArrowRight, Check,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UnassignedBooking {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
  guests: number;
}

interface InternalBookingInfo {
  id: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  status: string;
}

interface ExternalBookingInfo {
  id: string;
  source: string;
  guestName: string | null;
  notes: string | null;
  checkIn: string;
  checkOut: string;
}

interface RoomEntry {
  id: string;
  name: string;
  maxGuests: number;
  status: "AVAILABLE" | "INTERNAL" | "EXTERNAL";
  internalBooking: InternalBookingInfo | null;
  externalBooking: ExternalBookingInfo | null;
}

interface PropertyEntry {
  id: string;
  title: string;
  district: string;
  isTransport?: boolean;
  rooms: RoomEntry[];
  unassignedBookings: UnassignedBooking[];
  totalRooms: number;
  bookedInternal: number;
  bookedExternal: number;
  available: number;
  totalUnassigned: number;
}

interface CalendarData {
  date: string;
  properties: PropertyEntry[];
  summary: {
    totalRooms: number;
    bookedInternal: number;
    bookedExternal: number;
    available: number;
    totalUnassigned: number;
  };
}

interface RoomOption {
  id: string;
  name: string;
  maxGuests: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  BOOKING_COM: "Booking.com",
  AIRBNB: "Airbnb",
  AGODA: "Agoda",
  WALK_ON: "Walk-in",
  AHANGAMA: "Visit Sri Lanka",
  OTHER: "Other",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatShortDate(isoStr: string) {
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

function shiftDate(dateStr: string, days: number) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDisplayDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "UTC",
  });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
// Internal (Ahangama confirmed) = GREEN
// External (manual, any source) = BLUE
// Available = blank (no badge)

function StatusBadge({ status, source }: { status: RoomEntry["status"]; source?: string }) {
  if (status === "AVAILABLE") {
    return null; // Empty by default — the "+ Add Booking" button conveys availability
  }
  if (status === "INTERNAL") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
        Visit Sri Lanka
      </span>
    );
  }
  // EXTERNAL — always blue, but show the source name
  const sourceLabel = source ? (SOURCE_LABELS[source] ?? source) : "External";
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
      {sourceLabel}
    </span>
  );
}

// ─── Modals ───────────────────────────────────────────────────────────────────

// Global "Add External Booking" modal — picks property → room → booking form
interface GlobalBookingModalProps {
  properties: PropertyEntry[];
  defaultDate: string;
  onClose: () => void;
  onSaved: () => void;
}

function GlobalBookingModal({ properties, defaultDate, onClose, onSaved }: GlobalBookingModalProps) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [checkIn, setCheckIn] = useState(defaultDate);
  const [checkOut, setCheckOut] = useState(shiftDate(defaultDate, 1));
  const [source, setSource] = useState("BOOKING_COM");
  const [guestName, setGuestName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch rooms when property changes
  useEffect(() => {
    if (!propertyId) return;
    setLoadingRooms(true);
    setRoomId("");
    fetch(`/api/host/rooms?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then((data: RoomOption[]) => {
        setRooms(data);
        if (data.length) setRoomId(data[0].id);
      })
      .finally(() => setLoadingRooms(false));
  }, [propertyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) { setError("Please select a room"); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/host/external-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId, checkIn, checkOut, source,
          guestName: guestName || null,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const selectedProperty = properties.find((p) => p.id === propertyId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Add External Booking</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manual entry — Booking.com, Airbnb, Agoda, Walk-in…</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Select Property */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold mr-1.5">1</span>
              Property
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Room */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold mr-1.5">2</span>
              Room
            </label>
            {loadingRooms ? (
              <div className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" />
                Loading rooms…
              </div>
            ) : rooms.length === 0 ? (
              <div className="px-3 py-2 border border-dashed border-gray-200 rounded-xl text-sm text-gray-400 text-center">
                No rooms added to this property yet
              </div>
            ) : (
              <select
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (max {r.maxGuests} guests)</option>
                ))}
              </select>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-medium text-gray-500 mb-3">
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-teal-600 text-white text-[10px] font-bold mr-1.5">3</span>
              Booking Details
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Check-in</label>
                  <input
                    type="date"
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Check-out</label>
                  <input
                    type="date"
                    value={checkOut}
                    min={checkIn}
                    onChange={(e) => setCheckOut(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Booking Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Guest Name <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="e.g. John Smith"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes <span className="text-gray-400">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Any additional notes…"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !roomId}
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Add Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Per-room "Edit External Booking" modal
interface EditExternalModalProps {
  room: RoomEntry;
  propertyTitle: string;
  booking: ExternalBookingInfo;
  onClose: () => void;
  onSaved: () => void;
}

function EditExternalModal({ room, propertyTitle, booking, onClose, onSaved }: EditExternalModalProps) {
  const [checkIn, setCheckIn] = useState(booking.checkIn.split("T")[0]);
  const [checkOut, setCheckOut] = useState(booking.checkOut.split("T")[0]);
  const [source, setSource] = useState(booking.source);
  const [guestName, setGuestName] = useState(booking.guestName ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/host/external-bookings/${booking.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkIn, checkOut, source, guestName: guestName || null, notes: notes || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Edit External Booking</h2>
            <p className="text-xs text-gray-500 mt-0.5">{propertyTitle} — {room.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Check-in</label>
              <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Check-out</label>
              <input type="date" value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Booking Source</label>
            <select value={source} onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
              {Object.entries(SOURCE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Guest Name <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="e.g. John Smith"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Notes <span className="text-gray-400">(optional)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Any additional notes…"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saving ? "Updating…" : "Update"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Assign Room modal — for unassigned Ahangama confirmed bookings
interface AssignRoomModalProps {
  booking: UnassignedBooking;
  propertyId: string;
  propertyTitle: string;
  onClose: () => void;
  onSaved: () => void;
}

function AssignRoomModal({ booking, propertyId, propertyTitle, onClose, onSaved }: AssignRoomModalProps) {
  const [rooms, setRooms] = useState<RoomOption[]>([]);
  const [roomId, setRoomId] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/host/rooms?propertyId=${propertyId}`)
      .then((r) => r.json())
      .then((data: RoomOption[]) => {
        setRooms(data);
        if (data.length) setRoomId(data[0].id);
      })
      .finally(() => setLoadingRooms(false));
  }, [propertyId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) { setError("Please select a room"); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/host/bookings/${booking.id}/assign-room`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Assign Room</h2>
            <p className="text-xs text-gray-500 mt-0.5">{propertyTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Booking summary */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm font-medium">Visit Sri Lanka Booking (Confirmed)</span>
            </div>
            <div className="mt-1.5 text-sm text-green-800">
              <span className="font-medium">{booking.guestName}</span>
              <span className="text-green-600 mx-1.5">·</span>
              {formatShortDate(booking.checkIn)} – {formatShortDate(booking.checkOut)}
              <span className="text-green-600 mx-1.5">·</span>
              {booking.guests} guest{booking.guests !== 1 ? "s" : ""}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign to Room</label>
            {loadingRooms ? (
              <div className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-400 flex items-center gap-2">
                <div className="w-3 h-3 border border-teal-400 border-t-transparent rounded-full animate-spin" />
                Loading rooms…
              </div>
            ) : rooms.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">
                No rooms available. Add rooms to this property first.
              </p>
            ) : (
              <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (max {r.maxGuests} guests)</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving || !roomId || loadingRooms}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5">
              {saving ? "Assigning…" : <><ArrowRight className="w-3.5 h-3.5" /> Assign</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Add Room modal
interface AddRoomModalProps {
  properties: { id: string; title: string }[];
  defaultPropertyId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function AddRoomModal({ properties, defaultPropertyId, onClose, onSaved }: AddRoomModalProps) {
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? properties[0]?.id ?? "");
  const [name, setName] = useState("");
  const [maxGuests, setMaxGuests] = useState(2);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Room name is required"); return; }
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/host/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId, name: name.trim(), maxGuests, description: description || null }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong"); return; }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add Room</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
            </div>
          )}
          {!defaultPropertyId && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Property</label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Room Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deluxe Room, Room 1" required
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Max Guests</label>
            <input type="number" min={1} max={20} value={maxGuests} onChange={(e) => setMaxGuests(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description <span className="text-gray-400">(optional)</span></label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g. Sea view, ensuite bathroom"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 px-4 py-2.5 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
              {saving ? "Adding…" : "Add Room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Confirm delete modal
interface ConfirmDeleteModalProps {
  message: string;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}

function ConfirmDeleteModal({ message, onConfirm, onClose, loading }: ConfirmDeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Remove Booking</h2>
            <p className="text-sm text-gray-500 mt-0.5">{message}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
            {loading ? "Removing…" : "Remove"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Room Row ──────────────────────────────────────────────────────────────────

interface RoomRowProps {
  room: RoomEntry;
  propertyTitle: string;
  onMarkBooked: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRenamed: () => void;
}

function RoomRow({ room, onMarkBooked, onEdit, onDelete, onRenamed }: RoomRowProps) {
  const [renaming, setRenaming] = useState(false);
  const [editName, setEditName] = useState(room.name);
  const [renameLoading, setRenameLoading] = useState(false);

  const rowBg =
    room.status === "INTERNAL" ? "bg-green-50/40 hover:bg-green-50" :
    room.status === "EXTERNAL" ? "bg-blue-50/40 hover:bg-blue-50" :
    "bg-white hover:bg-gray-50";

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || editName.trim() === room.name) { setRenaming(false); return; }
    setRenameLoading(true);
    try {
      const res = await fetch(`/api/host/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      });
      if (res.ok) { onRenamed(); setRenaming(false); }
    } finally {
      setRenameLoading(false);
    }
  }

  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${rowBg}`}>
      {/* Room name — click pencil to rename inline */}
      <div className="w-36 flex-shrink-0">
        {renaming ? (
          <form onSubmit={handleRename} className="flex items-center gap-1">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && (setRenaming(false), setEditName(room.name))}
              className="w-24 px-2 py-0.5 border border-teal-400 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button type="submit" disabled={renameLoading}
              className="p-1 text-teal-600 hover:bg-teal-50 rounded-md transition-colors">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => { setRenaming(false); setEditName(room.name); }}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded-md transition-colors">
              <X className="w-3 h-3" />
            </button>
          </form>
        ) : (
          <div className="group flex items-center gap-1">
            <p className="text-sm font-medium text-gray-900 truncate">{room.name}</p>
            <button onClick={() => setRenaming(true)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-300 hover:text-gray-500 transition-all rounded">
              <Pencil className="w-3 h-3" />
            </button>
          </div>
        )}
        <p className="text-xs text-gray-400 flex items-center gap-0.5 mt-0.5">
          <Users className="w-3 h-3" /> {room.maxGuests}
        </p>
      </div>

      {/* Status — blank for available */}
      <div className="w-36 flex-shrink-0">
        <StatusBadge status={room.status} source={room.externalBooking?.source} />
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        {room.status === "INTERNAL" && room.internalBooking && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate">{room.internalBooking.guestName}</span>
            <span className="text-xs text-gray-400">
              {formatShortDate(room.internalBooking.checkIn)} – {formatShortDate(room.internalBooking.checkOut)}
            </span>
          </div>
        )}
        {room.status === "EXTERNAL" && room.externalBooking && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-800 truncate">
              {room.externalBooking.guestName ?? <span className="text-gray-400 italic font-normal">No name</span>}
            </span>
            <span className="text-xs text-gray-400">
              {formatShortDate(room.externalBooking.checkIn)} – {formatShortDate(room.externalBooking.checkOut)}
            </span>
            {room.externalBooking.notes && (
              <span className="text-xs text-gray-400 truncate max-w-40" title={room.externalBooking.notes}>
                · {room.externalBooking.notes}
              </span>
            )}
          </div>
        )}
        {/* Available — details cell intentionally blank */}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {room.status === "AVAILABLE" && (
          <button onClick={onMarkBooked}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            <Plus className="w-3 h-3" /> Add Booking
          </button>
        )}
        {room.status === "INTERNAL" && room.internalBooking && (
          <Link href={`/bookings/${room.internalBooking.id}`}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            <ExternalLink className="w-3 h-3" /> View
          </Link>
        )}
        {room.status === "EXTERNAL" && room.externalBooking && (
          <>
            <button onClick={onEdit}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
              <Pencil className="w-3 h-3" /> Edit
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Unassigned Bookings Banner ────────────────────────────────────────────────

function UnassignedBanner({
  bookings,
  propertyId,
  propertyTitle,
  isTransport,
  onAssign,
}: {
  bookings: UnassignedBooking[];
  propertyId: string;
  propertyTitle: string;
  isTransport?: boolean;
  onAssign: (booking: UnassignedBooking) => void;
}) {
  if (!bookings.length) return null;
  const unitWord = isTransport ? "vehicle" : "room";
  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-amber-100">
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
        <span className="text-xs font-semibold text-amber-700">
          {bookings.length} confirmed Visit Sri Lanka booking{bookings.length > 1 ? "s" : ""} — {unitWord} not yet assigned
        </span>
      </div>
      <div>
        {bookings.map((b) => (
          <div key={b.id} className="flex items-center gap-4 px-4 py-2.5 border-b border-amber-100 last:border-0">
            <div className="w-4 h-4 rounded-full bg-green-500 flex-shrink-0 ring-2 ring-green-200" />
            <div className="flex-1 min-w-0 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-800">{b.guestName}</span>
              <span className="text-xs text-gray-500">
                {formatShortDate(b.checkIn)} – {formatShortDate(b.checkOut)}
              </span>
              <span className="text-xs text-gray-400">{b.guests} guest{b.guests !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Link href={`/bookings/${b.id}`}
                className="px-2.5 py-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors font-medium">
                View
              </Link>
              <button onClick={() => onAssign(b)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors">
                <ArrowRight className="w-3 h-3" /> Assign {isTransport ? "Vehicle" : "Room"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function BookingCalendarClient() {
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [propertyFilter, setPropertyFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [data, setData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [globalBookingModal, setGlobalBookingModal] = useState(false);
  const [editModal, setEditModal] = useState<{ room: RoomEntry; propertyTitle: string } | null>(null);
  const [addRoomModal, setAddRoomModal] = useState<{ propertyId?: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ bookingId: string; roomName: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [assignModal, setAssignModal] = useState<{ booking: UnassignedBooking; propertyId: string; propertyTitle: string } | null>(null);
  const [roomBookingModal, setRoomBookingModal] = useState<{ room: RoomEntry; propertyId: string } | null>(null);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date: selectedDate });
      if (propertyFilter) params.set("propertyId", propertyFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      const res = await fetch(`/api/host/calendar?${params}`);
      if (!res.ok) throw new Error("Failed to load calendar data");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, propertyFilter, sourceFilter]);

  // On first mount: provision default rooms (Room 1, Room 2…) for any property
  // that has bedrooms set but no rooms yet, then load calendar.
  useEffect(() => {
    fetch("/api/host/rooms/provision", { method: "POST" })
      .finally(() => fetchCalendar());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // mount only

  // Re-fetch when date / filters change (skip first mount — handled above)
  const hasMounted = useState(false);
  useEffect(() => {
    if (!hasMounted[0]) { hasMounted[1](true); return; }
    fetchCalendar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, propertyFilter, sourceFilter]);

  async function handleDeleteExternal(bookingId: string) {
    setDeleteLoading(true);
    try {
      await fetch(`/api/host/external-bookings/${bookingId}`, { method: "DELETE" });
      setDeleteModal(null);
      fetchCalendar();
    } finally {
      setDeleteLoading(false);
    }
  }

  const propertyOptions = data?.properties ?? [];
  const summary = data?.summary ?? { totalRooms: 0, bookedInternal: 0, bookedExternal: 0, available: 0, totalUnassigned: 0 };
  const totalBooked = summary.bookedInternal + summary.bookedExternal;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard/host" className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition-colors">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-sm text-gray-700 font-medium">Booking Calendar</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-teal-600" /> Booking Calendar
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setGlobalBookingModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Booking
          </button>
          <button onClick={() => setAddRoomModal({})}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Add Room
          </button>
        </div>
      </div>

      {/* Date navigation + filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setSelectedDate((d) => shiftDate(d, -1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <button onClick={() => setSelectedDate((d) => shiftDate(d, 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => setSelectedDate(todayIso())}
            className="px-3 py-1.5 text-xs font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
            Today
          </button>
        </div>

        <div className="text-sm font-medium text-gray-700 flex-1 min-w-40">
          {formatDisplayDate(selectedDate)}
        </div>

        <div className="flex items-center gap-2">
          <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Properties</option>
            {propertyOptions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500">
            <option value="">All Sources</option>
            {Object.entries(SOURCE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Legend + Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-5 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Legend</span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-400" /> Available
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Visit Sri Lanka (Internal)
          </span>
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> External (Booking.com / Airbnb / Agoda / Walk-in…)
          </span>
        </div>

        {!loading && data && (
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span className="text-gray-400">
              <span className="font-semibold text-gray-900">{summary.totalRooms}</span> rooms
            </span>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-gray-500">
              <span className="font-semibold text-gray-500">{summary.available}</span> available
            </span>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-green-700">
              <span className="font-semibold">{summary.bookedInternal}</span> internal
            </span>
            <div className="w-px h-4 bg-gray-200" />
            <span className="text-blue-700">
              <span className="font-semibold">{summary.bookedExternal}</span> external
            </span>
            {summary.totalUnassigned > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <span className="text-amber-600">
                  <span className="font-semibold">{summary.totalUnassigned}</span> need room assignment
                </span>
              </>
            )}
            {summary.totalRooms > 0 && (
              <>
                <div className="w-px h-4 bg-gray-200" />
                <span className="text-gray-500">
                  <span className="font-semibold text-gray-700">
                    {Math.round((totalBooked / summary.totalRooms) * 100)}%
                  </span> occupancy
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading calendar…</span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-5 bg-red-50 border border-red-100 rounded-2xl text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
          <button onClick={fetchCalendar} className="ml-auto px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors">
            Retry
          </button>
        </div>
      ) : propertyOptions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Home className="w-12 h-12 text-gray-200 mb-4" />
          <p className="text-gray-500 font-medium">No properties found</p>
          <p className="text-sm text-gray-400 mt-1">Create a property, then add rooms to start managing bookings</p>
          <Link href="/properties/new" className="mt-4 px-4 py-2 bg-teal-600 text-white rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors">
            Add a Property
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data!.properties.map((property) => (
            <div key={property.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              {/* Property header */}
              <div className="flex items-center justify-between px-5 py-3.5 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Home className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{property.title}</h3>
                    <p className="text-xs text-gray-500">{property.district} · {property.totalRooms} {property.isTransport ? "vehicle" : "room"}{property.totalRooms !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-2">
                    {property.available > 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">{property.available} free</span>
                    )}
                    {property.bookedInternal > 0 && (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">{property.bookedInternal} internal</span>
                    )}
                    {property.bookedExternal > 0 && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{property.bookedExternal} external</span>
                    )}
                    {property.totalUnassigned > 0 && (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">{property.totalUnassigned} unassigned</span>
                    )}
                  </div>
                  <button onClick={() => setAddRoomModal({ propertyId: property.id })}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors">
                    <Plus className="w-3 h-3" /> {property.isTransport ? "Vehicle" : "Room"}
                  </button>
                </div>
              </div>

              {/* Unassigned confirmed Ahangama bookings */}
              <UnassignedBanner
                bookings={property.unassignedBookings}
                propertyId={property.id}
                propertyTitle={property.title}
                isTransport={property.isTransport}
                onAssign={(b) => setAssignModal({ booking: b, propertyId: property.id, propertyTitle: property.title })}
              />

              {/* Rooms */}
              {property.rooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                  <p className="text-sm">No {property.isTransport ? "vehicles" : "rooms"} added yet</p>
                  <button onClick={() => setAddRoomModal({ propertyId: property.id })}
                    className="mt-2 text-xs text-teal-600 hover:underline font-medium">
                    Add your first {property.isTransport ? "vehicle" : "room"} →
                  </button>
                </div>
              ) : (
                <div>
                  {/* Column headers */}
                  <div className="flex items-center gap-4 px-4 py-2 bg-gray-50/60 border-b border-gray-100 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    <div className="w-32 flex-shrink-0">{property.isTransport ? "Vehicle" : "Room"}</div>
                    <div className="w-36 flex-shrink-0">Status</div>
                    <div className="flex-1">Details</div>
                    <div className="flex-shrink-0 pr-2">Actions</div>
                  </div>
                  {property.rooms.map((room) => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      propertyTitle={property.title}
                      onMarkBooked={() => setRoomBookingModal({ room, propertyId: property.id })}
                      onEdit={() => setEditModal({ room, propertyTitle: property.title })}
                      onDelete={() => room.externalBooking && setDeleteModal({ bookingId: room.externalBooking.id, roomName: room.name })}
                      onRenamed={fetchCalendar}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}

      {/* Global add booking (property → room picker) */}
      {globalBookingModal && (
        <GlobalBookingModal
          properties={propertyOptions}
          defaultDate={selectedDate}
          onClose={() => setGlobalBookingModal(false)}
          onSaved={fetchCalendar}
        />
      )}

      {/* Per-room quick add (pre-select property, user picks room in same modal) */}
      {roomBookingModal && (
        <GlobalBookingModal
          properties={propertyOptions.filter((p) => p.id === roomBookingModal.propertyId)}
          defaultDate={selectedDate}
          onClose={() => setRoomBookingModal(null)}
          onSaved={fetchCalendar}
        />
      )}

      {/* Edit external booking */}
      {editModal?.room.externalBooking && (
        <EditExternalModal
          room={editModal.room}
          propertyTitle={editModal.propertyTitle}
          booking={editModal.room.externalBooking}
          onClose={() => setEditModal(null)}
          onSaved={fetchCalendar}
        />
      )}

      {/* Add room */}
      {addRoomModal !== null && (
        <AddRoomModal
          properties={propertyOptions.map((p) => ({ id: p.id, title: p.title }))}
          defaultPropertyId={addRoomModal.propertyId}
          onClose={() => setAddRoomModal(null)}
          onSaved={fetchCalendar}
        />
      )}

      {/* Delete external booking */}
      {deleteModal && (
        <ConfirmDeleteModal
          message={`Remove external booking for "${deleteModal.roomName}"?`}
          onConfirm={() => handleDeleteExternal(deleteModal.bookingId)}
          onClose={() => setDeleteModal(null)}
          loading={deleteLoading}
        />
      )}

      {/* Assign room to unassigned Ahangama booking */}
      {assignModal && (
        <AssignRoomModal
          booking={assignModal.booking}
          propertyId={assignModal.propertyId}
          propertyTitle={assignModal.propertyTitle}
          onClose={() => setAssignModal(null)}
          onSaved={fetchCalendar}
        />
      )}
    </div>
  );
}
