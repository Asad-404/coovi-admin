import type { Order } from '@/types'
import { formatDate, formatPrice } from '@/utils/format'

// A cell starting with = + - @ can run as a formula when the CSV is opened in Excel, so it is prefixed with a quote.
const csvCell = (value: string | number): string => {
  let text = String(value)
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export const ordersToCsv = (orders: Order[]): string => {
  const header = [
    'Order #',
    'Date',
    'Customer',
    'Phone',
    'Address',
    'Items',
    'Subtotal',
    'Delivery',
    'Total',
    'Status',
    'Payment',
    'Notes',
  ]
  const rows = orders.map((order) => [
    order.orderNumber,
    formatDate(order.createdAt),
    order.customerName,
    order.phone,
    order.address,
    order.items.map((item) => `${item.name} x${item.quantity}`).join('; '),
    order.subtotal,
    order.deliveryFee,
    order.total,
    order.status,
    order.paymentMethod,
    order.notes ?? '',
  ])
  // Leading BOM so Excel reads Bengali names and addresses correctly
  return '﻿' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n')
}

export const downloadCsv = (filename: string, csv: string): void => {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const escapeHtml = (value: string | number): string =>
  String(value).replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`)

// Opens a clean printable slip (invoice + packing list in one) in a new window and starts the print dialog
export const printOrderSlip = (order: Order): void => {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td>${escapeHtml(item.name)}${item.size ? `<br><small>${escapeHtml(item.size)}</small>` : ''}</td>
        <td class="num">${item.quantity}</td>
        <td class="num">${escapeHtml(formatPrice(item.price))}</td>
        <td class="num">${escapeHtml(formatPrice(item.price * item.quantity))}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(order.orderNumber)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 32px; }
  h1 { margin: 0; color: #0c2953; } h2 { margin: 24px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; }
  .row { display: flex; justify-content: space-between; align-items: flex-start; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; font-size: 14px; vertical-align: top; }
  .num { text-align: right; } .total td { font-weight: bold; font-size: 16px; border-bottom: none; }
  .box { border: 1px solid #ddd; padding: 12px; font-size: 14px; line-height: 1.5; }
  .cod { margin-top: 16px; padding: 12px; background: #eef5fb; font-weight: bold; }
</style></head><body>
  <div class="row">
    <div><h1>Coovi</h1><div>Order slip</div></div>
    <div style="text-align:right"><strong>${escapeHtml(order.orderNumber)}</strong><br>${escapeHtml(formatDate(order.createdAt))}<br>Status: ${escapeHtml(order.status)}</div>
  </div>
  <h2>Deliver to</h2>
  <div class="box"><strong>${escapeHtml(order.customerName)}</strong><br>${escapeHtml(order.phone)}<br>${escapeHtml(order.address)}${order.notes ? `<br><em>Note: ${escapeHtml(order.notes)}</em>` : ''}</div>
  <h2>Items</h2>
  <table>
    <thead><tr><th>Saree</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>
    <tbody>${rows}
      <tr><td colspan="3" class="num">Subtotal</td><td class="num">${escapeHtml(formatPrice(order.subtotal))}</td></tr>
      <tr><td colspan="3" class="num">Delivery</td><td class="num">${escapeHtml(formatPrice(order.deliveryFee))}</td></tr>
      <tr class="total"><td colspan="3" class="num">Total to collect</td><td class="num">${escapeHtml(formatPrice(order.total))}</td></tr>
    </tbody>
  </table>
  <div class="cod">Payment: ${escapeHtml(order.paymentMethod)}. Collect ${escapeHtml(formatPrice(order.total))} in cash on delivery.</div>
</body></html>`

  const win = window.open('', '_blank', 'width=800,height=900')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
