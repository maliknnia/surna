// Accessibility Testing and Auditing Component
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ColorContrast, TouchTarget } from "@/lib/accessibility";
import { AlertTriangle, CheckCircle, XCircle, Eye, MousePointer, Keyboard } from "lucide-react";

interface AccessibilityIssue {
  type: 'error' | 'warning' | 'info';
  category: 'contrast' | 'focus' | 'aria' | 'keyboard' | 'structure' | 'touch';
  message: string;
  element?: HTMLElement;
  recommendation?: string;
}

interface AccessibilityTestResult {
  score: number;
  issues: AccessibilityIssue[];
  summary: {
    errors: number;
    warnings: number;
    passed: number;
  };
}

export const AccessibilityTester: React.FC<{
  targetSelector?: string;
  autoRun?: boolean;
  showResults?: boolean;
}> = ({ 
  targetSelector = 'body',
  autoRun = false,
  showResults = true 
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AccessibilityTestResult | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    if (autoRun) {
      runAccessibilityAudit();
    }
  }, [autoRun, targetSelector]);

  const runAccessibilityAudit = async () => {
    setIsRunning(true);
    const issues: AccessibilityIssue[] = [];

    try {
      const targetElement = document.querySelector(targetSelector) as HTMLElement;
      if (!targetElement) {
        issues.push({
          type: 'error',
          category: 'structure',
          message: `Target element "${targetSelector}" not found`,
          recommendation: 'Ensure the target selector matches an existing element'
        });
        return;
      }

      // Test color contrast
      await testColorContrast(targetElement, issues);
      
      // Test focus indicators
      testFocusIndicators(targetElement, issues);
      
      // Test ARIA attributes
      testAriaAttributes(targetElement, issues);
      
      // Test keyboard accessibility
      testKeyboardAccessibility(targetElement, issues);
      
      // Test semantic structure
      testSemanticStructure(targetElement, issues);
      
      // Test touch targets
      testTouchTargets(targetElement, issues);

      const summary = {
        errors: issues.filter(i => i.type === 'error').length,
        warnings: issues.filter(i => i.type === 'warning').length,
        passed: 0 // Calculate based on total tests
      };

      const score = Math.max(0, 100 - (summary.errors * 10 + summary.warnings * 5));

      setResults({
        score,
        issues,
        summary
      });

    } catch (error) {
      console.error('Accessibility audit failed:', error);
      issues.push({
        type: 'error',
        category: 'structure',
        message: 'Audit failed due to an error',
        recommendation: 'Check browser console for details'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const testColorContrast = async (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const textElements = element.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, a, button, label');
    
    textElements.forEach(el => {
      const styles = getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;
      
      if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
        // Convert to hex for contrast calculation (simplified)
        try {
          const contrast = ColorContrast.getContrastRatio(color, backgroundColor);
          const fontSize = parseFloat(styles.fontSize);
          const isLarge = fontSize >= 18 || (fontSize >= 14 && styles.fontWeight === 'bold');
          
          const threshold = isLarge ? 3 : 4.5;
          
          if (contrast < threshold) {
            issues.push({
              type: 'error',
              category: 'contrast',
              message: `Text has insufficient contrast ratio: ${contrast.toFixed(2)}:1 (minimum: ${threshold}:1)`,
              element: el as HTMLElement,
              recommendation: `Increase contrast between text and background colors`
            });
          }
        } catch (error) {
          // Skip if color format not supported
        }
      }
    });
  };

  const testFocusIndicators = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const focusableElements = element.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(el => {
      const styles = getComputedStyle(el);
      
      // Check for custom focus styles
      if (!styles.outlineStyle || styles.outlineStyle === 'none') {
        // Check for alternative focus indicators
        const hasCustomFocus = styles.boxShadow.includes('ring') || 
                              styles.border.includes('ring') ||
                              el.classList.toString().includes('focus');
        
        if (!hasCustomFocus) {
          issues.push({
            type: 'warning',
            category: 'focus',
            message: 'Element may lack visible focus indicator',
            element: el as HTMLElement,
            recommendation: 'Add visible focus styles using CSS outline or box-shadow'
          });
        }
      }
    });
  };

  const testAriaAttributes = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Test for missing ARIA labels on interactive elements
    const buttons = element.querySelectorAll('button:not([aria-label]):not([aria-labelledby])');
    buttons.forEach(button => {
      if (!button.textContent?.trim()) {
        issues.push({
          type: 'error',
          category: 'aria',
          message: 'Button without accessible name',
          element: button as HTMLElement,
          recommendation: 'Add aria-label or visible text content'
        });
      }
    });

    // Test for missing alt text on images
    const images = element.querySelectorAll('img:not([alt])');
    images.forEach(img => {
      issues.push({
        type: 'error',
        category: 'aria',
        message: 'Image missing alt attribute',
        element: img as HTMLElement,
        recommendation: 'Add descriptive alt text or alt="" for decorative images'
      });
    });

    // Test for form inputs without labels
    const inputs = element.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const hasLabel = id && element.querySelector(`label[for="${id}"]`);
      
      if (!hasLabel) {
        issues.push({
          type: 'error',
          category: 'aria',
          message: 'Form input without associated label',
          element: input as HTMLElement,
          recommendation: 'Add a label element or aria-label attribute'
        });
      }
    });
  };

  const testKeyboardAccessibility = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Test for keyboard traps
    const focusableElements = element.querySelectorAll(
      'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    // Check for elements with positive tabindex
    element.querySelectorAll('[tabindex]:not([tabindex="0"]):not([tabindex="-1"])').forEach(el => {
      const tabindex = parseInt(el.getAttribute('tabindex') || '0');
      if (tabindex > 0) {
        issues.push({
          type: 'warning',
          category: 'keyboard',
          message: 'Positive tabindex found - can disrupt natural tab order',
          element: el as HTMLElement,
          recommendation: 'Use tabindex="0" or structure HTML in logical order'
        });
      }
    });

    // Check for click handlers on non-interactive elements
    element.querySelectorAll('div, span, p').forEach(el => {
      if (el.getAttribute('onclick') || el.classList.toString().includes('cursor-pointer')) {
        const hasKeyboard = el.getAttribute('onkeydown') || 
                           el.getAttribute('onkeypress') || 
                           el.getAttribute('onkeyup') ||
                           el.getAttribute('tabindex');
        
        if (!hasKeyboard) {
          issues.push({
            type: 'warning',
            category: 'keyboard',
            message: 'Click handler on non-interactive element without keyboard support',
            element: el as HTMLElement,
            recommendation: 'Add keyboard event handlers and tabindex="0"'
          });
        }
      }
    });
  };

  const testSemanticStructure = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    // Test heading structure
    const headings = Array.from(element.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let previousLevel = 0;

    headings.forEach(heading => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (currentLevel > previousLevel + 1) {
        issues.push({
          type: 'warning',
          category: 'structure',
          message: `Heading level skipped from h${previousLevel} to h${currentLevel}`,
          element: heading as HTMLElement,
          recommendation: 'Use heading levels in sequential order'
        });
      }
      
      previousLevel = currentLevel;
    });

    // Test for landmark roles
    const hasMain = element.querySelector('main, [role="main"]');
    if (!hasMain && targetSelector === 'body') {
      issues.push({
        type: 'warning',
        category: 'structure',
        message: 'Page missing main landmark',
        recommendation: 'Add <main> element or role="main"'
      });
    }
  };

  const testTouchTargets = (element: HTMLElement, issues: AccessibilityIssue[]) => {
    const interactiveElements = element.querySelectorAll('button, a, input, select, textarea');
    
    interactiveElements.forEach(el => {
      if (!TouchTarget.meetsMinimumSize(el as HTMLElement)) {
        issues.push({
          type: 'warning',
          category: 'touch',
          message: 'Touch target smaller than recommended 44x44px',
          element: el as HTMLElement,
          recommendation: 'Increase element size or add padding for better touch accessibility'
        });
      }
    });
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <XCircle className="h-4 w-4 text-[#efe7e9]" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-[#efe7e9]" />;
      default:
        return <CheckCircle className="h-4 w-4 text-[#efe7e9]" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contrast':
        return <Eye className="h-4 w-4" />;
      case 'touch':
        return <MousePointer className="h-4 w-4" />;
      case 'keyboard':
      case 'focus':
        return <Keyboard className="h-4 w-4" />;
      default:
        return <CheckCircle className="h-4 w-4" />;
    }
  };

  const filteredIssues = results?.issues.filter(issue => 
    selectedCategory === 'all' || issue.category === selectedCategory
  ) || [];

  if (!showResults) return null;

  return (
    <div className="space-y-4" data-testid="accessibility-tester">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Accessibility Audit</h3>
        <Button
          onClick={runAccessibilityAudit}
          disabled={isRunning}
          data-testid="run-audit-button"
        >
          {isRunning ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {results && (
        <div className="space-y-4">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Accessibility Score</span>
                <Badge 
                  variant={results.score >= 80 ? 'default' : results.score >= 60 ? 'secondary' : 'destructive'}
                  className="text-lg px-3 py-1"
                >
                  {results.score}/100
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-[#efe7e9]" />
                  <span>{results.summary.errors} Errors</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-[#efe7e9]" />
                  <span>{results.summary.warnings} Warnings</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All Issues
            </Button>
            {['contrast', 'focus', 'aria', 'keyboard', 'structure', 'touch'].map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="capitalize"
              >
                {getCategoryIcon(category)}
                <span className="ml-1">{category}</span>
              </Button>
            ))}
          </div>

          {/* Issues List */}
          <Card>
            <CardHeader>
              <CardTitle>Issues Found ({filteredIssues.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredIssues.length === 0 ? (
                <p className="text-muted-foreground">No issues found in selected category.</p>
              ) : (
                <div className="space-y-3">
                  {filteredIssues.map((issue, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-3 space-y-2"
                      data-testid={`issue-${index}`}
                    >
                      <div className="flex items-start gap-2">
                        {getIssueIcon(issue.type)}
                        <div className="flex-1">
                          <div className="font-medium">{issue.message}</div>
                          <Badge variant="outline" className="mt-1 capitalize">
                            {issue.category}
                          </Badge>
                        </div>
                      </div>
                      {issue.recommendation && (
                        <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                          <strong>Recommendation:</strong> {issue.recommendation}
                        </div>
                      )}
                      {issue.element && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            issue.element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            issue.element?.focus();
                          }}
                        >
                          Highlight Element
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};