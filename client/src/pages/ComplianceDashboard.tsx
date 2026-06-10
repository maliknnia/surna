// Stage 6: Compliance & Security Dashboard
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useSmartBack } from "@/lib/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Shield, Download, Eye, Lock, UserCheck, AlertTriangle, CheckCircle, Clock, FileText, Settings, ArrowLeft, Home } from "lucide-react";

interface ComplianceReport {
  reportGeneratedAt: string;
  timeframe: string;
  complianceRequests: any[];
  parentalConsent: {
    pending: number;
    totalProcessed: number;
  };
  securityEvents: {
    total: number;
    byType: Record<string, number>;
  };
  dataRetention: any[];
  summary: {
    gdprCompliant: boolean;
    coppaCompliant: boolean;
    dataRetentionCompliant: boolean;
    securityIncidents: number;
    lastSecurityReview: string;
  };
}

interface SecurityEvent {
  id: string;
  eventType: string;
  severity: string;
  userId?: string;
  timestamp: string;
  ipAddress?: string;
  additionalData?: any;
}

interface DataExportRequest {
  requestId: string;
  status: string;
  requestedAt: string;
  userId: string;
  userEmail: string;
}

export default function ComplianceDashboard() {
  const [, setLocation] = useLocation();
  const goBack = useSmartBack({ fallback: "/" });
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [dataExportRequests, setDataExportRequests] = useState<DataExportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("30d");
  const [exportEmail, setExportEmail] = useState("");
  const [deletionEmail, setDeletionEmail] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchComplianceData();
  }, [timeframe]);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      
      // Fetch compliance report
      const reportResponse = await fetch(`/api/compliance/report?timeframe=${timeframe}`);
      if (reportResponse.ok) {
        const report = await reportResponse.json();
        setComplianceReport(report);
      }

      // Fetch security events
      const eventsResponse = await fetch("/api/security/events", { credentials: "include" });
      if (eventsResponse.ok) {
        const payload = await eventsResponse.json();
        const list = Array.isArray(payload) ? payload : payload.events ?? [];
        setSecurityEvents(
          list.map((event: any) => ({
            ...event,
            severity: event.severity || event.threatLevel || "low",
          })),
        );
      }

      // Fetch data export requests
      const exportResponse = await fetch('/api/compliance/export-requests');
      if (exportResponse.ok) {
        const exports = await exportResponse.json();
        setDataExportRequests(exports);
      }
    } catch (error) {
      console.error('Failed to fetch compliance data:', error);
      toast({
        title: "Error",
        description: "Failed to fetch compliance data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async () => {
    if (!exportEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/security/privacy/data-export", {
        credentials: "include",
      });

      if (response.ok) {
        const payload = await response.json();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `surna-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "Your data export has been downloaded.",
        });
        setExportEmail("");
      } else {
        throw new Error('Failed to submit export request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit data export request",
        variant: "destructive",
      });
    }
  };

  const handleDataDeletion = async () => {
    if (!deletionEmail || !deletionReason) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/security/privacy/data-deletion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          confirmDelete: true,
          reason: deletionReason || `Requested by ${deletionEmail}`,
        }),
      });

      if (response.ok) {
        const payload = await response.json();
        toast({
          title: "Success",
          description: payload.message || "Account deletion initiated.",
        });
        setDeletionEmail("");
        setDeletionReason("");
        fetchComplianceData();
      } else {
        throw new Error('Failed to submit deletion request');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit data deletion request",
        variant: "destructive",
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'in_progress': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 bg-gradient-to-r from-transparent to-token-text"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="compliance-dashboard">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" onClick={goBack} aria-label="Go back" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setLocation("/")} aria-label="Home" data-testid="button-home">
            <Home className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold" data-testid="page-title">Security & Compliance Dashboard</h1>
            <p className="text-token-text-secondary">Monitor security events, compliance status, and manage data requests</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Label htmlFor="timeframe">Timeframe:</Label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 bg-transparent border border-border rounded-md"
            data-testid="timeframe-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Compliance Summary */}
      {complianceReport && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">GDPR Compliance</CardTitle>
              <Shield className="h-4 w-4 text-token-text" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {complianceReport.summary.gdprCompliant ? (
                  <CheckCircle className="h-5 w-5 text-token-text" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-token-text" />
                )}
                <span className="text-2xl font-bold">
                  {complianceReport.summary.gdprCompliant ? 'Compliant' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">COPPA Compliance</CardTitle>
              <UserCheck className="h-4 w-4 text-token-text" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                {complianceReport.summary.coppaCompliant ? (
                  <CheckCircle className="h-5 w-5 text-token-text" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-token-text" />
                )}
                <span className="text-2xl font-bold">
                  {complianceReport.summary.coppaCompliant ? 'Compliant' : 'Issues'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Incidents</CardTitle>
              <AlertTriangle className="h-4 w-4 text-token-text" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceReport.summary.securityIncidents}</div>
              <p className="text-xs text-token-text-muted">
                Critical incidents this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Consent</CardTitle>
              <Clock className="h-4 w-4 text-token-text" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{complianceReport.parentalConsent.pending}</div>
              <p className="text-xs text-token-text-muted">
                Parental consent requests
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="security" className="space-y-4">
        <TabsList>
          <TabsTrigger value="security" data-testid="tab-security">Security Events</TabsTrigger>
          <TabsTrigger value="data-requests" data-testid="tab-data-requests">Data Requests</TabsTrigger>
          <TabsTrigger value="parental-consent" data-testid="tab-parental-consent">Parental Consent</TabsTrigger>
          <TabsTrigger value="compliance-tools" data-testid="tab-compliance-tools">Compliance Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Events</CardTitle>
              <CardDescription>Monitor security-related activities and incidents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {securityEvents.length === 0 ? (
                  <p className="text-token-text-muted text-center py-8">
                    No security events in the selected timeframe
                  </p>
                ) : (
                  securityEvents.slice(0, 10).map((event) => (
                    <div key={event.id} className="flex items-center justify-between p-3 bg-transparent border border-border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge variant={getSeverityColor(event.severity) as any}>
                          {event.severity}
                        </Badge>
                        <div>
                          <p className="font-medium">{event.eventType.replace(/_/g, ' ')}</p>
                          <p className="text-sm text-token-text-muted">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {event.ipAddress && (
                        <span className="text-sm text-token-text-muted">
                          {event.ipAddress}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-requests" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Request Data Export (GDPR)</CardTitle>
                <CardDescription>Download all your personal data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="export-email">Email Address</Label>
                  <Input
                    id="export-email"
                    type="email"
                    placeholder="Enter your email"
                    value={exportEmail}
                    onChange={(e) => setExportEmail(e.target.value)}
                    data-testid="input-export-email"
                  />
                </div>
                <Button onClick={handleDataExport} className="w-full" data-testid="button-request-export">
                  <Download className="h-4 w-4 mr-2" />
                  Request Data Export
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Request Data Deletion (GDPR)</CardTitle>
                <CardDescription>Permanently delete your account and data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="deletion-email">Email Address</Label>
                  <Input
                    id="deletion-email"
                    type="email"
                    placeholder="Enter your email"
                    value={deletionEmail}
                    onChange={(e) => setDeletionEmail(e.target.value)}
                    data-testid="input-deletion-email"
                  />
                </div>
                <div>
                  <Label htmlFor="deletion-reason">Reason for Deletion</Label>
                  <Textarea
                    id="deletion-reason"
                    placeholder="Please provide a reason for data deletion"
                    value={deletionReason}
                    onChange={(e) => setDeletionReason(e.target.value)}
                    data-testid="textarea-deletion-reason"
                  />
                </div>
                <Button 
                  onClick={handleDataDeletion} 
                  variant="destructive" 
                  className="w-full"
                  data-testid="button-request-deletion"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Request Data Deletion
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Request Status</CardTitle>
              <CardDescription>Track your compliance requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dataExportRequests.length === 0 ? (
                  <p className="text-token-text-muted text-center py-8">
                    No data requests found
                  </p>
                ) : (
                  dataExportRequests.map((request) => (
                    <div key={request.requestId} className="flex items-center justify-between p-3 bg-transparent border border-border rounded-lg">
                      <div>
                        <p className="font-medium">Request #{request.requestId.slice(-8)}</p>
                        <p className="text-sm text-token-text-muted">
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(request.status) as any}>
                        {request.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="parental-consent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Parental Consent Management</CardTitle>
              <CardDescription>COPPA compliance for users under 18</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <UserCheck className="h-4 w-4" />
                <AlertTitle>COPPA Compliance</AlertTitle>
                <AlertDescription>
                  Users under 18 years old require verified parental consent to access certain features.
                  All consent requests are verified through secure methods including video verification.
                </AlertDescription>
              </Alert>
              
              {complianceReport && (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-transparent border border-border rounded-lg">
                      <div className="text-2xl font-bold text-token-text">
                        {complianceReport.parentalConsent.pending}
                      </div>
                      <p className="text-sm text-token-text-muted">Pending Verification</p>
                    </div>
                    <div className="text-center p-4 bg-transparent border border-border rounded-lg">
                      <div className="text-2xl font-bold text-token-text">
                        {complianceReport.parentalConsent.totalProcessed}
                      </div>
                      <p className="text-sm text-token-text-muted">Total Processed</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance-tools" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>Manage your privacy preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Data Processing Consent</p>
                    <p className="text-sm text-token-text-muted">Allow processing of personal data</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/settings")} data-testid="button-data-consent">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Communications</p>
                    <p className="text-sm text-token-text-muted">Receive marketing emails and notifications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setLocation("/settings")} data-testid="button-marketing-consent">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security Tools</CardTitle>
                <CardDescription>Additional security features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/security")} data-testid="button-audit-log">
                  <FileText className="h-4 w-4 mr-2" />
                  View Audit Log
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={() => setLocation("/security")} data-testid="button-security-settings">
                  <Lock className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
                <Button variant="outline" className="w-full justify-start" onClick={handleDataExport} data-testid="button-download-report">
                  <Download className="h-4 w-4 mr-2" />
                  Download Compliance Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}