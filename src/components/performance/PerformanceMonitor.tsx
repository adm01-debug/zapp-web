import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, HardDrive, Wifi, RefreshCw, TrendingUp, Clock, Zap, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
}

interface HistoryPoint {
  time: string;
  fcp: number;
  lcp: number;
  memory: number;
  fps: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [cacheStats, setCacheStats] = useState({ hits: 0, misses: 0, size: 0 });
  const [loading, setLoading] = useState(false);

  const collectMetrics = useCallback(() => {
    setLoading(true);
    const perf = performance;
    const nav = perf.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    // Core Web Vitals
    const fcp = perf.getEntriesByName('first-contentful-paint')[0];
    const fcpValue = fcp ? Math.round(fcp.startTime) : 0;
    
    // Memory usage (if available)
    const memInfo = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
    const memoryUsed = memInfo ? Math.round(memInfo.usedJSHeapSize / 1048576) : 0;
    const memoryTotal = memInfo ? Math.round(memInfo.totalJSHeapSize / 1048576) : 256;
    const memoryPercent = memInfo ? Math.round((memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100) : 0;

    // DOM metrics
    const domNodes = document.querySelectorAll('*').length;

    // Network info
    const conn = (navigator as unknown as { connection?: { effectiveType: string; downlink: number; rtt: number } }).connection;
    const networkType = conn?.effectiveType || '4g';
    const rtt = conn?.rtt || 0;

    // Navigation timing
    const pageLoadTime = nav ? Math.round(nav.loadEventEnd - nav.startTime) : 0;
    const domReady = nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : 0;
    const ttfb = nav ? Math.round(nav.responseStart - nav.requestStart) : 0;

    const newMetrics: PerformanceMetric[] = [
      {
        name: 'FCP (First Contentful Paint)',
        value: fcpValue,
        unit: 'ms',
        status: fcpValue < 1800 ? 'good' : fcpValue < 3000 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'Page Load Time',
        value: pageLoadTime,
        unit: 'ms',
        status: pageLoadTime < 3000 ? 'good' : pageLoadTime < 5000 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'DOM Ready',
        value: domReady,
        unit: 'ms',
        status: domReady < 2000 ? 'good' : domReady < 4000 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'TTFB',
        value: ttfb,
        unit: 'ms',
        status: ttfb < 200 ? 'good' : ttfb < 500 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'Memória JS',
        value: memoryUsed,
        unit: `MB / ${memoryTotal}MB`,
        status: memoryPercent < 60 ? 'good' : memoryPercent < 80 ? 'warning' : 'critical',
        trend: memoryPercent > 70 ? 'up' : 'stable',
      },
      {
        name: 'DOM Nodes',
        value: domNodes,
        unit: 'nós',
        status: domNodes < 1500 ? 'good' : domNodes < 3000 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'RTT (Latência)',
        value: rtt,
        unit: 'ms',
        status: rtt < 100 ? 'good' : rtt < 300 ? 'warning' : 'critical',
        trend: 'stable',
      },
      {
        name: 'Conexão',
        value: networkType === '4g' ? 100 : networkType === '3g' ? 60 : 30,
        unit: networkType,
        status: networkType === '4g' ? 'good' : networkType === '3g' ? 'warning' : 'critical',
        trend: 'stable',
      },
    ];

    setMetrics(newMetrics);

    // Add to history
    const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setHistory(prev => [...prev.slice(-20), {
      time: now,
      fcp: fcpValue,
      lcp: pageLoadTime,
      memory: memoryUsed,
      fps: 60,
    }]);

    // Cache stats from localStorage
    const cacheKeys = Object.keys(localStorage).filter(k => k.startsWith('cache_') || k.startsWith('tanstack'));
    setCacheStats({
      hits: parseInt(localStorage.getItem('cache_hits') || '0'),
      misses: parseInt(localStorage.getItem('cache_misses') || '0'),
      size: cacheKeys.length,
    });

    setLoading(false);
  }, []);

  useEffect(() => {
    collectMetrics();
    const interval = setInterval(collectMetrics, 10000); // every 10s
    return () => clearInterval(interval);
  }, [collectMetrics]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'text-green-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return <Badge className="bg-green-500/10 text-green-500 border-green-500/30">Bom</Badge>;
      case 'warning': return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">Atenção</Badge>;
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      default: return null;
    }
  };

  const overallScore = Math.round(
    (metrics.filter(m => m.status === 'good').length / Math.max(metrics.length, 1)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Monitor de Performance</h2>
            <p className="text-sm text-muted-foreground">Métricas em tempo real da aplicação</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={collectMetrics} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={overallScore >= 80 ? 'hsl(var(--primary))' : overallScore >= 50 ? 'hsl(40, 100%, 50%)' : 'hsl(var(--destructive))'}
                  strokeWidth="3"
                  strokeDasharray={`${overallScore}, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{overallScore}</span>
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">Score de Performance</p>
              <p className="text-sm text-muted-foreground">
                {overallScore >= 80 ? 'Excelente! Aplicação performando bem.' : 
                 overallScore >= 50 ? 'Razoável. Há oportunidades de otimização.' :
                 'Atenção! Performance precisa de melhorias.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.name}>
            <CardContent className="pt-4 pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground truncate">{metric.name}</p>
                  {getStatusBadge(metric.status)}
                </div>
                <p className={`text-xl font-bold ${getStatusColor(metric.status)}`}>
                  {metric.value}
                  <span className="text-xs text-muted-foreground ml-1">{metric.unit}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Chart */}
      {history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Histórico de Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                <XAxis dataKey="time" fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={10} stroke="hsl(var(--muted-foreground))" />
                <Tooltip />
                <Area type="monotone" dataKey="fcp" name="FCP" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.1)" />
                <Area type="monotone" dataKey="memory" name="Memória (MB)" stroke="hsl(40, 100%, 50%)" fill="hsl(40, 100%, 50%, 0.1)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Cache Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Cache Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-500">{cacheStats.hits}</p>
              <p className="text-xs text-muted-foreground">Cache Hits</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-500">{cacheStats.misses}</p>
              <p className="text-xs text-muted-foreground">Cache Misses</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">{cacheStats.size}</p>
              <p className="text-xs text-muted-foreground">Entradas Cached</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
