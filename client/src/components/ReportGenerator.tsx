// Report Generator - Generate and download administrative reports
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, FileText, TrendingUp } from "lucide-react";
import { format as formatDate } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  users: {
    totalUsers: number;
    newUsers: number;
  };
  content: {
    totalPosts: number;
    flaggedPosts: number;
  };
  moderation: {
    totalReports: number;
    resolvedReports: number;
    avgResponseTime: number;
  };
  generatedAt: string;
}

export function ReportGenerator() {
  const { toast } = useToast();
  const [reportType, setReportType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [generatedReport, setGeneratedReport] = useState<ReportData | null>(null);

  const generateReportMutation = useMutation({
    mutationFn: async (params: { startDate: string; endDate: string }) => {
      const qs = new URLSearchParams({ startDate: params.startDate, endDate: params.endDate });
      const response = await apiRequest("GET", `/api/admin/reports?${qs.toString()}`);
      return (await response.json()) as ReportData;
    },
    onSuccess: (data) => {
      setGeneratedReport(data);
      toast({
        title: "Report Generated",
        description: "Your administrative report has been generated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleGenerateReport = () => {
    if (!startDate || !endDate) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates.",
        variant: "destructive"
      });
      return;
    }

    if (startDate >= endDate) {
      toast({
        title: "Invalid Date Range",
        description: "End date must be after start date.",
        variant: "destructive"
      });
      return;
    }

    generateReportMutation.mutate({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  };

  const downloadReport = (format: 'json' | 'csv') => {
    if (!generatedReport) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(generatedReport, null, 2);
      filename = `admin-report-${formatDate(new Date(generatedReport.period.startDate), 'yyyy-MM-dd')}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const csvData = [
        ['Metric', 'Value'],
        ['Report Period', `${generatedReport.period.startDate} to ${generatedReport.period.endDate}`],
        ['Total Users', generatedReport.users.totalUsers.toString()],
        ['New Users', generatedReport.users.newUsers.toString()],
        ['Total Posts', generatedReport.content.totalPosts.toString()],
        ['Flagged Posts', generatedReport.content.flaggedPosts.toString()],
        ['Total Reports', generatedReport.moderation.totalReports.toString()],
        ['Resolved Reports', generatedReport.moderation.resolvedReports.toString()],
        ['Avg Response Time (hours)', generatedReport.moderation.avgResponseTime.toString()]
      ];
      
      content = csvData.map(row => row.join(',')).join('\n');
      filename = `admin-report-${formatDate(new Date(generatedReport.period.startDate), 'yyyy-MM-dd')}.csv`;
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" data-testid="report-generator">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Administrative Report
          </CardTitle>
          <CardDescription>
            Generate comprehensive reports for platform management and compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger data-testid="select-report-type">
                  <SelectValue placeholder="Select report type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="moderation">Moderation Report</SelectItem>
                  <SelectItem value="user-activity">User Activity Report</SelectItem>
                  <SelectItem value="content-analysis">Content Analysis Report</SelectItem>
                  <SelectItem value="compliance">Compliance Report</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-start-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? formatDate(startDate, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left font-normal"
                      data-testid="button-end-date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? formatDate(endDate, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={generateReportMutation.isPending || !reportType || !startDate || !endDate}
            className="w-full"
            data-testid="button-generate-report"
          >
            {generateReportMutation.isPending ? (
              <>
                <TrendingUp className="mr-2 h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {generatedReport && (
        <Card data-testid="generated-report">
          <CardHeader>
            <CardTitle>Generated Report</CardTitle>
            <CardDescription>
              Report for {formatDate(new Date(generatedReport.period.startDate), "PPP")} to{" "}
              {formatDate(new Date(generatedReport.period.endDate), "PPP")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">User Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Users:</span>
                    <span className="font-medium">{generatedReport.users.totalUsers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">New Users:</span>
                    <span className="font-medium">{generatedReport.users.newUsers}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Content Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Posts:</span>
                    <span className="font-medium">{generatedReport.content.totalPosts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Flagged Posts:</span>
                    <span className="font-medium">{generatedReport.content.flaggedPosts}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Moderation Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Total Reports:</span>
                    <span className="font-medium">{generatedReport.moderation.totalReports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Resolved:</span>
                    <span className="font-medium">{generatedReport.moderation.resolvedReports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Avg Response Time:</span>
                    <span className="font-medium">{Math.round(generatedReport.moderation.avgResponseTime)}h</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => downloadReport('json')}
                data-testid="button-download-json"
              >
                <Download className="mr-2 h-4 w-4" />
                Download JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadReport('csv')}
                data-testid="button-download-csv"
              >
                <Download className="mr-2 h-4 w-4" />
                Download CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}