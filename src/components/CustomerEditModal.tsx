import React, { useState } from 'react';
import { Customer } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { INDIAN_STATES, getStateCodeByName } from '../utils/formatters.ts';
import { X, Check } from 'lucide-react';

interface CustomerEditModalProps {
  customer?: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
}

export const CustomerEditModal: React.FC<CustomerEditModalProps> = ({
  customer,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(customer ? customer.name : '');
  const [companyName, setCompanyName] = useState(customer ? customer.companyName || '' : '');
  const [phone, setPhone] = useState(customer ? customer.phone : '');
  const [email, setEmail] = useState(customer ? customer.email || '' : '');
  const [gstin, setGstin] = useState(customer ? customer.gstin || '' : '');
  const [billingAddress, setBillingAddress] = useState(customer ? customer.billingAddress : '');
  const [shippingAddress, setShippingAddress] = useState(customer ? customer.shippingAddress || '' : '');
  const [state, setState] = useState(customer ? customer.state : 'Delhi');
  const [pincode, setPincode] = useState(customer ? customer.pincode : '110001');
  const [openingBalance, setOpeningBalance] = useState(customer ? customer.openingBalance : 0);
  const [notes, setNotes] = useState(customer ? customer.notes || '' : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Please enter both name and contact phone.');
      return;
    }

    const newCust: Customer = {
      id: customer ? customer.id : `cust-${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      billingAddress: billingAddress.trim(),
      shippingAddress: shippingAddress.trim() || undefined,
      state,
      stateCode: getStateCodeByName(state),
      pincode: pincode.trim(),
      openingBalance: Number(openingBalance) || 0,
      notes: notes.trim() || undefined,
      createdAt: customer ? customer.createdAt : new Date().toISOString(),
    };

    storage.saveCustomer(newCust);
    onSaved(newCust);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-sm">
            {customer ? 'Edit Customer Details' : 'Add New Customer'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Customer / Contact Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Kumar"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Company / Trade Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Enterprises"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Mobile / WhatsApp *</label>
              <input
                type="text"
                required
                placeholder="+91 98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="customer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="07AAACS1234F1Z9"
                value={gstin}
                onChange={e => setGstin(e.target.value.toUpperCase())}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State & Place of Supply</label>
              <select
                value={state}
                onChange={e => setState(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Billing Address</label>
            <textarea
              rows={2}
              placeholder="Shop/Office Address, Street, Area"
              value={billingAddress}
              onChange={e => setBillingAddress(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pincode</label>
              <input
                type="text"
                placeholder="110001"
                value={pincode}
                onChange={e => setPincode(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
              <input
                type="number"
                step="any"
                placeholder="0"
                value={openingBalance}
                onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Customer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
