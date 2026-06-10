// Enhanced Button component with comprehensive accessibility features
import React from "react";
import { Button, ButtonProps } from "./button";
import { cn } from "@/lib/utils";

interface AccessibleButtonProps extends ButtonProps {
  // ARIA properties
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean | 'false' | 'true' | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  'aria-pressed'?: boolean;
  'aria-controls'?: string;
  
  // Loading state for async operations
  isLoading?: boolean;
  loadingText?: string;
  
  // Screen reader enhancements
  srOnlyText?: string;
  
  // Keyboard navigation
  onEnterKey?: () => void;
  onSpaceKey?: () => void;
  
  // Touch accessibility
  touchOptimized?: boolean;
}

export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    className, 
    children, 
    isLoading = false,
    loadingText,
    srOnlyText,
    onEnterKey,
    onSpaceKey,
    touchOptimized = false,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-expanded': ariaExpanded,
    'aria-haspopup': ariaHasPopup,
    'aria-pressed': ariaPressed,
    'aria-controls': ariaControls,
    onKeyDown,
    ...props 
  }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          if (onEnterKey) {
            onEnterKey();
          } else if (props.onClick) {
            props.onClick(event as any);
          }
          break;
        case ' ':
          event.preventDefault();
          if (onSpaceKey) {
            onSpaceKey();
          } else if (props.onClick) {
            props.onClick(event as any);
          }
          break;
      }
      onKeyDown?.(event);
    };

    const buttonClasses = cn(
      // Ensure minimum touch target size (44px x 44px)
      touchOptimized && "min-h-[44px] min-w-[44px] p-2",
      // Enhanced focus indicators
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "focus-visible:outline-none",
      // High contrast mode support
      "border border-transparent focus-visible:border-ring",
      className
    );

    return (
      <Button
        ref={ref}
        className={buttonClasses}
        disabled={isLoading || props.disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHasPopup}
        aria-pressed={ariaPressed}
        aria-controls={ariaControls}
        aria-busy={isLoading}
        onKeyDown={handleKeyDown}
        data-testid={(props as any)['data-testid'] || `button-${ariaLabel?.toLowerCase().replace(/\s+/g, '-') || 'action'}`}
        {...props}
      >
        {isLoading && (
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        )}
        {children}
        {isLoading && loadingText && (
          <span className="sr-only">{loadingText}</span>
        )}
        {srOnlyText && !isLoading && (
          <span className="sr-only">{srOnlyText}</span>
        )}
      </Button>
    );
  }
);

AccessibleButton.displayName = "AccessibleButton";

// Higher-order component to enhance any button with accessibility features
export function withAccessibility<T extends ButtonProps>(
  WrappedComponent: React.ComponentType<T>
) {
  return React.forwardRef<HTMLButtonElement, T & AccessibleButtonProps>((props, ref) => {
    return <AccessibleButton as={WrappedComponent} ref={ref} {...props} />;
  });
}