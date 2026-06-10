import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadialBar, RadialBarChart, ResponsiveContainer, Legend } from "recharts";

interface RadialProgressProps {
  title: string;
  value: number;
  max: number;
  label: string;
  color?: string;
  loading?: boolean;
}

export function RadialProgress({ title, value, max, label, color = "#000000", loading }: RadialProgressProps) {
  const percentage = Math.round((value / max) * 100);
  const data = [
    {
      name: label,
      value: percentage,
      fill: color,
    },
  ];

  if (loading) {
    return (
      <Card data-testid={`radial-progress-${title.toLowerCase().replace(/\s+/g, '-')}-loading`}>
        <CardHeader>
          <CardTitle className="text-center">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 bg-muted animate-pulse rounded-full mx-auto w-48" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`radial-progress-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader>
        <CardTitle className="text-center text-gray-900 dark:text-gray-100">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <ResponsiveContainer width="100%" height={250}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              data={data}
              startAngle={90}
              endAngle={-270}
            >
              <RadialBar
                background={{ fill: 'hsl(var(--muted))' }}
                dataKey="value"
                cornerRadius={10}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-gray-900 dark:text-gray-100" data-testid={`radial-value-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {percentage}%
            </div>
            <div className="text-sm text-muted-foreground mt-1" data-testid={`radial-label-${title.toLowerCase().replace(/\s+/g, '-')}`}>
              {value} / {max}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
