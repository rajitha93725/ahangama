"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PIN_ICON = L.divIcon({
  className: "",
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#00000040"/>
    </filter>
    <path filter="url(#s)" d="M16 1C8.268 1 2 7.268 2 15c0 9.941 14 26 14 26S30 24.941 30 15C30 7.268 23.732 1 16 1z" fill="#0d9488" stroke="#fff" stroke-width="1.5"/>
    <circle cx="16" cy="15" r="5" fill="#fff"/>
  </svg>`,
});

function MapRecenter({ lat, lng, centerKey }: { lat: number; lng: number; centerKey: number }) {
  const map = useMap();
  const prevKey = useRef(centerKey);

  useEffect(() => {
    if (prevKey.current !== centerKey) {
      prevKey.current = centerKey;
      map.flyTo([lat, lng], Math.max(map.getZoom(), 14), { duration: 0.8 });
    }
  }, [centerKey, lat, lng, map]);

  return null;
}

function DraggableMarker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);

  return (
    <Marker
      ref={markerRef}
      position={[lat, lng]}
      draggable
      icon={PIN_ICON}
      eventHandlers={{
        dragend: () => {
          const pos = markerRef.current?.getLatLng();
          if (pos) onChange(pos.lat, pos.lng);
        },
      }}
    />
  );
}

interface Props {
  lat: number;
  lng: number;
  centerKey: number;
  onChange: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, centerKey, onChange }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      scrollWheelZoom
      style={{ height: "220px", width: "100%", borderRadius: "0.75rem" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <DraggableMarker lat={lat} lng={lng} onChange={onChange} />
      <MapRecenter lat={lat} lng={lng} centerKey={centerKey} />
    </MapContainer>
  );
}
