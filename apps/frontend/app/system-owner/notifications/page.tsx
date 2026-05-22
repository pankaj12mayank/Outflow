'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Badge } from '@/app/components/ui/badge';
import { Tabs, TabList, TabTrigger, TabContent, Modal, ModalHeader, ModalContent, ModalFooter, ModalTitle } from '@/app/components/premium';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { useSystemOwnerAuth } from "@/app/hooks/useSystemOwnerAuth";
import { notificationsAPI, emailTemplatesAPI } from '@/app/lib/api';

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  is_read: boolean;
  organization_id?: string;
  created_at: string;
}

interface EmailTemplate {
  _id: string;
  name: string;
  subject: string;
  type: string;
  is_active: boolean;
  is_default: boolean;
  body_html?: string;
}

interface EmailLog {
  _id: string;
  recipient_email: string;
  subject: string;
  status: string;
  sent_at?: string;
  error_message?: string;
}

export default function NotificationsPage() {
  useSystemOwnerAuth();
  const [activeTab, setActiveTab] = useState("notifications");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);

  const [templateForm, setTemplateForm] = useState({
    name: '',
    subject: '',
    type: 'system_alert',
    is_active: true,
    is_default: false,
    body_html: ''
  });

  const fetchData = useCallback(async () => {
    const [notifData, templateData, logData] = await Promise.all([
      notificationsAPI.list({ limit: 50 }),
      emailTemplatesAPI.list(undefined),
      notificationsAPI.listEmailLogs({ limit: 50 }),
    ]);
    setNotifications(Array.isArray(notifData) ? notifData : notifData?.items || []);
    setTemplates(Array.isArray(templateData) ? templateData : templateData?.items || []);
    setEmailLogs(Array.isArray(logData) ? logData : logData?.items || []);
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('system_owner_token') : null;
    if (token) {
      fetchData().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchData]);

  const handleCreateTemplate = async () => {
    await emailTemplatesAPI.create(templateForm);
    setShowTemplateDialog(false);
    setTemplateForm({ name: '', subject: '', type: 'system_alert', is_active: true, is_default: false, body_html: '' });
    fetchData();
  };

  const handleUpdateTemplate = async () => {
    if (!selectedTemplate?._id) return;
    await emailTemplatesAPI.update(selectedTemplate._id, templateForm);
    setShowTemplateDialog(false);
    setSelectedTemplate(null);
    fetchData();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await emailTemplatesAPI.delete(id);
    fetchData();
  };

  const handleEditTemplate = (template: EmailTemplate) => {
    setTemplateForm({
      name: template.name,
      subject: template.subject,
      type: template.type,
      is_active: template.is_active,
      is_default: template.is_default,
      body_html: template.body_html || ''
    });
    setSelectedTemplate(template);
    setShowTemplateDialog(true);
  };

  const handleRetryEmail = async (logId: string) => {
    await notificationsAPI.retryEmailLog(logId);
    fetchData();
  };

  const handleMarkAsRead = async (id: string) => {
    await notificationsAPI.markRead(id);
    fetchData();
  };

  const handleMarkAllAsRead = async () => {
    await notificationsAPI.markAllRead();
    fetchData();
  };

  const typeLabels: Record<string, string> = {
    billing_alert: 'Billing Alert',
    smtp_failure: 'SMTP Failure',
    subscription_expiry: 'Subscription Expiry',
    ai_usage_alert: 'AI Usage',
    scraping_failure: 'Scraping Failure',
    organization_suspension: 'Org Suspension',
    system_alert: 'System Alert',
    user_invite: 'User Invite',
    task_completed: 'Task Completed'
  };

  const statusColors: Record<string, string> = {
    sent: 'bg-green-500',
    pending: 'bg-yellow-500',
    failed: 'bg-red-500',
    bounced: 'bg-orange-500'
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <Button onClick={handleMarkAllAsRead} variant="outline">Mark All Read</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabList>
          <TabTrigger value="notifications">Notifications</TabTrigger>
          <TabTrigger value="templates">Email Templates</TabTrigger>
          <TabTrigger value="logs">Email Logs</TabTrigger>
        </TabList>

        <TabContent value="notifications">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.map(notif => (
                    <TableRow key={notif._id} className={!notif.is_read ? 'bg-gray-800/30' : ''}>
                      <TableCell><Badge variant="outline">{typeLabels[notif.type] || notif.type}</Badge></TableCell>
                      <TableCell className="font-medium">{notif.title}</TableCell>
                      <TableCell className="max-w-md truncate">{notif.message}</TableCell>
                      <TableCell><Badge className={notif.priority === 'urgent' ? 'bg-red-500' : notif.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'}>{notif.priority}</Badge></TableCell>
                      <TableCell>{notif.is_read ? 'Read' : 'Unread'}</TableCell>
                      <TableCell className="text-sm">{new Date(notif.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {!notif.is_read && <Button size="sm" variant="outline" onClick={() => handleMarkAsRead(notif._id)}>Mark Read</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {notifications.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-4">No notifications</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabContent>

        <TabContent value="templates">
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setSelectedTemplate(null); setShowTemplateDialog(true); }}>+ Create Template</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(template => (
                    <TableRow key={template._id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{template.subject}</TableCell>
                      <TableCell><Badge variant="outline">{typeLabels[template.type] || template.type}</Badge></TableCell>
                      <TableCell>{template.is_default ? 'Yes' : 'No'}</TableCell>
                      <TableCell>{template.is_active ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditTemplate(template)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteTemplate(template._id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No templates</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabContent>

        <TabContent value="logs">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailLogs.map(log => (
                    <TableRow key={log._id}>
                      <TableCell>{log.recipient_email}</TableCell>
                      <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                      <TableCell><Badge className={statusColors[log.status]}>{log.status}</Badge></TableCell>
                      <TableCell>{log.sent_at ? new Date(log.sent_at).toLocaleString() : '-'}</TableCell>
                      <TableCell className="max-w-xs truncate text-red-400">{log.error_message || '-'}</TableCell>
                      <TableCell>
                        {log.status === 'failed' && (
                          <Button size="sm" variant="outline" onClick={() => handleRetryEmail(log._id)}>Retry</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {emailLogs.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No email logs</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabContent>
      </Tabs>

      <Modal isOpen={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} className="max-w-2xl">
        <ModalContent>
          <ModalHeader><ModalTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</ModalTitle></ModalHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Template Name</Label><Input value={templateForm.name} onChange={e => setTemplateForm({...templateForm, name: e.target.value})} /></div>
              <div><Label>Type</Label>
                <select className="w-full p-2 border rounded" value={templateForm.type} onChange={e => setTemplateForm({...templateForm, type: e.target.value})}>
                  <option value="billing_alert">Billing Alert</option>
                  <option value="smtp_failure">SMTP Failure</option>
                  <option value="subscription_expiry">Subscription Expiry</option>
                  <option value="ai_usage_alert">AI Usage Alert</option>
                  <option value="scraping_failure">Scraping Failure</option>
                  <option value="system_alert">System Alert</option>
                  <option value="user_invite">User Invite</option>
                </select>
              </div>
            </div>
            <div><Label>Subject</Label><Input value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} /></div>
            <div><Label>Body HTML</Label><textarea className="w-full p-2 border rounded h-40" value={templateForm.body_html} onChange={e => setTemplateForm({...templateForm, body_html: e.target.value})} /></div>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={templateForm.is_active} onChange={e => setTemplateForm({...templateForm, is_active: e.target.checked})} />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={templateForm.is_default} onChange={e => setTemplateForm({...templateForm, is_default: e.target.checked})} />
                <Label>Default</Label>
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={selectedTemplate ? handleUpdateTemplate : handleCreateTemplate}>{selectedTemplate ? 'Update' : 'Create'}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
