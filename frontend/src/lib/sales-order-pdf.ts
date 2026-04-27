import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { SalesOrder } from '../types'

const COMPANY = {
  name: 'HARVESTGROW VEG SDN BHD (1344269-D)',
  addressLine1: 'NO.5, JALAN KEMPAS LAMA 2/4, KEMPAS LAMA,',
  addressLine2: '81200 JOHOR BAHRU, JOHOR.',
  phone: 'Tel: +6075112696',
  email: 'Email: sales@harvestgrow-veg.com',
  tin: '(TIN Number : C26132987010)',
}

type DocType = 'PICKING LIST' | 'DELIVERY ORDER'

function generateOrderDocument(order: SalesOrder, type: DocType) {
  const doc = new jsPDF()
  const pw = doc.internal.pageSize.width
  const ph = doc.internal.pageSize.height
  const now = new Date()
  const timestamp = `${now.toLocaleDateString('en-GB').replace(/\//g, '/')} ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`

  const customerName = order.customerCompanyName || order.customerName || ''
  const branchAddress = order.deliveryAddress || ''
  const slotLabel = order.deliverySlot === 'TOMORROW_MORNING' ? 'Tomorrow Morning'
    : order.deliverySlot === 'AFTERNOON' ? 'Afternoon'
    : order.deliverySlot === 'MORNING' ? 'Morning' : order.deliverySlot

  const items = (order.items || []).map((item, idx) => [
    String(idx + 1),
    item.secondDescription || '',
    Number(item.quantity).toFixed(3),
    item.unit,
    item.description,
  ])

  const totalPages = Math.ceil(items.length / 18) || 1

  function drawHeader(pageNum: number) {
    // Company header
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.text(COMPANY.name, 25, 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.text(COMPANY.addressLine1, 25, 20)
    doc.text(COMPANY.addressLine2, 25, 24)
    doc.text(`${COMPANY.phone} ${COMPANY.email}`, 25, 28)
    doc.text(COMPANY.tin, 25, 32)

    // Timestamp
    doc.setFontSize(8)
    doc.text(timestamp, pw - 14, 14, { align: 'right' })

    // Title
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(16)
    doc.text(type, pw / 2, 48, { align: 'center' })

    // Customer info box (left)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setDrawColor(0)
    doc.rect(14, 55, pw / 2 - 20, 30)
    doc.text(customerName, 16, 62)

    const addrLines = branchAddress.split('\n')
    let addrY = 68
    for (const line of addrLines) {
      doc.text(line, 16, addrY, { maxWidth: pw / 2 - 24 })
      addrY += 4
    }

    // Order info box (right)
    const rx = pw / 2
    doc.rect(rx, 55, pw / 2 - 14, 30)
    const labels = ['D/ORDER', 'PO No', 'From Doc No', 'Date', 'Delivery Slot', 'Truck', 'Your Ref.', 'Page']
    const values = [
      order.salesOrderNumber,
      order.poNumber || '',
      '',
      new Date(order.deliveryDate).toLocaleDateString('en-GB').replace(/\//g, '/'),
      slotLabel,
      order.truck || '',
      '',
      `${pageNum} of ${totalPages}`,
    ]
    let ry = 60
    doc.setFontSize(8)
    for (let i = 0; i < labels.length; i++) {
      doc.text(labels[i], rx + 2, ry)
      doc.text(`: ${values[i]}`, rx + 30, ry)
      ry += 3.5
    }
  }

  // Paginate items
  const pageSize = 18
  let pageNum = 1

  for (let start = 0; start < items.length; start += pageSize) {
    if (start > 0) doc.addPage()
    drawHeader(pageNum)

    const pageItems = items.slice(start, start + pageSize)

    autoTable(doc, {
      startY: 90,
      head: [['No', '2nd Desc', 'Qty', '', 'Description']],
      body: pageItems,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3, lineColor: [0, 0, 0] },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 25 },
        2: { cellWidth: 18, halign: 'right' },
        3: { cellWidth: 18 },
        4: { cellWidth: pw - 87 },
      },
      theme: 'plain',
      didDrawCell: (data) => {
        if (data.section === 'body') {
          doc.setDrawColor(200)
          doc.line(data.cell.x, data.cell.y + data.cell.height, data.cell.x + data.cell.width, data.cell.y + data.cell.height)
        }
      },
    })

    // Footer: customer info on every page
    doc.setFontSize(8)
    doc.setTextColor(0)
    doc.text(customerName, 14, ph - 25)
    if (branchAddress) {
      const footLines = branchAddress.split('\n')
      let fy = ph - 21
      for (const l of footLines) {
        doc.text(l, 14, fy, { maxWidth: pw - 28 })
        fy += 4
      }
    }

    pageNum++
  }

  // Handle empty items
  if (!items.length) {
    drawHeader(1)
    doc.setFontSize(10)
    doc.text('No items', pw / 2, 100, { align: 'center' })
  }

  // Last page: basket/box/pack by
  const lastPageY = ph - 12
  doc.setFontSize(9)
  doc.text(`Basket`, 14, lastPageY)
  doc.text(`:`, 35, lastPageY)
  doc.text(String(order.basket || 0), 40, lastPageY)
  doc.text(`Box`, pw / 3, lastPageY)
  doc.text(`:`, pw / 3 + 15, lastPageY)
  doc.text(String(order.box || 0), pw / 3 + 20, lastPageY)
  doc.text(`Pack`, pw * 2 / 3, lastPageY)
  doc.text(`By :`, pw * 2 / 3 + 12, lastPageY)

  const filename = type === 'PICKING LIST'
    ? `PickingList-${order.salesOrderNumber}.pdf`
    : `DeliveryOrder-${order.salesOrderNumber}.pdf`

  doc.save(filename)
}

export function generatePickingListPdf(order: SalesOrder) {
  generateOrderDocument(order, 'PICKING LIST')
}

export function generateDeliveryOrderPdf(order: SalesOrder) {
  generateOrderDocument(order, 'DELIVERY ORDER')
}
