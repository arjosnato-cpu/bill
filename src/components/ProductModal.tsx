import React, { useState } from 'react';
import { Product } from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { X, Check, Package } from 'lucide-react';

interface ProductModalProps {
  product?: Product | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  onClose,
  onSaved,
}) => {
  const [name, setName] = useState(product ? product.name : '');
  const [sku, setSku] = useState(product ? product.sku || '' : '');
  const [hsnSacCode, setHsnSacCode] = useState(product ? product.hsnSacCode : '8544');
  const [category, setCategory] = useState(product ? product.category : 'General');
  const [unit, setUnit] = useState(product ? product.unit : 'Pcs');
  const [salePrice, setSalePrice] = useState(product ? product.salePrice : 0);
  const [purchaseCost, setPurchaseCost] = useState(product ? product.purchaseCost : 0);
  const [taxRate, setTaxRate] = useState(product ? product.taxRate : 18);
  const [currentStock, setCurrentStock] = useState(product ? product.currentStock : 20);
  const [lowStockThreshold, setLowStockThreshold] = useState(
    product ? product.lowStockThreshold : 5
  );
  const [description, setDescription] = useState(product ? product.description || '' : '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter product name.');
      return;
    }

    const prod: Product = {
      id: product ? product.id : `prod-${Date.now()}`,
      name: name.trim(),
      sku: sku.trim() || undefined,
      hsnSacCode: hsnSacCode.trim() || '8544',
      category: category.trim() || 'General',
      unit,
      salePrice: Number(salePrice) || 0,
      purchaseCost: Number(purchaseCost) || 0,
      taxRate: Number(taxRate) || 0,
      currentStock: Number(currentStock) || 0,
      lowStockThreshold: Number(lowStockThreshold) || 5,
      description: description.trim() || undefined,
    };

    storage.saveProduct(prod);
    onSaved(prod);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {product ? 'Edit Catalog Product' : 'Add Item to Product Catalog'}
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
            <label className="block font-semibold text-slate-700 mb-1">Product / Item Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Copper Wire 2.5 sq mm (90m Roll)"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HSN/SAC Code *</label>
              <input
                type="text"
                required
                placeholder="8544"
                value={hsnSacCode}
                onChange={e => setHsnSacCode(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">SKU / Code</label>
              <input
                type="text"
                placeholder="e.g. PROD-01"
                value={sku}
                onChange={e => setSku(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <input
                type="text"
                placeholder="e.g. Cables"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit</label>
              <select
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800"
              >
                <option value="Pcs">Pcs</option>
                <option value="Box">Box</option>
                <option value="Roll">Roll</option>
                <option value="Kg">Kg</option>
                <option value="Mtr">Mtr</option>
                <option value="Nos">Nos</option>
                <option value="Set">Set</option>
                <option value="Bag">Bag</option>
                <option value="Ltr">Ltr</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sale Price (₹) *</label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={salePrice}
                onChange={e => setSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (₹)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={purchaseCost}
                onChange={e => setPurchaseCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GST Tax Rate</label>
              <select
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 font-medium"
              >
                <option value="0">0% (Nil / Exempt)</option>
                <option value="5">5%</option>
                <option value="12">12%</option>
                <option value="18">18%</option>
                <option value="28">28%</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                step="any"
                value={currentStock}
                onChange={e => setCurrentStock(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Low Stock Alert</label>
              <input
                type="number"
                min="0"
                step="any"
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Specs</label>
            <input
              type="text"
              placeholder="e.g. 100% Electrolytic Copper, ISI marked"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-1.5 border border-slate-300 rounded"
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
              <Check className="w-4 h-4" />
              <span>Save Product</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
