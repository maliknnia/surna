import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Download, 
  FileText, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Clock,
  Shield,
  CheckCircle 
} from "lucide-react";

export default function DataExport() {
  const [exportInProgress, setExportInProgress] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [confirmDeletion, setConfirmDeletion] = useState(false);
  const { toast } = useToast();

  // Export user data mutation
  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("GET", "/api/security/privacy/data-export");
      return r.json();
    },
    onSuccess: (data: any) => {
      // Create a downloadable file
      const blob = new Blob([JSON.stringify(data?.data ?? data, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surna-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setExportInProgress(false);
      toast({
        title: "Data Export Complete",
        description: "Your data has been downloaded to your device",
      });
    },
    onError: (error) => {
      setExportInProgress(false);
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Account deletion mutation
  const deletionMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", "/api/security/privacy/data-deletion", {
        confirmDelete: true,
        reason: deletionReason
      });
      return r.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Account Deletion Initiated",
        description: `Your account will be permanently deleted on ${new Date(data.deletionDate).toLocaleDateString()}`,
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Deletion Request Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleExportData = () => {
    setExportInProgress(true);
    exportDataMutation.mutate();
  };

  const handleAccountDeletion = () => {
    if (!confirmDeletion) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm that you want to delete your account",
        variant: "destructive",
      });
      return;
    }

    deletionMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Data Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </CardTitle>
          <CardDescription>
            Download a copy of all your personal data in JSON format. This includes your profile, posts, messages, and activity history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Your data export will include:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Profile information and settings</li>
                  <li>Posts, comments, and reactions</li>
                  <li>Messages and conversations</li>
                  <li>Team memberships and events</li>
                  <li>Training data and achievements</li>
                  <li>Privacy and security settings</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-token-text" />
            <span className="text-sm">Export format: JSON</span>
          </div>

          <Button 
            onClick={handleExportData}
            disabled={exportInProgress || exportDataMutation.isPending}
            className="w-full"
            data-testid="button-export-data"
          >
            {exportInProgress || exportDataMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Preparing Export...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export My Data
              </>
            )}
          </Button>

          <p className="text-xs text-token-text">
            Data exports are generated in real-time and may take a few moments for large accounts.
          </p>
        </CardContent>
      </Card>

      {/* GDPR/CCPA Rights Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Your Privacy Rights
          </CardTitle>
          <CardDescription>
            Under GDPR, CCPA, and other privacy laws, you have the following rights regarding your personal data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Access</h4>
                  <p className="text-sm text-token-text">Export and view all your personal data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Rectification</h4>
                  <p className="text-sm text-token-text">Correct any inaccurate personal data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Erasure</h4>
                  <p className="text-sm text-token-text">Request deletion of your personal data</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Portability</h4>
                  <p className="text-sm text-token-text">Transfer your data to another service</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Object</h4>
                  <p className="text-sm text-token-text">Object to processing of your data</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-token-text mt-0.5" />
                <div>
                  <h4 className="font-medium">Right to Restrict</h4>
                  <p className="text-sm text-token-text">Limit how your data is processed</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Deletion Section */}
      <Card className="">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-token-text">
            <Trash2 className="h-5 w-5" />
            Delete Account
          </CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Warning: This action is irreversible!</p>
                <p className="text-sm">
                  Deleting your account will permanently remove all your data including:
                </p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Profile and personal information</li>
                  <li>All posts, comments, and messages</li>
                  <li>Team memberships and created teams</li>
                  <li>Training data and achievements</li>
                  <li>Purchase history and subscriptions</li>
                </ul>
                <p className="text-sm font-medium">
                  Your data will be permanently deleted within 30 days of your request.
                </p>
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <Label htmlFor="deletion-reason">Reason for deletion (optional)</Label>
              <Textarea
                id="deletion-reason"
                placeholder="Tell us why you're leaving (optional)"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                className="mt-1"
                data-testid="textarea-deletion-reason"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-deletion"
                checked={confirmDeletion}
                onCheckedChange={(checked) => setConfirmDeletion(checked as boolean)}
                data-testid="checkbox-confirm-deletion"
              />
              <Label htmlFor="confirm-deletion" className="text-sm">
                I understand that this action is permanent and cannot be undone
              </Label>
            </div>
          </div>

          <Button 
            variant="destructive"
            onClick={handleAccountDeletion}
            disabled={!confirmDeletion || deletionMutation.isPending}
            className="w-full"
            data-testid="button-delete-account"
          >
            {deletionMutation.isPending ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processing Deletion...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete My Account
              </>
            )}
          </Button>

          <p className="text-xs text-token-text text-center">
            You have 30 days to cancel this request by contacting support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}