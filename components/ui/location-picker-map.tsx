"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function MapEvents({ setPosition }: { setPosition: (p: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPickerMap({
  position,
  setPosition,
}: {
  position: { lat: number; lng: number };
  setPosition: (p: { lat: number; lng: number }) => void;
}) {
  const customMarker = useMemo(() => {
    return L.divIcon({
      className: "",
      html: `<div style="
        width: 28px; height: 28px;
        background: #ef4444;
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
    });
  }, []);

  return (
    <MapContainer
      center={[position.lat, position.lng]}
      zoom={15}
      className="w-full h-full z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[position.lat, position.lng]} icon={customMarker} />
      <MapEvents setPosition={setPosition} />
    </MapContainer>
  );
}
