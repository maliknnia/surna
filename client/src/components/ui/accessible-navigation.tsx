// Enhanced Navigation component with comprehensive accessibility features
import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { AriaUtils, KeyboardNav, useKeyboardNavigation, useScreenReader } from "@/lib/accessibility";
import { Menu, X, ChevronDown } from "lucide-react";

interface AccessibleNavItem {
  href: string;
  label: string;
  isActive?: boolean;
  isExternal?: boolean;
  'aria-describedby'?: string;
  subItems?: AccessibleNavItem[];
}

interface AccessibleNavigationProps {
  items: AccessibleNavItem[];
  brand?: React.ReactNode;
  className?: string;
  
  // Mobile navigation
  mobileBreakpoint?: 'sm' | 'md' | 'lg';
  
  // Skip link
  skipLinkHref?: string;
  skipLinkText?: string;
  
  // ARIA labels
  'aria-label'?: string;
  landmarkRole?: 'navigation' | 'banner';
}

export const AccessibleNavigation: React.FC<AccessibleNavigationProps> = ({
  items,
  brand,
  className,
  mobileBreakpoint = 'md',
  skipLinkHref = '#main-content',
  skipLinkText = 'Skip to main content',
  'aria-label': ariaLabel = 'Main navigation',
  landmarkRole = 'navigation'
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const { announce } = useScreenReader();
  const navRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Focus trap for mobile menu
  useEffect(() => {
    if (isMobileMenuOpen && mobileMenuRef.current) {
      const releaseFocusTrap = KeyboardNav.trapFocus(mobileMenuRef.current);
      return releaseFocusTrap;
    }
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    const newState = !isMobileMenuOpen;
    setIsMobileMenuOpen(newState);
    announce(newState ? 'Navigation menu opened' : 'Navigation menu closed');
  };

  const handleNavItemClick = (item: AccessibleNavItem) => {
    if (!item.isExternal) {
      setIsMobileMenuOpen(false);
    }
    announce(`Navigating to ${item.label}`);
  };

  const renderNavItem = (item: AccessibleNavItem, isMobile = false) => {
    const isActive = item.isActive || location === item.href;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    if (hasSubItems) {
      return (
        <DropdownNavItem
          key={item.href}
          item={item}
          isActive={isActive}
          isMobile={isMobile}
          onItemClick={handleNavItemClick}
        />
      );
    }

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={() => handleNavItemClick(item)}
        className={cn(
          "px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground",
          isMobile ? "block w-full text-left" : "inline-flex items-center"
        )}
        aria-current={isActive ? 'page' : undefined}
        aria-describedby={item['aria-describedby']}
        target={item.isExternal ? '_blank' : undefined}
        rel={item.isExternal ? 'noopener noreferrer' : undefined}
        data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {item.label}
        {item.isExternal && (
          <span className="sr-only">(opens in new tab)</span>
        )}
      </a>
    );
  };

  return (
    <>
      {/* Skip Link */}
      <a
        href={skipLinkHref}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md"
        data-testid="skip-link"
      >
        {skipLinkText}
      </a>

      <nav
        ref={navRef}
        role={landmarkRole}
        aria-label={ariaLabel}
        className={cn("bg-background border-b", className)}
        data-testid="main-navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {/* Brand/Logo */}
            <div className="flex items-center">
              {brand && (
                <div className="flex-shrink-0 flex items-center">
                  {brand}
                </div>
              )}
            </div>

            {/* Desktop Navigation */}
            <div className={cn("hidden space-x-1", `${mobileBreakpoint}:flex`)}>
              <div className="flex items-center space-x-1">
                {items.map(item => renderNavItem(item, false))}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className={cn("flex items-center", `${mobileBreakpoint}:hidden`)}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMobileMenu}
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                data-testid="mobile-menu-toggle"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="h-6 w-6" aria-hidden="true" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div
            ref={mobileMenuRef}
            id="mobile-menu"
            className={cn("border-t border-border", `${mobileBreakpoint}:hidden`)}
            data-testid="mobile-menu"
          >
            <div className="px-2 pt-2 pb-3 space-y-1">
              {items.map(item => renderNavItem(item, true))}
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

// Dropdown Navigation Item Component
interface DropdownNavItemProps {
  item: AccessibleNavItem;
  isActive: boolean;
  isMobile: boolean;
  onItemClick: (item: AccessibleNavItem) => void;
}

const DropdownNavItem: React.FC<DropdownNavItemProps> = ({
  item,
  isActive,
  isMobile,
  onItemClick
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerId = AriaUtils.generateId('dropdown-trigger');
  const menuId = AriaUtils.generateId('dropdown-menu');

  const { handleKeyDown } = useKeyboardNavigation(
    (direction) => {
      if (direction === 'down' && !isOpen) {
        setIsOpen(true);
      } else if (direction === 'up' && isOpen) {
        setIsOpen(false);
      }
    },
    () => setIsOpen(!isOpen),
    () => setIsOpen(false)
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  if (isMobile) {
    return (
      <div className="space-y-1">
        <button
          id={triggerId}
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full px-3 py-2 rounded-md text-sm font-medium text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "hover:bg-accent hover:text-accent-foreground flex items-center justify-between",
            isActive && "bg-accent text-accent-foreground"
          )}
          aria-expanded={isOpen}
          aria-controls={menuId}
          aria-haspopup="true"
          data-testid={`nav-dropdown-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.label}
          <ChevronDown 
            className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
            aria-hidden="true"
          />
        </button>
        
        {isOpen && (
          <div
            id={menuId}
            role="menu"
            aria-labelledby={triggerId}
            className="pl-4 space-y-1"
          >
            {item.subItems?.map(subItem => (
              <a
                key={subItem.href}
                href={subItem.href}
                onClick={() => onItemClick(subItem)}
                className="block px-3 py-2 rounded-md text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                role="menuitem"
                data-testid={`nav-sublink-${subItem.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {subItem.label}
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        id={triggerId}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyDown(e.nativeEvent)}
        className={cn(
          "inline-flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "hover:bg-accent hover:text-accent-foreground",
          isActive && "bg-accent text-accent-foreground"
        )}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="true"
        data-testid={`nav-dropdown-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {item.label}
        <ChevronDown 
          className={cn("ml-1 h-4 w-4 transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          id={menuId}
          role="menu"
          aria-labelledby={triggerId}
          className="absolute z-50 mt-2 w-48 rounded-md shadow-lg bg-popover border border-border py-1"
          data-testid="nav-dropdown-menu"
        >
          {item.subItems?.map(subItem => (
            <a
              key={subItem.href}
              href={subItem.href}
              onClick={() => {
                onItemClick(subItem);
                setIsOpen(false);
              }}
              className="block px-4 py-2 text-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:bg-accent focus-visible:text-accent-foreground"
              role="menuitem"
              data-testid={`nav-sublink-${subItem.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {subItem.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};