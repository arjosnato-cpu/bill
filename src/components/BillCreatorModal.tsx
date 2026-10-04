import React, { useState } from 'react';
import {
  DocumentRecord,
  DocumentType,
  LineItem,
  BusinessProfile,
  Customer,
  Product,
  PaymentMode,
} from '../types/index.ts';
import { storage } from '../services/storage.ts';
import {
  formatCurrency,
  INDIAN_STATES,
  getStateCodeByName,
  extractStateFromGstin,
} from '../utils/formatters.ts';
import {
  X,
  Plus,
  Trash2,
  Check,
  Building,
  User,
  Truck,
  FileCheck,
  BookmarkPlus,
  CreditCard,
  Calendar,
} from 'lucide-react';

interface BillCreatorModalProps {
  profile: BusinessProfile;
  initialDocType?: DocumentType;
  initialCustomer?: Customer | null;
  onClose: () => void;
  onSaved: (doc: DocumentRecord) => void;
}

export const BillCreatorModal: React.FC<BillCreatorModalProps> = ({
  profile,
  initialDocType = 'tax_invoice',
  initialCustomer = null,
  onClose,
  onSaved,
}) => {
  const [docType, setDocType] = useState<DocumentType>(initialDocType);
  const [docNumber, setDocNumber] = useState(() => storage.generateNextDocNumber(initialDocType));
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);

  // B2B specific PO & transport
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');

  const existingCustomers = storage.getCustomers();
  const existingProducts = storage.getProducts();

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(initialCustomer ? initialCustomer.id : '');
  const [customerName, setCustomerName] = useState(initialCustomer ? initialCustomer.name : '');
  const [customerPhone, setCustomerPhone] = useState(initialCustomer ? initialCustomer.phone : '');
  const [customerEmail, setCustomerEmail] = useState(initialCustomer ? initialCustomer.email || '' : '');
  const [customerGstin, setCustomerGstin] = useState(initialCustomer ? initialCustomer.gstin || '' : '');
  const [customerBillingAddress, setCustomerBillingAddress] = useState(
    initialCustomer ? initialCustomer.billingAddress : ''
  );
  const [customerShippingAddress, setCustomerShippingAddress] = useState(
    initialCustomer ? initialCustomer.shippingAddress || '' : ''
  );
  const [placeOfSupply, setPlaceOfSupply] = useState(
    initialCustomer ? initialCustomer.state : profile.state || 'Delhi'
  );
  const [saveCustomerToDb, setSaveCustomerToDb] = useState(false);

  // Tax and Interstate
  const [isInterState, setIsInterState] = useState(() => {
    const custState = initialCustomer ? initialCustomer.state : profile.state;
    return custState.toLowerCase() !== (profile.state || '').toLowerCase();
  });
  const [reverseCharge, setReverseCharge] = useState(false);

  // Transport details (Challan)
  const [vehicleNo, setVehicleNo] = useState('');
  const [transportMode, setTransportMode] = useState('Road');
  const [challanPurpose, setChallanPurpose] = useState('Supply on Approval');

  // Quotation specific
  const [quotationValidity, setQuotationValidity] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });

  // Items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: `item-${Date.now()}-1`,
      name: '',
      hsnSacCode: '',
      quantity: 1,
      unit: 'Pcs',
      unitPrice: 0,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: docType === 'bill_of_supply' ? 0 : profile.defaultTaxRate || 18,
      taxableAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      totalAmount: 0,
    },
  ]);

  // Payment
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('credit');
  const [notes, setNotes] = useState(profile.invoiceNote || '');
  const [terms, setTerms] = useState(profile.termsAndConditions || '');

  // Auto GSTIN intelligence
  const handleGstinChange = (gst: string) => {
    const cleanGst = gst.toUpperCase();
    setCustomerGstin(cleanGst);
    const resolvedState = extractStateFromGstin(cleanGst);
    if (resolvedState) {
      setPlaceOfSupply(resolvedState.stateName);
      const isInter = resolvedState.stateName.toLowerCase() !== (profile.state || '').toLowerCase();
      setIsInterState(isInter);
      setItems(prev => prev.map(item => recalculateLineItem(item, isInter)));
    }
  };

  // Handle docType change
  const handleDocTypeChange = (newType: DocumentType) => {
    setDocType(newType);
    setDocNumber(storage.generateNextDocNumber(newType));
    if (newType === 'bill_of_supply') {
      setItems(prev => prev.map(i => recalculateLineItem({ ...i, taxRate: 0 }, isInterState)));
    }
  };

  // When customer is selected from dropdown
  const handleCustomerSelect = (customerId: string) => {
    setSelectedCustomerId(customerId);
    if (!customerId) return;
    const c = existingCustomers.find(item => item.id === customerId);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
      setCustomerEmail(c.email || '');
      setCustomerGstin(c.gstin || '');
      setCustomerBillingAddress(c.billingAddress);
      setCustomerShippingAddress(c.shippingAddress || '');
      setPlaceOfSupply(c.state);
      const isInter = c.state.toLowerCase() !== (profile.state || '').toLowerCase();
      setIsInterState(isInter);
      setItems(prev => prev.map(item => recalculateLineItem(item, isInter)));
    }
  };

  const handlePlaceOfSupplyChange = (newState: string) => {
    setPlaceOfSupply(newState);
    const isInter = newState.toLowerCase() !== (profile.state || '').toLowerCase();
    setIsInterState(isInter);
    setItems(prev => prev.map(item => recalculateLineItem(item, isInter)));
  };

  const handleInterStateToggle = (inter: boolean) => {
    setIsInterState(inter);
    setItems(prev => prev.map(item => recalculateLineItem(item, inter)));
  };

  function recalculateLineItem(item: LineItem, interState: boolean): LineItem {
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unitPrice) || 0;
    const discPct = Number(item.discountPercent) || 0;
    const taxPct = Number(item.taxRate) || 0;

    const gross = qty * rate;
    const discAmt = (gross * discPct) / 100;
    const taxable = Math.max(0, gross - discAmt);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (taxPct > 0) {
      if (interState) {
        igst = (taxable * taxPct) / 100;
      } else {
        cgst = (taxable * (taxPct / 2)) / 100;
        sgst = (taxable * (taxPct / 2)) / 100;
      }
    }

    const total = taxable + cgst + sgst + igst;

    return {
      ...item,
      discountAmount: Number(discAmt.toFixed(2)),
      taxableAmount: Number(taxable.toFixed(2)),
      cgstAmount: Number(cgst.toFixed(2)),
      sgstAmount: Number(sgst.toFixed(2)),
      igstAmount: Number(igst.toFixed(2)),
      totalAmount: Number(total.toFixed(2)),
    };
  }

  const handleItemFieldChange = (index: number, field: keyof LineItem, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };
      updated[index] = recalculateLineItem(item, isInterState);
      return updated;
    });
  };

  const handleSelectProduct = (index: number, productId: string) => {
    if (!productId) return;
    const p = existingProducts.find(prod => prod.id === productId);
    if (!p) return;

    setItems(prev => {
      const updated = [...prev];
      const item: LineItem = {
        ...updated[index],
        productId: p.id,
        name: p.name,
        hsnSacCode: p.hsnSacCode,
        unit: p.unit,
        unitPrice: p.salePrice,
        taxRate: docType === 'bill_of_supply' ? 0 : p.taxRate,
      };
      updated[index] = recalculateLineItem(item, isInterState);
      return updated;
    });
  };

  const handleSaveItemToCatalog = (item: LineItem) => {
    if (!item.name.trim()) return;
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      name: item.name,
      hsnSacCode: item.hsnSacCode || '8544',
      category: 'General',
      unit: item.unit || 'Pcs',
      salePrice: item.unitPrice || 0,
      purchaseCost: Math.round(item.unitPrice * 0.75),
      taxRate: item.taxRate || 18,
      currentStock: 50,
      lowStockThreshold: 10,
    };
    storage.saveProduct(newProd);
    alert(`"${item.name}" saved to Catalog.`);
  };

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      recalculateLineItem(
        {
          id: `item-${Date.now()}-${prev.length + 1}`,
          name: '',
          hsnSacCode: '',
          quantity: 1,
          unit: 'Pcs',
          unitPrice: 0,
          discountPercent: 0,
          discountAmount: 0,
          taxRate: docType === 'bill_of_supply' ? 0 : profile.defaultTaxRate || 18,
          taxableAmount: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
          totalAmount: 0,
        },
        isInterState
      ),
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Grand summary calculation
  const subtotal = items.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0);
  const totalDiscount = items.reduce((acc, i) => acc + i.discountAmount, 0);
  const totalTaxable = items.reduce((acc, i) => acc + i.taxableAmount, 0);
  const cgstTotal = items.reduce((acc, i) => acc + i.cgstAmount, 0);
  const sgstTotal = items.reduce((acc, i) => acc + i.sgstAmount, 0);
  const igstTotal = items.reduce((acc, i) => acc + i.igstAmount, 0);
  const totalTax = cgstTotal + sgstTotal + igstTotal;

  const rawGrandTotal = totalTaxable + totalTax;
  const roundedGrandTotal = Math.round(rawGrandTotal);
  const roundOff = Number((roundedGrandTotal - rawGrandTotal).toFixed(2));
  const balanceDue = Math.max(0, roundedGrandTotal - paidAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim()) {
      alert('Please enter or select a buyer company name.');
      return;
    }

    if (items.some(i => !i.name.trim() || i.quantity <= 0)) {
      alert('Please check all items: name and quantity are required.');
      return;
    }

    let custId = selectedCustomerId;
    if ((saveCustomerToDb || !custId) && customerName.trim()) {
      const existing = existingCustomers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
      if (existing) {
        custId = existing.id;
      } else {
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail.trim(),
          gstin: customerGstin.trim(),
          billingAddress: customerBillingAddress.trim(),
          shippingAddress: customerShippingAddress.trim(),
          state: placeOfSupply,
          stateCode: getStateCodeByName(placeOfSupply),
          pincode: '110001',
          openingBalance: 0,
          createdAt: new Date().toISOString(),
        };
        storage.saveCustomer(newCust);
        custId = newCust.id;
      }
    }

    const docRecord: DocumentRecord = {
      id: `doc-${Date.now()}`,
      docNumber,
      docType,
      docDate,
      poNumber: poNumber.trim() || undefined,
      poDate: poDate || undefined,
      eWayBillNo: eWayBillNo.trim() || undefined,
      isB2B: !!customerGstin.trim(),
      customerId: custId || undefined,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      customerGstin: customerGstin || undefined,
      customerBillingAddress,
      customerShippingAddress: customerShippingAddress || undefined,
      placeOfSupply,
      isInterState,
      reverseCharge,
      vehicleNo: docType === 'delivery_challan' ? vehicleNo : undefined,
      transportMode: docType === 'delivery_challan' ? transportMode : undefined,
      challanPurpose: docType === 'delivery_challan' ? challanPurpose : undefined,
      quotationValidity: docType === 'quotation' ? quotationValidity : undefined,
      items,
      subtotal: Number(subtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalTaxable: Number(totalTaxable.toFixed(2)),
      cgstTotal: Number(cgstTotal.toFixed(2)),
      sgstTotal: Number(sgstTotal.toFixed(2)),
      igstTotal: Number(igstTotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      grandTotal: roundedGrandTotal,
      paidAmount,
      balanceDue,
      paymentMode,
      notes,
      terms,
      status: balanceDue <= 0 ? 'paid' : paidAmount > 0 ? 'partially_paid' : 'unpaid',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storage.saveDocument(docRecord);
    onSaved(docRecord);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative w-full max-w-4xl bg-white rounded-t-2xl sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[95vh]">
        {/* Mobile Grab Handle Bar */}
        <div className="sm:hidden w-10 h-1 bg-slate-300 rounded-full mx-auto my-2" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/80 shrink-0">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
              <span>Create B2B Invoice / Bill</span>
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">
              #{docNumber} · {placeOfSupply} ({isInterState ? 'IGST' : 'CGST+SGST'})
            </span>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-slate-700 active:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 flex-1">
          {/* Document Type Selector Segmented Controls */}
          <div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => handleDocTypeChange('tax_invoice')}
                className={`min-h-[44px] py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  docType === 'tax_invoice'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                B2B Tax Invoice
              </button>

              <button
                type="button"
                onClick={() => handleDocTypeChange('delivery_challan')}
                className={`min-h-[44px] py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  docType === 'delivery_challan'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Delivery Challan
              </button>

              <button
                type="button"
                onClick={() => handleDocTypeChange('quotation')}
                className={`min-h-[44px] py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  docType === 'quotation'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Quotation / Estimate
              </button>

              <button
                type="button"
                onClick={() => handleDocTypeChange('bill_of_supply')}
                className={`min-h-[44px] py-2 px-2.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  docType === 'bill_of_supply'
                    ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                Retail Memo (Non-GST)
              </button>
            </div>
          </div>

          {/* B2B Customer & GSTIN Section */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Building className="w-4 h-4 text-indigo-600" />
                <span>Buyer / Party Details</span>
              </span>

              {/* Quick Select from Saved Customers */}
              {existingCustomers.length > 0 && (
                <select
                  value={selectedCustomerId}
                  onChange={e => handleCustomerSelect(e.target.value)}
                  className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 font-medium max-w-[180px] truncate"
                >
                  <option value="">Pick Saved Party...</option>
                  {existingCustomers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gstin ? `(${c.gstin})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buyer Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Infotech Pvt Ltd"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Buyer GSTIN (15 Digits)
                </label>
                <input
                  type="text"
                  placeholder="07AAACS1429B1ZB"
                  value={customerGstin}
                  onChange={e => handleGstinChange(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono uppercase font-bold text-indigo-700 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  WhatsApp Contact Phone *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={customerPhone}
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street / Office Address"
                  value={customerBillingAddress}
                  onChange={e => setCustomerBillingAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Place of Supply (State)
                </label>
                <select
                  value={placeOfSupply}
                  onChange={e => handlePlaceOfSupplyChange(e.target.value)}
                  className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-slate-800 text-xs"
                >
                  {INDIAN_STATES.map(s => (
                    <option key={s.code} value={s.name}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Tax Mode Toggle (CGST+SGST vs IGST) */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="text-slate-500">Tax Type:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleInterStateToggle(false)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    !isInterState
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Intra-State (CGST + SGST)
                </button>
                <button
                  type="button"
                  onClick={() => handleInterStateToggle(true)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                    isInterState
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  Inter-State (IGST)
                </button>
              </div>
            </div>
          </div>

          {/* B2B Purchase Order & Invoice Date Row */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5 text-xs">
            <span className="font-bold text-slate-700 block">
              B2B Order Reference & Invoice Date
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-0.5">Buyer PO Number</label>
                <input
                  type="text"
                  placeholder="PO-2026/88"
                  value={poNumber}
                  onChange={e => setPoNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-0.5">PO Date</label>
                <input
                  type="date"
                  value={poDate}
                  onChange={e => setPoDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-0.5">Invoice Date *</label>
                <input
                  type="date"
                  required
                  value={docDate}
                  onChange={e => setDocDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
                />
              </div>
            </div>
          </div>

          {/* Delivery Challan specifics */}
          {docType === 'delivery_challan' && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-700" />
                <span>Transport & Dispatch Details</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="Vehicle No (e.g. DL 01 AB 1234)"
                  value={vehicleNo}
                  onChange={e => setVehicleNo(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-amber-300 rounded font-mono uppercase"
                />
                <input
                  type="text"
                  placeholder="Mode (Road / Courier / Tempo)"
                  value={transportMode}
                  onChange={e => setTransportMode(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-amber-300 rounded"
                />
                <select
                  value={challanPurpose}
                  onChange={e => setChallanPurpose(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-amber-300 rounded text-slate-800"
                >
                  <option value="Supply on Approval">Supply on Approval</option>
                  <option value="Job Work">Job Work (Rule 55)</option>
                  <option value="Branch Transfer">Branch / Godown Transfer</option>
                  <option value="Exhibition">Exhibition / Demo</option>
                </select>
              </div>
            </div>
          )}

          {/* Line Items Builder (Mobile-friendly cards) */}
          <div className="border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-3 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-700">
                Line Items & Materials ({items.length})
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-700">Item #{index + 1}</span>
                    {existingProducts.length > 0 && (
                      <select
                        onChange={e => handleSelectProduct(index, e.target.value)}
                        className="text-[11px] bg-white border border-slate-300 rounded px-1.5 py-0.5 text-indigo-600 font-medium max-w-[180px] truncate"
                      >
                        <option value="">Catalog Item...</option>
                        {existingProducts.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({formatCurrency(p.salePrice)})
                          </option>
                        ))}
                      </select>
                    )}
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <input
                    type="text"
                    required
                    placeholder="Product or service description"
                    value={item.name}
                    onChange={e => handleItemFieldChange(index, 'name', e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-medium text-xs"
                  />

                  {/* Quantity, Unit, Price, Tax, Total */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">HSN Code</label>
                      <input
                        type="text"
                        placeholder="8544"
                        value={item.hsnSacCode}
                        onChange={e => handleItemFieldChange(index, 'hsnSacCode', e.target.value)}
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-center text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Quantity & Unit</label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          min="1"
                          step="any"
                          required
                          value={item.quantity}
                          onChange={e =>
                            handleItemFieldChange(index, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-16 px-1.5 py-1.5 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                        />
                        <select
                          value={item.unit}
                          onChange={e => handleItemFieldChange(index, 'unit', e.target.value)}
                          className="flex-1 px-1 py-1.5 bg-white border border-slate-300 rounded text-xs"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Box">Box</option>
                          <option value="Roll">Roll</option>
                          <option value="Kg">Kg</option>
                          <option value="Mtr">Mtr</option>
                          <option value="Nos">Nos</option>
                          <option value="Set">Set</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={item.unitPrice}
                        onChange={e =>
                          handleItemFieldChange(index, 'unitPrice', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded font-mono text-right text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-500 mb-0.5">GST Rate</label>
                      <select
                        disabled={docType === 'bill_of_supply'}
                        value={item.taxRate}
                        onChange={e =>
                          handleItemFieldChange(index, 'taxRate', parseFloat(e.target.value) || 0)
                        }
                        className="w-full px-1.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                      >
                        <option value="0">0%</option>
                        <option value="5">5%</option>
                        <option value="12">12%</option>
                        <option value="18">18%</option>
                        <option value="28">28%</option>
                      </select>
                    </div>

                    <div className="col-span-2 sm:col-span-1 text-right">
                      <label className="block text-[11px] text-slate-500 mb-0.5">Item Total</label>
                      <div className="py-1.5 font-mono font-bold text-slate-900 tabular-nums text-xs">
                        {formatCurrency(item.totalAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Mode & Advance */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
            <div className="font-bold text-slate-700">Payment & Settlement</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-slate-600 mb-1">Advance Received (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={paidAmount}
                  onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded font-mono font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value as PaymentMode)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded uppercase font-medium text-slate-800"
                >
                  <option value="credit">Credit (B2B Pay Later)</option>
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Mobile & Desktop Action Bar */}
        <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3 shadow-lg rounded-b-xl shrink-0">
          <div className="font-mono">
            <span className="text-[10px] text-slate-500 font-sans block leading-none">
              Grand Total ({items.length} items)
            </span>
            <span className="text-base sm:text-lg font-extrabold text-indigo-700 tabular-nums">
              {formatCurrency(roundedGrandTotal)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-3 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="min-h-[44px] px-5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save & View Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
