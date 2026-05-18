import base64
import io
from typing import Dict, Optional
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER
from jinja2 import Template


class InvoicePdfGenerator:
    @staticmethod
    async def generate_pdf(invoice: Dict, template: Optional[Dict] = None) -> bytes:
        if not template:
            template = {
                "company_name": "Outflo",
                "company_email": "billing@outflo.com",
                "colors": {"primary": "#6366f1"},
                "tax_label": "Tax"
            }

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor(template.get("colors", {}).get("primary", "#6366f1")))
        heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=12, textColor=colors.gray)
        
        story = []
        
        data = [
            [Paragraph(f"<b>{template.get('company_name', 'Company')}</b>", styles['Normal']), 
             Paragraph(f"<b>INVOICE</b>", title_style)],
        ]
        
        if template.get("company_address"):
            addr = template["company_address"]
            address_text = ""
            if addr.get("street"): address_text += addr["street"] + "<br/>"
            if addr.get("city"): address_text += f"{addr['city']}, {addr.get('state', '')} {addr.get('zip', '')}"
            data[0].append(Paragraph(address_text, styles['Normal']))
        else:
            data[0].append("")
        
        t = Table(data, colWidths=[2.5*inch, 2.5*inch, 2*inch])
        t.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ]))
        story.append(t)
        story.append(Spacer(1, 20))
        
        invoice_meta = [
            [Paragraph("<b>Invoice #:</b>", styles['Normal']), invoice.get("invoice_number", "N/A")],
            [Paragraph("<b>Date:</b>", styles['Normal']), invoice.get("issue_date", "").strftime("%Y-%m-%d") if isinstance(invoice.get("issue_date"), datetime) else str(invoice.get("issue_date", ""))[:10]],
            [Paragraph("<b>Due Date:</b>", styles['Normal']), invoice.get("due_date", "").strftime("%Y-%m-%d") if isinstance(invoice.get("due_date"), datetime) else str(invoice.get("due_date", ""))[:10]],
            [Paragraph("<b>Status:</b>", styles['Normal']), invoice.get("status", "draft").upper()],
        ]
        
        meta_table = Table(invoice_meta, colWidths=[1.5*inch, 3*inch])
        meta_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0, colors.white),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 20))
        
        story.append(Paragraph("<b>Bill To:</b>", styles['Normal']))
        story.append(Paragraph(invoice.get("customer_name", "Customer"), styles['Normal']))
        story.append(Paragraph(invoice.get("customer_email", ""), styles['Normal']))
        
        billing_addr = invoice.get("billing_address", {})
        if billing_addr.get("street"):
            addr_str = f"{billing_addr.get('street', '')}<br/>"
            if billing_addr.get("city"):
                addr_str += f"{billing_addr.get('city', '')}, {billing_addr.get('state', '')} {billing_addr.get('zip', '')}"
            story.append(Paragraph(addr_str, styles['Normal']))
        
        story.append(Spacer(1, 20))
        
        line_items = invoice.get("line_items", [])
        table_data = [["Description", "Qty", "Unit Price", "Amount"]]
        for item in line_items:
            qty = item.get("quantity", 1)
            price = item.get("unit_price", 0) or item.get("amount", 0)
            total = qty * price
            table_data.append([
                item.get("description", "Item"),
                str(qty),
                f"${price:.2f}",
                f"${total:.2f}"
            ])
        
        items_table = Table(table_data, colWidths=[3*inch, 0.75*inch, 1.25*inch, 1.25*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor(template.get("colors", {}).get("primary", "#6366f1"))),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ALIGN', (1, 1), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.gray),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(items_table)
        story.append(Spacer(1, 20))
        
        subtotal = invoice.get("subtotal", 0)
        tax_rate = invoice.get("tax_rate", 0)
        tax_amount = invoice.get("tax_amount", 0)
        discount = invoice.get("discount_amount", 0)
        total = invoice.get("total", 0)
        
        totals_data = [
            ["Subtotal", f"${subtotal:.2f}"],
            [f"{template.get('tax_label', 'Tax')} ({tax_rate}%)", f"${tax_amount:.2f}"],
        ]
        if discount > 0:
            totals_data.append(["Discount", f"-${discount:.2f}"])
        totals_data.append(["", ""])
        totals_data.append([Paragraph("<b>Total</b>", styles['Normal']), Paragraph(f"<b>${total:.2f}</b>", styles['Normal'])])
        
        totals_table = Table(totals_data, colWidths=[4*inch, 1.5*inch])
        totals_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, -1), (-1, -1), 12),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor(template.get("colors", {}).get("primary", "#6366f1"))),
            ('TEXTCOLOR', (0, -1), (-1, -1), colors.white),
            ('BOTTOMPADDING', (0, -1), (-1, -1), 8),
            ('TOPPADDING', (0, -1), (-1, -1), 8),
        ]))
        story.append(totals_table)
        
        if invoice.get("notes"):
            story.append(Spacer(1, 30))
            story.append(Paragraph("<b>Notes:</b>", styles['Normal']))
            story.append(Paragraph(invoice["notes"], styles['Normal']))
        
        if invoice.get("terms"):
            story.append(Spacer(1, 20))
            story.append(Paragraph("<b>Terms & Conditions:</b>", styles['Normal']))
            story.append(Paragraph(invoice["terms"], styles['Normal']))
        
        story.append(Spacer(1, 40))
        story.append(Paragraph("<i>Thank you for your business!</i>", styles['Normal']))
        story.append(Paragraph("Generated by Outflo", ParagraphStyle('Footer', parent=styles['Normal'], fontSize=8, textColor=colors.gray, alignment=TA_CENTER)))
        
        doc.build(story)
        return buffer.getvalue()

    @staticmethod
    async def generate_base64(invoice: Dict, template: Optional[Dict] = None) -> str:
        pdf_bytes = await InvoicePdfGenerator.generate_pdf(invoice, template)
        return base64.b64encode(pdf_bytes).decode("utf-8")


from datetime import datetime