import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Globe, Users, Lock, Info } from "lucide-react";

interface PrivacySettings {
  profileVisibility: "public" | "friends" | "private";
  showEmail: boolean;
  showPhoneNumber: boolean;
  showLocation: boolean;
  allowDirectMessages: boolean;
  allowFollowRequests: boolean;
  analyticsOptOut: boolean;
  marketingEmails: boolean;
  dataProcessingConsent: boolean;
  shareDataWithPartners: boolean;
  personalizedAds: boolean;
  consentDate?: string;
  preferences?: {
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
  };
}

const DEFAULT_PRIVACY: PrivacySettings = {
  profileVisibility: "public",
  showEmail: false,
  showPhoneNumber: false,
  showLocation: true,
  allowDirectMessages: true,
  allowFollowRequests: true,
  analyticsOptOut: false,
  marketingEmails: false,
  dataProcessingConsent: true,
  shareDataWithPartners: false,
  personalizedAds: false,
};

export default function PrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: privacySettings, isLoading, isError } = useQuery<PrivacySettings>({
    queryKey: ["/api/security/privacy/settings"],
    retry: 1,
  });

  React.useEffect(() => {
    if (privacySettings) setSettings(privacySettings);
    else if (isError) setSettings(DEFAULT_PRIVACY);
  }, [privacySettings, isError]);

  // Update privacy settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: Partial<PrivacySettings>) => {
      const r = await apiRequest("PUT", "/api/security/privacy/settings", newSettings);
      return r.json();
    },
    onSuccess: (data: any) => {
      setSettings(data);
      queryClient.invalidateQueries({ queryKey: ["/api/security/privacy/settings"] });
      toast({
        title: "Settings Updated",
        description: "Your privacy settings have been saved",
      });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSettingChange = (key: keyof PrivacySettings, value: any) => {
    if (!settings) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettingsMutation.mutate({ [key]: value });
  };

  if (isLoading && !settings) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 bg-gradient-to-r from-transparent to-[#2a2535]"></div>
      </div>
    );
  }

  if (!settings) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Privacy settings could not be loaded. Pull to refresh or try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Visibility */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Profile Visibility
          </CardTitle>
          <CardDescription>
            Control who can see your profile and personal information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-visibility">Who can see your profile</Label>
            <Select
              value={settings.profileVisibility}
              onValueChange={(value: "public" | "friends" | "private") => 
                handleSettingChange("profileVisibility", value)
              }
            >
              <SelectTrigger data-testid="select-profile-visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public - Anyone can see your profile
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Friends only - Only your connections
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private - Only you can see your profile
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-email">Show email address</Label>
              <Switch
                id="show-email"
                checked={settings.showEmail}
                onCheckedChange={(checked) => handleSettingChange("showEmail", checked)}
                data-testid="switch-show-email"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-phone">Show phone number</Label>
              <Switch
                id="show-phone"
                checked={settings.showPhoneNumber}
                onCheckedChange={(checked) => handleSettingChange("showPhoneNumber", checked)}
                data-testid="switch-show-phone"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-location">Show location</Label>
              <Switch
                id="show-location"
                checked={settings.showLocation}
                onCheckedChange={(checked) => handleSettingChange("showLocation", checked)}
                data-testid="switch-show-location"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Communication Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
          <CardDescription>
            Manage how others can contact you and what messages you receive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="direct-messages">Allow direct messages</Label>
              <p className="text-sm text-token-text opacity-80">Let other users send you private messages</p>
            </div>
            <Switch
              id="direct-messages"
              checked={settings.allowDirectMessages}
              onCheckedChange={(checked) => handleSettingChange("allowDirectMessages", checked)}
              data-testid="switch-direct-messages"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="follow-requests">Allow follow requests</Label>
              <p className="text-sm text-token-text opacity-80">Let others request to follow you</p>
            </div>
            <Switch
              id="follow-requests"
              checked={settings.allowFollowRequests}
              onCheckedChange={(checked) => handleSettingChange("allowFollowRequests", checked)}
              data-testid="switch-follow-requests"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="marketing-emails">Marketing emails</Label>
              <p className="text-sm text-token-text opacity-80">Receive emails about new features and promotions</p>
            </div>
            <Switch
              id="marketing-emails"
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => handleSettingChange("marketingEmails", checked)}
              data-testid="switch-marketing-emails"
            />
          </div>
        </CardContent>
      </Card>

      {/* Data & Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Data & Analytics</CardTitle>
          <CardDescription>
            Control how your data is used for analytics and personalization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="analytics-opt-out">Opt out of analytics</Label>
              <p className="text-sm text-token-text opacity-80">Prevent your usage data from being collected</p>
            </div>
            <Switch
              id="analytics-opt-out"
              checked={settings.analyticsOptOut}
              onCheckedChange={(checked) => handleSettingChange("analyticsOptOut", checked)}
              data-testid="switch-analytics-opt-out"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="personalized-ads">Personalized advertising</Label>
              <p className="text-sm text-token-text opacity-80">Use your activity to show relevant ads</p>
            </div>
            <Switch
              id="personalized-ads"
              checked={settings.personalizedAds}
              onCheckedChange={(checked) => handleSettingChange("personalizedAds", checked)}
              data-testid="switch-personalized-ads"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="share-data-partners">Share data with partners</Label>
              <p className="text-sm text-token-text opacity-80">Allow sharing anonymized data with trusted partners</p>
            </div>
            <Switch
              id="share-data-partners"
              checked={settings.shareDataWithPartners}
              onCheckedChange={(checked) => handleSettingChange("shareDataWithPartners", checked)}
              data-testid="switch-share-data-partners"
            />
          </div>
        </CardContent>
      </Card>

      {/* GDPR/CCPA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>Data Processing Consent</CardTitle>
          <CardDescription>
            Your rights under GDPR, CCPA, and other privacy regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="data-processing-consent">Data processing consent</Label>
              <p className="text-sm text-token-text opacity-80">
                Consent to process your personal data as outlined in our Privacy Policy
              </p>
            </div>
            <Switch
              id="data-processing-consent"
              checked={settings.dataProcessingConsent}
              onCheckedChange={(checked) => handleSettingChange("dataProcessingConsent", checked)}
              data-testid="switch-data-processing-consent"
            />
          </div>

          {settings.consentDate && (
            <p className="text-sm text-token-text opacity-80">
              Consent last updated: {new Date(settings.consentDate).toLocaleDateString()}
            </p>
          )}

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Your Privacy Rights:</p>
              <ul className="text-sm space-y-1">
                <li>• Right to access your personal data</li>
                <li>• Right to correct inaccurate data</li>
                <li>• Right to delete your data</li>
                <li>• Right to data portability</li>
                <li>• Right to object to processing</li>
              </ul>
              <p className="text-sm mt-2">
                Visit the Data Management tab to exercise these rights.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}