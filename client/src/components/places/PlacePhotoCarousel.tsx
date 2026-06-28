import { useRef, useCallback, type TouchEvent } from "react";
import { cn } from "@/lib/utils";

type PlacePhotoCarouselProps = {
  images: string[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  alt?: string;
  className?: string;
};

/** Tinder-style tap-to-advance photo stack for venue profiles. */
export function PlacePhotoCarousel({
  images,
  activeIndex,
  onActiveIndexChange,
  alt = "Venue photo",
  className,
}: PlacePhotoCarouselProps) {
  const touchStartX = useRef<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => {
      if (images.length <= 1) return;
      onActiveIndexChange((activeIndex + dir + images.length) % images.length);
    },
    [activeIndex, images.length, onActiveIndexChange],
  );

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 40) return;
    go(delta < 0 ? 1 : -1);
  };

  if (images.length === 0) return null;

  const safeIndex = Math.min(activeIndex, images.length - 1);
  const current = images[safeIndex];

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-black select-none", className)}
      style={{ aspectRatio: "3 / 4", maxHeight: "62vh" }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      data-testid="place-photo-carousel"
    >
      {images.length > 1 ? (
        <div className="absolute top-3 left-3 right-3 z-20 flex gap-1 pointer-events-none">
          {images.map((_, i) => (
            <div
              key={i}
              className="h-[3px] flex-1 rounded-full transition-colors duration-200"
              style={{
                background: i === safeIndex ? "#ffffff" : "rgba(255,255,255,0.35)",
              }}
            />
          ))}
        </div>
      ) : null}

      <img
        key={current}
        src={current}
        alt={alt}
        className="w-full h-full object-cover"
        draggable={false}
      />

      {images.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute inset-y-0 left-0 w-2/5 z-10 cursor-w-resize"
            aria-label="Previous photo"
            onClick={() => go(-1)}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 w-3/5 z-10 cursor-e-resize"
            aria-label="Next photo"
            onClick={() => go(1)}
          />
        </>
      ) : null}

      <div
        className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
        style={{
          background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 100%)",
        }}
      />
    </div>
  );
}
