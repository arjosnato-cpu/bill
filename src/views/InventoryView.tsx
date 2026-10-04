import React, { useState } from 'react';
import { Product } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency } from '../utils/formatters.ts';
import {
  Search,
  Plus,
  Package,
  AlertTriangle,
  Edit2,
  Trash2,
  ArrowUpDown,
} from 'lucide-react';

interface InventoryViewProps {
  products: Product[];
  onOpenProductModal: (product?: Product) => void;
  onRefresh: () => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  onOpenProductModal,
  onRefresh,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  const categories = Array.from(new Set(products.map(p => p.category)));

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'all' && p.category !== selectedCategory) return false;
    if (showLowStockOnly && p.currentStock > p.lowStockThreshold) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.hsnSacCode.includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const lowStockCount = products.filter(p => p.currentStock <= p.lowStockThreshold).length;
  const totalStockValue = products.reduce((acc, p) => acc + (p.currentStock * p.purchaseCost), 0);
  const totalRetailValue = products.reduce((acc, p) => acc + (p.currentStock * p.salePrice), 0);

  const handleStockAdjust = (product: Product, delta: number) => {
    storage.adjustProductStock(product.id, delta);
    onRefresh();
  };

  const handleDelete = (p: Product) => {
    if (confirm(`Delete product "${p.name}"?`)) {
      storage.deleteProduct(p.id);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Catalog Items
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {products.length}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Across {categories.length} categories</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className="text-2xl font-bold font-mono text-rose-600 mt-1 tabular-nums flex items-center gap-2">
            <span>{lowStockCount}</span>
            {lowStockCount > 0 && <AlertTriangle className="w-5 h-5 text-rose-500" />}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Below re-order threshold</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Stock Inventory Cost
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {formatCurrency(totalStockValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">At purchase acquisition cost</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Estimated Retail Value
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">
            {formatCurrency(totalRetailValue)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Potential margin: {formatCurrency(totalRetailValue - totalStockValue)}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search products or HSN..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-medium"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                showLowStockOnly
                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Low Stock Only ({lowStockCount})
            </button>
          </div>

          <button
            onClick={() => onOpenProductModal()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>

        {/* Product Table */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p>No products found matching your criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Product Name & Category</th>
                  <th className="p-3.5 text-center">HSN/SAC</th>
                  <th className="p-3.5 text-center">Unit</th>
                  <th className="p-3.5 text-right">Sale Price</th>
                  <th className="p-3.5 text-right">Cost Price</th>
                  <th className="p-3.5 text-center">GST %</th>
                  <th className="p-3.5 text-center">Stock Level</th>
                  <th className="p-3.5 text-center">Quick Adjust</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const isLow = p.currentStock <= p.lowStockThreshold;
                  const marginPct = p.purchaseCost > 0
                    ? Math.round(((p.salePrice - p.purchaseCost) / p.salePrice) * 100)
                    : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>{p.category}</span>
                          {p.sku && <span className="font-mono text-[10px]">SKU: {p.sku}</span>}
                        </div>
                      </td>

                      <td className="p-3.5 text-center font-mono text-slate-600">
                        {p.hsnSacCode}
                      </td>

                      <td className="p-3.5 text-center text-slate-700">
                        {p.unit}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 tabular-nums">
                        {formatCurrency(p.salePrice)}
                      </td>

                      <td className="p-3.5 text-right font-mono text-slate-600 tabular-nums">
                        <div>{formatCurrency(p.purchaseCost)}</div>
                        <span className="text-[10px] text-emerald-600 font-sans">
                          {marginPct}% margin
                        </span>
                      </td>

                      <td className="p-3.5 text-center font-mono font-semibold text-indigo-700">
                        {p.taxRate}%
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 font-mono">
                          <span
                            className={`font-bold text-sm ${
                              isLow ? 'text-rose-600' : 'text-slate-800'
                            }`}
                          >
                            {p.currentStock}
                          </span>
                          <span className="text-[11px] text-slate-500">{p.unit}</span>
                          {isLow && (
                            <span className="text-[10px] bg-rose-100 text-rose-700 font-sans px-1.5 py-0.2 rounded font-bold">
                              LOW
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded">
                          <button
                            onClick={() => handleStockAdjust(p, -1)}
                            className="px-2 py-0.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 rounded text-xs font-bold shadow-2xs cursor-pointer"
                            title="Decrease Stock (-1)"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleStockAdjust(p, 5)}
                            className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 rounded text-xs font-bold shadow-2xs cursor-pointer"
                            title="Restock (+5)"
                          >
                            +5
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onOpenProductModal(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
