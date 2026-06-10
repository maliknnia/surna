// Enhanced Image component with comprehensive accessibility features
import React, { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { useAccessibility } from "./AccessibilityProvider";

interface AccessibleImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  // Alt text is required for accessibility
  alt: string;
  
  // Additional descriptions
  longDescription?: string;
  caption?: string;
  
  // Decorative images
  decorative?: boolean;
  
  // Loading behavior
  lazy?: boolean;
  placeholder?: string;
  
  // Interactive features
  zoomable?: boolean;
  onImageLoad?: () => void;
  onImageError?: () => void;
  
  // Container props
  containerClassName?: string;
  captionClassName?: string;
}

export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  alt,
  longDescription,
  caption,
  decorative = false,
  lazy = true,
  placeholder,
  zoomable = false,
  onImageLoad,
  onImageError,
  containerClassName,
  captionClassName,
  className,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const { settings, announce } = useAccessibility();
  const imgRef = useRef<HTMLImageElement>(null);

  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
    onImageLoad?.();
    
    if (settings.announcements && !decorative) {
      announce(`Image loaded: ${alt}`, 'polite');
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(false);
    onImageError?.();
    
    if (settings.announcements) {
      announce(`Failed to load image: ${alt}`, 'polite');
    }
  };

  const handleZoomToggle = () => {
    if (!zoomable) return;
    
    const newZoomState = !isZoomed;
    setIsZoomed(newZoomState);
    
    if (settings.announcements) {
      announce(
        newZoomState ? `Image zoomed in: ${alt}` : `Image zoomed out: ${alt}`,
        'polite'
      );
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!zoomable) return;
    
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleZoomToggle();
    }
  };

  // Generate IDs for ARIA relationships
  const imgId = `img-${Math.random().toString(36).substr(2, 9)}`;
  const longDescId = longDescription ? `${imgId}-desc` : undefined;
  const captionId = caption ? `${imgId}-caption` : undefined;

  // Build ARIA attributes
  const ariaDescribedBy = [longDescId, captionId].filter(Boolean).join(' ');

  const imageElement = (
    <img
      ref={imgRef}
      id={imgId}
      alt={decorative ? '' : alt}
      aria-describedby={ariaDescribedBy || undefined}
      role={decorative ? 'presentation' : undefined}
      loading={lazy ? 'lazy' : 'eager'}
      onLoad={handleLoad}
      onError={handleError}
      onClick={zoomable ? handleZoomToggle : undefined}
      onKeyDown={zoomable ? handleKeyDown : undefined}
      tabIndex={zoomable ? 0 : undefined}
      className={cn(
        // Base styling
        "max-w-full h-auto",
        
        // Loading and error states
        !isLoaded && !hasError && "opacity-50",
        hasError && "opacity-25",
        
        // Zoomable styling
        zoomable && [
          "cursor-zoom-in transition-transform duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isZoomed && "cursor-zoom-out scale-150 z-50"
        ],
        
        // High contrast support
        settings.highContrast && "ring-2 ring-border",
        
        className
      )}
      data-testid="accessible-image"
      {...props}
    />
  );

  return (
    <figure className={cn("relative", containerClassName)} data-testid="image-container">
      {/* Placeholder while loading */}
      {!isLoaded && !hasError && placeholder && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
          aria-hidden="true"
        >
          {placeholder}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div
          className="flex items-center justify-center bg-muted text-muted-foreground p-4 rounded"
          role="img"
          aria-label={`Failed to load image: ${alt}`}
        >
          <div className="text-center">
            <p className="text-sm font-medium">Image could not be loaded</p>
            <p className="text-xs">{alt}</p>
          </div>
        </div>
      )}

      {/* Main image */}
      {!hasError && (
        <>
          {zoomable ? (
            <button
              type="button"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
              aria-label={`${alt}. Click to ${isZoomed ? 'zoom out' : 'zoom in'}`}
              onClick={handleZoomToggle}
              data-testid="image-zoom-button"
            >
              {imageElement}
            </button>
          ) : (
            imageElement
          )}
        </>
      )}

      {/* Long description (hidden but accessible) */}
      {longDescription && (
        <div id={longDescId} className="sr-only">
          {longDescription}
        </div>
      )}

      {/* Caption */}
      {caption && (
        <figcaption
          id={captionId}
          className={cn(
            "mt-2 text-sm text-muted-foreground text-center",
            captionClassName
          )}
          data-testid="image-caption"
        >
          {caption}
        </figcaption>
      )}

      {/* Zoom overlay */}
      {zoomable && isZoomed && (
        <div
          className="fixed inset-0 bg-background/50 z-40"
          onClick={handleZoomToggle}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsZoomed(false);
              announce(`Image zoom closed: ${alt}`, 'polite');
            }
          }}
          tabIndex={-1}
          aria-hidden="true"
        />
      )}

      {/* Loading indicator for screen readers */}
      {!isLoaded && !hasError && (
        <div
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Loading image: {alt}
        </div>
      )}
    </figure>
  );
};

// Gallery component with accessible navigation
export const AccessibleImageGallery: React.FC<{
  images: Array<{
    src: string;
    alt: string;
    caption?: string;
    longDescription?: string;
  }>;
  className?: string;
}> = ({ images, className }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { announce } = useAccessibility();

  const goToPrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    announce(`Showing image ${newIndex + 1} of ${images.length}: ${images[newIndex].alt}`, 'polite');
  };

  const goToNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    announce(`Showing image ${newIndex + 1} of ${images.length}: ${images[newIndex].alt}`, 'polite');
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        goToPrevious();
        break;
      case 'ArrowRight':
        event.preventDefault();
        goToNext();
        break;
      case 'Home':
        event.preventDefault();
        setCurrentIndex(0);
        announce(`Showing first image: ${images[0].alt}`, 'polite');
        break;
      case 'End':
        event.preventDefault();
        setCurrentIndex(images.length - 1);
        announce(`Showing last image: ${images[images.length - 1].alt}`, 'polite');
        break;
    }
  };

  if (images.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-8">
        No images available
      </div>
    );
  }

  const currentImage = images[currentIndex];

  return (
    <div
      className={cn("space-y-4", className)}
      role="region"
      aria-label="Image gallery"
      data-testid="image-gallery"
    >
      {/* Gallery controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={goToPrevious}
          disabled={images.length <= 1}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Previous image"
          data-testid="gallery-previous"
        >
          Previous
        </button>
        
        <span
          className="text-sm text-muted-foreground"
          aria-live="polite"
          aria-atomic="true"
        >
          {currentIndex + 1} of {images.length}
        </span>
        
        <button
          onClick={goToNext}
          disabled={images.length <= 1}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Next image"
          data-testid="gallery-next"
        >
          Next
        </button>
      </div>

      {/* Current image */}
      <div
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        role="img"
        aria-label={`Gallery image ${currentIndex + 1} of ${images.length}`}
      >
        <AccessibleImage
          src={currentImage.src}
          alt={currentImage.alt}
          caption={currentImage.caption}
          longDescription={currentImage.longDescription}
          zoomable
          className="w-full"
        />
      </div>

      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <div className="flex gap-2 justify-center flex-wrap">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => {
                setCurrentIndex(index);
                announce(`Selected image ${index + 1}: ${image.alt}`, 'polite');
              }}
              className={cn(
                "w-16 h-16 rounded border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === currentIndex ? "border-primary" : ""
              )}
              aria-label={`Go to image ${index + 1}: ${image.alt}`}
              data-testid={`gallery-thumbnail-${index}`}
            >
              <img
                src={image.src}
                alt=""
                className="w-full h-full object-cover rounded"
                role="presentation"
              />
            </button>
          ))}
        </div>
      )}

      {/* Screen reader instructions */}
      <div className="sr-only">
        Use arrow keys to navigate between images, Home and End keys to go to first and last images.
        Press Enter or Space on thumbnails to select an image.
      </div>
    </div>
  );
};