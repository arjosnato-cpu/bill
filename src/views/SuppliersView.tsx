import React, { useState } from 'react';
import { Supplier, PurchaseRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  Search,
  Plus,
  Truck,
  Phone,
  ShoppingCart,
  Trash2,
  Edit2,
  CheckCircle,
  FileText,
} from 'lucide-react';

interface SuppliersViewProps {
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  onOpenSupplierModal: (mode: 'supplier' | 'purchase', supplier?: Supplier) => void;
  onRefresh: () => void;
}

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  suppliers,
  purchases,
  onOpenSupplierModal,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'suppliers'>('purchases');
  const [search, setSearch] = useState('');

  const filteredPurchases = purchases.filter(p =>
    p.billNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    p.itemsSummary.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.companyName && s.companyName.toLowerCase().includes(search.toLowerCase())) ||
    s.phone.includes(search) ||
    (s.gstin && s.gstin.toLowerCase().includes(search.toLowerCase()))
  );

  const totalPurchased = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
  const totalPaid = purchases.reduce((acc, p) => acc + p.paidAmount, 0);
  const totalPayable = purchases.reduce((acc, p) => acc + p.balanceDue, 0) +
    suppliers.reduce((acc, s) => acc + (s.openingBalance || 0), 0);
  const totalItc = purchases.filter(p => p.inputTaxCreditEligible).reduce((acc, p) => acc + p.gstAmount, 0);

  const handleDeleteSupplier = (s: Supplier) => {
    if (confirm(`Delete supplier "${s.name}"?`)) {
      storage.deleteSupplier(s.id);
      onRefresh();
    }
  };

  const handleDeletePurchase = (p: PurchaseRecord) => {
    if (confirm(`Delete purchase record "${p.billNumber}"?`)) {
      storage.deletePurchase(p.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Inward Purchases
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatCurrency(totalPurchased)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Raw materials & goods bought</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Paid to Suppliers
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {formatCurrency(totalPaid)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Cleared invoices</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Payables to Suppliers
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums">
            {formatCurrency(totalPayable)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Pending payments to vendors</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            GST Input Tax Credit (ITC)
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">
            {formatCurrency(totalItc)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Tax credit to offset GST liability</div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('purchases')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'purchases'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Inward Purchases ({purchases.length})
              </button>
              <button
                onClick={() => setActiveTab('suppliers')}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  activeTab === 'suppliers'
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Supplier Store ({suppliers.length})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-48 sm:w-60"
              />
            </div>

            <button
              onClick={() => onOpenSupplierModal(activeTab === 'purchases' ? 'purchase' : 'supplier')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{activeTab === 'purchases' ? 'Record Purchase' : 'Add Supplier'}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'purchases' ? (
          filteredPurchases.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No purchase records yet. Record inward supplier bills to track ITC.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Bill Number</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Supplier Name</th>
                    <th className="p-3.5">Items Summary</th>
                    <th className="p-3.5 text-right">Taxable</th>
                    <th className="p-3.5 text-right">GST (ITC)</th>
                    <th className="p-3.5 text-right">Total Bill</th>
                    <th className="p-3.5 text-right">Paid</th>
                    <th className="p-3.5 text-right">Balance</th>
                    <th className="p-3.5 text-center">ITC</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {p.billNumber}
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(p.billDate)}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {p.supplierName}
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs truncate">
                        {p.itemsSummary}
                      </td>
                      <td className="p-3.5 text-right font-mono tabular-nums">
                        {formatCurrency(p.taxableAmount)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-indigo-700 font-semibold tabular-nums">
                        {formatCurrency(p.gstAmount)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCurrency(p.grandTotal)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-700 tabular-nums">
                        {formatCurrency(p.paidAmount)}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        <span className={p.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrency(p.balanceDue)}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          ELIGIBLE
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeletePurchase(p)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          filteredSuppliers.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs">
              <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No suppliers stored yet. Click &quot;Add Supplier&quot; to manage vendor information.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {filteredSuppliers.map(supplier => (
                <div
                  key={supplier.id}
                  className="bg-slate-50/70 rounded-xl border border-slate-200 p-4 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="font-bold text-slate-900 text-sm">{supplier.name}</div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onOpenSupplierModal('supplier', supplier)}
                          className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSupplier(supplier)}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {supplier.companyName && (
                      <div className="text-xs text-slate-500">{supplier.companyName}</div>
                    )}

                    <div className="mt-2 space-y-1 text-xs text-slate-600 font-mono">
                      <div>Ph: {supplier.phone || 'N/A'}</div>
                      {supplier.gstin && (
                        <div className="text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200 inline-block font-bold">
                          GSTIN: {supplier.gstin}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500 font-sans">Payable:</span>
                    <span className="font-bold text-rose-600">{formatCurrency(supplier.openingBalance)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};
