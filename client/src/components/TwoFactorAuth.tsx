import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Shield, AlertCircle, CheckCircle, Key, Copy } from "lucide-react";
import QRCode from "qrcode";

interface TwoFactorSetup {
  qrCode: string;
  backupCodes: string[];
}

export default function TwoFactorAuth() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [qrCodeImage, setQrCodeImage] = useState<string>("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get 2FA status
  const { data: securityStatus } = useQuery<{ twoFactorEnabled?: boolean } | null>({
    queryKey: ["/api/security/status"],
  });

  React.useEffect(() => {
    setIsEnabled(securityStatus?.twoFactorEnabled || false);
  }, [securityStatus]);

  // Setup 2FA mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/security/2fa/setup");
      return r.json();
    },
    onSuccess: async (data: any) => {
      setSetupData(data);
      // Generate QR code image
      try {
        const qrImage = await QRCode.toDataURL(data.qrCode);
        setQrCodeImage(qrImage);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      }
      toast({
        title: "2FA Setup Initiated",
        description: "Scan the QR code with your authenticator app",
      });
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Enable 2FA mutation
  const enableMutation = useMutation({
    mutationFn: ({ secret, token }: { secret: string; token: string }) =>
      apiRequest("POST", "/api/security/2fa/enable", { secret, token }),
    onSuccess: (data) => {
      setIsEnabled(true);
      setSetupData(null);
      setVerificationCode("");
      setQrCodeImage("");
      setShowBackupCodes(true);
      queryClient.invalidateQueries({ queryKey: ["/api/security/status"] });
      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been enabled successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Verification Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Disable 2FA mutation
  const disableMutation = useMutation({
    mutationFn: (password: string) =>
      apiRequest("POST", "/api/security/2fa/disable", { password }),
    onSuccess: () => {
      setIsEnabled(false);
      setShowBackupCodes(false);
      queryClient.invalidateQueries({ queryKey: ["/api/security/status"] });
      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled",
      });
    },
    onError: (error) => {
      toast({
        title: "Disable Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSetup = () => {
    setupMutation.mutate();
  };

  const handleEnable = () => {
    if (!setupData || !verificationCode) {
      toast({
        title: "Missing Information",
        description: "Please complete the setup first",
        variant: "destructive",
      });
      return;
    }

    enableMutation.mutate({
      secret: setupData.qrCode.split('secret=')[1]?.split('&')[0] || "",
      token: verificationCode
    });
  };

  const handleDisable = () => {
    const password = prompt("Enter your password to disable 2FA:");
    if (password) {
      disableMutation.mutate(password);
    }
  };

  const copyBackupCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Copied",
      description: "Backup code copied to clipboard",
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="flex items-center justify-between p-4 rounded-lg">
        <div className="flex items-center gap-3">
          <Shield className={`h-5 w-5 ${isEnabled ? 'text-token-text' : 'text-token-text'}`} />
          <div>
            <h3 className="font-medium">Two-Factor Authentication</h3>
            <p className="text-sm text-token-text">
              {isEnabled ? "Enabled and protecting your account" : "Not enabled"}
            </p>
          </div>
        </div>
        <Badge variant={isEnabled ? "default" : "secondary"}>
          {isEnabled ? "Enabled" : "Disabled"}
        </Badge>
      </div>

      {!isEnabled && !setupData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Enable Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Protect your account with an additional layer of security. You'll need an authenticator app like Google Authenticator or Authy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSetup} 
              disabled={setupMutation.isPending}
              data-testid="button-setup-2fa"
            >
              {setupMutation.isPending ? "Setting up..." : "Setup 2FA"}
            </Button>
          </CardContent>
        </Card>
      )}

      {setupData && qrCodeImage && (
        <Card>
          <CardHeader>
            <CardTitle>Scan QR Code</CardTitle>
            <CardDescription>
              Scan this QR code with your authenticator app, then enter the verification code below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCodeImage} alt="2FA QR Code" className="w-48 h-48" />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="verification-code">Verification Code</Label>
              <Input
                id="verification-code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                data-testid="input-verification-code"
              />
            </div>

            <Button 
              onClick={handleEnable} 
              disabled={enableMutation.isPending || verificationCode.length !== 6}
              className="w-full"
              data-testid="button-enable-2fa"
            >
              {enableMutation.isPending ? "Verifying..." : "Enable 2FA"}
            </Button>
          </CardContent>
        </Card>
      )}

      {showBackupCodes && setupData?.backupCodes && (
        <Alert>
          <Key className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Save these backup codes!</p>
              <p className="text-sm">
                These codes can be used to access your account if you lose your authenticator device. 
                Store them in a safe place.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {setupData.backupCodes.map((code, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-2 bg-transparent border border-border rounded font-mono text-sm"
                  >
                    <span>{code}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyBackupCode(code)}
                      data-testid={`button-copy-backup-${index}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-token-text" />
              2FA is Active
            </CardTitle>
            <CardDescription>
              Your account is protected with two-factor authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={handleDisable}
              disabled={disableMutation.isPending}
              data-testid="button-disable-2fa"
            >
              {disableMutation.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}