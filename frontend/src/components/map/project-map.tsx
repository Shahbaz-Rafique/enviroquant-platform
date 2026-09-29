"use client";

import L from "leaflet";
import { useEffect, useRef } from "react";

const ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

type ProjectMapProps = {
  latitude: number | null;
  longitude: number | null;
  editable?: boolean;
  locationName?: string;
  onChange?: (lat: number, lng: number) => void;
};

export function ProjectMap({ latitude, longitude, editable = false, locationName, onChange }: ProjectMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const defaultLat = latitude ?? 29.3759;
  const defaultLng = longitude ?? 47.9774; // Default: Kuwait

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: latitude ? 10 : 5,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (latitude && longitude) {
      const marker = editable
        ? L.marker([latitude, longitude], { draggable: true, icon: ICON }).addTo(map)
        : L.marker([latitude, longitude], { icon: ICON }).addTo(map);

      if (locationName) {
        marker.bindPopup(`<strong>${locationName}</strong>`).openPopup();
      }

      if (editable) {
        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          onChange?.(pos.lat, pos.lng);
        });
      }

      markerRef.current = marker;
    }

    if (editable) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          const m = L.marker([lat, lng], { draggable: true, icon: ICON }).addTo(map);
          m.on("dragend", () => {
            const pos = m.getLatLng();
            onChange?.(pos.lat, pos.lng);
          });
          markerRef.current = m;
        }
        onChange?.(lat, lng);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update marker when coords change externally
  useEffect(() => {
    if (!mapRef.current || latitude === null || longitude === null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const m = L.marker([latitude, longitude], { draggable: editable, icon: ICON }).addTo(mapRef.current);
      if (editable) {
        m.on("dragend", () => {
          const pos = m.getLatLng();
          onChange?.(pos.lat, pos.lng);
        });
      }
      if (locationName) m.bindPopup(`<strong>${locationName}</strong>`);
      markerRef.current = m;
    }
    mapRef.current.setView([latitude, longitude], mapRef.current.getZoom());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-full w-full" />;
}
