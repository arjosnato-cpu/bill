import React from 'react';
import {
  Plus,
  ReceiptText,
  Users,
  Package,
  BarChart3,
  Settings,
  Truck,
  Cloud,
  CloudOff,
  LogOut,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { User } from 'firebase/auth';

export type ActiveTab = 'bills' | 'customers' | 'suppliers' | 'inventory' | 'accounting' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenCreateBill: () => void;
  onOpenScanBill?: () => void;
  businessName?: string;
  pendingReceivables?: number;
  authUser?: User | null;
  onSignIn?: () => void;
  onSignOut?: () => void;
  isSyncing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreateBill,
  onOpenScanBill,
  businessName = 'My Business',
  authUser,
  onSignIn,
  onSignOut,
  isSyncing = false,
}) => {
  return (
    <>
      {/* ================= DESKTOP TOP BAR ================= */}
      <header className="hidden md:block sticky top-0 z-30 bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Zone 1: Single text element wordmark */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('bills')}
                className="text-left group flex items-center gap-2.5 focus:outline-none cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  B2B
                </div>
                <div>
                  <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                    VyaparFlow
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block leading-none">
                    GST Billing & Cloud Sync
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation tabs */}
            <nav className="flex items-center gap-1 lg:gap-2 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setActiveTab('bills')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'bills'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <ReceiptText className="w-4 h-4" />
                <span>Invoices & Bills</span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'customers'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Buyers & Ledger</span>
              </button>

              <button
                onClick={() => setActiveTab('suppliers')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'suppliers'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Vendors & ITC</span>
              </button>

              <button
                onClick={() => setActiveTab('inventory')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>Stock Catalog</span>
              </button>

              <button
                onClick={() => setActiveTab('accounting')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'accounting'
                    ? 'bg-indigo-600/10 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analytics & GST</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'settings'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
            </nav>

            {/* Zone 3: Actions + Firebase Auth */}
            <div className="flex items-center gap-3">
              {authUser ? (
                <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                    <Cloud className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="hidden lg:inline">{authUser.displayName || 'Cloud Synced'}</span>
                  </span>
                  <button
                    onClick={onSignOut}
                    title="Sign Out"
                    className="text-slate-400 hover:text-rose-600 ml-1 cursor-pointer transition-colors p-0.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onSignIn}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  <CloudOff className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sync with Google</span>
                </button>
              )}

              {onOpenScanBill && (
                <button
                  onClick={onOpenScanBill}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-all shadow-2xs active:scale-98 cursor-pointer"
                  title="Scan paper bill or receipt using camera or photo upload"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>AI Scan Bill</span>
                </button>
              )}

              <button
                onClick={onOpenCreateBill}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-98 transition-all shadow-xs whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create B2B Bill</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ================= MOBILE COMPACT TOP BAR ================= */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
            B2B
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-900 truncate">
              {businessName || 'VyaparFlow'}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-medium -mt-0.5">
              {authUser ? (
                <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Firebase Synced
                </span>
              ) : (
                <button
                  onClick={onSignIn}
                  className="text-indigo-600 font-semibold hover:underline flex items-center gap-0.5"
                >
                  <LogIn className="w-2.5 h-2.5" />
                  <span>Sign in to sync</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenScanBill && (
            <button
              onClick={onOpenScanBill}
              className="min-h-[38px] px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-1 cursor-pointer"
              title="AI Scan Bill"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Scan</span>
            </button>
          )}

          {authUser && (
            <button
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onOpenCreateBill}
            className="min-h-[38px] px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 active:bg-indigo-700 rounded-lg shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Bill</span>
          </button>
        </div>
      </header>

      {/* ================= MOBILE FIXED BOTTOM TAB BAR ================= */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg pb-safe">
        <div className="grid grid-cols-5 h-15">
          {/* Tab 1: Bills */}
          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              activeTab === 'bills' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ReceiptText className={`w-5 h-5 ${activeTab === 'bills' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Bills</span>
          </button>

          {/* Tab 2: Buyers / Customers */}
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              activeTab === 'customers' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className={`w-5 h-5 ${activeTab === 'customers' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Buyers</span>
          </button>

          {/* Tab 3: Catalog / Stock */}
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              activeTab === 'inventory' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className={`w-5 h-5 ${activeTab === 'inventory' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Stock</span>
          </button>

          {/* Tab 4: Analytics */}
          <button
            onClick={() => setActiveTab('accounting')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              activeTab === 'accounting' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className={`w-5 h-5 ${activeTab === 'accounting' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Reports</span>
          </button>

          {/* Tab 5: Settings / Profile */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center min-h-[44px] cursor-pointer transition-colors ${
              activeTab === 'settings' ? 'text-indigo-600 font-bold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5 tracking-tight">Settings</span>
          </button>
        </div>
      </div>
    </>
  );
};
