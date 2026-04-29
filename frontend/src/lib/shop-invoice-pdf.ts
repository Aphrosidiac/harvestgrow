import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface InvoiceDoc {
  documentNumber: string
  issueDate: string
  dueDate?: string | null
  customerName?: string | null
  customerPhone?: string | null
  customerEmail?: string | null
  customerCompanyName?: string | null
  notes?: string | null
  status: string
  subtotal: number | string
  totalAmount: number | string
  paidAmount?: number | string
  items: Array<{
    description: string
    quantity: number
    unit: string
    unitPrice: number | string
    total: number | string
  }>
}

import { COMPANY, OLIVE } from './company'

export function downloadShopInvoicePdf(doc: InvoiceDoc) {
  const pdf = new jsPDF()

  // Header bar
  pdf.setFillColor(...OLIVE)
  pdf.rect(0, 0, pdf.internal.pageSize.width, 26, 'F')
  pdf.setTextColor(255, 255, 255)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(14)
  pdf.text(COMPANY.name, 14, 11)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.text(COMPANY.address, 14, 17)
  pdf.text(`Tel: ${COMPANY.phone}  ${COMPANY.email}`, 14, 22)

  // Title
  pdf.setTextColor(0, 0, 0)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(16)
  pdf.text('INVOICE', 14, 38)

  // Meta right side
  pdf.setFontSize(9)
  pdf.setFont('helvetica', 'normal')
  const rightX = pdf.internal.pageSize.width - 14
  pdf.text(`No: ${doc.documentNumber}`, rightX, 38, { align: 'right' })
  pdf.text(`Date: ${fmtDate(doc.issueDate)}`, rightX, 43, { align: 'right' })
  if (doc.dueDate) pdf.text(`Due: ${fmtDate(doc.dueDate)}`, rightX, 48, { align: 'right' })

  // Bill to
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(9)
  pdf.text('BILL TO', 14, 50)
  pdf.setFont('helvetica', 'normal')
  pdf.text(doc.customerName || '—', 14, 55)
  if (doc.customerCompanyName) pdf.text(doc.customerCompanyName, 14, 60)
  if (doc.customerPhone) pdf.text(doc.customerPhone, 14, doc.customerCompanyName ? 65 : 60)

  // Items table
  autoTable(pdf, {
    startY: 72,
    head: [['#', 'Description', 'Qty', 'Unit', 'Price RM', 'Amount RM']],
    body: doc.items.map((it, i) => [
      String(i + 1),
      it.description,
      String(it.quantity),
      it.unit,
      Number(it.unitPrice).toFixed(2),
      Number(it.total).toFixed(2),
    ]),
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: OLIVE, textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'right', cellWidth: 16 },
      3: { cellWidth: 18 },
      4: { halign: 'right', cellWidth: 24 },
      5: { halign: 'right', cellWidth: 28 },
    },
  })

  const finalY = (pdf as any).lastAutoTable?.finalY ?? 100

  // Totals
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text(`TOTAL: RM ${Number(doc.totalAmount).toFixed(2)}`, rightX, finalY + 10, { align: 'right' })

  // Status stamp
  const isPaid = Number(doc.paidAmount || 0) >= Number(doc.totalAmount)
  pdf.setFontSize(20)
  pdf.setTextColor(isPaid ? 34 : 220, isPaid ? 139 : 38, isPaid ? 34 : 38)
  pdf.text(isPaid ? 'PAID' : 'UNPAID', 14, finalY + 10)
  pdf.setTextColor(0, 0, 0)

  // Footer
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(120)
  const footY = pdf.internal.pageSize.height - 18
  pdf.text('Thank you for your order.', 14, footY)
  if (doc.notes) pdf.text(doc.notes, 14, footY + 5, { maxWidth: 180 })

  pdf.save(`${doc.documentNumber}.pdf`)
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString('en-MY') } catch { return d }
}
