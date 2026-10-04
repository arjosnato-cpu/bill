export type DocumentType = 'tax_invoice' | 'invoice_cum_challan' | 'bill_of_supply' | 'delivery_challan' | 'quotation';

export type DocumentStatus = 'paid' | 'unpaid' | 'partially_paid' | 'cancelled' | 'converted';

export type PaymentMode = 'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'credit';

export interface LineItem {
  id: string;
  productId?: string;
  name: string;
  description?: string;
  hsnSacCode: string;
  quantity: number;
  unit: string; // Pcs, Kg, Box, Mtr, Nos, Set, etc.
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxRate: number; // 0, 5, 12, 18, 28
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface DocumentRecord {
  id: string;
  userId?: string;
  docNumber: string;
  docType: DocumentType;
  docDate: string; // YYYY-MM-DD
  
  // B2B specific purchase order & transport
  poNumber?: string; // Purchase Order / Work Order Reference
  poDate?: string;
  eWayBillNo?: string; // E-Way Bill for consignments
  isB2B?: boolean;

  // Customer info
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerGstin?: string;
  customerBillingAddress: string;
  customerShippingAddress?: string;
  placeOfSupply: string; // State name
  isInterState: boolean; // true = IGST, false = CGST + SGST
  reverseCharge: boolean;

  // Delivery Challan / Transport details
  vehicleNo?: string;
  transportMode?: string;
  challanPurpose?: string; // 'Supply on Approval' | 'Job Work' | 'Exhibition' | 'Branch Transfer' | 'Other'

  // Quotation specific
  quotationValidity?: string; // Valid until date
  convertedToDocId?: string;

  // Items and totals
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  totalTaxable: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: PaymentMode;

  notes?: string;
  terms?: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  userId?: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  billingAddress: string;
  shippingAddress?: string;
  state: string;
  stateCode: string;
  pincode: string;
  openingBalance: number; // positive = customer owes us
  notes?: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  userId?: string;
  name: string;
  companyName?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address: string;
  state: string;
  stateCode: string;
  pincode: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
  };
  openingBalance: number; // positive = we owe supplier
  notes?: string;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  userId?: string;
  billNumber: string;
  supplierId: string;
  supplierName: string;
  billDate: string;
  itemsSummary: string;
  taxableAmount: number;
  gstAmount: number;
  grandTotal: number;
  paidAmount: number;
  balanceDue: number;
  paymentMode: PaymentMode;
  inputTaxCreditEligible: boolean;
  notes?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  userId?: string;
  name: string;
  sku?: string;
  hsnSacCode: string;
  category: string;
  unit: string;
  salePrice: number;
  purchaseCost: number;
  taxRate: number; // 0, 5, 12, 18, 28
  currentStock: number;
  lowStockThreshold: number;
  description?: string;
}

export interface ExpenseRecord {
  id: string;
  userId?: string;
  expenseNumber: string;
  date: string;
  category: 'Rent' | 'Electricity & Utility' | 'Salaries & Wages' | 'Transport & Freight' | 'Marketing' | 'Packaging & Office' | 'Repairs & Maintenance' | 'Miscellaneous';
  description: string;
  amount: number;
  paymentMode: PaymentMode;
  receiptNo?: string;
  notes?: string;
  createdAt: string;
}

export interface PaymentTransaction {
  id: string;
  userId?: string;
  date: string;
  entityType: 'customer' | 'supplier';
  entityId: string;
  entityName: string;
  docId?: string;
  docNumber?: string;
  amount: number;
  type: 'in' | 'out'; // 'in' = money received from customer, 'out' = money paid to supplier
  paymentMode: PaymentMode;
  referenceNo?: string;
  notes?: string;
  createdAt: string;
}

export interface BusinessProfile {
  userId?: string;
  businessName: string;
  tagline: string;
  ownerName: string;
  gstNumber: string;
  pan: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  logoUrl?: string;
  authorizedSignatoryTitle: string;
  bankDetails: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
    branch: string;
    upiId: string;
  };
  termsAndConditions: string;
  invoiceNote: string;
  currencySymbol: string;
  defaultTaxRate: number;
  invoicePrefix: string;
  challanPrefix: string;
  quotePrefix: string;
  invoiceTheme: 'modern' | 'classic' | 'minimal';
  printLayout: 'a4' | 'thermal';
}
