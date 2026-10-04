import React, { useState } from 'react';
import { ExpenseRecord, PaymentMode } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { X, Check, DollarSign } from 'lucide-react';

interface ExpenseModalProps {
  onClose: () => void;
  onSaved: () => void;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({ onClose, onSaved }) => {
  const [category, setCategory] = useState<ExpenseRecord['category']>('Rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('upi');
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description.trim()) {
      alert('Please enter a description and valid amount.');
      return;
    }

    const exp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      expenseNumber: `EXP-${Date.now().toString().slice(-4)}`,
      date,
      category,
      description: description.trim(),
      amount,
      paymentMode,
      receiptNo: receiptNo.trim() || undefined,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    };

    storage.saveExpense(exp);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Record Operational Business Expense
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expense Category *</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as ExpenseRecord['category'])}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-800"
            >
              <option value="Rent">Rent (Shop / Godown / Office)</option>
              <option value="Electricity & Utility">Electricity & Utility Bills</option>
              <option value="Salaries & Wages">Salaries & Staff Wages</option>
              <option value="Transport & Freight">Transport & Freight Charges</option>
              <option value="Marketing">Marketing & Advertising</option>
              <option value="Packaging & Office">Packaging & Office Supplies</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Miscellaneous">Miscellaneous Expenses</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. Shop March rent or Delivery tempo diesel"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={amount}
                onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded uppercase font-medium text-slate-800"
              >
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Receipt / Voucher No.</label>
              <input
                type="text"
                placeholder="REC-1049"
                value={receiptNo}
                onChange={e => setReceiptNo(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
