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

interface Invoice {
  _id: string;
  invoice_number: string;
  organization_id: string;
  status: string;
  issue_date: string;
  due_date: string;
  total: number;
  currency: string;
  customer_name: string;
  customer_email: string;
}

interface Subscription {
  _id: string;
  organization_id: string;
  plan_name: string;
  status: string;
  billing_interval: string;
  price_amount: number;
  currency: string;
  current_period_end: string;
}

interface Payment {
  _id: string;
  invoice_id: string;
  organization_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  failure_reason?: string;
  refunded_amount: number;
  created_at: string;
}

interface RevenueAnalytics {
  period_days: number;
  total_revenue: number;
  avg_daily_revenue: number;
  daily_breakdown: { _id: string; revenue: number }[];
}

interface MRRARR {
  mrr: number;
  arr: number;
  active_subscriptions: number;
}

export default function BillingDashboard() {
  const { token } = useSystemOwnerAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalytics | null>(null);
  const [mrrArr, setMrrArr] = useState<MRRARR | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showSubDialog, setShowSubDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [pdfData, setPdfData] = useState<string | null>(null);

  const [invoiceForm, setInvoiceForm] = useState({
    organization_id: '',
    customer_name: '',
    customer_email: '',
    line_items: [{ description: '', quantity: 1, unit_price: 0 }],
    tax_rate: 0,
    discount_amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    notes: '',
    terms: ''
  });

  const [subForm, setSubForm] = useState({
    organization_id: '',
    plan_id: '',
    plan_name: '',
    billing_interval: 'monthly',
    price_amount: 0
  });

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${token}` };
    const [invRes, subRes, payRes, revRes, mrrRes] = await Promise.all([
      fetch('/api/v1/billing/invoices', { headers }),
      fetch('/api/v1/billing/subscriptions', { headers }),
      fetch('/api/v1/billing/payments', { headers }),
      fetch('/api/v1/billing/revenue/analytics?days=30', { headers }),
      fetch('/api/v1/billing/revenue/mrr-arr', { headers })
    ]);
    setInvoices(await invRes.json());
    setSubscriptions(await subRes.json());
    setPayments(await payRes.json());
    setRevenueAnalytics(await revRes.json());
    setMrrArr(await mrrRes.json());
  };

  useEffect(() => {
    if (token) fetchData().finally(() => setLoading(false));
  }, [token]);

  const handleCreateInvoice = async () => {
    await fetch('/api/v1/billing/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        ...invoiceForm,
        line_items: invoiceForm.line_items.map(item => ({
          ...item,
          amount: item.unit_price
        }))
      })
    });
    setShowInvoiceDialog(false);
    setInvoiceForm({ organization_id: '', customer_name: '', customer_email: '', line_items: [{ description: '', quantity: 1, unit_price: 0 }], tax_rate: 0, discount_amount: 0, due_date: new Date().toISOString().split('T')[0], notes: '', terms: '' });
    fetchData();
  };

  const handleCreateSubscription = async () => {
    await fetch('/api/v1/billing/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(subForm)
    });
    setShowSubDialog(false);
    setSubForm({ organization_id: '', plan_id: '', plan_name: '', billing_interval: 'monthly', price_amount: 0 });
    fetchData();
  };

  const handleMarkPaid = async (invoiceId: string) => {
    await fetch(`/api/v1/billing/invoices/${invoiceId}/mark-paid`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    await fetch(`/api/v1/billing/invoices/${invoiceId}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const handleViewPdf = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    const res = await fetch(`/api/v1/billing/invoices/${invoice._id}/pdf`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setPdfData(data.pdf_base64);
    setShowPaymentDialog(true);
  };

  const handleProcessPayment = async (paymentId: string, success: boolean) => {
    await fetch(`/api/v1/billing/payments/${paymentId}/process?success=${success}`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    fetchData();
  };

  const addLineItem = () => {
    setInvoiceForm({ ...invoiceForm, line_items: [...invoiceForm.line_items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const statusColors: Record<string, string> = {
    paid: 'bg-green-500',
    sent: 'bg-blue-500',
    draft: 'bg-gray-500',
    overdue: 'bg-red-500',
    cancelled: 'bg-gray-300',
    refunded: 'bg-yellow-500',
    active: 'bg-green-500',
    past_due: 'bg-red-500',
    trialing: 'bg-blue-500',
    success: 'bg-green-500',
    failed: 'bg-red-500',
    pending: 'bg-yellow-500'
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Billing & Invoices</h1>
        <div className="space-x-2">
          <Button onClick={() => setShowInvoiceDialog(true)}>Create Invoice</Button>
          <Button onClick={() => setShowSubDialog(true)} variant="outline">Add Subscription</Button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><div className="text-sm text-gray-500">MRR</div><div className="text-2xl font-bold">${mrrArr?.mrr?.toLocaleString() || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-gray-500">ARR</div><div className="text-2xl font-bold">${mrrArr?.arr?.toLocaleString() || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Revenue (30d)</div><div className="text-2xl font-bold">${revenueAnalytics?.total_revenue?.toLocaleString() || 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Active Subs</div><div className="text-2xl font-bold">{mrrArr?.active_subscriptions || 0}</div></CardContent></Card>
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv._id}>
                      <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.customer_name}<br/><span className="text-xs text-gray-500">{inv.customer_email}</span></TableCell>
                      <TableCell>{inv.issue_date?.slice(0, 10)}</TableCell>
                      <TableCell>{inv.due_date?.slice(0, 10)}</TableCell>
                      <TableCell>${inv.total?.toFixed(2)}</TableCell>
                      <TableCell><Badge className={statusColors[inv.status]}>{inv.status}</Badge></TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleViewPdf(inv)}>PDF</Button>
                        {inv.status !== 'paid' && <Button size="sm" onClick={() => handleMarkPaid(inv._id)}>Mark Paid</Button>}
                        {inv.status === 'draft' && <Button size="sm" variant="destructive" onClick={() => handleCancelInvoice(inv._id)}>Cancel</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {invoices.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-4">No invoices found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Interval</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Renewal</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map(sub => (
                    <TableRow key={sub._id}>
                      <TableCell className="font-medium">{sub.organization_id}</TableCell>
                      <TableCell>{sub.plan_name}</TableCell>
                      <TableCell>{sub.billing_interval}</TableCell>
                      <TableCell>${sub.price_amount}/{sub.billing_interval === 'monthly' ? 'mo' : 'yr'}</TableCell>
                      <TableCell>{sub.current_period_end?.slice(0, 10)}</TableCell>
                      <TableCell><Badge className={statusColors[sub.status]}>{sub.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                  {subscriptions.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No subscriptions found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map(pay => (
                    <TableRow key={pay._id}>
                      <TableCell className="font-medium">{pay.invoice_id}</TableCell>
                      <TableCell>${pay.amount?.toFixed(2)}</TableCell>
                      <TableCell>{pay.payment_method}</TableCell>
                      <TableCell>{pay.created_at?.slice(0, 10)}</TableCell>
                      <TableCell><Badge className={statusColors[pay.status]}>{pay.status}</Badge></TableCell>
                      <TableCell className="space-x-2">
                        {pay.status === 'pending' && (
                          <>
                            <Button size="sm" onClick={() => handleProcessPayment(pay._id, true)}>Process</Button>
                            <Button size="sm" variant="destructive" onClick={() => handleProcessPayment(pay._id, false)}>Fail</Button>
                          </>
                        )}
                        {pay.status === 'success' && pay.refunded_amount === 0 && <Button size="sm" variant="outline">Refund</Button>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-4">No payments found</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue">
          <Card>
            <CardHeader><CardTitle>Daily Revenue (30 Days)</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80 flex items-end gap-1">
                {(revenueAnalytics?.daily_breakdown || []).map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center">
                    <div className="w-full bg-purple-500 rounded-t" style={{ height: `${Math.min(d.revenue * 5, 250)}px` }} />
                    <span className="text-xs mt-1">{d._id?.slice(5)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Organization ID</Label><Input value={invoiceForm.organization_id} onChange={e => setInvoiceForm({...invoiceForm, organization_id: e.target.value})} /></div>
              <div><Label>Customer Name</Label><Input value={invoiceForm.customer_name} onChange={e => setInvoiceForm({...invoiceForm, customer_name: e.target.value})} /></div>
              <div className="col-span-2"><Label>Customer Email</Label><Input type="email" value={invoiceForm.customer_email} onChange={e => setInvoiceForm({...invoiceForm, customer_email: e.target.value})} /></div>
              <div><Label>Tax Rate (%)</Label><Input type="number" value={invoiceForm.tax_rate} onChange={e => setInvoiceForm({...invoiceForm, tax_rate: parseFloat(e.target.value)})} /></div>
              <div><Label>Discount</Label><Input type="number" value={invoiceForm.discount_amount} onChange={e => setInvoiceForm({...invoiceForm, discount_amount: parseFloat(e.target.value)})} /></div>
              <div className="col-span-2"><Label>Due Date</Label><Input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm({...invoiceForm, due_date: e.target.value})} /></div>
            </div>
            <div><Label>Line Items</Label></div>
            {invoiceForm.line_items.map((item, i) => (
              <div key={i} className="grid grid-cols-4 gap-2">
                <Input placeholder="Description" value={item.description} onChange={e => { const items = [...invoiceForm.line_items]; items[i].description = e.target.value; setInvoiceForm({...invoiceForm, line_items: items}) }} />
                <Input type="number" placeholder="Qty" value={item.quantity} onChange={e => { const items = [...invoiceForm.line_items]; items[i].quantity = parseInt(e.target.value); setInvoiceForm({...invoiceForm, line_items: items}) }} />
                <Input type="number" placeholder="Price" value={item.unit_price} onChange={e => { const items = [...invoiceForm.line_items]; items[i].unit_price = parseFloat(e.target.value); setInvoiceForm({...invoiceForm, line_items: items}) }} />
                <Button variant="destructive" size="sm" onClick={() => setInvoiceForm({...invoiceForm, line_items: invoiceForm.line_items.filter((_, idx) => idx !== i)})}>X</Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLineItem}>+ Add Line Item</Button>
            <div><Label>Notes</Label><Input value={invoiceForm.notes} onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})} /></div>
            <div><Label>Terms</Label><Input value={invoiceForm.terms} onChange={e => setInvoiceForm({...invoiceForm, terms: e.target.value})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvoiceDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showSubDialog} onOpenChange={setShowSubDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Organization ID</Label><Input value={subForm.organization_id} onChange={e => setSubForm({...subForm, organization_id: e.target.value})} /></div>
            <div><Label>Plan ID</Label><Input value={subForm.plan_id} onChange={e => setSubForm({...subForm, plan_id: e.target.value})} /></div>
            <div><Label>Plan Name</Label><Input value={subForm.plan_name} onChange={e => setSubForm({...subForm, plan_name: e.target.value})} /></div>
            <div><Label>Billing Interval</Label>
              <Select value={subForm.billing_interval} onValueChange={v => setSubForm({...subForm, billing_interval: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Price</Label><Input type="number" value={subForm.price_amount} onChange={e => setSubForm({...subForm, price_amount: parseFloat(e.target.value)})} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateSubscription}>Create Subscription</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Invoice PDF - {selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          <div className="py-4">
            {pdfData && (
              <iframe src={`data:application/pdf;base64,${pdfData}`} className="w-full h-[500px]" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPaymentDialog(false); setPdfData(null); }}>Close</Button>
            {pdfData && <Button onClick={() => { const link = document.createElement('a'); link.href = `data:application/pdf;base64,${pdfData}`; link.download = `${selectedInvoice?.invoice_number}.pdf`; link.click(); }}>Download PDF</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}