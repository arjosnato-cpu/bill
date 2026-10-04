import React, { useState, useEffect } from 'react';
import {
  DocumentRecord,
  DocumentType,
  Customer,
  Supplier,
  Product,
  BusinessProfile,
} from './types/index.ts';
import { storage } from './services/storage.ts';
import { createWhatsAppLink, formatCurrency } from './utils/formatters.ts';
import { Navbar, ActiveTab } from './components/Navbar.tsx';
import { InvoiceDocument } from './components/InvoiceDocument.tsx';
import { BillCreatorModal } from './components/BillCreatorModal.tsx';
import { WhatsAppShareModal } from './components/WhatsAppShareModal.tsx';
import { CustomerDetailModal } from './components/CustomerDetailModal.tsx';
import { CustomerEditModal } from './components/CustomerEditModal.tsx';
import { RecordPaymentModal } from './components/RecordPaymentModal.tsx';
import { ProductModal } from './components/ProductModal.tsx';
import { SupplierModal } from './components/SupplierModal.tsx';
import { ExpenseModal } from './components/ExpenseModal.tsx';
import { AIScanBillModal } from './components/AIScanBillModal.tsx';

// Firebase Auth & Firestore sync
import {
  onAuthUserChanged,
  signInWithGoogle,
  signOutUser,
  subscribeToUserDocuments,
  subscribeToUserCustomers,
  subscribeToUserSuppliers,
  subscribeToUserPurchases,
  subscribeToUserProducts,
  subscribeToUserExpenses,
  subscribeToUserPayments,
  subscribeToUserProfile,
} from './firebase/index.ts';
import { User } from 'firebase/auth';

// Views
import { BillsView } from './views/BillsView.tsx';
import { CustomersView } from './views/CustomersView.tsx';
import { SuppliersView } from './views/SuppliersView.tsx';
import { InventoryView } from './views/InventoryView.tsx';
import { AccountingView } from './views/AccountingView.tsx';
import { SettingsView } from './views/SettingsView.tsx';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('bills');
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const [profile, setProfile] = useState<BusinessProfile>(() => storage.getProfile());
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => storage.getDocuments());
  const [customers, setCustomers] = useState<Customer[]>(() => storage.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => storage.getSuppliers());
  const [purchases, setPurchases] = useState(() => storage.getPurchases());
  const [products, setProducts] = useState<Product[]>(() => storage.getProducts());

  // Modals state
  const [isScanBillOpen, setIsScanBillOpen] = useState(false);
  const [isCreateBillOpen, setIsCreateBillOpen] = useState(false);
  const [billDocType, setBillDocType] = useState<DocumentType>('tax_invoice');
  const [billCustomer, setBillCustomer] = useState<Customer | null>(null);

  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [whatsAppDoc, setWhatsAppDoc] = useState<DocumentRecord | null>(null);
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<Customer | null>(null);

  const [customerEditTarget, setCustomerEditTarget] = useState<Customer | null | undefined>(undefined);
  const [isCustomerEditOpen, setIsCustomerEditOpen] = useState(false);

  const [paymentDocTarget, setPaymentDocTarget] = useState<DocumentRecord | null>(null);
  const [paymentCustomerTarget, setPaymentCustomerTarget] = useState<Customer | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [productEditTarget, setProductEditTarget] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [supplierModalMode, setSupplierModalMode] = useState<'supplier' | 'purchase'>('supplier');
  const [supplierEditTarget, setSupplierEditTarget] = useState<Supplier | null>(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);

  const refreshData = () => {
    setProfile(storage.getProfile());
    setDocuments(storage.getDocuments());
    setCustomers(storage.getCustomers());
    setSuppliers(storage.getSuppliers());
    setPurchases(storage.getPurchases());
    setProducts(storage.getProducts());
  };

  // Firebase auth & live Firestore sync subscription
  useEffect(() => {
    // Subscribe to local storage changes
    const unsubStorage = storage.subscribe(() => {
      refreshData();
    });

    // Listen to Firebase Auth state
    const unsubAuth = onAuthUserChanged((user) => {
      setAuthUser(user);
      storage.setAuthUser(user);

      if (user) {
        setIsSyncing(true);
        // Connect real-time listeners to Firestore collections
        const unsubs = [
          subscribeToUserProfile(user.uid, (cloudProf) => {
            if (cloudProf) {
              storage.setCloudProfile(cloudProf);
              setProfile(cloudProf);
            } else {
              storage.saveProfile(storage.getProfile());
            }
          }),
          subscribeToUserDocuments(user.uid, (cloudDocs) => {
            storage.setCloudDocuments(cloudDocs);
            setDocuments(cloudDocs);
          }),
          subscribeToUserCustomers(user.uid, (cloudCusts) => {
            storage.setCloudCustomers(cloudCusts);
            setCustomers(cloudCusts);
          }),
          subscribeToUserSuppliers(user.uid, (cloudSupps) => {
            storage.setCloudSuppliers(cloudSupps);
            setSuppliers(cloudSupps);
          }),
          subscribeToUserPurchases(user.uid, (cloudPurchases) => {
            storage.setCloudPurchases(cloudPurchases);
            setPurchases(cloudPurchases);
          }),
          subscribeToUserProducts(user.uid, (cloudProducts) => {
            storage.setCloudProducts(cloudProducts);
            setProducts(cloudProducts);
          }),
          subscribeToUserExpenses(user.uid, (cloudExpenses) => {
            storage.setCloudExpenses(cloudExpenses);
          }),
          subscribeToUserPayments(user.uid, (cloudPayments) => {
            storage.setCloudPayments(cloudPayments);
          }),
        ];

        setIsSyncing(false);

        return () => {
          unsubs.forEach((unsub) => unsub());
        };
      }
    });

    return () => {
      unsubStorage();
      unsubAuth();
    };
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      refreshData();
    } catch (e) {
      console.error('Google sign in error:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      refreshData();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  };

  const handleOpenCreateBill = (type: DocumentType = 'tax_invoice', customer?: Customer) => {
    setBillDocType(type);
    setBillCustomer(customer || null);
    setIsCreateBillOpen(true);
  };

  const handleBillSaved = (doc: DocumentRecord) => {
    setIsCreateBillOpen(false);
    refreshData();
    setViewingDoc(doc);
  };

  const handleOpenEditCustomer = (customer?: Customer) => {
    setCustomerEditTarget(customer || null);
    setIsCustomerEditOpen(true);
  };

  const handleOpenRecordPaymentForDoc = (doc: DocumentRecord) => {
    setPaymentDocTarget(doc);
    setPaymentCustomerTarget(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenRecordPaymentForCustomer = (cust: Customer) => {
    setPaymentCustomerTarget(cust);
    setPaymentDocTarget(null);
    setIsPaymentModalOpen(true);
  };

  const handleOpenProductModal = (prod?: Product) => {
    setProductEditTarget(prod || null);
    setIsProductModalOpen(true);
  };

  const handleOpenSupplierModal = (mode: 'supplier' | 'purchase', supp?: Supplier) => {
    setSupplierModalMode(mode);
    setSupplierEditTarget(supp || null);
    setIsSupplierModalOpen(true);
  };

  // WhatsApp balance reminder
  const handleSendWhatsAppReminder = (customer: Customer, balanceDue: number) => {
    const text = `*Payment Reminder from ${profile.businessName}*\n\nDear *${customer.name}*,\nThis is a gentle reminder that an outstanding ledger balance of *${formatCurrency(balanceDue)}* is pending against your account.\n\nPlease arrange for settlement at your earliest convenience to our bank account or UPI: ${profile.bankDetails.upiId || profile.bankDetails.accountNo}.\n\nThank you for your cooperation!`;
    const link = createWhatsAppLink(customer.phone, text);
    window.open(link, '_blank');
  };

  const totalReceivables = documents
    .filter((d) => d.docType !== 'quotation')
    .reduce((acc, d) => acc + d.balanceDue, 0);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans pb-16 md:pb-0">
      {/* Universal Top Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCreateBill={() => handleOpenCreateBill('tax_invoice')}
        onOpenScanBill={() => setIsScanBillOpen(true)}
        businessName={profile.businessName}
        pendingReceivables={totalReceivables}
        authUser={authUser}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isSyncing={isSyncing}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'bills' && (
          <BillsView
            documents={documents}
            onOpenCreateBill={handleOpenCreateBill}
            onOpenScanBill={() => setIsScanBillOpen(true)}
            onViewDoc={(doc) => setViewingDoc(doc)}
            onShareWhatsApp={(doc) => setWhatsAppDoc(doc)}
            onRecordPayment={handleOpenRecordPaymentForDoc}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'customers' && (
          <CustomersView
            customers={customers}
            onOpenCustomerDetail={(cust) => setSelectedCustomerDetail(cust)}
            onOpenCreateBill={(cust) => handleOpenCreateBill('tax_invoice', cust)}
            onOpenEditCustomer={handleOpenEditCustomer}
            onRecordPayment={handleOpenRecordPaymentForCustomer}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'suppliers' && (
          <SuppliersView
            suppliers={suppliers}
            purchases={purchases}
            onOpenSupplierModal={handleOpenSupplierModal}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryView
            products={products}
            onOpenProductModal={handleOpenProductModal}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'accounting' && (
          <AccountingView
            onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
            onRefresh={refreshData}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            profile={profile}
            onProfileUpdated={(newProf) => {
              setProfile(newProf);
              refreshData();
            }}
            onRefreshAll={refreshData}
          />
        )}
      </main>

      {/* Bill & Challan Creator Modal */}
      {isCreateBillOpen && (
        <BillCreatorModal
          profile={profile}
          initialDocType={billDocType}
          initialCustomer={billCustomer}
          onClose={() => setIsCreateBillOpen(false)}
          onSaved={handleBillSaved}
        />
      )}

      {/* Invoice Viewer & Print Canvas */}
      {viewingDoc && (
        <InvoiceDocument
          document={viewingDoc}
          profile={profile}
          onClose={() => setViewingDoc(null)}
          onShareWhatsApp={(doc) => setWhatsAppDoc(doc)}
        />
      )}

      {/* WhatsApp Share Modal */}
      {whatsAppDoc && (
        <WhatsAppShareModal
          document={whatsAppDoc}
          profile={profile}
          onClose={() => setWhatsAppDoc(null)}
        />
      )}

      {/* Customer Purchase History & Details Modal */}
      {selectedCustomerDetail && (
        <CustomerDetailModal
          customer={selectedCustomerDetail}
          onClose={() => setSelectedCustomerDetail(null)}
          onCreateBill={(cust) => {
            setSelectedCustomerDetail(null);
            handleOpenCreateBill('tax_invoice', cust);
          }}
          onViewDoc={(doc) => setViewingDoc(doc)}
          onRecordPayment={(cust) => {
            setSelectedCustomerDetail(null);
            handleOpenRecordPaymentForCustomer(cust);
          }}
          onSendWhatsAppReminder={handleSendWhatsAppReminder}
        />
      )}

      {/* Customer Add/Edit Modal */}
      {isCustomerEditOpen && (
        <CustomerEditModal
          customer={customerEditTarget}
          onClose={() => setIsCustomerEditOpen(false)}
          onSaved={() => refreshData()}
        />
      )}

      {/* Record Payment Receipt Modal */}
      {isPaymentModalOpen && (
        <RecordPaymentModal
          customer={paymentCustomerTarget}
          document={paymentDocTarget}
          onClose={() => setIsPaymentModalOpen(false)}
          onPaymentRecorded={() => refreshData()}
        />
      )}

      {/* Product Add/Edit Modal */}
      {isProductModalOpen && (
        <ProductModal
          product={productEditTarget}
          onClose={() => setIsProductModalOpen(false)}
          onSaved={() => refreshData()}
        />
      )}

      {/* Supplier / Inward Purchase Modal */}
      {isSupplierModalOpen && (
        <SupplierModal
          mode={supplierModalMode}
          supplier={supplierEditTarget}
          onClose={() => setIsSupplierModalOpen(false)}
          onSaved={() => refreshData()}
        />
      )}

      {/* Operational Expense Modal */}
      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
          onSaved={() => refreshData()}
        />
      )}

      {/* Gemini Flash AI Bill Scanner Modal */}
      {isScanBillOpen && (
        <AIScanBillModal
          profile={profile}
          onClose={() => setIsScanBillOpen(false)}
          onStoredBill={(doc) => {
            refreshData();
            setViewingDoc(doc);
          }}
          onOpenInEditor={(draftDoc) => {
            setBillDocType(draftDoc.docType || 'tax_invoice');
            setIsCreateBillOpen(true);
          }}
        />
      )}
    </div>
  );
}
