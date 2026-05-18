"use client";

import { useMemo } from "react";
import { 
  LineChart as RechartsLineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar,
  AreaChart as RechartsAreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import { motion } from "framer-motion";
import { cn } from "@/app/lib/utils";

const COLORS = ["#a78bfa", "#4ade80", "#60a5fa", "#fbbf24", "#f87171", "#fb7185", "#22d3ee", "#a855f7"];

interface ChartContainerProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  headerContent?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: "default" | "glass" | "minimal";
  noPadding?: boolean;
}

function ChartContainer({ children, className, title, subtitle, action, headerContent, footer, variant = "default", noPadding = false }: ChartContainerProps) {
  const variantStyles = {
    default: "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
    glass: "bg-[rgba(24,24,27,0.8)] backdrop-blur-xl border border-[var(--color-border)]",
    minimal: "bg-transparent",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(variantStyles[variant], "rounded-2xl", className)}
    >
      {(title || action || headerContent) && (
        <div className={cn("flex items-center justify-between mb-6", noPadding ? "px-6 pt-6" : "p-6")}>
          <div className="flex-1">
            {title && <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>}
            {subtitle && <p className="text-sm text-[var(--color-text-tertiary)] mt-1">{subtitle}</p>}
            {headerContent}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className={cn(noPadding ? "" : "px-6 pb-6")}>
        {children}
      </div>
      {footer && (
        <div className={cn("border-t border-[var(--color-border)]", noPadding ? "px-6 py-4" : "px-6 py-4")}>
          {footer}
        </div>
      )}
    </motion.div>
  );
}

interface LineChartProps {
  data: any[];
  dataKey: string | string[];
  xKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  animated?: boolean;
  gradient?: boolean;
  dot?: boolean;
  dotSize?: number;
  curveType?: "monotone" | "linear" | "basis";
}

function LineChart({ 
  data, 
  dataKey, 
  xKey = "name", 
  colors = ["#a78bfa", "#4ade80"],
  showGrid = true, 
  showTooltip = true, 
  showLegend = false,
  height = 300,
  animated = true,
  gradient = true,
  dot = false,
  dotSize = 4,
  curveType = "monotone"
}: LineChartProps) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.06)" 
            vertical={false}
          />
        )}
        <XAxis 
          dataKey={xKey} 
          stroke="#71717a" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        {showTooltip && (
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(24, 24, 27, 0.95)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
            labelStyle={{ color: "#fafafa", fontWeight: 600, marginBottom: 8 }}
            itemStyle={{ color: "#a1a1aa" }}
          />
        )}
        {showLegend && <Legend />}
        {keys.map((key, i) => (
          <Line
            key={key}
            type={curveType}
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={dot}
            activeDot={{ r: 6, fill: colors[i % colors.length], stroke: "#0a0a0b", strokeWidth: 2 }}
            animationDuration={animated ? 1000 : 0}
            animationEasing="ease-out"
          >
            {gradient && (
              <defs>
                <linearGradient id={`gradient-${key}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={1} />
                </linearGradient>
              </defs>
            )}
          </Line>
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}

interface AreaChartProps {
  data: any[];
  dataKey: string | string[];
  xKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  stacked?: boolean;
  gradient?: boolean;
  gradientOpacity?: number[];
}

function AreaChart({ 
  data, 
  dataKey, 
  xKey = "name", 
  colors = ["#a78bfa", "#4ade80"],
  showGrid = true, 
  showTooltip = true, 
  showLegend = false,
  height = 300,
  stacked = false,
  gradient = true,
  gradientOpacity = [0.4, 0]
}: AreaChartProps) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((key, i) => (
            <linearGradient key={key} id={`areaGradient-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={gradientOpacity[0]} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={gradientOpacity[1]} />
            </linearGradient>
          ))}
        </defs>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.06)" 
            vertical={false}
          />
        )}
        <XAxis 
          dataKey={xKey} 
          stroke="#71717a" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dy={10}
        />
        <YAxis 
          stroke="#71717a" 
          fontSize={12}
          tickLine={false}
          axisLine={false}
          dx={-10}
        />
        {showTooltip && (
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(24, 24, 27, 0.95)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
            labelStyle={{ color: "#fafafa", fontWeight: 600 }}
            itemStyle={{ color: "#a1a1aa" }}
          />
        )}
        {showLegend && <Legend />}
        {keys.map((key, i) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            fill={`url(#areaGradient-${key})`}
            stackId={stacked ? "stack" : undefined}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

interface BarChartProps {
  data: any[];
  dataKey: string | string[];
  xKey?: string;
  colors?: string[];
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  height?: number;
  horizontal?: boolean;
  stacked?: boolean;
  barSize?: number;
  rounded?: boolean;
}

function BarChart({ 
  data, 
  dataKey, 
  xKey = "name", 
  colors = ["#a78bfa"],
  showGrid = true, 
  showTooltip = true, 
  showLegend = false,
  height = 300,
  horizontal = false,
  stacked = false,
  barSize = 20,
  rounded = true
}: BarChartProps) {
  const keys = Array.isArray(dataKey) ? dataKey : [dataKey];
  
  const ChartComponent = horizontal ? ComposedChart : RechartsBarChart;
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={data} layout={horizontal ? "vertical" : "horizontal"} margin={{ top: 10, right: 20, left: horizontal ? 60 : 0, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(255,255,255,0.06)" 
            horizontal={!horizontal}
            vertical={horizontal}
          />
        )}
        {horizontal ? (
          <>
            <XAxis type="number" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey={xKey} stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} width={80} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dy={10} />
            <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
          </>
        )}
        {showTooltip && (
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "rgba(24, 24, 27, 0.95)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: "12px",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)"
            }}
            labelStyle={{ color: "#fafafa", fontWeight: 600 }}
            itemStyle={{ color: "#a1a1aa" }}
            cursor={{ fill: "rgba(255,255,255,0.05)" }}
          />
        )}
        {showLegend && <Legend />}
        {keys.map((key, i) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[i % colors.length]}
            radius={rounded ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            stackId={stacked ? "stack" : undefined}
            barSize={barSize}
          />
        ))}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

interface DonutChartProps {
  data: any[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  height?: number;
  showTooltip?: boolean;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  showLabels?: boolean;
  centerLabel?: string;
  centerValue?: string | number;
}

function DonutChart({ 
  data, 
  nameKey = "name", 
  valueKey = "value", 
  colors = COLORS,
  height = 300,
  showTooltip = true,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 100,
  showLabels = false,
  centerLabel,
  centerValue
}: DonutChartProps) {
  const total = useMemo(() => data.reduce((acc: number, item: any) => acc + item[valueKey], 0), [data, valueKey]);

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey={valueKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          {showTooltip && (
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "rgba(24, 24, 27, 0.95)", 
                border: "1px solid rgba(255,255,255,0.1)", 
                borderRadius: "12px"
              }}
              formatter={(value: number) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, ""]}
            />
          )}
          {showLegend && (
            <Legend 
              verticalAlign="middle" 
              align="right"
              layout="vertical"
              formatter={(value) => <span className="text-[var(--color-text-secondary)] text-sm">{value}</span>}
            />
          )}
        </PieChart>
      </ResponsiveContainer>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && <span className="text-2xl font-bold text-[var(--color-text-primary)]">{centerValue}</span>}
          {centerLabel && <span className="text-sm text-[var(--color-text-tertiary)]">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

interface FunnelChartComponentProps {
  data: any[];
  nameKey?: string;
  valueKey?: string;
  colors?: string[];
  height?: number;
}

function FunnelChartComponent({ 
  data, 
  nameKey = "name", 
  valueKey = "value", 
  colors = COLORS,
  height = 300
}: FunnelChartComponentProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <FunnelChart>
        <Tooltip 
          contentStyle={{ 
            backgroundColor: "rgba(24, 24, 27, 0.95)", 
            border: "1px solid rgba(255,255,255,0.1)", 
            borderRadius: "12px"
          }}
        />
        <Funnel
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          fill={colors[0]}
        >
          <LabelList
            position="right"
            fill="#a1a1aa"
            stroke="none"
            dataKey={nameKey}
          />
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
}

function Sparkline({ data, color = "#a78bfa", height = 40, width = 100, strokeWidth = 2 }: SparklineProps) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={`sparkline-gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  sparklineData?: number[];
  variant?: "default" | "gradient" | "glass";
  className?: string;
}

function StatCard({ label, value, change, changeLabel, icon, trend, sparklineData, variant = "default", className }: StatCardProps) {
  const isPositive = trend === "up" || (change !== undefined && change > 0);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "rounded-2xl p-5",
        variant === "default" && "bg-[var(--color-bg-secondary)] border border-[var(--color-border)]",
        variant === "gradient" && "bg-gradient-to-br from-[var(--color-bg-secondary)] to-[var(--color-bg-tertiary)] border border-[var(--color-border)]",
        variant === "glass" && "bg-[rgba(24,24,27,0.8)] backdrop-blur-xl border border-[var(--color-border)]",
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        {icon && (
          <div className="p-2.5 rounded-xl bg-[var(--color-purple-dim)]">
            {icon}
          </div>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
            isPositive ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"
          )}>
            {trend === "up" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            )}
            {trend === "down" && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            )}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)] mb-1">{value}</div>
      <div className="text-sm text-[var(--color-text-tertiary)]">{label}</div>
      {change !== undefined && (
        <div className={cn(
          "text-xs mt-2 font-medium",
          isPositive ? "text-green-400" : "text-red-400"
        )}>
          {isPositive ? "+" : ""}{change}%{changeLabel && ` ${changeLabel}`}
        </div>
      )}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-3 h-8">
          <Sparkline data={sparklineData} color={isPositive ? "#4ade80" : "#f87171"} height={32} />
        </div>
      )}
    </motion.div>
  );
}

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
}

function MiniChart({ data, color = "#a78bfa", height = 40 }: MiniChartProps) {
  const chartData = data.map((v, i) => ({ name: i, value: v }));
  
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart
        data={chartData}
        dataKey="value"
        colors={[color]}
        showGrid={false}
        showTooltip={false}
        showLegend={false}
        height={height}
        gradient={true}
      />
    </ResponsiveContainer>
  );
}

export { 
  ChartContainer,
  LineChart, 
  AreaChart, 
  BarChart,
  DonutChart,
  FunnelChartComponent,
  Sparkline,
  StatCard,
  MiniChart
};