'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useSystemOwnerAuth } from '@/hooks/useSystemOwnerAuth';

interface InvoiceTemplate {
  _id: string;
  name: string;
  is_default: boolean;
  is_active: boolean;
  colors: { primary: string; text: string; background: string };
  logo_url?: string;
  company_name: string;
  company_address: { street?: string; city?: string; state?: string; zip?: string };
  company_email?: string;
  company_phone?: string;
  tax_number?: string;
  tax_label: string;
  notes_template?: string;
  terms_template?: string;
}

export default function InvoiceTemplatesPage() {
  const { token } = useSystemOwnerAuth();
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<InvoiceTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    is_default: false,
    colors: { primary: '#6366f1', text: '#1f2937', background: '#ffffff' },
    logo_url: '',
    company_name: '',
    company_address: { street: '', city: '', state: '', zip: '' },
    company_email: '',
    company_phone: '',
    tax_number: '',
    tax_label: 'Tax',
    notes_template: '',
    terms_template: ''
  });

  const fetchTemplates = async () => {
    const res = await fetch('/api/v1/billing/invoice-templates', { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setTemplates(data);
  };

  useEffect(() => {
    if (token) fetchTemplates().finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    await fetch('/api/v1/billing/invoice-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    setShowDialog(false);
    setFormData({
      name: '', is_default: false,
      colors: { primary: '#6366f1', text: '#1f2937', background: '#ffffff' },
      logo_url: '', company_name: '', company_address: { street: '', city: '', state: '', zip: '' },
      company_email: '', company_phone: '', tax_number: '', tax_label: 'Tax',
      notes_template: '', terms_template: ''
    });
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/v1/billing/invoice-templates/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchTemplates();
  };

  const handleEdit = (template: InvoiceTemplate) => {
    setFormData({
      name: template.name,
      is_default: template.is_default,
      colors: template.colors,
      logo_url: template.logo_url || '',
      company_name: template.company_name,
      company_address: template.company_address,
      company_email: template.company_email || '',
      company_phone: template.company_phone || '',
      tax_number: template.tax_number || '',
      tax_label: template.tax_label,
      notes_template: template.notes_template || '',
      terms_template: template.terms_template || ''
    });
    setSelectedTemplate(template);
    setShowDialog(true);
  };

  const handleUpdate = async () => {
    await fetch(`/api/v1/billing/invoice-templates/${selectedTemplate?._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    setShowDialog(false);
    setSelectedTemplate(null);
    fetchTemplates();
  };

  const SampleInvoice = ({ colors }: { colors: any }) => (
    <div className="bg-white p-6 rounded-lg border" style={{ fontFamily: 'Helvetica, Arial, sans-serif', color: colors.text }}>
      <div className="flex justify-between items-start border-b-2 pb-4 mb-4" style={{ borderColor: colors.primary }}>
        <div>
          {formData.logo_url && <img src={formData.logo_url} alt="Logo" className="h-12 mb-2" />}
          <h1 className="text-xl font-bold" style={{ color: colors.primary }}>{formData.company_name || 'Company Name'}</h1>
          <p className="text-sm text-gray-500">{formData.company_address.street}</p>
          <p className="text-sm text-gray-500">{formData.company_address.city}, {formData.company_address.state} {formData.company_address.zip}</p>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>INVOICE</h2>
          <p className="text-sm text-gray-500">INV-001</p>
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm text-gray-500">Bill To:</p>
        <p className="font-medium">Customer Name</p>
        <p className="text-sm">customer@example.com</p>
      </div>
      <table className="w-full mb-4">
        <thead>
          <tr style={{ backgroundColor: colors.primary, color: 'white' }}>
            <th className="p-2 text-left text-sm">Description</th>
            <th className="p-2 text-right text-sm">Qty</th>
            <th className="p-2 text-right text-sm">Price</th>
            <th className="p-2 text-right text-sm">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="p-2">Sample Item</td>
            <td className="p-2 text-right">1</td>
            <td className="p-2 text-right">$100.00</td>
            <td className="p-2 text-right">$100.00</td>
          </tr>
        </tbody>
      </table>
      <div className="flex justify-end">
        <table className="w-48">
          <tr><td className="p-1 text-right">Subtotal:</td><td className="p-1 text-right">$100.00</td></tr>
          <tr><td className="p-1 text-right">{formData.tax_label || 'Tax'} (10%):</td><td className="p-1 text-right">$10.00</td></tr>
          <tr style={{ backgroundColor: colors.primary, color: 'white' }}><td className="p-2 text-right font-bold">Total:</td><td className="p-2 text-right font-bold">$110.00</td></tr>
        </table>
      </div>
      {formData.notes_template && <div className="mt-4 p-2 bg-gray-50 rounded"><p className="text-sm text-gray-600">{formData.notes_template}</p></div>}
      <div className="mt-4 text-center text-xs text-gray-400">Thank you for your business!</div>
    </div>
  );

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Invoice Templates</h1>
        <Button onClick={() => { setSelectedTemplate(null); setShowDialog(true); }}>+ Create Template</Button>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="designer">Designer</TabsTrigger>
        </TabsList>

        <TabsContent value="templates">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Colors</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map(t => (
                    <TableRow key={t._id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>{t.company_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: t.colors.primary }} />
                          <div className="w-6 h-6 rounded" style={{ backgroundColor: t.colors.text }} />
                          <div className="w-6 h-6 rounded border" style={{ backgroundColor: t.colors.background }} />
                        </div>
                      </TableCell>
                      <TableCell>{t.is_default ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(t)}>Edit</Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(t._id)}>Delete</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {templates.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-4">No templates found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designer">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>Basic Info</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Template Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                  <div><Label>Company Name</Label><Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
                  <div><Label>Logo URL</Label><Input value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} /></div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} />
                    <Label>Set as default</Label>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Address</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Street</Label><Input value={formData.company_address.street} onChange={e => setFormData({...formData, company_address: {...formData.company_address, street: e.target.value}})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>City</Label><Input value={formData.company_address.city} onChange={e => setFormData({...formData, company_address: {...formData.company_address, city: e.target.value}})} /></div>
                    <div><Label>State</Label><Input value={formData.company_address.state} onChange={e => setFormData({...formData, company_address: {...formData.company_address, state: e.target.value}})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label>ZIP</Label><Input value={formData.company_address.zip} onChange={e => setFormData({...formData, company_address: {...formData.company_address, zip: e.target.value}})} /></div>
                    <div><Label>Email</Label><Input value={formData.company_email} onChange={e => setFormData({...formData, company_email: e.target.value})} /></div>
                  </div>
                  <div><Label>Phone</Label><Input value={formData.company_phone} onChange={e => setFormData({...formData, company_phone: e.target.value})} /></div>
                  <div><Label>Tax Number</Label><Input value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Colors</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Primary</Label><Input type="color" value={formData.colors.primary} onChange={e => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})} /></div>
                    <div><Label>Text</Label><Input type="color" value={formData.colors.text} onChange={e => setFormData({...formData, colors: {...formData.colors, text: e.target.value}})} /></div>
                    <div><Label>Background</Label><Input type="color" value={formData.colors.background} onChange={e => setFormData({...formData, colors: {...formData.colors, background: e.target.value}})} /></div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Content</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div><Label>Tax Label</Label><Input value={formData.tax_label} onChange={e => setFormData({...formData, tax_label: e.target.value})} /></div>
                  <div><Label>Notes Template</Label><Input value={formData.notes_template} onChange={e => setFormData({...formData, notes_template: e.target.value})} placeholder="Thank you for..." /></div>
                  <div><Label>Terms Template</Label><Input value={formData.terms_template} onChange={e => setFormData({...formData, terms_template: e.target.value})} placeholder="Payment due within..." /></div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button onClick={handleSubmit}>Create Template</Button>
                {selectedTemplate && <Button variant="outline" onClick={handleUpdate}>Update Template</Button>}
              </div>
            </div>

            <div>
              <Card>
                <CardHeader><CardTitle>Live Preview</CardTitle></CardHeader>
                <CardContent>
                  <SampleInvoice colors={formData.colors} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{selectedTemplate ? 'Edit Template' : 'Create Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Template Name</Label><Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
              <div><Label>Company Name</Label><Input value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} /></div>
              <div><Label>Logo URL</Label><Input value={formData.logo_url} onChange={e => setFormData({...formData, logo_url: e.target.value})} /></div>
              <div><Label>Tax Number</Label><Input value={formData.tax_number} onChange={e => setFormData({...formData, tax_number: e.target.value})} /></div>
              <div><Label>Email</Label><Input value={formData.company_email} onChange={e => setFormData({...formData, company_email: e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={formData.company_phone} onChange={e => setFormData({...formData, company_phone: e.target.value})} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><Label>Primary Color</Label><Input type="color" value={formData.colors.primary} onChange={e => setFormData({...formData, colors: {...formData.colors, primary: e.target.value}})} /></div>
              <div><Label>Text Color</Label><Input type="color" value={formData.colors.text} onChange={e => setFormData({...formData, colors: {...formData.colors, text: e.target.value}})} /></div>
              <div><Label>Background</Label><Input type="color" value={formData.colors.background} onChange={e => setFormData({...formData, colors: {...formData.colors, background: e.target.value}})} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formData.is_default} onChange={e => setFormData({...formData, is_default: e.target.checked})} />
              <Label>Set as default template</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={selectedTemplate ? handleUpdate : handleSubmit}>{selectedTemplate ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}