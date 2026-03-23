import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { Activity, TrendingUp } from "lucide-react";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  severity: string;
  created_at: string;
}

interface TelemetryChartsProps {
  rows: TelemetryRow[];
  timeFilter: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  slow: "hsl(var(--warning, 45 93% 47%))",
  very_slow: "hsl(var(--destructive))",
  error: "hsl(0 84% 60%)",
  normal: "hsl(var(--primary))",
};

export function TelemetryCharts({ rows, timeFilter }: TelemetryChartsProps) {
  // Timeline: group by time bucket
  const bucketMs = timeFilter === "1h" ? 5 * 60_000
    : timeFilter === "6h" ? 30 * 60_000
    : timeFilter === "24h" ? 60 * 60_000
    : 6 * 60 * 60_000;

  const timelineMap = new Map<number, { bucket: number; count: number; avgMs: number; totalMs: number }>();
  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    const bucket = Math.floor(t / bucketMs) * bucketMs;
    const prev = timelineMap.get(bucket) || { bucket, count: 0, avgMs: 0, totalMs: 0 };
    prev.count += 1;
    prev.totalMs += r.duration_ms;
    prev.avgMs = Math.round(prev.totalMs / prev.count);
    timelineMap.set(bucket, prev);
  }
  const timelineData = [...timelineMap.values()]
    .sort((a, b) => a.bucket - b.bucket)
    .map(d => ({
      ...d,
      time: new Date(d.bucket).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    }));

  // Severity distribution
  const severityCounts = rows.reduce((acc, r) => {
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pieData = Object.entries(severityCounts).map(([name, value]) => ({ name, value }));

  // Top tables bar chart
  const tableMap = new Map<string, number>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    tableMap.set(key, (tableMap.get(key) || 0) + 1);
  }
  const barData = [...tableMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name, count }));

  if (rows.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Timeline */}
      <Card className="md:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Alertas ao Longo do Tempo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timelineData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <YAxis tick={{ fontSize: 10 }} className="fill-muted-foreground" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Alertas" />
              <Line type="monotone" dataKey="avgMs" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} name="Média ms" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Severity Pie */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Por Severidade
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={SEVERITY_COLORS[entry.name] || "hsl(var(--muted-foreground))"} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Tables Bar */}
      {barData.length > 0 && (
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Top Tabelas com Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Alertas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
