import { useState } from "react";
import { MapPin, Calendar, Building2 } from "lucide-react";
import type { Coordinates } from "@/lib/geo";

interface MapPin {
  id: string;
  coords: Coordinates;
  type: 'event' | 'place';
  title: string;
  subtitle?: string;
  data: any;
}

interface MapShellProps {
  center: Coordinates;
  pins: MapPin[];
  onPinClick: (pin: MapPin) => void;
  className?: string;
}

export default function MapShell({ center, pins, onPinClick, className = "" }: MapShellProps) {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  // Simple map visualization using CSS positioning
  // This creates a basic map-like interface without external dependencies
  const mapBounds = {
    minLat: Math.min(center.lat, ...pins.map(p => p.coords.lat)) - 0.02,
    maxLat: Math.max(center.lat, ...pins.map(p => p.coords.lat)) + 0.02,
    minLng: Math.min(center.lng, ...pins.map(p => p.coords.lng)) - 0.02,
    maxLng: Math.max(center.lng, ...pins.map(p => p.coords.lng)) + 0.02,
  };

  const getPositionPercent = (coords: Coordinates) => {
    const x = ((coords.lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * 100;
    const y = ((mapBounds.maxLat - coords.lat) / (mapBounds.maxLat - mapBounds.minLat)) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const handlePinClick = (pin: MapPin) => {
    setSelectedPin(pin.id);
    onPinClick(pin);
  };

  return (
    <div className={`relative bg-background bg-transparent border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Map background grid */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px'
        }} />
      </div>

      {/* Center marker (user location) */}
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10"
        style={{
          left: `${getPositionPercent(center).x}%`,
          top: `${getPositionPercent(center).y}%`
        }}
      >
        <div className="w-4 h-4 bg-transparent border border-border  rounded-full shadow-lg">
          <div className="absolute inset-0 bg-transparent border border-border rounded-full animate-ping opacity-75" />
        </div>
      </div>

      {/* Event and place pins */}
      {pins.map((pin) => {
        const position = getPositionPercent(pin.coords);
        const isSelected = selectedPin === pin.id;
        
        return (
          <button
            key={pin.id}
            className={`absolute transform -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-200 hover:scale-110 ${
              isSelected ? 'scale-125 z-30' : ''
            }`}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`
            }}
            onClick={() => handlePinClick(pin)}
            data-testid={`pin-${pin.type}-${pin.id}`}
          >
            <div className={`relative ${isSelected ? 'animate-bounce' : ''}`}>
              {/* Pin background */}
              <div className={`w-8 h-8 rounded-full  shadow-lg flex items-center justify-center ${
                pin.type === 'event' 
                  ? 'bg-transparent border border-border hover:bg-background' 
                  : 'bg-transparent border border-border hover:bg-background'
              }`}>
                {pin.type === 'event' ? (
                  <Calendar size={16} className="text-token-text" />
                ) : (
                  <Building2 size={16} className="text-token-text" />
                )}
              </div>
              
              {/* Pin pointer */}
              <div className={`absolute left-1/2 transform -translate-x-1/2 top-full w-0 h-0 ${
                pin.type === 'event' 
                  ? 'border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-background' 
                  : 'border-l-4 border-r-4 border-t-8 border-l-transparent border-r-transparent border-t-background'
              }`} />
            </div>

            {/* Pin label on hover */}
            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-transparent border border-border text-token-text text-xs rounded whitespace-nowrap transition-opacity duration-200 ${
              isSelected ? 'opacity-100' : 'opacity-0 hover:opacity-100'
            }`}>
              {pin.title}
            </div>
          </button>
        );
      })}

      {/* Map info overlay */}
      <div className="absolute top-4 left-4 bg-transparent border border-border/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-sm">
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-token-text" />
          <span className="text-token-text">
            {center.lat.toFixed(4)}, {center.lng.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-transparent border border-border/90 backdrop-blur-sm rounded-lg px-3 py-2 text-sm shadow-sm">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-transparent border border-border rounded-full" />
            <span className="text-token-text">Events</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-transparent border border-border rounded-full" />
            <span className="text-token-text">Places</span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {pins.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-token-text text-center">
            <MapPin size={32} className="mx-auto mb-2 opacity-50" />
            <p>No events or places found in this area</p>
          </div>
        </div>
      )}
    </div>
  );
}