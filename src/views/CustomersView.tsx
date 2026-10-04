import React, { useState } from 'react';
import { Customer } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency } from '../utils/formatters.ts';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  FileText,
  Clock,
  Edit2,
  Trash2,
  Users,
  CreditCard,
  Share2,
} from 'lucide-react';

interface CustomersViewProps {
  customers: Customer[];
  onOpenCustomerDetail: (customer: Customer) => void;
  onOpenCreateBill: (customer?: Customer) => void;
  onOpenEditCustomer: (customer?: Customer) => void;
  onRecordPayment: (customer: Customer) => void;
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  onOpenCustomerDetail,
  onOpenCreateBill,
  onOpenEditCustomer,
  onRecordPayment,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = customers.filter(c => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      c.phone.includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      c.state.toLowerCase().includes(q)
    );
  });

  const handleDelete = (c: Customer) => {
    if (confirm(`Are you sure you want to delete customer "${c.name}"?`)) {
      storage.deleteCustomer(c.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer by name, phone, GSTIN, city..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          onClick={() => onOpenEditCustomer()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Customers List Cards */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-slate-200 text-slate-500 text-xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">No customers found</p>
          <p className="mt-1">Add your clients to track what they buy, when they buy, and ledger balance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(customer => {
            const history = storage.getCustomerPurchaseHistory(customer.id);
            return (
              <div
                key={customer.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        onClick={() => onOpenCustomerDetail(customer)}
                        className="font-bold text-slate-900 text-sm hover:text-indigo-600 cursor-pointer"
                      >
                        {customer.name}
                      </h3>
                      {customer.companyName && (
                        <div className="text-xs text-slate-500">{customer.companyName}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditCustomer(customer)}
                        className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                        title="Edit Customer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete Customer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="mt-3 space-y-1 text-xs text-slate-600 font-mono">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.phone}</span>
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-2 font-sans">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{customer.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 font-sans">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{customer.state} ({customer.stateCode})</span>
                    </div>
                  </div>

                  {/* GSTIN badge */}
                  {customer.gstin && (
                    <div className="mt-2.5">
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        GSTIN: {customer.gstin}
                      </span>
                    </div>
                  )}

                  {/* Ledger Metrics */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-sans">Total Billed</span>
                      <span className="font-bold text-slate-800 tabular-nums">
                        {formatCurrency(history.totalBilled)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-sans">Balance Due</span>
                      <span
                        className={`font-bold tabular-nums ${
                          history.balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}
                      >
                        {formatCurrency(history.balanceDue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onOpenCustomerDetail(customer)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Purchase History ({history.itemsHistory.length})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {history.balanceDue > 0 && (
                      <button
                        onClick={() => onRecordPayment(customer)}
                        className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors cursor-pointer"
                        title="Record payment"
                      >
                        Receive
                      </button>
                    )}
                    <button
                      onClick={() => onOpenCreateBill(customer)}
                      className="px-2.5 py-1 text-[11px] font-semibold text-white bg-slate-900 hover:bg-indigo-600 rounded transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Bill</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
