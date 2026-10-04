import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  getDocFromServer,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
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

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling conforming to Firebase Skill specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
    }
  }
}

testConnection();

// Authentication helpers
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Sign-in failed:', err);
    throw err;
  }
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export function onAuthUserChanged(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, callback);
}

// Real-time Firestore sync helpers
export function subscribeToUserDocuments(
  userId: string,
  onData: (docs: DocumentRecord[]) => void
): Unsubscribe {
  const path = 'documents';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: DocumentRecord[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as DocumentRecord);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncDocumentToFirestore(record: DocumentRecord, userId: string) {
  const path = `documents/${record.id}`;
  try {
    await setDoc(doc(db, 'documents', record.id), {
      ...record,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDocumentFromFirestore(id: string) {
  const path = `documents/${id}`;
  try {
    await deleteDoc(doc(db, 'documents', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Customers
export function subscribeToUserCustomers(
  userId: string,
  onData: (customers: Customer[]) => void
): Unsubscribe {
  const path = 'customers';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: Customer[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as Customer);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncCustomerToFirestore(customer: Customer, userId: string) {
  const path = `customers/${customer.id}`;
  try {
    await setDoc(doc(db, 'customers', customer.id), {
      ...customer,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCustomerFromFirestore(id: string) {
  const path = `customers/${id}`;
  try {
    await deleteDoc(doc(db, 'customers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Suppliers
export function subscribeToUserSuppliers(
  userId: string,
  onData: (suppliers: Supplier[]) => void
): Unsubscribe {
  const path = 'suppliers';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: Supplier[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as Supplier);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncSupplierToFirestore(supplier: Supplier, userId: string) {
  const path = `suppliers/${supplier.id}`;
  try {
    await setDoc(doc(db, 'suppliers', supplier.id), {
      ...supplier,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteSupplierFromFirestore(id: string) {
  const path = `suppliers/${id}`;
  try {
    await deleteDoc(doc(db, 'suppliers', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Purchases
export function subscribeToUserPurchases(
  userId: string,
  onData: (purchases: PurchaseRecord[]) => void
): Unsubscribe {
  const path = 'purchases';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: PurchaseRecord[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as PurchaseRecord);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncPurchaseToFirestore(purchase: PurchaseRecord, userId: string) {
  const path = `purchases/${purchase.id}`;
  try {
    await setDoc(doc(db, 'purchases', purchase.id), {
      ...purchase,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePurchaseFromFirestore(id: string) {
  const path = `purchases/${id}`;
  try {
    await deleteDoc(doc(db, 'purchases', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Products
export function subscribeToUserProducts(
  userId: string,
  onData: (products: Product[]) => void
): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: Product[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as Product);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncProductToFirestore(product: Product, userId: string) {
  const path = `products/${product.id}`;
  try {
    await setDoc(doc(db, 'products', product.id), {
      ...product,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteProductFromFirestore(id: string) {
  const path = `products/${id}`;
  try {
    await deleteDoc(doc(db, 'products', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Expenses
export function subscribeToUserExpenses(
  userId: string,
  onData: (expenses: ExpenseRecord[]) => void
): Unsubscribe {
  const path = 'expenses';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: ExpenseRecord[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as ExpenseRecord);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncExpenseToFirestore(expense: ExpenseRecord, userId: string) {
  const path = `expenses/${expense.id}`;
  try {
    await setDoc(doc(db, 'expenses', expense.id), {
      ...expense,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteExpenseFromFirestore(id: string) {
  const path = `expenses/${id}`;
  try {
    await deleteDoc(doc(db, 'expenses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Payments
export function subscribeToUserPayments(
  userId: string,
  onData: (payments: PaymentTransaction[]) => void
): Unsubscribe {
  const path = 'payments';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const records: PaymentTransaction[] = [];
      snapshot.forEach((snap) => {
        records.push(snap.data() as PaymentTransaction);
      });
      onData(records);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncPaymentToFirestore(payment: PaymentTransaction, userId: string) {
  const path = `payments/${payment.id}`;
  try {
    await setDoc(doc(db, 'payments', payment.id), {
      ...payment,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePaymentFromFirestore(id: string) {
  const path = `payments/${id}`;
  try {
    await deleteDoc(doc(db, 'payments', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Business Profile
export function subscribeToUserProfile(
  userId: string,
  onData: (profile: BusinessProfile | null) => void
): Unsubscribe {
  const path = `profiles/${userId}`;
  return onSnapshot(
    doc(db, 'profiles', userId),
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data() as BusinessProfile);
      } else {
        onData(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function syncProfileToFirestore(profile: BusinessProfile, userId: string) {
  const path = `profiles/${userId}`;
  try {
    await setDoc(doc(db, 'profiles', userId), {
      ...profile,
      userId,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
