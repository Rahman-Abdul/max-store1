"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { getBuyerTypeLabel } from "@/lib/utils";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

interface Props {
  data: Array<{ buyerType: string; count: number; revenue: number }>;
  height?: number;
  dataKey?: "count" | "revenue";
}

export function BuyerPieChart({ data, height = 200, dataKey = "count" }: Props) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
          paddingAngle={3} dataKey={dataKey}
          nameKey="buyerType">
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v, n) => [v, getBuyerTypeLabel(n as string)]} />
        <Legend formatter={(v) => getBuyerTypeLabel(v)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
