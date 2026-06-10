// Enhanced Input component with comprehensive accessibility features
import React from "react";
import { Input } from "./input";
import { Label } from "./label";
import { cn } from "@/lib/utils";
import { AriaUtils } from "@/lib/accessibility";

interface AccessibleInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Label and description
  label?: string;
  description?: string;
  errorMessage?: string;
  
  // ARIA enhancements
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  
  // Visual indicators
  isRequired?: boolean;
  isInvalid?: boolean;
  
  // Touch accessibility
  touchOptimized?: boolean;
  
  // Container props
  containerClassName?: string;
}

export const AccessibleInput = React.forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ 
    className,
    containerClassName,
    label,
    description,
    errorMessage,
    isRequired = false,
    isInvalid = false,
    touchOptimized = false,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    'aria-invalid': ariaInvalid,
    'aria-required': ariaRequired,
    id,
    ...props 
  }, ref) => {
    // Generate unique IDs for accessibility relationships
    const inputId = id || AriaUtils.generateId('input');
    const descriptionId = description ? AriaUtils.generateId('description') : undefined;
    const errorId = errorMessage ? AriaUtils.generateId('error') : undefined;
    
    // Build aria-describedby string
    const describedByIds = [
      ariaDescribedBy,
      descriptionId,
      errorId
    ].filter(Boolean).join(' ');

    const inputClasses = cn(
      // Enhanced focus indicators for accessibility
      "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      "focus-visible:outline-none",
      
      // Touch optimization
      touchOptimized && "min-h-[44px] text-base", // Prevent zoom on iOS
      
      // Error state styling
      isInvalid && "border-destructive focus-visible:ring-destructive",
      
      // High contrast mode support
      "border-input focus-visible:border-ring",
      
      className
    );

    return (
      <div className={cn("space-y-2", containerClassName)}>
        {label && (
          <Label 
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium",
              isRequired && "after:content-['*'] after:ml-1 after:text-destructive"
            )}
          >
            {label}
            {isRequired && <span className="sr-only">(required)</span>}
          </Label>
        )}
        
        {description && (
          <p 
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </p>
        )}
        
        <Input
          ref={ref}
          id={inputId}
          className={inputClasses}
          aria-label={ariaLabel || label}
          aria-describedby={describedByIds || undefined}
          aria-invalid={ariaInvalid || isInvalid}
          aria-required={ariaRequired || isRequired}
          data-testid={(props as any)['data-testid'] || `input-${label?.toLowerCase().replace(/\s+/g, '-') || 'field'}`}
          {...props}
        />
        
        {errorMessage && (
          <p 
            id={errorId}
            className="text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {errorMessage}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = "AccessibleInput";

// Specific accessible input variants
export const AccessibleEmailInput = React.forwardRef<HTMLInputElement, Omit<AccessibleInputProps, 'type'>>(
  (props, ref) => (
    <AccessibleInput
      ref={ref}
      type="email"
      autoComplete="email"
      aria-label="Email address"
      {...props}
    />
  )
);

export const AccessiblePasswordInput = React.forwardRef<HTMLInputElement, Omit<AccessibleInputProps, 'type'>>(
  (props, ref) => (
    <AccessibleInput
      ref={ref}
      type="password"
      autoComplete="current-password"
      aria-label="Password"
      {...props}
    />
  )
);

export const AccessibleSearchInput = React.forwardRef<HTMLInputElement, Omit<AccessibleInputProps, 'type' | 'role'>>(
  (props, ref) => (
    <AccessibleInput
      ref={ref}
      type="search"
      role="searchbox"
      aria-label="Search"
      {...props}
    />
  )
);