"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/lib/utils";

export interface ProgressDonutSegment {
  name: string;
  value: number;
  color: string;
}

const DEFAULT_COLORS = [
  "hsl(var(--success))",   // completed
  "hsl(var(--warning))",   // started
  "hsl(var(--muted-foreground))", // not started
];

export interface ProgressDonutProps {
  completed: number;
  started: number;
  notStarted: number;
  title?: string;
  className?: string;
  colors?: [string, string, string];
}

export function ProgressDonut({
  completed,
  started,
  notStarted,
  title = "Прогресс",
  className,
  colors = DEFAULT_COLORS,
}: ProgressDonutProps) {
  const data: ProgressDonutSegment[] = [
    { name: "Выполнено", value: completed, color: colors[0] },
    { name: "Начато", value: started, color: colors[1] },
    { name: "Не начато", value: notStarted, color: colors[2] },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    data.push({ name: "Нет данных", value: 1, color: colors[2] });
  }

  return (
    <Card className={cn(className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [value, ""]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--card-foreground))" }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
