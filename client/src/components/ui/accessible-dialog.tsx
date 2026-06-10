// Enhanced Dialog component with comprehensive accessibility features
import React, { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { KeyboardNav, AriaUtils } from "@/lib/accessibility";
import { cn } from "@/lib/utils";

interface AccessibleDialogProps {
  children: React.ReactNode;
  trigger?: React.ReactNode;
  title: string;
  description?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  
  // Accessibility enhancements
  role?: 'dialog' | 'alertdialog';
  'aria-label'?: string;
  'aria-describedby'?: string;
  
  // Focus management
  initialFocusRef?: React.RefObject<HTMLElement>;
  restoreFocus?: boolean;
  
  // Keyboard behavior
  closeOnEscape?: boolean;
  closeOnOverlayClick?: boolean;
  
  // Screen reader announcements
  announceOnOpen?: string;
  announceOnClose?: string;
  
  // Styling
  contentClassName?: string;
  overlayClassName?: string;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  children,
  trigger,
  title,
  description,
  open,
  onOpenChange,
  role = 'dialog',
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  initialFocusRef,
  restoreFocus = true,
  closeOnEscape = true,
  closeOnOverlayClick = true,
  announceOnOpen,
  announceOnClose,
  contentClassName,
  overlayClassName,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement>(null);
  const titleId = AriaUtils.generateId('dialog-title');
  const descriptionId = description ? AriaUtils.generateId('dialog-description') : undefined;

  // Focus management
  useEffect(() => {
    if (open && contentRef.current) {
      // Store the currently focused element to restore later
      const previouslyFocused = document.activeElement as HTMLElement;
      
      // Set up focus trap
      const releaseFocusTrap = KeyboardNav.trapFocus(contentRef.current);
      
      // Focus initial element or first focusable element
      setTimeout(() => {
        if (initialFocusRef?.current) {
          initialFocusRef.current.focus();
        } else {
          const focusableElements = KeyboardNav.getFocusableElements(contentRef.current!);
          focusableElements[0]?.focus();
        }
      }, 100);

      // Announce dialog opening to screen readers
      if (announceOnOpen) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'assertive');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = announceOnOpen;
        document.body.appendChild(announcement);
        
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
      }

      return () => {
        releaseFocusTrap();
        
        // Restore focus to trigger element
        if (restoreFocus && previouslyFocused) {
          previouslyFocused.focus();
        }
        
        // Announce dialog closing
        if (announceOnClose) {
          const announcement = document.createElement('div');
          announcement.setAttribute('aria-live', 'polite');
          announcement.className = 'sr-only';
          announcement.textContent = announceOnClose;
          document.body.appendChild(announcement);
          
          setTimeout(() => {
            document.body.removeChild(announcement);
          }, 1000);
        }
      };
    }
  }, [open, initialFocusRef, restoreFocus, announceOnOpen, announceOnClose]);

  // Keyboard event handling
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      onOpenChange?.(false);
    }
  };

  const handleOverlayClick = (event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onOpenChange?.(false);
    }
  };

  const content = (
    <DialogContent
      ref={contentRef}
      className={cn(
        // Enhanced focus indicators
        "focus-visible:outline-none",
        // Ensure proper contrast for dialog borders
        "border border-border",
        contentClassName
      )}
      role={role}
      aria-label={ariaLabel || title}
      aria-labelledby={!ariaLabel ? titleId : undefined}
      aria-describedby={ariaDescribedBy || descriptionId}
      onKeyDown={handleKeyDown}
      onPointerDownOutside={closeOnOverlayClick ? undefined : (e) => e.preventDefault()}
      data-testid="dialog-content"
    >
      <DialogHeader>
        <DialogTitle 
          id={titleId}
          className="text-lg font-semibold leading-none tracking-tight"
        >
          {title}
        </DialogTitle>
        {description && (
          <DialogDescription 
            id={descriptionId}
            className="text-sm text-muted-foreground"
          >
            {description}
          </DialogDescription>
        )}
      </DialogHeader>
      
      <div className="mt-4">
        {children}
      </div>
    </DialogContent>
  );

  if (trigger) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogTrigger 
          asChild
          data-testid="dialog-trigger"
        >
          {trigger}
        </DialogTrigger>
        {content}
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {content}
    </Dialog>
  );
};

// Specific dialog variants for common use cases
export const AccessibleAlertDialog: React.FC<Omit<AccessibleDialogProps, 'role'>> = (props) => (
  <AccessibleDialog
    {...props}
    role="alertdialog"
    closeOnOverlayClick={false}
    announceOnOpen={`Alert: ${props.title}`}
  />
);

export const AccessibleConfirmDialog: React.FC<Omit<AccessibleDialogProps, 'role'> & {
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
}> = ({ 
  onConfirm, 
  onCancel, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  children,
  ...props 
}) => (
  <AccessibleDialog
    {...props}
    role="alertdialog"
    closeOnOverlayClick={false}
  >
    <div className="space-y-4">
      {children}
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-token-text bg-transparent border border-white/10 rounded-md hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="button-cancel"
        >
          {cancelText}
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-token-text bg-transparent border border-white/10 rounded-md hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid="button-confirm"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </AccessibleDialog>
);