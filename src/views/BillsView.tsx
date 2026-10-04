import React, { useState } from 'react';
import { DocumentRecord, DocumentType, DocumentStatus } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  Search,
  Plus,
  Eye,
  Share2,
  Trash2,
  ArrowRightLeft,
  FileText,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface BillsViewProps {
  documents: DocumentRecord[];
  onOpenCreateBill: (type?: DocumentType) => void;
  onOpenScanBill?: () => void;
  onViewDoc: (doc: DocumentRecord) => void;
  onShareWhatsApp: (doc: DocumentRecord) => void;
  onRecordPayment: (doc: DocumentRecord) => void;
  onRefresh: () => void;
}

export const BillsView: React.FC<BillsViewProps> = ({
  documents,
  onOpenCreateBill,
  onOpenScanBill,
  onViewDoc,
  onShareWhatsApp,
  onRecordPayment,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'b2b_only' | DocumentType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | DocumentStatus>('all');

  const filteredDocs = documents.filter(doc => {
    // B2B filter
    if (typeFilter === 'b2b_only' && !doc.customerGstin && !doc.isB2B) return false;
    // Type filter
    if (typeFilter !== 'all' && typeFilter !== 'b2b_only' && doc.docType !== typeFilter) return false;
    // Status filter
    if (statusFilter !== 'all' && doc.status !== statusFilter) return false;
    // Search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchNum = doc.docNumber.toLowerCase().includes(q);
      const matchCust = doc.customerName.toLowerCase().includes(q);
      const matchPhone = doc.customerPhone.includes(q);
      const matchGst = doc.customerGstin?.toLowerCase().includes(q);
      const matchPo = doc.poNumber?.toLowerCase().includes(q);
      return matchNum || matchCust || matchPhone || matchGst || matchPo;
    }
    return true;
  });

  const handleConvertQuote = (doc: DocumentRecord) => {
    if (confirm(`Convert Quotation ${doc.docNumber} to B2B GST Tax Invoice?`)) {
      const newDoc = storage.convertQuotationToInvoice(doc.id, 'tax_invoice');
      if (newDoc) {
        onRefresh();
        onViewDoc(newDoc);
      }
    }
  };

  const handleDelete = (doc: DocumentRecord) => {
    if (confirm(`Delete ${doc.docNumber}?`)) {
      storage.deleteDocument(doc.id);
      onRefresh();
    }
  };

  // Metrics
  const totalBilled = documents
    .filter(d => d.docType !== 'quotation')
    .reduce((acc, d) => acc + d.grandTotal, 0);
  const totalReceived = documents
    .filter(d => d.docType !== 'quotation')
    .reduce((acc, d) => acc + d.paidAmount, 0);
  const totalPending = documents
    .filter(d => d.docType !== 'quotation')
    .reduce((acc, d) => acc + d.balanceDue, 0);

  const b2bInvoicesCount = documents.filter(
    d => (d.docType === 'tax_invoice' || d.docType === 'invoice_cum_challan') && (d.customerGstin || d.isB2B)
  ).length;

  const demoDoc = documents.find(d => d.id === 'doc-aloka-20');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Featured Demo Bill Banner from User's Voucher */}
      {demoDoc && (
        <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-wider bg-white/20 px-2 py-0.5 rounded">
                Verified Paper Bill Demo
              </span>
              <span className="font-mono text-xs font-bold text-blue-200">
                INVOICE CUM CHALLAN #{demoDoc.docNumber}
              </span>
            </div>
            <div className="text-sm font-bold mt-1 text-white truncate">
              ALOKA VALVES MFG. CO. → {demoDoc.customerName}
            </div>
            <div className="text-[11px] text-blue-200 font-mono flex items-center gap-2 mt-0.5 flex-wrap">
              <span>Vehicle: {demoDoc.vehicleNo}</span>
              <span>·</span>
              <span>E-Way: {demoDoc.eWayBillNo}</span>
              <span>·</span>
              <span className="font-bold text-emerald-300">{formatCurrency(demoDoc.grandTotal)} (CGST 9% + SGST 9%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onViewDoc(demoDoc)}
              className="flex-1 sm:flex-none min-h-[38px] px-4 py-2 text-xs font-bold bg-white text-indigo-900 hover:bg-blue-50 active:scale-98 rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-indigo-700" />
              <span>View & Print Demo Bill</span>
            </button>
            <button
              onClick={() => onShareWhatsApp(demoDoc)}
              className="min-h-[38px] px-3 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 active:scale-98 text-white rounded-lg shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1"
              title="Share on WhatsApp"
            >
              <Share2 className="w-4 h-4" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Metrics Cards - Responsive Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total B2B Invoiced
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatCurrency(totalBilled)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
            {documents.filter(d => d.docType !== 'quotation').length} bills ({b2bInvoicesCount} B2B GST)
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Collected
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {formatCurrency(totalReceived)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
            Bank, UPI, & Cash
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Credit Receivables
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums">
            {formatCurrency(totalPending)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
            Pending buyer balance
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Challans & Quotes
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">
            {documents.filter(d => d.docType === 'delivery_challan' || d.docType === 'quotation').length}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
            Dispatches & active quotes
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Controls: Search, Type Tabs, Status Filter */}
        <div className="p-3 sm:p-5 border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search party, GSTIN, invoice#, PO#..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Quick Actions & Status dropdown */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium flex-1 sm:flex-none"
              >
                <option value="all">All Payment Status</option>
                <option value="unpaid">Unpaid / Credit Due</option>
                <option value="partially_paid">Partially Paid</option>
                <option value="paid">Paid in Full</option>
              </select>

              {onOpenScanBill && (
                <button
                  onClick={onOpenScanBill}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-all active:scale-98 cursor-pointer shrink-0"
                  title="Scan paper invoice or old bill using camera / photo"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Scan Bill</span>
                </button>
              )}

              <button
                onClick={() => onOpenCreateBill('tax_invoice')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Bill</span>
              </button>
            </div>
          </div>

          {/* Quick Segmented B2B Tabs (Touch-friendly scroll) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                typeFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Bills ({documents.length})
            </button>

            <button
              onClick={() => setTypeFilter('b2b_only')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 flex items-center gap-1 ${
                typeFilter === 'b2b_only'
                  ? 'bg-indigo-600 text-white'
                  : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100'
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              <span>B2B GST ({b2bInvoicesCount})</span>
            </button>

            <button
              onClick={() => setTypeFilter('tax_invoice')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                typeFilter === 'tax_invoice'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Tax Invoices
            </button>

            <button
              onClick={() => setTypeFilter('delivery_challan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                typeFilter === 'delivery_challan'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Challans
            </button>

            <button
              onClick={() => setTypeFilter('quotation')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                typeFilter === 'quotation'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Quotations
            </button>
          </div>
        </div>

        {/* Empty State */}
        {filteredDocs.length === 0 ? (
          <div className="p-8 sm:p-14 text-center text-slate-500 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <p className="font-bold text-sm text-slate-800">No invoices or bills yet</p>
            <p className="mt-1 text-slate-500 max-w-sm mx-auto">
              Your database is clean and ready. Create your first GST tax invoice, delivery challan, or cash bill.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2.5 flex-wrap">
              <button
                onClick={() => onOpenCreateBill('tax_invoice')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Bill</span>
              </button>
              {onOpenScanBill && (
                <button
                  onClick={onOpenScanBill}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl shadow-xs hover:bg-indigo-50 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>Scan Old Bill (Camera/Photo)</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* ================= MOBILE VIEW: TOUCH-FRIENDLY B2B CARDS ================= */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredDocs.map(doc => {
                const isPaid = doc.status === 'paid';
                const isPartial = doc.status === 'partially_paid';

                return (
                  <div
                    key={doc.id}
                    className="p-3.5 space-y-2.5 active:bg-slate-50 transition-colors"
                  >
                    {/* Top Row: Party Name & Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4
                            onClick={() => onViewDoc(doc)}
                            className="font-bold text-slate-900 text-sm hover:text-indigo-600 truncate cursor-pointer"
                          >
                            {doc.customerName}
                          </h4>
                        </div>

                        {/* GSTIN badge & PO # */}
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5 flex-wrap">
                          {doc.customerGstin ? (
                            <span className="bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                              GST: {doc.customerGstin}
                            </span>
                          ) : (
                            <span className="text-slate-400">Retail / Cash</span>
                          )}
                          {doc.poNumber && (
                            <span className="bg-slate-100 text-slate-700 px-1 py-0.2 rounded">
                              PO: {doc.poNumber}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right shrink-0">
                        <div className="text-base font-bold font-mono text-slate-900 tabular-nums">
                          {formatCurrency(doc.grandTotal)}
                        </div>
                        {doc.balanceDue > 0 ? (
                          <div className="text-[11px] font-mono font-bold text-rose-600">
                            Due: {formatCurrency(doc.balanceDue)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-emerald-600 font-bold">
                            FULL PAID
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Middle Row: Doc Number, Date, Status */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-700">{doc.docNumber}</span>
                        <span>·</span>
                        <span>{formatDate(doc.docDate)}</span>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isPaid
                            ? 'bg-emerald-100 text-emerald-800'
                            : isPartial
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Touch Action Bar (Min touch targets 44px) */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      {/* View / Print */}
                      <button
                        onClick={() => onViewDoc(doc)}
                        className="min-h-[38px] px-3 text-xs font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>View / Print</span>
                      </button>

                      {/* WhatsApp Direct */}
                      <button
                        onClick={() => onShareWhatsApp(doc)}
                        className="min-h-[38px] px-3 text-xs font-semibold text-emerald-700 bg-emerald-50 active:bg-emerald-100 border border-emerald-200 rounded-lg flex items-center gap-1.5 cursor-pointer"
                      >
                        <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Record payment */}
                      {doc.balanceDue > 0 && doc.docType !== 'quotation' && (
                        <button
                          onClick={() => onRecordPayment(doc)}
                          className="min-h-[38px] px-3 text-xs font-semibold text-white bg-indigo-600 active:bg-indigo-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Receive</span>
                        </button>
                      )}

                      {/* Quotation convert */}
                      {doc.docType === 'quotation' && doc.status !== 'converted' && (
                        <button
                          onClick={() => handleConvertQuote(doc)}
                          className="min-h-[38px] px-3 text-xs font-semibold text-white bg-indigo-600 active:bg-indigo-700 rounded-lg flex items-center gap-1.5 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>To Invoice</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ================= DESKTOP VIEW: HIGH-DENSITY B2B TABLE ================= */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5">Bill Number</th>
                    <th className="p-3.5">Date & Due</th>
                    <th className="p-3.5">Buyer / Party Name & GSTIN</th>
                    <th className="p-3.5">PO Number</th>
                    <th className="p-3.5 text-right">Taxable</th>
                    <th className="p-3.5 text-right">GST Tax</th>
                    <th className="p-3.5 text-right">Total Bill</th>
                    <th className="p-3.5 text-right">Balance Due</th>
                    <th className="p-3.5 text-center">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDocs.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        <button
                          onClick={() => onViewDoc(doc)}
                          className="hover:underline cursor-pointer"
                        >
                          {doc.docNumber}
                        </button>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        <div>{formatDate(doc.docDate)}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{doc.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                          {doc.customerGstin ? (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-200 font-bold">
                              GST: {doc.customerGstin}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Unregistered B2C</span>
                          )}
                          <span>{doc.customerPhone}</span>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {doc.poNumber ? (
                          <span className="font-semibold text-slate-800">{doc.poNumber}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-mono tabular-nums text-slate-600">
                        {formatCurrency(doc.totalTaxable)}
                      </td>

                      <td className="p-3.5 text-right font-mono tabular-nums text-indigo-700 font-medium">
                        {formatCurrency(doc.totalTax)}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold tabular-nums text-slate-900 whitespace-nowrap">
                        {formatCurrency(doc.grandTotal)}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                        <span className={doc.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                          {formatCurrency(doc.balanceDue)}
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            doc.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.status === 'partially_paid'
                              ? 'bg-amber-100 text-amber-800'
                              : doc.status === 'converted'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {doc.status.toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onViewDoc(doc)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                            title="View & Print Bill"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => onShareWhatsApp(doc)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Share direct on WhatsApp"
                          >
                            <Share2 className="w-4 h-4" />
                          </button>

                          {doc.balanceDue > 0 && doc.docType !== 'quotation' && (
                            <button
                              onClick={() => onRecordPayment(doc)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                              title="Record Payment Receipt"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}

                          {doc.docType === 'quotation' && doc.status !== 'converted' && (
                            <button
                              onClick={() => handleConvertQuote(doc)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                              title="Convert to GST Tax Invoice"
                            >
                              <ArrowRightLeft className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
