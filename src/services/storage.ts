import {
  BusinessProfile,
  Customer,
  DocumentRecord,
  ExpenseRecord,
  PaymentTransaction,
  Product,
  PurchaseRecord,
  Supplier,
} from '../types/index.ts';
import {
  syncDocumentToFirestore,
  deleteDocumentFromFirestore,
  syncCustomerToFirestore,
  deleteCustomerFromFirestore,
  syncSupplierToFirestore,
  deleteSupplierFromFirestore,
  syncPurchaseToFirestore,
  deletePurchaseFromFirestore,
  syncProductToFirestore,
  deleteProductFromFirestore,
  syncExpenseToFirestore,
  deleteExpenseFromFirestore,
  syncPaymentToFirestore,
  deletePaymentFromFirestore,
  syncProfileToFirestore,
} from '../firebase/index.ts';
import { User } from 'firebase/auth';

const STORAGE_KEYS = {
  PROFILE: 'vyapar_business_profile',
  DOCUMENTS: 'vyapar_documents',
  CUSTOMERS: 'vyapar_customers',
  SUPPLIERS: 'vyapar_suppliers',
  PURCHASES: 'vyapar_purchases',
  PRODUCTS: 'vyapar_products',
  EXPENSES: 'vyapar_expenses',
  PAYMENTS: 'vyapar_payments',
  CLEARED_DEMO: 'vyapar_demo_cleared_v2',
};

const DEFAULT_PROFILE: BusinessProfile = {
  businessName: 'My Business Enterprise',
  tagline: 'Quality Products & Services',
  ownerName: 'Proprietor',
  gstNumber: '',
  pan: '',
  phone: '',
  whatsappNumber: '',
  email: '',
  address: '',
  city: '',
  state: 'Delhi',
  stateCode: '07',
  pincode: '',
  logoUrl: '',
  authorizedSignatoryTitle: 'Authorized Signatory',
  bankDetails: {
    bankName: '',
    accountNo: '',
    ifscCode: '',
    branch: '',
    upiId: '',
  },
  termsAndConditions: '1. Goods once sold will not be taken back or exchanged.\n2. All disputes subject to local jurisdiction.',
  invoiceNote: 'Thank you for your valuable business!',
  currencySymbol: '₹',
  defaultTaxRate: 18,
  invoicePrefix: 'INV-26/',
  challanPrefix: 'DC-26/',
  quotePrefix: 'QT-26/',
  invoiceTheme: 'modern',
  printLayout: 'a4',
};

class StorageService {
  private currentUser: User | null = null;
  private listeners: (() => void)[] = [];

  constructor() {
    this.ensureDemoDataDeleted();
  }

  public setAuthUser(user: User | null) {
    this.currentUser = user;
  }

  public getAuthUser(): User | null {
    return this.currentUser;
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  /**
   * Clears all old demo data completely as requested by the user.
   */
  private ensureDemoDataDeleted(): void {
    try {
      const alreadyCleared = localStorage.getItem(STORAGE_KEYS.CLEARED_DEMO);
      if (!alreadyCleared) {
        // Clear out any previous demo items
        localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
        localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
        localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
        localStorage.removeItem(STORAGE_KEYS.PURCHASES);
        localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
        localStorage.removeItem(STORAGE_KEYS.EXPENSES);
        localStorage.removeItem(STORAGE_KEYS.PAYMENTS);

        // Check if existing profile is the old sample
        const existingProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
        if (existingProfile) {
          try {
            const p = JSON.parse(existingProfile);
            if (p.businessName?.includes('ALOKA') || p.gstNumber?.includes('19AVLPM5641D1ZF')) {
              localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
            }
          } catch {
            localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
          }
        } else {
          localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(DEFAULT_PROFILE));
        }

        localStorage.setItem(STORAGE_KEYS.CLEARED_DEMO, 'true');
      }
    } catch (e) {
      console.error('Error cleaning demo data:', e);
    }
  }

  // Profile
  getProfile(): BusinessProfile {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PROFILE);
      if (data) {
        return { ...DEFAULT_PROFILE, ...JSON.parse(data) };
      }
      return DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  saveProfile(profile: BusinessProfile): void {
    const enriched = {
      ...profile,
      userId: this.currentUser?.uid || profile.userId,
    };
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(enriched));
    if (this.currentUser) {
      syncProfileToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore profile sync error:', err)
      );
    }
    this.notify();
  }

  // Documents (Invoices, Challans, Quotations)
  getDocuments(): DocumentRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getDocumentById(id: string): DocumentRecord | undefined {
    return this.getDocuments().find((d) => d.id === id);
  }

  saveDocument(doc: DocumentRecord): void {
    const docs = this.getDocuments();
    const index = docs.findIndex((d) => d.id === doc.id);
    const enriched: DocumentRecord = {
      ...doc,
      userId: this.currentUser?.uid || doc.userId,
      updatedAt: new Date().toISOString(),
    };

    if (index >= 0) {
      docs[index] = enriched;
    } else {
      docs.unshift(enriched);
    }

    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));

    // Deduct stock if tax_invoice or bill_of_supply or invoice_cum_challan and brand new
    if (index < 0 && enriched.docType !== 'quotation') {
      enriched.items.forEach((item) => {
        if (item.productId) {
          this.adjustProductStock(item.productId, -item.quantity);
        }
      });
    }

    // Record payment if paidAmount > 0 and new document
    if (index < 0 && enriched.paidAmount > 0 && enriched.docType !== 'quotation') {
      this.recordPayment({
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        date: enriched.docDate,
        entityType: 'customer',
        entityId: enriched.customerId || 'walk-in',
        entityName: enriched.customerName,
        docId: enriched.id,
        docNumber: enriched.docNumber,
        amount: enriched.paidAmount,
        type: 'in',
        paymentMode: enriched.paymentMode,
        referenceNo: enriched.poNumber,
        notes: `Payment for ${enriched.docNumber}`,
        createdAt: new Date().toISOString(),
      });
    }

    if (this.currentUser) {
      syncDocumentToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore doc sync error:', err)
      );
    }

    this.notify();
  }

  deleteDocument(id: string): void {
    const docs = this.getDocuments();
    const docToDelete = docs.find((d) => d.id === id);

    // Restore stock if deleting an invoice
    if (docToDelete && docToDelete.docType !== 'quotation') {
      docToDelete.items.forEach((item) => {
        if (item.productId) {
          this.adjustProductStock(item.productId, item.quantity);
        }
      });
    }

    const filtered = docs.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(filtered));

    if (this.currentUser) {
      deleteDocumentFromFirestore(id).catch((err) =>
        console.error('Firestore doc delete error:', err)
      );
    }

    this.notify();
  }

  recordBillPayment(
    docId: string,
    amount: number,
    paymentMode: DocumentRecord['paymentMode'],
    notes?: string
  ): void {
    const doc = this.getDocumentById(docId);
    if (!doc) return;

    doc.paidAmount = Math.min(doc.grandTotal, doc.paidAmount + amount);
    doc.balanceDue = Math.max(0, doc.grandTotal - doc.paidAmount);
    doc.status = doc.balanceDue <= 0 ? 'paid' : 'partially_paid';

    this.saveDocument(doc);

    this.recordPayment({
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString().split('T')[0],
      entityType: 'customer',
      entityId: doc.customerId || 'walk-in',
      entityName: doc.customerName,
      docId: doc.id,
      docNumber: doc.docNumber,
      amount,
      type: 'in',
      paymentMode,
      notes: notes || `Settlement payment for ${doc.docNumber}`,
      createdAt: new Date().toISOString(),
    });
  }

  recordDocumentPayment(
    docId: string,
    amount: number,
    paymentMode: DocumentRecord['paymentMode'],
    notes?: string
  ): void {
    this.recordBillPayment(docId, amount, paymentMode, notes);
  }

  convertQuotationToInvoice(
    quoteId: string,
    targetType: 'tax_invoice' | 'bill_of_supply'
  ): DocumentRecord | null {
    const quote = this.getDocumentById(quoteId);
    if (!quote || quote.docType !== 'quotation') return null;

    const nextNumber = this.generateNextDocNumber(targetType);

    const newDoc: DocumentRecord = {
      ...quote,
      id: `doc-${Date.now()}`,
      userId: this.currentUser?.uid,
      docNumber: nextNumber,
      docType: targetType,
      docDate: new Date().toISOString().split('T')[0],
      status: 'unpaid',
      paidAmount: 0,
      balanceDue: quote.grandTotal,
      notes: `Generated from Quotation ${quote.docNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mark quotation as converted
    quote.status = 'converted';
    quote.convertedToDocId = newDoc.id;
    this.saveDocument(quote);

    // Save newly created invoice
    this.saveDocument(newDoc);
    return newDoc;
  }

  // Customers
  getCustomers(): Customer[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find((c) => c.id === id);
  }

  saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex((c) => c.id === customer.id);
    const enriched: Customer = {
      ...customer,
      userId: this.currentUser?.uid || customer.userId,
    };

    if (index >= 0) {
      customers[index] = enriched;
    } else {
      customers.push(enriched);
    }
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));

    if (this.currentUser) {
      syncCustomerToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore customer sync error:', err)
      );
    }

    this.notify();
  }

  deleteCustomer(id: string): void {
    const customers = this.getCustomers().filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));

    if (this.currentUser) {
      deleteCustomerFromFirestore(id).catch((err) =>
        console.error('Firestore customer delete error:', err)
      );
    }

    this.notify();
  }

  /**
   * Retrieves what a specific customer bought and when they bought it!
   */
  getCustomerPurchaseHistory(customerId: string) {
    const docs = this.getDocuments().filter(
      (d) => d.customerId === customerId && d.docType !== 'quotation'
    );

    const itemsHistory: {
      docId: string;
      docNumber: string;
      docDate: string;
      docType: DocumentRecord['docType'];
      itemName: string;
      hsnSacCode: string;
      quantity: number;
      unit: string;
      unitPrice: number;
      totalAmount: number;
    }[] = [];

    let totalBilled = 0;
    let totalPaid = 0;
    let balanceDue = 0;

    docs.forEach((doc) => {
      totalBilled += doc.grandTotal;
      totalPaid += doc.paidAmount;
      balanceDue += doc.balanceDue;

      doc.items.forEach((item) => {
        itemsHistory.push({
          docId: doc.id,
          docNumber: doc.docNumber,
          docDate: doc.docDate,
          docType: doc.docType,
          itemName: item.name,
          hsnSacCode: item.hsnSacCode,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalAmount: item.totalAmount,
        });
      });
    });

    itemsHistory.sort(
      (a, b) => new Date(b.docDate).getTime() - new Date(a.docDate).getTime()
    );
    docs.sort((a, b) => new Date(b.docDate).getTime() - new Date(a.docDate).getTime());

    return {
      documents: docs,
      itemsHistory,
      totalBilled,
      totalPaid,
      balanceDue,
    };
  }

  // Suppliers & Purchases
  getSuppliers(): Supplier[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveSupplier(supplier: Supplier): void {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex((s) => s.id === supplier.id);
    const enriched: Supplier = {
      ...supplier,
      userId: this.currentUser?.uid || supplier.userId,
    };

    if (index >= 0) {
      suppliers[index] = enriched;
    } else {
      suppliers.push(enriched);
    }
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));

    if (this.currentUser) {
      syncSupplierToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore supplier sync error:', err)
      );
    }

    this.notify();
  }

  deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers().filter((s) => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));

    if (this.currentUser) {
      deleteSupplierFromFirestore(id).catch((err) =>
        console.error('Firestore supplier delete error:', err)
      );
    }

    this.notify();
  }

  getPurchases(): PurchaseRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  savePurchase(purchase: PurchaseRecord): void {
    const purchases = this.getPurchases();
    const index = purchases.findIndex((p) => p.id === purchase.id);
    const enriched: PurchaseRecord = {
      ...purchase,
      userId: this.currentUser?.uid || purchase.userId,
    };

    if (index >= 0) {
      purchases[index] = enriched;
    } else {
      purchases.unshift(enriched);
      if (enriched.paidAmount > 0) {
        this.recordPayment({
          id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          date: enriched.billDate,
          entityType: 'supplier',
          entityId: enriched.supplierId,
          entityName: enriched.supplierName,
          docId: enriched.id,
          docNumber: enriched.billNumber,
          amount: enriched.paidAmount,
          type: 'out',
          paymentMode: enriched.paymentMode,
          notes: `Purchase payment for ${enriched.billNumber}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));

    if (this.currentUser) {
      syncPurchaseToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore purchase sync error:', err)
      );
    }

    this.notify();
  }

  deletePurchase(id: string): void {
    const purchases = this.getPurchases().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));

    if (this.currentUser) {
      deletePurchaseFromFirestore(id).catch((err) =>
        console.error('Firestore purchase delete error:', err)
      );
    }

    this.notify();
  }

  // Products & Inventory
  getProducts(): Product[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveProduct(product: Product): void {
    const products = this.getProducts();
    const index = products.findIndex((p) => p.id === product.id);
    const enriched: Product = {
      ...product,
      userId: this.currentUser?.uid || product.userId,
    };

    if (index >= 0) {
      products[index] = enriched;
    } else {
      products.push(enriched);
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    if (this.currentUser) {
      syncProductToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore product sync error:', err)
      );
    }

    this.notify();
  }

  deleteProduct(id: string): void {
    const products = this.getProducts().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));

    if (this.currentUser) {
      deleteProductFromFirestore(id).catch((err) =>
        console.error('Firestore product delete error:', err)
      );
    }

    this.notify();
  }

  adjustProductStock(productId: string, delta: number): void {
    const products = this.getProducts();
    const product = products.find((p) => p.id === productId);
    if (product) {
      product.currentStock = Math.max(0, product.currentStock + delta);
      this.saveProduct(product);
    }
  }

  // Expenses
  getExpenses(): ExpenseRecord[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveExpense(expense: ExpenseRecord): void {
    const expenses = this.getExpenses();
    const index = expenses.findIndex((e) => e.id === expense.id);
    const enriched: ExpenseRecord = {
      ...expense,
      userId: this.currentUser?.uid || expense.userId,
    };

    if (index >= 0) {
      expenses[index] = enriched;
    } else {
      expenses.unshift(enriched);
    }
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    if (this.currentUser) {
      syncExpenseToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore expense sync error:', err)
      );
    }

    this.notify();
  }

  deleteExpense(id: string): void {
    const expenses = this.getExpenses().filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));

    if (this.currentUser) {
      deleteExpenseFromFirestore(id).catch((err) =>
        console.error('Firestore expense delete error:', err)
      );
    }

    this.notify();
  }

  // Payments
  getPayments(): PaymentTransaction[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  recordPayment(payment: PaymentTransaction): void {
    const payments = this.getPayments();
    const enriched: PaymentTransaction = {
      ...payment,
      userId: this.currentUser?.uid || payment.userId,
    };
    payments.unshift(enriched);
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));

    if (this.currentUser) {
      syncPaymentToFirestore(enriched, this.currentUser.uid).catch((err) =>
        console.error('Firestore payment sync error:', err)
      );
    }

    this.notify();
  }

  // Sync loaded cloud lists into local store
  setCloudDocuments(docs: DocumentRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    this.notify();
  }

  setCloudCustomers(customers: Customer[]): void {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    this.notify();
  }

  setCloudSuppliers(suppliers: Supplier[]): void {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
    this.notify();
  }

  setCloudPurchases(purchases: PurchaseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases));
    this.notify();
  }

  setCloudProducts(products: Product[]): void {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    this.notify();
  }

  setCloudExpenses(expenses: ExpenseRecord[]): void {
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    this.notify();
  }

  setCloudPayments(payments: PaymentTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
    this.notify();
  }

  setCloudProfile(profile: BusinessProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    this.notify();
  }

  // Number Generator Helper
  generateNextDocNumber(type: DocumentRecord['docType']): string {
    const profile = this.getProfile();
    const docs = this.getDocuments().filter((d) => d.docType === type);
    const count = docs.length + 1;
    const padded = String(count).padStart(3, '0');

    switch (type) {
      case 'invoice_cum_challan':
        return `${profile.invoicePrefix || '20/'}${padded}`;
      case 'tax_invoice':
        return `${profile.invoicePrefix || 'INV-26/'}${padded}`;
      case 'bill_of_supply':
        return `RET-26/${padded}`;
      case 'delivery_challan':
        return `${profile.challanPrefix || 'DC-26/'}${padded}`;
      case 'quotation':
        return `${profile.quotePrefix || 'QT-26/'}${padded}`;
      default:
        return `INV-${padded}`;
    }
  }

  // Financial & Accounting Aggregations
  getAccountingSummary() {
    const docs = this.getDocuments();
    const purchases = this.getPurchases();
    const expenses = this.getExpenses();
    const customers = this.getCustomers();
    const suppliers = this.getSuppliers();

    const salesDocs = docs.filter(
      (d) =>
        d.docType === 'tax_invoice' ||
        d.docType === 'bill_of_supply' ||
        d.docType === 'invoice_cum_challan'
    );
    const totalSalesRevenue = salesDocs.reduce((acc, d) => acc + d.grandTotal, 0);
    const totalSalesTaxable = salesDocs.reduce((acc, d) => acc + d.totalTaxable, 0);
    const totalSalesTax = salesDocs.reduce((acc, d) => acc + d.totalTax, 0);
    const cgstCollected = salesDocs.reduce((acc, d) => acc + d.cgstTotal, 0);
    const sgstCollected = salesDocs.reduce((acc, d) => acc + d.sgstTotal, 0);
    const igstCollected = salesDocs.reduce((acc, d) => acc + d.igstTotal, 0);

    const totalReceivables =
      salesDocs.reduce((acc, d) => acc + d.balanceDue, 0) +
      customers.reduce((acc, c) => acc + (c.openingBalance || 0), 0);

    const totalPurchasesAmount = purchases.reduce((acc, p) => acc + p.grandTotal, 0);
    const totalPurchasesTaxable = purchases.reduce((acc, p) => acc + p.taxableAmount, 0);
    const inputTaxCredit = purchases
      .filter((p) => p.inputTaxCreditEligible)
      .reduce((acc, p) => acc + p.gstAmount, 0);
    const totalPayables =
      purchases.reduce((acc, p) => acc + p.balanceDue, 0) +
      suppliers.reduce((acc, s) => acc + (s.openingBalance || 0), 0);

    const netGstPayable = Math.max(0, totalSalesTax - inputTaxCredit);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = totalSalesTaxable - totalPurchasesTaxable - totalExpenses;
    const profitMargin =
      totalSalesTaxable > 0 ? (netProfit / totalSalesTaxable) * 100 : 0;

    return {
      totalSalesRevenue,
      totalSalesTaxable,
      totalSalesTax,
      cgstCollected,
      sgstCollected,
      igstCollected,
      totalReceivables,
      totalPurchasesAmount,
      totalPurchasesTaxable,
      inputTaxCredit,
      totalPayables,
      netGstPayable,
      totalExpenses,
      netProfit,
      profitMargin,
      totalInvoicesCount: salesDocs.length,
      challansCount: docs.filter((d) => d.docType === 'delivery_challan').length,
      quotationsCount: docs.filter((d) => d.docType === 'quotation').length,
    };
  }

  // Backup & Restore
  exportAllData(): string {
    const backup = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      profile: this.getProfile(),
      documents: this.getDocuments(),
      customers: this.getCustomers(),
      suppliers: this.getSuppliers(),
      purchases: this.getPurchases(),
      products: this.getProducts(),
      expenses: this.getExpenses(),
      payments: this.getPayments(),
    };
    return JSON.stringify(backup, null, 2);
  }

  importAllData(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (data.profile) this.saveProfile(data.profile);
      if (data.documents && Array.isArray(data.documents)) {
        data.documents.forEach((d: DocumentRecord) => this.saveDocument(d));
      }
      if (data.customers && Array.isArray(data.customers)) {
        data.customers.forEach((c: Customer) => this.saveCustomer(c));
      }
      if (data.suppliers && Array.isArray(data.suppliers)) {
        data.suppliers.forEach((s: Supplier) => this.saveSupplier(s));
      }
      if (data.purchases && Array.isArray(data.purchases)) {
        data.purchases.forEach((p: PurchaseRecord) => this.savePurchase(p));
      }
      if (data.products && Array.isArray(data.products)) {
        data.products.forEach((pr: Product) => this.saveProduct(pr));
      }
      if (data.expenses && Array.isArray(data.expenses)) {
        data.expenses.forEach((e: ExpenseRecord) => this.saveExpense(e));
      }
      if (data.payments && Array.isArray(data.payments)) {
        data.payments.forEach((pay: PaymentTransaction) => this.recordPayment(pay));
      }
      return true;
    } catch (e) {
      console.error('Import error', e);
      return false;
    }
  }

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
    localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
    localStorage.removeItem(STORAGE_KEYS.PURCHASES);
    localStorage.removeItem(STORAGE_KEYS.PRODUCTS);
    localStorage.removeItem(STORAGE_KEYS.EXPENSES);
    localStorage.removeItem(STORAGE_KEYS.PAYMENTS);
    this.notify();
  }
}

export const storage = new StorageService();
