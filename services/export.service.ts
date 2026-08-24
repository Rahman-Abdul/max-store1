import * as XLSX from "xlsx";
import type { SalesReport, InventoryReport, StaffPerformance } from "@/types";

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

export function exportSalesToExcel(data: SalesReport[], shopName: string): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map((r) => ({
      Date: r.date,
      "Total Sales": r.totalSales,
      Revenue: r.totalRevenue,
      Cost: r.totalCost,
      Profit: r.totalProfit,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sales");
  downloadWorkbook(wb, `sales-${shopName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportInventoryToExcel(data: InventoryReport[], shopName: string): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map((r) => ({
      Product: r.productName,
      "Opening Stock": r.openingStock,
      Restocked: r.restocked,
      Sold: r.sold,
      Damaged: r.damaged,
      Returned: r.returned,
      "Closing Stock": r.closingStock,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventory");
  downloadWorkbook(wb, `inventory-${shopName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportStaffToExcel(data: StaffPerformance[], shopName: string): void {
  const ws = XLSX.utils.json_to_sheet(
    data.map((s) => ({
      Staff: s.staffName,
      "Total Sales": s.totalSales,
      Revenue: s.totalRevenue,
      Profit: s.totalProfit,
      "Avg. Order Value": s.averageOrderValue,
    }))
  );

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Staff Performance");
  downloadWorkbook(wb, `staff-${shopName}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

export function exportToCSV<T extends Record<string, any>>(data: T[], filename: string): void {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(","));
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
