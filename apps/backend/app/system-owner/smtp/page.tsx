'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSystemOwnerAuth } from '@/hooks/useSystemOwnerAuth';

interface SmtpConfig {
  _id: string;
  name: string;
  provider: string;
  host: string;
  port: number;
  from_email: string;
  from_name: string;
  is_default: boolean;
  is_active: boolean;
  assigned_plans: string[];
  daily_limit: number;
  monthly_limit: number;
  daily_sent: number;
  monthly_sent: number;
  health_status: string;
  created_at: string;
}

interface SmtpAnalytics {
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_failed: number;
  delivery_rate: number;
  bounce_rate: number;
  failed_rate: number;
  daily_breakdown: { date: string; sent: number }[];
}

interface SmtpHealth {
  config_id: string;
  config_name: string;
  provider: string;
  status: string;
  success_rate?: number;
  sent_last_hour?: number;
  failed_last_hour?: number;
}

export default function SmtpDashboard() {
  const { token } = useSystemOwnerAuth();
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [analytics, setAnalytics] = useState<SmtpAnalytics | null>(null);
  const [healthData, setHealthData] = useState<SmtpHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    provider: 'gmail',
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    is_default: false,
    assigned_plans: [] as string[],
    daily_limit: 1000,
    monthly_limit: 30000
  });

  const fetchConfigs = async () => {
    const res = await fetch('/api/v1/smtp/configs', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setConfigs(data);
  };

  const fetchAnalytics = async () => {
    const res = await fetch('/api/v1/smtp/analytics?days=30', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setAnalytics(data);
  };

  const fetchHealth = async () => {
    const res = await fetch('/api/v1/smtp/health', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    setHealthData(data);
  };

  useEffect(() => {
    if (token) {
      Promise.all([fetchConfigs(), fetchAnalytics(), fetchHealth()]).finally(() => setLoading(false));
    }
  }, [token]);

  const handleSubmit = async () => {
    await fetch('/api/v1/smtp/configs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    setShowDialog(false);
    setFormData({ name: '', provider: 'gmail', host: '', port: 587, username: '', password: '', from_email: '', from_name: '', is_default: false, assigned_plans: [], daily_limit: 1000, monthly_limit: 30000 });
    fetchConfigs();
    fetchHealth();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this SMTP config?')) return;
    await fetch(`/api/v1/smtp/configs/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchConfigs();
    fetchHealth();
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResult(null);
    const res = await fetch('/api/v1/smtp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ smtp_config_id: id, recipient: 'test@example.com' })
    });
    const data = await res.json();
    setTestResult(data);
    setTesting(null);
  };

  const handleToggleActive = async (config: SmtpConfig) => {
    await fetch(`/api/v1/smtp/configs/${config._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ is_active: !config.is_active })
    });
    fetchConfigs();
  };

  const providerLabels: Record<string, string> = {
    gmail: 'Gmail',
    outlook: 'Outlook',
    aws_ses: 'AWS SES',
    mailgun: 'Mailgun',
    sendgrid: 'SendGrid',
    smtp_generic: 'Custom SMTP'
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">SMTP Management</h1>
        <Button onClick={() => setShowDialog(true)}>+ Add SMTP</Button>
      </div>

      <Tabs defaultValue="configs">
        <TabsList>
          <TabsTrigger value="configs">Configurations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="configs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {configs.map(config => (
                    <TableRow key={config._id}>
                      <TableCell className="font-medium">{config.name}</TableCell>
                      <TableCell><Badge variant="outline">{providerLabels[config.provider] || config.provider}</Badge></TableCell>
                      <TableCell>{config.from_email}</TableCell>
                      <TableCell>{config.daily_sent}/{config.daily_limit} today</TableCell>
                      <TableCell>
                        <Badge variant={config.is_active ? 'default' : 'secondary'}>{config.is_active ? 'Active' : 'Inactive'}</Badge>
                        {config.is_default && <Badge className="ml-1 bg-blue-500">Default</Badge>}
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleTest(config._id)} disabled={testing === config._id}>
                          {testing === config._id ? 'Testing...' : 'Test'}
                        </Button>
                        <Button size="sm" variant={config.is_active ? 'destructive' : 'default'} onClick={() => handleToggleActive(config)}>
                          {config.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(config._id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {configs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No SMTP configs found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Sent</div><div className="text-2xl font-bold">{analytics?.total_sent || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Delivered</div><div className="text-2xl font-bold">{analytics?.total_delivered || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Bounced</div><div className="text-2xl font-bold">{analytics?.total_bounced || 0}</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Failed</div><div className="text-2xl font-bold">{analytics?.total_failed || 0}</div></CardContent></Card>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Delivery Rate</div><div className="text-2xl font-bold text-green-600">{analytics?.delivery_rate || 0}%</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Bounce Rate</div><div className="text-2xl font-bold text-yellow-600">{analytics?.bounce_rate || 0}%</div></CardContent></Card>
            <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Failed Rate</div><div className="text-2xl font-bold text-red-600">{analytics?.failed_rate || 0}%</div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle>Daily Breakdown</CardTitle></CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-1">
                {(analytics?.daily_breakdown || []).slice(-14).map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-blue-500 rounded-t" style={{ height: `${Math.min(d.sent * 2, 200)}px` }} />
                    <span className="text-xs mt-1">{d.date.slice(5)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Last Hour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthData.map(h => (
                    <TableRow key={h.config_id}>
                      <TableCell className="font-medium">{h.config_name}</TableCell>
                      <TableCell>{providerLabels[h.provider] || h.provider}</TableCell>
                      <TableCell>
                        <Badge variant={h.status === 'healthy' ? 'default' : h.status === 'degraded' ? 'outline' : 'destructive'}>
                          {h.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{h.success_rate ? `${h.success_rate}%` : '-'}</TableCell>
                      <TableCell>{h.sent_last_hour || 0} sent / {h.failed_last_hour || 0} failed</TableCell>
                    </TableRow>
                  ))}
                  {healthData.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4">No health data</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Add SMTP Configuration</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div><Label>Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
            <div><Label>Provider</Label>
              <Select value={formData.provider} onValueChange={v => setFormData({...formData, provider: v, host: v === 'gmail' ? 'smtp.gmail.com' : v === 'outlook' ? 'smtp.office365.com' : v === 'aws_ses' ? 'email-smtp.amazonaws.com' : v === 'mailgun' ? 'smtp.mailgun.org' : v === 'sendgrid' ? 'smtp.sendgrid.net' : ''})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gmail">Gmail SMTP</SelectItem>
                  <SelectItem value="outlook">Outlook SMTP</SelectItem>
                  <SelectItem value="aws_ses">AWS SES</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="smtp_generic">Custom SMTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Host</Label><Input value={formData.host} onChange={e => setFormData({...formData, host: e.target.value})} /></div>
            <div><Label>Port</Label><Input type="number" value={formData.port} onChange={e => setFormData({...formData, port: parseInt(e.target.value)})} /></div>
            <div><Label>Username</Label><Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            <div><Label>Password</Label><Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
            <div><Label>From Email</Label><Input type="email" value={formData.from_email} onChange={e => setFormData({...formData, from_email: e.target.value})} /></div>
            <div><Label>From Name</Label><Input value={formData.from_name} onChange={e => setFormData({...formData, from_name: e.target.value})} /></div>
            <div><Label>Daily Limit</Label><Input type="number" value={formData.daily_limit} onChange={e => setFormData({...formData, daily_limit: parseInt(e.target.value)})} /></div>
            <div><Label>Monthly Limit</Label><Input type="number" value={formData.monthly_limit} onChange={e => setFormData({...formData, monthly_limit: parseInt(e.target.value)})} /></div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} />
              <Label>Set as default SMTP</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testResult} onOpenChange={open => !open && setTestResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Test Result</DialogTitle></DialogHeader>
          <div className="py-4">
            <div className={`text-lg font-bold mb-2 ${testResult?.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult?.success ? 'Success' : 'Failed'}
            </div>
            <p className="text-gray-600">{testResult?.message}</p>
            {testResult?.latency_ms && <p className="mt-2">Latency: {testResult.latency_ms}ms</p>}
            <p className="mt-2">Auth: {testResult?.auth_valid ? 'Valid' : 'Invalid'} | DNS: {testResult?.dns_valid ? 'Valid' : 'Invalid'}</p>
          </div>
          <Button onClick={() => setTestResult(null)}>Close</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}