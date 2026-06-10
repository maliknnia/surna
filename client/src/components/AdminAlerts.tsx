// Admin Alerts - Display automated alerts and notifications for administrators
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, CheckCircle, Clock, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AdminAlert {
  id: string;
  alertType: string;
  title: string;
  description: string;
  severity: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  isRead: boolean;
  createdAt: string;
}

interface AdminAlertsProps {
  showOnlyUnread?: boolean;
  maxHeight?: string;
}

export function AdminAlerts({ showOnlyUnread = false, maxHeight = "400px" }: AdminAlertsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alerts, isLoading } = useQuery<AdminAlert[]>({
    queryKey: ["/api/admin/alerts", showOnlyUnread ? false : undefined],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Mark alert as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await apiRequest("POST", `/api/admin/alerts/${alertId}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/alerts"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark alert as read.",
        variant: "destructive"
      });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-token-text" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-token-text" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-token-text" />;
      case 'low':
        return <Eye className="h-4 w-4 text-token-text" />;
      default:
        return <Clock className="h-4 w-4 text-token-text" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-transparent border border-border';
      case 'high': return 'bg-transparent border border-border';
      case 'medium': return 'bg-transparent border border-border';
      case 'low': return 'bg-transparent border border-border';
      default: return 'bg-transparent border border-border';
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    const labels: { [key: string]: string } = {
      'flagged_content_threshold': 'Content Flagged Multiple Times',
      'suspicious_activity': 'Suspicious User Activity',
      'spam_detection': 'Spam Detected',
      'system_error': 'System Error',
      'security_breach': 'Security Alert',
      'high_volume_reports': 'High Report Volume'
    };
    return labels[alertType] || alertType.replace(/_/g, ' ');
  };

  const filteredAlerts = showOnlyUnread 
    ? alerts?.filter(alert => !alert.isRead) 
    : alerts;

  const unreadCount = alerts?.filter(alert => !alert.isRead).length || 0;

  if (isLoading) {
    return (
      <Card data-testid="admin-alerts-loading">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Admin Alerts
          </CardTitle>
          <CardDescription>System notifications and automated alerts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-transparent border border-border rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="admin-alerts">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Admin Alerts
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </div>
        </CardTitle>
        <CardDescription>System notifications and automated alerts</CardDescription>
      </CardHeader>
      <CardContent>
        {!filteredAlerts || filteredAlerts.length === 0 ? (
          <div className="text-center py-8" data-testid="no-alerts">
            <CheckCircle className="h-12 w-12 text-token-text mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">All Clear!</h3>
            <p className="text-muted-foreground">
              {showOnlyUnread 
                ? "No unread alerts at the moment."
                : "No alerts to display."
              }
            </p>
          </div>
        ) : (
          <ScrollArea style={{ height: maxHeight }}>
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-lg ${
                    alert.isRead 
                      ? 'bg-background' 
                      : 'bg-transparent border border-border'
                  }`}
                  data-testid={`alert-${alert.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getSeverityIcon(alert.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{alert.title}</h4>
                          <Badge className={`text-foreground ${getSeverityColor(alert.severity)}`}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getAlertTypeLabel(alert.alertType)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>{new Date(alert.createdAt).toLocaleString()}</span>
                          {alert.relatedEntityType && alert.relatedEntityId && (
                            <span>
                              Related: {alert.relatedEntityType} #{alert.relatedEntityId}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!alert.isRead && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => markAsReadMutation.mutate(alert.id)}
                          disabled={markAsReadMutation.isPending}
                          data-testid={`button-mark-read-${alert.id}`}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}