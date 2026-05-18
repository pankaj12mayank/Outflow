'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemOwnerAuth } from '@/hooks/useSystemOwnerAuth';

interface SystemHealth {
  _id: string;
  component: string;
  status: string;
  is_online: boolean;
  cpu_usage_percent?: number;
  ram_usage_percent?: number;
  disk_usage_percent?: number;
  response_time_ms?: number;
  database_size_mb?: number;
  last_error?: string;
  last_check: string;
}

interface Alert {
  _id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  component?: string;
  triggered_at: string;
  acknowledged_by?: string;
  resolved_by?: string;
}

interface LogEntry {
  _id: string;
  level: string;
  category: string;
  message: string;
  details?: any;
  source?: string;
  user_id?: string;
  organization_id?: string;
  endpoint?: string;
  method?: string;
  status_code?: number;
  response_time_ms?: number;
  timestamp: string;
}

interface Metrics {
  period_hours: number;
  total_requests: number;
  failed_requests: number;
  success_rate: number;
  avg_response_time_ms: number;
  log_counts: any;
}

const statusColors: Record<string, string> = {
  healthy: 'bg-green-500',
  degraded: 'bg-yellow-500',
  critical: 'bg-red-500',
  offline: 'bg-gray-500',
  unknown: 'bg-gray-400'
};

const severityColors: Record<string, string> = {
  low: 'bg-blue-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500'
};

const levelColors: Record<string, string> = {
  debug: 'text-gray-500',
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  error: 'text-red-500',
  critical: 'text-red-700 font-bold'
};

export default function MonitoringDashboard() {
  const { token } = useSystemOwnerAuth();
  const [health, setHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [alertCounts, setAlertCounts] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [logFilter, setLogFilter] = useState({
    level: '',
    category: '',
    search: '',
    limit: 50
  });

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [healthRes, alertsRes, logsRes, metricsRes, alertCountsRes] = await Promise.all([
      fetch('/api/v1/monitoring/health', { headers }),
      fetch('/api/v1/monitoring/alerts?status=active', { headers }),
      fetch(`/api/v1/monitoring/logs?limit=${logFilter.limit}&level=${logFilter.level || ''}&category=${logFilter.category || ''}`, { headers }),
      fetch('/api/v1/monitoring/metrics?hours=24', { headers }),
      fetch('/api/v1/monitoring/alerts/counts', { headers })
    ]);
    
    setHealth(await healthRes.json());
    setAlerts(await alertsRes.json());
    setLogs(await logsRes.json());
    setMetrics(await metricsRes.json());
    setAlertCounts(await alertCountsRes.json());
  };

  useEffect(() => {
    if (token) fetchData().finally(() => setLoading(false));
  }, [token]);

  const handleCheckHealth = async () => {
    await fetch('/api/v1/monitoring/health/check', { 
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const handleAcknowledge = async (alertId: string) => {
    await fetch(`/api/v1/monitoring/alerts/${alertId}/acknowledge?user_id=admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const handleResolve = async (alertId: string) => {
    await fetch(`/api/v1/monitoring/alerts/${alertId}/resolve?user_id=admin`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchData();
  };

  const componentLabels: Record<string, string> = {
    backend: 'Backend API',
    frontend: 'Frontend App',
    mongodb: 'MongoDB',
    ollama: 'Ollama AI',
    redis: 'Redis Cache',
    worker: 'Worker Service',
    scraper: 'Scraper Service',
    smtp: 'SMTP Service',
    billing: 'Billing Service',
    api_gateway: 'API Gateway'
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Monitoring Dashboard</h1>
        <div className="space-x-2">
          <Button onClick={handleCheckHealth} variant="outline">Refresh Health</Button>
          <Button onClick={fetchData}>Refresh All</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Overall Status</div>
            <div className={`text-2xl font-bold ${
              health?.overall_status === 'healthy' ? 'text-green-600' : 
              health?.overall_status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {health?.overall_status?.toUpperCase() || 'UNKNOWN'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Total Requests (24h)</div>
            <div className="text-2xl font-bold">{metrics?.total_requests?.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className={`text-2xl font-bold ${(metrics?.success_rate || 0) > 95 ? 'text-green-600' : 'text-yellow-600'}`}>
              {metrics?.success_rate || 0}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-gray-500">Active Alerts</div>
            <div className="text-2xl font-bold text-red-600">{alertCounts?.by_status?.active || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="health">
        <TabsList>
          <TabsTrigger value="health">System Health</TabsTrigger>
          <TabsTrigger value="alerts">Alerts ({alertCounts?.by_status?.active || 0})</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
        </TabsList>

        <TabsContent value="health">
          <div className="grid grid-cols-3 gap-4">
            {(health?.components || []).map((comp: SystemHealth) => (
              <Card key={comp._id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{componentLabels[comp.component] || comp.component}</h3>
                    <Badge className={statusColors[comp.status]}>{comp.status}</Badge>
                  </div>
                  {comp.cpu_usage_percent !== undefined && (
                    <div className="space-y-1 text-sm">
                      <div>CPU: {comp.cpu_usage_percent?.toFixed(1)}%</div>
                      <div>RAM: {comp.ram_usage_percent?.toFixed(1)}%</div>
                      <div>Disk: {comp.disk_usage_percent?.toFixed(1)}%</div>
                    </div>
                  )}
                  {comp.response_time_ms !== undefined && (
                    <div className="text-sm">Response: {comp.response_time_ms}ms</div>
                  )}
                  {comp.database_size_mb !== undefined && (
                    <div className="text-sm">DB Size: {comp.database_size_mb?.toFixed(1)} MB</div>
                  )}
                  {comp.last_error && (
                    <div className="text-xs text-red-500 mt-1">Error: {comp.last_error}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-2">
                    Last check: {comp.last_check ? new Date(comp.last_check).toLocaleTimeString() : 'N/A'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card><CardContent className="p-4 text-center text-gray-500">No active alerts</CardContent></Card>
            ) : (
              alerts.map(alert => (
                <Card key={alert._id} className={alert.severity === 'critical' ? 'border-red-500' : ''}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{alert.title}</h3>
                          <Badge className={severityColors[alert.severity]}>{alert.severity}</Badge>
                          <Badge variant="outline">{alert.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-600">{alert.description}</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Triggered: {new Date(alert.triggered_at).toLocaleString()}
                          {alert.component && ` | Component: ${componentLabels[alert.component] || alert.component}`}
                        </div>
                      </div>
                      <div className="space-x-2">
                        {alert.status === 'active' && (
                          <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert._id)}>Acknowledge</Button>
                        )}
                        {alert.status === 'acknowledged' && (
                          <Button size="sm" onClick={() => handleResolve(alert._id)}>Resolve</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Platform Logs</CardTitle>
              <div className="flex gap-2">
                <Select value={logFilter.level} onValueChange={v => { setLogFilter({...logFilter, level: v}); fetchData(); }}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Level" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={logFilter.category} onValueChange={v => { setLogFilter({...logFilter, category: v}); fetchData(); }}>
                  <SelectTrigger className="w-32"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All</SelectItem>
                    <SelectItem value="auth">Auth</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="scraping">Scraping</SelectItem>
                    <SelectItem value="ai">AI</SelectItem>
                    <SelectItem value="smtp">SMTP</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Search..." className="w-48" value={logFilter.search} onChange={e => setLogFilter({...logFilter, search: e.target.value})} />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map(log => (
                    <TableRow key={log._id}>
                      <TableCell className="text-xs">{new Date(log.timestamp).toLocaleTimeString()}</TableCell>
                      <TableCell><span className={levelColors[log.level]}>{log.level}</span></TableCell>
                      <TableCell><Badge variant="outline">{log.category}</Badge></TableCell>
                      <TableCell className="max-w-md truncate">{log.message}</TableCell>
                      <TableCell className="text-xs">{log.source || '-'}</TableCell>
                      <TableCell>{log.status_code ? <Badge variant={log.status_code < 400 ? 'default' : 'destructive'}>{log.status_code}</Badge> : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {logs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No logs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>API Performance</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Total Requests</span>
                  <span className="font-bold">{metrics?.total_requests?.toLocaleString() || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Failed Requests</span>
                  <span className="font-bold text-red-500">{metrics?.failed_requests || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span>Success Rate</span>
                  <span className="font-bold text-green-500">{metrics?.success_rate || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Avg Response Time</span>
                  <span className="font-bold">{metrics?.avg_response_time_ms || 0}ms</span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Log Distribution (24h)</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {metrics?.log_counts?.by_level && Object.entries(metrics.log_counts.by_level).map(([level, count]: any) => (
                  <div key={level} className="flex justify-between">
                    <span className={levelColors[level]}>{level}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}