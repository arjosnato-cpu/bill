import React, { useState } from 'react';
import { Supplier, PurchaseRecord, PaymentMode } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { INDIAN_STATES, getStateCodeByName } from '../utils/formatters.ts';
import { X, Check, Truck, ShoppingCart } from 'lucide-react';

interface SupplierModalProps {
  mode: 'supplier' | 'purchase';
  supplier?: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  mode,
  supplier,
  onClose,
  onSaved,
}) => {
  const existingSuppliers = storage.getSuppliers();

  // Supplier fields
  const [name, setName] = useState(supplier ? supplier.name : '');
  const [companyName, setCompanyName] = useState(supplier ? supplier.companyName || '' : '');
  const [phone, setPhone] = useState(supplier ? supplier.phone : '');
  const [email, setEmail] = useState(supplier ? supplier.email || '' : '');
  const [gstin, setGstin] = useState(supplier ? supplier.gstin || '' : '');
  const [address, setAddress] = useState(supplier ? supplier.address : '');
  const [state, setState] = useState(supplier ? supplier.state : 'Delhi');
  const [pincode, setPincode] = useState(supplier ? supplier.pincode : '110001');
  const [bankName, setBankName] = useState(supplier?.bankDetails?.bankName || '');
  const [accountNo, setAccountNo] = useState(supplier?.bankDetails?.accountNo || '');
  const [ifscCode, setIfscCode] = useState(supplier?.bankDetails?.ifscCode || '');
  const [openingBalance, setOpeningBalance] = useState(supplier ? supplier.openingBalance : 0);

  // Purchase Bill fields
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    supplier ? supplier.id : existingSuppliers[0]?.id || ''
  );
  const [billNumber, setBillNumber] = useState(`PUR-${Date.now().toString().slice(-4)}`);
  const [billDate, setBillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [itemsSummary, setItemsSummary] = useState('');
  const [taxableAmount, setTaxableAmount] = useState<number>(0);
  const [gstAmount, setGstAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('bank_transfer');
  const [itcEligible, setItcEligible] = useState(true);

  const grandTotal = taxableAmount + gstAmount;
  const balanceDue = Math.max(0, grandTotal - paidAmount);

  const handleSubmitSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const supp: Supplier = {
      id: supplier ? supplier.id : `supp-${Date.now()}`,
      name: name.trim(),
      companyName: companyName.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      gstin: gstin.trim().toUpperCase() || undefined,
      address: address.trim(),
      state,
      stateCode: getStateCodeByName(state),
      pincode: pincode.trim(),
      bankDetails: bankName
        ? {
            bankName,
            accountNo,
            ifscCode,
          }
        : undefined,
      openingBalance: Number(openingBalance) || 0,
      createdAt: supplier ? supplier.createdAt : new Date().toISOString(),
    };

    storage.saveSupplier(supp);
    onSaved();
    onClose();
  };

  const handleSubmitPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    const currentSupp = existingSuppliers.find(s => s.id === selectedSupplierId);
    if (!currentSupp) {
      alert('Please select a supplier.');
      return;
    }

    const purch: PurchaseRecord = {
      id: `purch-${Date.now()}`,
      billNumber: billNumber.trim(),
      supplierId: currentSupp.id,
      supplierName: currentSupp.name,
      billDate,
      itemsSummary: itemsSummary.trim() || 'Raw Materials / Inward Goods',
      taxableAmount,
      gstAmount,
      grandTotal,
      paidAmount,
      balanceDue,
      paymentMode,
      inputTaxCreditEligible: itcEligible,
      createdAt: new Date().toISOString(),
    };

    storage.savePurchase(purch);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {mode === 'supplier' ? (
              <Truck className="w-5 h-5 text-indigo-600" />
            ) : (
              <ShoppingCart className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="font-bold text-slate-800 text-sm">
              {mode === 'supplier'
                ? supplier
                  ? 'Edit Supplier Details'
                  : 'Add New Supplier / Vendor'
                : 'Record Inward Purchase Bill'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {mode === 'supplier' ? (
          <form onSubmit={handleSubmitSupplier} className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Havells India Ltd"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company / Brand</label>
                <input
                  type="text"
                  placeholder="e.g. Havells"
                  value={companyName}
                  onChange={e => setCompanyName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="text"
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier GSTIN</label>
                <input
                  type="text"
                  placeholder="08AAACH1244G1Z2"
                  value={gstin}
                  onChange={e => setGstin(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Address</label>
              <input
                type="text"
                placeholder="Factory / Warehouse location"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">State</label>
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
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opening Payable Balance (₹)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-2">
              <div className="font-semibold text-slate-700">Bank Details (for supplier payments)</div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Bank Name"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded text-[11px]"
                />
                <input
                  type="text"
                  placeholder="Account Number"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded font-mono text-[11px]"
                />
                <input
                  type="text"
                  placeholder="IFSC Code"
                  value={ifscCode}
                  onChange={e => setIfscCode(e.target.value)}
                  className="px-2 py-1 bg-white border border-slate-300 rounded font-mono uppercase text-[11px]"
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
                <span>Save Supplier</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmitPurchase} className="p-6 space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
              <select
                required
                value={selectedSupplierId}
                onChange={e => setSelectedSupplierId(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 font-medium"
              >
                {existingSuppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.gstin ? `(${s.gstin})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Supplier Bill Number *</label>
                <input
                  type="text"
                  required
                  placeholder="INV-9912"
                  value={billNumber}
                  onChange={e => setBillNumber(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bill Date</label>
                <input
                  type="date"
                  required
                  value={billDate}
                  onChange={e => setBillDate(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Summary of Items Purchased</label>
              <input
                type="text"
                placeholder="e.g. 50 rolls 2.5mm copper cable and 20 MCB units"
                value={itemsSummary}
                onChange={e => setItemsSummary(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Taxable Amount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={taxableAmount}
                  onChange={e => setTaxableAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">GST Tax Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={gstAmount}
                  onChange={e => setGstAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paidAmount}
                  onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded uppercase font-medium text-slate-800"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="credit">Credit / Unpaid</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded text-[11px] flex items-center justify-between">
              <div>
                <span className="text-slate-600 block">Total Bill: <strong>₹{grandTotal}</strong></span>
                <span className="text-rose-600">Balance Payable: <strong>₹{balanceDue}</strong></span>
              </div>
              <label className="flex items-center gap-1.5 text-indigo-900 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={itcEligible}
                  onChange={e => setItcEligible(e.target.checked)}
                  className="rounded text-indigo-600"
                />
                <span>Eligible for GST Input Tax Credit (ITC)</span>
              </label>
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
                <span>Save Inward Bill</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
