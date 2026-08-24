import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { SalesReport, StaffPerformance, InventoryReport } from "@/types";

const BRAND_COLOR: [number, number, number] = [37, 99, 235]; // blue-600
const GRAY: [number, number, number] = [107, 114, 128];

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFillColor(...BRAND_COLOR);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("EnterprisePOS", 14, 12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setFontSize(9);
    doc.text(subtitle, 14, 26);
  }
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text(
      `Generated on ${new Date().toLocaleString()} — Page ${i} of ${pageCount}`,
      14,
      doc.internal.pageSize.height - 8
    );
  }
}

export function generateSalesReportPDF(data: SalesReport[], shopName: string): void {
  const doc = new jsPDF();
  addHeader(doc, "Sales Report", shopName);

  const rows = data.map((r) => [
    r.date,
    r.totalSales.toString(),
    `₦${r.totalRevenue.toLocaleString()}`,
    `₦${r.totalCost.toLocaleString()}`,
    `₦${r.totalProfit.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Date", "Sales", "Revenue", "Cost", "Profit"]],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9 },
  });

  addFooter(doc);
  doc.save(`sales-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateInventoryReportPDF(data: InventoryReport[], shopName: string): void {
  const doc = new jsPDF({ orientation: "landscape" });
  addHeader(doc, "Inventory Report", shopName);

  const rows = data.map((r) => [
    r.productName,
    r.openingStock,
    r.restocked,
    r.sold,
    r.damaged,
    r.returned,
    r.closingStock,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Product", "Opening", "Restocked", "Sold", "Damaged", "Returned", "Closing"]],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9 },
  });

  addFooter(doc);
  doc.save(`inventory-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function generateStaffReportPDF(data: StaffPerformance[], shopName: string): void {
  const doc = new jsPDF();
  addHeader(doc, "Staff Performance Report", shopName);

  const rows = data.map((s) => [
    s.staffName,
    s.totalSales,
    `₦${s.totalRevenue.toLocaleString()}`,
    `₦${s.totalProfit.toLocaleString()}`,
    `₦${s.averageOrderValue.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: 35,
    head: [["Staff", "Sales", "Revenue", "Profit", "Avg. Order"]],
    body: rows,
    headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    styles: { fontSize: 9 },
  });

  addFooter(doc);
  doc.save(`staff-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
