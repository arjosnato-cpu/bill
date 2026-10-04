import React, { useState } from 'react';
import { Customer, DocumentRecord, PaymentMode } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency } from '../utils/formatters.ts';
import { X, CheckCircle, CreditCard } from 'lucide-react';

interface RecordPaymentModalProps {
  customer?: Customer | null;
  document?: DocumentRecord | null;
  onClose: () => void;
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  customer,
  document: doc,
  onClose,
  onPaymentRecorded,
}) => {
  const maxDue = doc ? doc.balanceDue : 50000;
  const [amount, setAmount] = useState<number>(doc ? doc.balanceDue : 0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [referenceNo, setReferenceNo] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const targetName = customer ? customer.name : doc ? doc.customerName : 'Customer';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (doc) {
      storage.recordDocumentPayment(doc.id, amount, paymentMode, notes || `Payment against ${doc.docNumber}`);
    } else if (customer) {
      storage.recordPayment({
        id: `pay-${Date.now()}`,
        date,
        entityType: 'customer',
        entityId: customer.id,
        entityName: customer.name,
        amount,
        type: 'in',
        paymentMode,
        referenceNo,
        notes: notes || `Direct ledger credit payment from ${customer.name}`,
        createdAt: new Date().toISOString(),
      });
    }

    onPaymentRecorded();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              Record Payment Receipt
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
          <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
            <div className="text-slate-500">Customer</div>
            <div className="font-bold text-slate-900 text-sm">{targetName}</div>
            {doc && (
              <div className="text-[11px] text-slate-600 mt-0.5">
                Invoice: <strong className="font-mono">{doc.docNumber}</strong> | Balance Due:{' '}
                <strong className="font-mono text-rose-600">{formatCurrency(doc.balanceDue)}</strong>
              </div>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Amount Received (₹) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              required
              value={amount}
              onChange={e => setAmount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-base font-bold font-mono border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md uppercase font-medium text-slate-800"
              >
                <option value="bank_transfer">Bank (NEFT/RTGS)</option>
                <option value="upi">UPI / QR</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Reference / UTR / Cheque No.
            </label>
            <input
              type="text"
              placeholder="e.g. UTR1902837 or Cheque #004412"
              value={referenceNo}
              onChange={e => setReferenceNo(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes</label>
            <input
              type="text"
              placeholder="e.g. Part payment for goods clearance"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded-md"
            />
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
              <CheckCircle className="w-4 h-4" />
              <span>Record Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
