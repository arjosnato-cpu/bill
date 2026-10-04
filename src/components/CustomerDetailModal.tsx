import React, { useState } from 'react';
import { Customer, DocumentRecord } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  X,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Package,
  FileText,
  Plus,
  Share2,
  CheckCircle,
  Search,
  CreditCard,
} from 'lucide-react';

interface CustomerDetailModalProps {
  customer: Customer;
  onClose: () => void;
  onCreateBill: (customer: Customer) => void;
  onViewDoc: (doc: DocumentRecord) => void;
  onRecordPayment: (customer: Customer) => void;
  onSendWhatsAppReminder: (customer: Customer, balanceDue: number) => void;
}

export const CustomerDetailModal: React.FC<CustomerDetailModalProps> = ({
  customer,
  onClose,
  onCreateBill,
  onViewDoc,
  onRecordPayment,
  onSendWhatsAppReminder,
}) => {
  const [activeTab, setActiveTab] = useState<'purchases' | 'documents'>('purchases');
  const [itemSearch, setItemSearch] = useState('');

  const history = storage.getCustomerPurchaseHistory(customer.id);

  const filteredItems = history.itemsHistory.filter(i =>
    i.itemName.toLowerCase().includes(itemSearch.toLowerCase()) ||
    i.docNumber.toLowerCase().includes(itemSearch.toLowerCase()) ||
    (i.hsnSacCode && i.hsnSacCode.includes(itemSearch))
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{customer.name}</h2>
              {customer.companyName && (
                <span className="text-xs text-slate-500 font-medium">({customer.companyName})</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1 font-mono">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                {customer.phone}
              </span>
              {customer.email && (
                <span className="flex items-center gap-1 font-sans">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  {customer.email}
                </span>
              )}
              {customer.gstin && (
                <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800">
                  GSTIN: {customer.gstin}
                </span>
              )}
              <span className="flex items-center gap-1 font-sans">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.state} ({customer.stateCode})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateBill(customer)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create Bill</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Financial Scorecard Banner */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b border-indigo-100 grid grid-cols-3 gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Total Purchases (Billed)</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {formatCurrency(history.totalBilled)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-sans block text-[11px]">Total Received (Paid)</span>
            <span className="text-base font-bold text-emerald-700 tabular-nums">
              {formatCurrency(history.totalPaid)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-slate-500 font-sans block text-[11px]">Pending Balance Due</span>
              <span
                className={`text-base font-bold tabular-nums ${
                  history.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                {formatCurrency(history.balanceDue)}
              </span>
            </div>

            {history.balanceDue > 0 && (
              <div className="flex gap-1.5">
                <button
                  onClick={() => onRecordPayment(customer)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 rounded-md text-slate-700 shadow-xs cursor-pointer flex items-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Receive</span>
                </button>
                <button
                  onClick={() => onSendWhatsAppReminder(customer, history.balanceDue)}
                  className="p-1 text-emerald-700 bg-emerald-100 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer"
                  title="Send payment reminder on WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center justify-between px-6 pt-3 border-b border-slate-200 bg-white">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('purchases')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'purchases'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>What They Bought ({history.itemsHistory.length} Items)</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-2 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Invoices & Bills ({history.documents.length})</span>
            </button>
          </div>

          {activeTab === 'purchases' && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search purchased items..."
                value={itemSearch}
                onChange={e => setItemSearch(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-300 rounded-md w-56 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto p-6 flex-1">
          {activeTab === 'purchases' ? (
            <div>
              {filteredItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No item purchase records found for this customer.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">When (Date)</th>
                        <th className="p-3">Bill Number</th>
                        <th className="p-3">What They Bought (Item)</th>
                        <th className="p-3 text-center">HSN</th>
                        <th className="p-3 text-right">Quantity</th>
                        <th className="p-3 text-right">Price Paid</th>
                        <th className="p-3 text-right">Total Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(item.docDate)}
                          </td>
                          <td className="p-3 font-mono font-medium text-indigo-700 whitespace-nowrap">
                            <button
                              onClick={() => {
                                const doc = storage.getDocumentById(item.docId);
                                if (doc) onViewDoc(doc);
                              }}
                              className="hover:underline cursor-pointer"
                            >
                              {item.docNumber}
                            </button>
                          </td>
                          <td className="p-3 font-medium text-slate-900">
                            {item.itemName}
                          </td>
                          <td className="p-3 font-mono text-center text-slate-500">
                            {item.hsnSacCode || '-'}
                          </td>
                          <td className="p-3 font-mono text-right tabular-nums">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="p-3 font-mono text-right tabular-nums text-slate-600">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="p-3 font-mono font-bold text-right tabular-nums text-slate-900">
                            {formatCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div>
              {history.documents.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No invoices created yet for this customer.</p>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Doc No</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-right">Items</th>
                        <th className="p-3 text-right">Total (₹)</th>
                        <th className="p-3 text-right">Paid</th>
                        <th className="p-3 text-right">Balance</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {history.documents.map(doc => (
                        <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3 font-mono font-bold text-indigo-700">
                            {doc.docNumber}
                          </td>
                          <td className="p-3 font-mono text-slate-600">
                            {formatDate(doc.docDate)}
                          </td>
                          <td className="p-3 text-slate-600">
                            {doc.docType === 'tax_invoice'
                              ? 'Tax Invoice'
                              : doc.docType === 'delivery_challan'
                              ? 'Challan'
                              : 'Retail Bill'}
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums text-slate-600">
                            {doc.items.length}
                          </td>
                          <td className="p-3 text-right font-mono font-bold tabular-nums text-slate-900">
                            {formatCurrency(doc.grandTotal)}
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums text-emerald-700">
                            {formatCurrency(doc.paidAmount)}
                          </td>
                          <td className="p-3 text-right font-mono font-bold tabular-nums text-rose-600">
                            {formatCurrency(doc.balanceDue)}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                doc.status === 'paid'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : doc.status === 'partially_paid'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {doc.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => onViewDoc(doc)}
                              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer"
                            >
                              View Bill
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
