// Accessibility Settings Panel for user customization
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAccessibility } from "./AccessibilityProvider";
import { ScreenReaderOnly } from "./ScreenReaderOnly";
import { Eye, MousePointer, Keyboard, Volume2, Type, RotateCcw } from "lucide-react";

export const AccessibilitySettings: React.FC<{
  className?: string;
}> = ({ className }) => {
  const { settings, updateSetting, resetSettings, announce } = useAccessibility();

  const handleSettingChange = <K extends keyof typeof settings>(
    key: K,
    value: (typeof settings)[K]
  ) => {
    updateSetting(key, value);
    announce(`${key} setting changed`, 'polite');
  };

  return (
    <Card className={className} data-testid="accessibility-settings">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Accessibility Settings
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Customize your experience for better accessibility
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Visual Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Visual Preferences
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="high-contrast">High Contrast Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Increase contrast for better visibility
                </p>
              </div>
              <Switch
                id="high-contrast"
                checked={settings.highContrast}
                onCheckedChange={(checked) => handleSettingChange('highContrast', checked)}
                data-testid="switch-high-contrast"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="reduced-motion">Reduce Motion</Label>
                <p className="text-sm text-muted-foreground">
                  Minimize animations and transitions
                </p>
              </div>
              <Switch
                id="reduced-motion"
                checked={settings.reducedMotion}
                onCheckedChange={(checked) => handleSettingChange('reducedMotion', checked)}
                data-testid="switch-reduced-motion"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="font-size" className="flex items-center gap-2">
                <Type className="h-4 w-4" />
                Font Size
              </Label>
              <Select
                value={settings.fontSize}
                onValueChange={(value: any) => handleSettingChange('fontSize', value)}
              >
                <SelectTrigger data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small</SelectItem>
                  <SelectItem value="medium">Medium (Default)</SelectItem>
                  <SelectItem value="large">Large</SelectItem>
                  <SelectItem value="extra-large">Extra Large</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Screen Reader Preferences */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Screen Reader
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="announcements">Enable Announcements</Label>
                <p className="text-sm text-muted-foreground">
                  Announce actions and status changes
                </p>
              </div>
              <Switch
                id="announcements"
                checked={settings.announcements}
                onCheckedChange={(checked) => handleSettingChange('announcements', checked)}
                data-testid="switch-announcements"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="verbose-descriptions">Verbose Descriptions</Label>
                <p className="text-sm text-muted-foreground">
                  Provide detailed descriptions of interface elements
                </p>
              </div>
              <Switch
                id="verbose-descriptions"
                checked={settings.verboseDescriptions}
                onCheckedChange={(checked) => handleSettingChange('verboseDescriptions', checked)}
                data-testid="switch-verbose-descriptions"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Keyboard Navigation */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <Keyboard className="h-4 w-4" />
            Keyboard Navigation
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="focus-indicators">Show Focus Indicators</Label>
                <p className="text-sm text-muted-foreground">
                  Highlight focused elements with visual indicators
                </p>
              </div>
              <Switch
                id="focus-indicators"
                checked={settings.showFocusIndicators}
                onCheckedChange={(checked) => handleSettingChange('showFocusIndicators', checked)}
                data-testid="switch-focus-indicators"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="skip-links">Enable Skip Links</Label>
                <p className="text-sm text-muted-foreground">
                  Show skip navigation links for keyboard users
                </p>
              </div>
              <Switch
                id="skip-links"
                checked={settings.skipLinksEnabled}
                onCheckedChange={(checked) => handleSettingChange('skipLinksEnabled', checked)}
                data-testid="switch-skip-links"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Touch & Mobile */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <MousePointer className="h-4 w-4" />
            Touch & Mobile
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="larger-touch-targets">Larger Touch Targets</Label>
                <p className="text-sm text-muted-foreground">
                  Increase touch target size for easier interaction
                </p>
              </div>
              <Switch
                id="larger-touch-targets"
                checked={settings.largerTouchTargets}
                onCheckedChange={(checked) => handleSettingChange('largerTouchTargets', checked)}
                data-testid="switch-larger-touch-targets"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="text-direction">Text Direction</Label>
              <Select
                value={settings.textDirection}
                onValueChange={(value: any) => handleSettingChange('textDirection', value)}
              >
                <SelectTrigger data-testid="select-text-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ltr">Left to Right (LTR)</SelectItem>
                  <SelectItem value="rtl">Right to Left (RTL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Reset Settings */}
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Reset Settings</h3>
            <p className="text-sm text-muted-foreground">
              Restore all accessibility settings to default values
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              resetSettings();
              announce('Accessibility settings reset to defaults', 'polite');
            }}
            className="flex items-center gap-2"
            data-testid="button-reset-settings"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {/* Screen reader instructions */}
        <ScreenReaderOnly>
          <p>
            Use Tab and Shift+Tab to navigate between settings. 
            Use Space or Enter to toggle switches. 
            Use arrow keys to change select values.
          </p>
        </ScreenReaderOnly>
      </CardContent>
    </Card>
  );
};