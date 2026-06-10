import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart as RechartsBarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

interface BarChartProps {
  title: string;
  data: any[];
  xKey: string;
  bars: {
    key: string;
    label: string;
    color: string;
  }[];
  loading?: boolean;
  height?: number;
  horizontal?: boolean;
}

export function BarChart({ title, data, xKey, bars, loading, height = 300, horizontal = false }: BarChartProps) {
  if (loading) {
    return (
      <Card data-testid={`bar-chart-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ height }} className="bg-muted animate-pulse rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`bar-chart-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-gray-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div className="flex items-center justify-center text-muted-foreground" style={{ height }} data-testid="chart-empty">
            No data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <RechartsBarChart data={data} layout={horizontal ? "vertical" : "horizontal"}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              {horizontal ? (
                <>
                  <XAxis 
                    type="number"
                    className="text-xs text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    type="category"
                    dataKey={xKey}
                    className="text-xs text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                </>
              ) : (
                <>
                  <XAxis 
                    dataKey={xKey} 
                    className="text-xs text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                  <YAxis 
                    className="text-xs text-gray-600 dark:text-gray-400"
                    tick={{ fill: 'currentColor' }}
                  />
                </>
              )}
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  color: 'hsl(var(--foreground))'
                }}
              />
              <Legend />
              {bars.map((bar) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  name={bar.label}
                  fill={bar.color}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
