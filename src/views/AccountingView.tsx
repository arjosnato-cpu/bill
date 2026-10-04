import React, { useState } from 'react';
import { storage } from '../services/storage.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart3,
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
} from 'lucide-react';

interface AccountingViewProps {
  onOpenExpenseModal: () => void;
  onRefresh: () => void;
}

export const AccountingView: React.FC<AccountingViewProps> = ({
  onOpenExpenseModal,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<
    'analytics' | 'pnl' | 'gst' | 'daybook' | 'expenses'
  >('analytics');

  const summary = storage.getAccountingSummary();
  const docs = storage.getDocuments();
  const purchases = storage.getPurchases();
  const expenses = storage.getExpenses();
  const payments = storage.getPayments();
  const products = storage.getProducts();

  // 1. Analytics Calculations:
  // Top Selling Items by Revenue
  const itemSalesMap = new Map<string, { name: string; qty: number; revenue: number }>();
  docs
    .filter(d => d.docType !== 'quotation')
    .forEach(d => {
      d.items.forEach(i => {
        const existing = itemSalesMap.get(i.name) || { name: i.name, qty: 0, revenue: 0 };
        existing.qty += i.quantity;
        existing.revenue += i.totalAmount;
        itemSalesMap.set(i.name, existing);
      });
    });

  const topSellingItems = Array.from(itemSalesMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Payment Mode Distribution
  const paymentModeMap = new Map<string, number>();
  docs
    .filter(d => d.docType !== 'quotation')
    .forEach(d => {
      const mode = d.paymentMode || 'cash';
      paymentModeMap.set(mode, (paymentModeMap.get(mode) || 0) + d.paidAmount);
    });

  const paymentModesList = Array.from(paymentModeMap.entries()).map(([mode, amt]) => ({
    mode: mode.replace('_', ' ').toUpperCase(),
    amount: amt,
    percent: summary.totalSalesRevenue > 0 ? (amt / summary.totalSalesRevenue) * 100 : 0,
  }));

  // Expense by Category
  const expenseCatMap = new Map<string, number>();
  expenses.forEach(e => {
    expenseCatMap.set(e.category, (expenseCatMap.get(e.category) || 0) + e.amount);
  });
  const expenseCatsList = Array.from(expenseCatMap.entries()).map(([cat, amt]) => ({
    category: cat,
    amount: amt,
    percent: summary.totalExpenses > 0 ? (amt / summary.totalExpenses) * 100 : 0,
  }));

  // Day Book combined ledger: Inflows (Invoices & Payments in) vs Outflows (Purchases & Expenses)
  const dayBookEntries: {
    id: string;
    date: string;
    title: string;
    description: string;
    type: 'in' | 'out';
    amount: number;
    mode: string;
  }[] = [];

  payments.forEach(p => {
    dayBookEntries.push({
      id: p.id,
      date: p.date,
      title: p.entityName,
      description: p.notes || (p.type === 'in' ? 'Customer Receipt' : 'Supplier Payment'),
      type: p.type,
      amount: p.amount,
      mode: p.paymentMode.toUpperCase(),
    });
  });

  expenses.forEach(e => {
    dayBookEntries.push({
      id: e.id,
      date: e.date,
      title: e.category,
      description: e.description,
      type: 'out',
      amount: e.amount,
      mode: e.paymentMode.toUpperCase(),
    });
  });

  // Sort Day Book newest first
  dayBookEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalCashIn = dayBookEntries
    .filter(e => e.type === 'in')
    .reduce((acc, e) => acc + e.amount, 0);
  const totalCashOut = dayBookEntries
    .filter(e => e.type === 'out')
    .reduce((acc, e) => acc + e.amount, 0);
  const netCashFlow = totalCashIn - totalCashOut;

  const handleDeleteExpense = (id: string) => {
    if (confirm('Delete this expense?')) {
      storage.deleteExpense(id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Analysis Details Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pnl'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Profit & Loss</span>
          </button>

          <button
            onClick={() => setActiveTab('gst')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'gst'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>GST Tax Summary (GSTR-1)</span>
          </button>

          <button
            onClick={() => setActiveTab('daybook')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'daybook'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Day Book (Cash Journal)</span>
          </button>

          <button
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Expenses ({expenses.length})</span>
          </button>
        </div>

        {activeTab === 'expenses' && (
          <button
            onClick={onOpenExpenseModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      {/* ================= 1. ANALYSIS DETAILS DASHBOARD ================= */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Executive Performance Scorecard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Net Operating Profit */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Net Operating Profit
                </span>
                <span
                  className={`inline-flex items-center text-xs font-bold px-1.5 py-0.5 rounded ${
                    summary.netProfit >= 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {summary.netProfit >= 0 ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {summary.profitMargin.toFixed(1)}% margin
                </span>
              </div>
              <div
                className={`text-2xl font-bold font-mono mt-2 tabular-nums ${
                  summary.netProfit >= 0 ? 'text-slate-900' : 'text-rose-600'
                }`}
              >
                {formatCurrency(summary.netProfit)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sales Taxable − Cost of Goods − Overhead
              </p>
            </div>

            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Gross Sales (Taxable)
                </span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                {formatCurrency(summary.totalSalesTaxable)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Total Invoice Gross: {formatCurrency(summary.totalSalesRevenue)}
              </div>
            </div>

            {/* Operating Overheads */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Operational Expenses
                </span>
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
                {formatCurrency(summary.totalExpenses)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Rent, electricity, wages, freight & misc
              </div>
            </div>

            {/* Net GST Payable */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Net GST Payable
                </span>
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-indigo-700 mt-2 tabular-nums">
                {formatCurrency(summary.netGstPayable)}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tax Collected ({formatCurrency(summary.totalSalesTax)}) − ITC ({formatCurrency(summary.inputTaxCredit)})
              </div>
            </div>
          </div>

          {/* Deep Dive Row 1: Top Selling Items & Payment Mode Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Top Products Analysis (7 Cols) */}
            <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Top Selling Products & Revenue Drivers
                  </h3>
                  <p className="text-xs text-slate-500">
                    Highest contributing inventory items from issued bills
                  </p>
                </div>
              </div>

              {topSellingItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No sales recorded yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {topSellingItems.map((item, idx) => {
                    const percentOfTotal = summary.totalSalesRevenue > 0
                      ? (item.revenue / summary.totalSalesRevenue) * 100
                      : 0;

                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-semibold text-slate-800">
                            #{idx + 1} {item.name}
                          </span>
                          <span className="font-mono font-bold text-slate-900 tabular-nums">
                            {formatCurrency(item.revenue)} ({item.qty} sold)
                          </span>
                        </div>
                        {/* Visual Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(8, percentOfTotal))}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          {percentOfTotal.toFixed(1)}% of total revenue
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payment Method Distribution (5 Cols) */}
            <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Collections by Payment Mode
                </h3>
                <p className="text-xs text-slate-500">
                  Cash vs UPI vs Bank Transfer share
                </p>
              </div>

              <div className="space-y-4">
                {paymentModesList.map((m, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{m.mode}</span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(m.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          m.mode.includes('BANK')
                            ? 'bg-blue-600'
                            : m.mode.includes('UPI')
                            ? 'bg-emerald-600'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, m.percent))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="font-sans">Total Collected:</span>
                  <span className="font-bold text-emerald-700">
                    {formatCurrency(summary.totalSalesRevenue - summary.totalReceivables)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-sans">Pending Customer Balance:</span>
                  <span className="font-bold text-rose-600">
                    {formatCurrency(summary.totalReceivables)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Deep Dive Row 2: Expense Distribution & Cash Flow Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Operational Overheads breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Operational Overhead Cost Breakdown
                </h3>
                <p className="text-xs text-slate-500">
                  Where your business spends its operational capital
                </p>
              </div>

              <div className="space-y-3">
                {expenseCatsList.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                    <span className="font-semibold text-slate-800">{cat.category}</span>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900">{formatCurrency(cat.amount)}</span>
                      <span className="text-[10px] text-slate-500 block">
                        {cat.percent.toFixed(1)}% of expenses
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cash Flow Summary */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h3 className="font-bold text-slate-900 text-sm">
                  Net Cash Flow Velocity (Inflow vs Outflow)
                </h3>
                <p className="text-xs text-slate-500">
                  Total realized cash inflow against outward payments
                </p>
              </div>

              <div className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="font-sans font-semibold text-emerald-800 block">
                      Total Realized Cash-In
                    </span>
                    <span className="text-[10px] text-emerald-600">Customer payments & receipts</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-700">
                    +{formatCurrency(totalCashIn)}
                  </span>
                </div>

                <div className="p-3 bg-rose-50 rounded-lg border border-rose-100 flex items-center justify-between">
                  <div>
                    <span className="font-sans font-semibold text-rose-800 block">
                      Total Cash-Out
                    </span>
                    <span className="text-[10px] text-rose-600">Supplier payments & operating overhead</span>
                  </div>
                  <span className="text-lg font-bold text-rose-700">
                    −{formatCurrency(totalCashOut)}
                  </span>
                </div>

                <div className="p-4 bg-slate-900 text-white rounded-lg flex items-center justify-between">
                  <div>
                    <span className="font-sans font-bold text-sm block">Net Cash Surplus / (Deficit)</span>
                    <span className="text-[11px] text-slate-400">Total liquid liquidity position</span>
                  </div>
                  <span
                    className={`text-xl font-bold ${
                      netCashFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCurrency(netCashFlow)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= 2. PROFIT & LOSS STATEMENT (P&L) ================= */}
      {activeTab === 'pnl' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900">
              Statement of Profit & Loss (P&L)
            </h3>
            <p className="text-xs text-slate-500">
              Comprehensive financial performance breakdown for the business
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b-2 border-slate-800 text-left font-sans font-bold text-slate-700 text-sm">
                  <th className="py-2">Particulars</th>
                  <th className="py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* 1. Revenue */}
                <tr className="bg-slate-50 font-sans font-bold text-slate-800">
                  <td className="py-2.5">I. REVENUE FROM OPERATIONS</td>
                  <td className="py-2.5 text-right font-mono"></td>
                </tr>
                <tr>
                  <td className="py-2 pl-4 text-slate-600">Gross Invoiced Revenue (Sales)</td>
                  <td className="py-2 text-right">{formatCurrency(summary.totalSalesRevenue)}</td>
                </tr>
                <tr>
                  <td className="py-2 pl-4 text-slate-600">Less: GST Tax Collected (Payable to Govt)</td>
                  <td className="py-2 text-right text-rose-600">
                    −{formatCurrency(summary.totalSalesTax)}
                  </td>
                </tr>
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2 font-sans text-slate-900">Net Taxable Revenue (A)</td>
                  <td className="py-2 text-right text-indigo-700">
                    {formatCurrency(summary.totalSalesTaxable)}
                  </td>
                </tr>

                {/* 2. Cost of Sales */}
                <tr className="bg-slate-50 font-sans font-bold text-slate-800">
                  <td className="py-2.5">II. COST OF GOODS SOLD (COGS)</td>
                  <td className="py-2.5 text-right font-mono"></td>
                </tr>
                <tr>
                  <td className="py-2 pl-4 text-slate-600">Inward Supplies / Purchases (Taxable)</td>
                  <td className="py-2 text-right">{formatCurrency(summary.totalPurchasesTaxable)}</td>
                </tr>
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2 font-sans text-slate-900">Total Cost of Goods (B)</td>
                  <td className="py-2 text-right text-slate-800">
                    {formatCurrency(summary.totalPurchasesTaxable)}
                  </td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-indigo-50/60 font-bold border-t-2 border-indigo-200 text-indigo-950">
                  <td className="py-2.5 font-sans">GROSS PROFIT (A − B)</td>
                  <td className="py-2.5 text-right font-mono text-sm">
                    {formatCurrency(summary.totalSalesTaxable - summary.totalPurchasesTaxable)}
                  </td>
                </tr>

                {/* 3. Operating Expenses */}
                <tr className="bg-slate-50 font-sans font-bold text-slate-800">
                  <td className="py-2.5">III. OPERATIONAL EXPENSES</td>
                  <td className="py-2.5 text-right font-mono"></td>
                </tr>
                {expenseCatsList.map((e, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pl-4 text-slate-600">{e.category}</td>
                    <td className="py-2 text-right">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
                <tr className="font-bold border-t border-slate-200">
                  <td className="py-2 font-sans text-slate-900">Total Operating Expenses (C)</td>
                  <td className="py-2 text-right text-rose-600">
                    {formatCurrency(summary.totalExpenses)}
                  </td>
                </tr>

                {/* NET PROFIT */}
                <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-sm">
                  <td className="py-3 px-2 font-sans">
                    NET PROFIT BEFORE TAX (Gross Profit − C)
                  </td>
                  <td className="py-3 px-2 text-right font-mono text-emerald-400 text-base">
                    {formatCurrency(summary.netProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 3. GST TAX SUMMARY (GSTR-1 & ITC) ================= */}
      {activeTab === 'gst' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
          <div className="border-b border-slate-200 pb-3 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                GST Tax Liability & Input Tax Credit (ITC) Report
              </h3>
              <p className="text-xs text-slate-500">
                Data formatted to assist with filing GSTR-1, GSTR-3B, and tax calculation
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-500 block">Net GST Payable:</span>
              <span className="text-lg font-bold font-mono text-indigo-700">
                {formatCurrency(summary.netGstPayable)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Outward Taxable Value</span>
              <span className="text-xl font-bold font-mono text-slate-900">
                {formatCurrency(summary.totalSalesTaxable)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">From sales invoices</span>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Total GST Collected (Output Tax)</span>
              <span className="text-xl font-bold font-mono text-rose-600">
                {formatCurrency(summary.totalSalesTax)}
              </span>
              <div className="text-[10px] text-slate-600 font-mono mt-1">
                CGST: {formatCurrency(summary.cgstCollected)} | SGST: {formatCurrency(summary.sgstCollected)} | IGST: {formatCurrency(summary.igstCollected)}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-xs text-slate-500 block">Input Tax Credit (ITC Available)</span>
              <span className="text-xl font-bold font-mono text-emerald-600">
                {formatCurrency(summary.inputTaxCredit)}
              </span>
              <span className="text-[11px] text-slate-500 block mt-1">From inward purchase bills</span>
            </div>
          </div>

          {/* Tax Breakdown Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Tax Component</th>
                  <th className="p-3 text-right">Output Tax (Sales)</th>
                  <th className="p-3 text-right">Input Tax Credit (Purchases)</th>
                  <th className="p-3 text-right">Net Tax Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-800">
                    Central Tax (CGST)
                  </td>
                  <td className="p-3 text-right">{formatCurrency(summary.cgstCollected)}</td>
                  <td className="p-3 text-right text-emerald-600">
                    {formatCurrency(summary.inputTaxCredit / 2)}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatCurrency(Math.max(0, summary.cgstCollected - summary.inputTaxCredit / 2))}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-800">
                    State Tax (SGST)
                  </td>
                  <td className="p-3 text-right">{formatCurrency(summary.sgstCollected)}</td>
                  <td className="p-3 text-right text-emerald-600">
                    {formatCurrency(summary.inputTaxCredit / 2)}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatCurrency(Math.max(0, summary.sgstCollected - summary.inputTaxCredit / 2))}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-800">
                    Integrated Tax (IGST - Inter-state)
                  </td>
                  <td className="p-3 text-right">{formatCurrency(summary.igstCollected)}</td>
                  <td className="p-3 text-right text-emerald-600">₹0.00</td>
                  <td className="p-3 text-right font-bold text-slate-900">
                    {formatCurrency(summary.igstCollected)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-bold font-sans">
                  <td className="p-3">TOTAL GST PAYABLE</td>
                  <td className="p-3 text-right font-mono">{formatCurrency(summary.totalSalesTax)}</td>
                  <td className="p-3 text-right font-mono text-emerald-600">
                    {formatCurrency(summary.inputTaxCredit)}
                  </td>
                  <td className="p-3 text-right font-mono text-indigo-700 text-sm">
                    {formatCurrency(summary.netGstPayable)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 4. DAY BOOK (CASH JOURNAL) ================= */}
      {activeTab === 'daybook' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Day Book (Daily Cash & Bank Ledger)
              </h3>
              <p className="text-xs text-slate-500">
                Chronological record of every cash-in and cash-out transaction
              </p>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <span className="text-emerald-700 font-bold">
                In: {formatCurrency(totalCashIn)}
              </span>
              <span className="text-rose-700 font-bold">
                Out: {formatCurrency(totalCashOut)}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Party / Account</th>
                  <th className="p-3">Particulars & Description</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Inflow (₹)</th>
                  <th className="p-3 text-right">Outflow (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {dayBookEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {formatDate(entry.date)}
                    </td>
                    <td className="p-3 font-sans font-semibold text-slate-900">
                      {entry.title}
                    </td>
                    <td className="p-3 font-sans text-slate-600">
                      {entry.description}
                    </td>
                    <td className="p-3">
                      <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                        {entry.mode}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-700 tabular-nums">
                      {entry.type === 'in' ? formatCurrency(entry.amount) : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-rose-600 tabular-nums">
                      {entry.type === 'out' ? formatCurrency(entry.amount) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= 5. OPERATIONAL EXPENSES ================= */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-slate-900">Business Expenses Log</h3>
              <p className="text-xs text-slate-500">
                Track overhead costs like rent, utilities, freight, and wages
              </p>
            </div>
            <button
              onClick={onOpenExpenseModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Expense</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Voucher / Ref</th>
                  <th className="p-3">Mode</th>
                  <th className="p-3 text-right">Amount (₹)</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(exp => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(exp.date)}
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {exp.category}
                    </td>
                    <td className="p-3 text-slate-600 max-w-sm">
                      {exp.description}
                    </td>
                    <td className="p-3 font-mono text-slate-500">
                      {exp.receiptNo || '—'}
                    </td>
                    <td className="p-3 font-mono uppercase text-[11px]">
                      {exp.paymentMode}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
