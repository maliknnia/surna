import { useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSmartBack } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import TwoFactorAuth from "@/components/TwoFactorAuth";
import PasswordSettings from "@/components/PasswordSettings";
import PrivacySettings from "@/components/PrivacySettings";
import SecurityEvents from "@/components/SecurityEvents";
import DataExport from "@/components/DataExport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Lock, Eye, AlertTriangle, FileText } from "lucide-react";

export default function SecuritySettings() {
  const { user, isLoading } = useAuth();
  const goBack = useSmartBack({ fallback: "/settings" });
  const [activeTab, setActiveTab] = useState("2fa");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8  "></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sign in required
            </CardTitle>
            <CardDescription>Log in to manage security and privacy settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login?next=/security">
              <Button className="w-full">Go to login</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border/60">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={goBack} aria-label="Go back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Link href="/">
            <Button variant="ghost" size="icon" aria-label="Home">
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground">Security & privacy</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-4xl">
      <p className="text-muted-foreground mb-6 text-sm">
        Password, two-factor authentication, privacy controls, and data export.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto gap-1">
          <TabsTrigger value="2fa" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            2FA
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Password
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="2fa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Two-Factor Authentication
              </CardTitle>
              <CardDescription>
                Add an extra layer of security to your account with two-factor authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TwoFactorAuth />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password Settings
              </CardTitle>
              <CardDescription>
                Change your password and view security requirements.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordSettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Privacy Settings
              </CardTitle>
              <CardDescription>
                Control who can see your information and how your data is used.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PrivacySettings />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Activity
              </CardTitle>
              <CardDescription>
                Monitor security events and suspicious activity on your account.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SecurityEvents />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Management
              </CardTitle>
              <CardDescription>
                Export your data or request account deletion in compliance with GDPR/CCPA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataExport />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}