import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

type ChangePasswordForm = z.infer<typeof changePasswordSchema>;

interface PasswordPolicy {
  requirements: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    maxAge: number;
    preventReuse: number;
  };
}

export default function PasswordSettings() {
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const { toast } = useToast();

  // Get password policy
  const { data: passwordPolicy } = useQuery<PasswordPolicy>({
    queryKey: ["/api/security/password/policy"],
  });

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors }
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPassword = watch("newPassword", "");

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordForm) =>
      apiRequest("POST", "/api/security/password/change", data),
    onSuccess: () => {
      reset();
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Password Change Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate(data);
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Password strength calculation
  const calculatePasswordStrength = (password: string): number => {
    let score = 0;
    if (password.length >= 8) score += 20;
    if (password.length >= 12) score += 10;
    if (/[A-Z]/.test(password)) score += 20;
    if (/[a-z]/.test(password)) score += 20;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^A-Za-z0-9]/.test(password)) score += 15;
    return Math.min(score, 100);
  };

  const passwordStrength = calculatePasswordStrength(newPassword);
  const getStrengthColor = (strength: number) => {
    if (strength < 30) return "bg-transparent border border-border";
    if (strength < 60) return "bg-transparent border border-border";
    if (strength < 80) return "bg-transparent border border-border";
    return "bg-transparent border border-border";
  };

  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return "Weak";
    if (strength < 60) return "Fair";
    if (strength < 80) return "Good";
    return "Strong";
  };

  return (
    <div className="space-y-6">
      {/* Password Policy Card */}
      {passwordPolicy && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-token-text" />
              Password Requirements
            </CardTitle>
            <CardDescription>
              Your password must meet these security requirements:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-token-text" />
                <span className="text-sm">
                  At least {passwordPolicy.requirements.minLength} characters
                </span>
              </div>
              {passwordPolicy.requirements.requireUppercase && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-token-text" />
                  <span className="text-sm">One uppercase letter</span>
                </div>
              )}
              {passwordPolicy.requirements.requireLowercase && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-token-text" />
                  <span className="text-sm">One lowercase letter</span>
                </div>
              )}
              {passwordPolicy.requirements.requireNumbers && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-token-text" />
                  <span className="text-sm">One number</span>
                </div>
              )}
              {passwordPolicy.requirements.requireSpecialChars && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-token-text" />
                  <span className="text-sm">One special character</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showPasswords.current ? "text" : "password"}
                  {...register("currentPassword")}
                  data-testid="input-current-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => togglePasswordVisibility("current")}
                  data-testid="button-toggle-current-password"
                >
                  {showPasswords.current ? 
                    <EyeOff className="h-4 w-4" /> : 
                    <Eye className="h-4 w-4" />
                  }
                </Button>
              </div>
              {errors.currentPassword && (
                <p className="text-sm text-token-text" data-testid="error-current-password">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPasswords.new ? "text" : "password"}
                  {...register("newPassword")}
                  data-testid="input-new-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => togglePasswordVisibility("new")}
                  data-testid="button-toggle-new-password"
                >
                  {showPasswords.new ? 
                    <EyeOff className="h-4 w-4" /> : 
                    <Eye className="h-4 w-4" />
                  }
                </Button>
              </div>
              {errors.newPassword && (
                <p className="text-sm text-token-text" data-testid="error-new-password">
                  {errors.newPassword.message}
                </p>
              )}
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-token-text">Password strength</span>
                    <span className="text-sm font-medium text-token-text">
                      {getStrengthLabel(passwordStrength)}
                    </span>
                  </div>
                  <div className="w-full bg-transparent border border-border rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(passwordStrength)}`}
                      style={{ width: `${passwordStrength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showPasswords.confirm ? "text" : "password"}
                  {...register("confirmPassword")}
                  data-testid="input-confirm-password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => togglePasswordVisibility("confirm")}
                  data-testid="button-toggle-confirm-password"
                >
                  {showPasswords.confirm ? 
                    <EyeOff className="h-4 w-4" /> : 
                    <Eye className="h-4 w-4" />
                  }
                </Button>
              </div>
              {errors.confirmPassword && (
                <p className="text-sm text-token-text" data-testid="error-confirm-password">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              disabled={changePasswordMutation.isPending}
              className="w-full"
              data-testid="button-change-password"
            >
              {changePasswordMutation.isPending ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Security Tips */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <div className="space-y-2">
            <p className="font-medium">Password Security Tips:</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Use a unique password that you don't use anywhere else</li>
              <li>Consider using a password manager to generate and store strong passwords</li>
              <li>Enable two-factor authentication for additional security</li>
              <li>Never share your password with anyone</li>
            </ul>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
}