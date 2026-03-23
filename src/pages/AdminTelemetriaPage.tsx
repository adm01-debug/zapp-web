import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, AlertTriangle, Clock, Database, RefreshCw, Zap, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TelemetryCharts } from "@/components/admin/telemetry/TelemetryCharts";
import { toast } from "sonner";

interface TelemetryRow {
  id: string;
  operation: string;
  table_name: string | null;
  rpc_name: string | null;
  duration_ms: number;
  record_count: number | null;
  query_limit: number | null;
  query_offset: number | null;
  count_mode: string | null;
  severity: string;
  error_message: string | null;
  user_id: string | null;
  created_at: string;
}

type SeverityFilter = "all" | "slow" | "very_slow" | "error";
type TimeFilter = "1h" | "6h" | "24h" | "7d";

export default function AdminTelemetriaPage() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("24h");

  const getTimeThreshold = () => {
    const now = new Date();
    switch (timeFilter) {
      case "1h": return new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      case "6h": return new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  };

  const { data: rows = [], isLoading, refetch, isRefetching } = useQuery<TelemetryRow[]>({
    queryKey: ["query-telemetry", severityFilter, timeFilter],
    queryFn: async () => {
      let query = supabase
        .from("query_telemetry" as any)
        .select("*")
        .gte("created_at", getTimeThreshold())
        .order("created_at", { ascending: false })
        .limit(200);

      if (severityFilter !== "all") {
        query = query.eq("severity", severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown as TelemetryRow[]) || [];
    },
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const handleCleanup = async () => {
    const threshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase
      .from("query_telemetry" as any)
      .delete()
      .lt("created_at", threshold);
    if (error) {
      toast.error("Erro ao limpar dados antigos");
    } else {
      toast.success("Dados com mais de 7 dias removidos");
      refetch();
    }
  };

  const verySlow = rows.filter(r => r.severity === "very_slow").length;
  const slow = rows.filter(r => r.severity === "slow").length;
  const errors = rows.filter(r => r.severity === "error").length;
  const avgDuration = rows.length > 0 ? Math.round(rows.reduce((s, r) => s + r.duration_ms, 0) / rows.length) : 0;

  const tableStats = new Map<string, { count: number; totalMs: number; maxMs: number }>();
  for (const r of rows) {
    const key = r.rpc_name || r.table_name || "unknown";
    const prev = tableStats.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
    tableStats.set(key, {
      count: prev.count + 1,
      totalMs: prev.totalMs + r.duration_ms,
      maxMs: Math.max(prev.maxMs, r.duration_ms),
    });
  }
  const topOffenders = [...tableStats.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8);

  const formatDuration = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
    });
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "very_slow":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">🔴 Muito Lenta</Badge>;
      case "slow":
        return <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px]">🟡 Lenta</Badge>;
      case "error":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[10px]">❌ Erro</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{severity}</Badge>;
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Telemetria de Queries</h1>
              <p className="text-sm text-muted-foreground">Monitoramento de performance do banco externo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleCleanup}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar +7d
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{verySlow}</p>
                <p className="text-[11px] text-muted-foreground">Muito Lentas (&gt;8s)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{slow}</p>
                <p className="text-[11px] text-muted-foreground">Lentas (&gt;3s)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Zap className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{errors}</p>
                <p className="text-[11px] text-muted-foreground">Erros</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatDuration(avgDuration)}</p>
                <p className="text-[11px] text-muted-foreground">Média de duração</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {topOffenders.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4" />
                Tabelas Mais Problemáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {topOffenders.map(([name, stats]) => (
                  <div key={name} className="p-3 rounded-lg border border-border/50 bg-muted/30">
                    <p className="font-mono text-sm font-medium truncate" title={name}>{name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">{stats.count}× alertas</span>
                      <span className="text-xs text-destructive">max {formatDuration(stats.maxMs)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      média: {formatDuration(Math.round(stats.totalMs / stats.count))}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <TelemetryCharts rows={rows} timeFilter={timeFilter} />

        <div className="flex items-center gap-3">
          <Select value={severityFilter} onValueChange={(v) => setSeverityFilter(v as SeverityFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="slow">🟡 Lentas</SelectItem>
              <SelectItem value="very_slow">🔴 Muito Lentas</SelectItem>
              <SelectItem value="error">❌ Erros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="6h">Últimas 6h</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground ml-auto">
            {rows.length} registros · auto-refresh 30s
          </span>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhuma query lenta registrada</p>
                <p className="text-sm mt-1">Isso é bom! O sistema está performando bem.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Quando</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Operação</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Tabela/RPC</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Duração</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Records</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Limit</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Offset</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Count</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Severidade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                          {formatTime(row.created_at)}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-[10px] font-mono">
                            {row.operation}
                          </Badge>
                        </td>
                        <td className="p-3 font-mono text-xs font-medium">
                          {row.rpc_name || row.table_name || "-"}
                        </td>
                        <td className="p-3 text-right font-mono font-bold tabular-nums">
                          <span className={row.duration_ms >= 8000 ? "text-destructive" : row.duration_ms >= 3000 ? "text-warning" : ""}>
                            {formatDuration(row.duration_ms)}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums">
                          {row.record_count ?? "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {row.query_limit ?? "-"}
                        </td>
                        <td className="p-3 text-right font-mono text-xs tabular-nums text-muted-foreground">
                          {row.query_offset ?? "-"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {row.count_mode || "-"}
                        </td>
                        <td className="p-3">
                          {getSeverityBadge(row.severity)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
