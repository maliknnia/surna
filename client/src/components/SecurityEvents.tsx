import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { 
  AlertTriangle, 
  Shield, 
  Lock, 
  Eye, 
  Calendar, 
  MapPin, 
  Monitor,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface SecurityEvent {
  id: string;
  eventType: string;
  threatLevel: "low" | "medium" | "high" | "critical";
  description: string;
  ipAddress: string;
  timestamp: string;
  resolved: boolean;
}

interface SecurityStatus {
  overallScore: number;
  activeThreats: number;
  lastSecurityCheck: string;
  twoFactorEnabled: boolean;
  recentLoginAttempts: number;
  suspiciousActivities: number;
}

export default function SecurityEvents() {
  const [timeFilter, setTimeFilter] = useState("7d");
  const [threatFilter, setThreatFilter] = useState("all");

  // Get security events
  const { data: securityEvents = [], isLoading: eventsLoading } = useQuery<SecurityEvent[]>({
    queryKey: ["security-events", timeFilter, threatFilter],
    queryFn: async () => {
      const res = await fetch("/api/security/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load security events");
      const data = await res.json();
      return (data.events ?? data) as SecurityEvent[];
    },
  });

  // Get security status
  const { data: securityStatus, isLoading: statusLoading } = useQuery<SecurityStatus>({
    queryKey: ["/api/security/status"],
  });

  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case "low": return "bg-background text-token-text ";
      case "medium": return "bg-transparent border border-border text-token-text ";
      case "high": return "bg-transparent border border-border text-token-text ";
      case "critical": return "bg-background text-token-text ";
      default: return "bg-transparent border border-border text-token-text ";
    }
  };

  const getThreatLevelIcon = (level: string) => {
    switch (level) {
      case "low": return <CheckCircle className="h-4 w-4" />;
      case "medium": return <AlertCircle className="h-4 w-4" />;
      case "high": return <AlertTriangle className="h-4 w-4" />;
      case "critical": return <XCircle className="h-4 w-4" />;
      default: return <Shield className="h-4 w-4" />;
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case "login_attempt": return <Lock className="h-4 w-4" />;
      case "password_change": return <Shield className="h-4 w-4" />;
      case "suspicious_activity": return <AlertTriangle className="h-4 w-4" />;
      case "data_access": return <Eye className="h-4 w-4" />;
      case "two_factor_setup": return <Shield className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  const formatEventType = (eventType: string) => {
    return eventType.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (eventsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 bg-gradient-to-r from-transparent to-[#2a2535]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Security Status Overview */}
      {securityStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-transparent border border-border rounded-lg">
                <div className="text-2xl font-bold text-token-text">{securityStatus.overallScore}/100</div>
                <div className="text-sm text-token-text opacity-80">Security Score</div>
              </div>
              <div className="text-center p-4 bg-transparent border border-border rounded-lg">
                <div className="text-2xl font-bold text-token-text">{securityStatus.activeThreats}</div>
                <div className="text-sm text-token-text opacity-80">Active Threats</div>
              </div>
              <div className="text-center p-4 bg-transparent border border-border rounded-lg">
                <div className="text-2xl font-bold text-token-text">
                  {securityStatus.twoFactorEnabled ? "ON" : "OFF"}
                </div>
                <div className="text-sm text-token-text opacity-80">Two-Factor Auth</div>
              </div>
            </div>
            
            {securityStatus.lastSecurityCheck && (
              <p className="text-sm text-token-text opacity-80 mt-4">
                Last security check: {new Date(securityStatus.lastSecurityCheck).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger data-testid="select-time-filter">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24 hours</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <Select value={threatFilter} onValueChange={setThreatFilter}>
            <SelectTrigger data-testid="select-threat-filter">
              <SelectValue placeholder="Threat level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All threats</SelectItem>
              <SelectItem value="critical">Critical only</SelectItem>
              <SelectItem value="high">High & Critical</SelectItem>
              <SelectItem value="medium">Medium & above</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Security Events List */}
      <Card>
        <CardHeader>
          <CardTitle>Security Events</CardTitle>
          <CardDescription>
            Recent security-related activities on your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-token-text opacity-60 mb-4" />
              <p className="text-token-text opacity-80">No security events found for the selected period.</p>
              <p className="text-sm text-token-text opacity-60 mt-1">
                This is good news - your account has been secure!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {securityEvents.map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-4 p-4 bg-transparent border border-border rounded-lg hover:bg-background transition-colors"
                  data-testid={`security-event-${event.id}`}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getEventTypeIcon(event.eventType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium">{formatEventType(event.eventType)}</h4>
                        <p className="text-sm text-token-text opacity-80 mt-1">{event.description}</p>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getThreatLevelColor(event.threatLevel)}
                      >
                        <span className="flex items-center gap-1">
                          {getThreatLevelIcon(event.threatLevel)}
                          {event.threatLevel.toUpperCase()}
                        </span>
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-2 text-xs text-token-text opacity-60">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.timestamp).toLocaleString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.ipAddress}
                      </div>
                      {event.resolved && (
                        <div className="flex items-center gap-1 text-token-text">
                          <CheckCircle className="h-3 w-3" />
                          Resolved
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      {securityStatus && securityStatus.overallScore < 80 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Security Recommendations:</p>
              <ul className="text-sm space-y-1">
                {!securityStatus.twoFactorEnabled && (
                  <li>• Enable two-factor authentication for better security</li>
                )}
                {securityStatus.recentLoginAttempts > 5 && (
                  <li>• Consider changing your password due to recent login attempts</li>
                )}
                {securityStatus.suspiciousActivities > 0 && (
                  <li>• Review recent account activity for any unauthorized access</li>
                )}
                <li>• Keep your password strong and unique</li>
                <li>• Regularly review your privacy settings</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}