import React, { useState } from 'react';
import { DocumentRecord, BusinessProfile } from '../types/index.ts';
import { generateWhatsAppMessage, createWhatsAppLink } from '../utils/formatters.ts';
import { X, Send, Copy, Check } from 'lucide-react';

interface WhatsAppShareModalProps {
  document: DocumentRecord;
  profile: BusinessProfile;
  onClose: () => void;
}

export const WhatsAppShareModal: React.FC<WhatsAppShareModalProps> = ({
  document: doc,
  profile,
  onClose,
}) => {
  const [phoneNumber, setPhoneNumber] = useState(doc.customerPhone || '');
  const [copied, setCopied] = useState(false);

  const defaultMsg = generateWhatsAppMessage(
    profile.businessName,
    doc.docType === 'tax_invoice'
      ? 'GST Tax Invoice'
      : doc.docType === 'delivery_challan'
      ? 'Delivery Challan'
      : doc.docType === 'quotation'
      ? 'Quotation Estimate'
      : 'Retail Bill',
    doc.docNumber,
    doc.customerName,
    doc.grandTotal,
    doc.balanceDue,
    doc.items.length,
    profile.phone,
    doc.docDate
  );

  const [message, setMessage] = useState(defaultMsg);

  const handleSendWhatsApp = () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a valid customer phone number.');
      return;
    }
    const link = createWhatsAppLink(phoneNumber, message);
    window.open(link, '_blank');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 bg-emerald-600 text-white">
          <div className="flex items-center gap-2 font-bold text-base">
            <span>Send Direct on WhatsApp</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-emerald-700 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Customer WhatsApp Number
            </label>
            <div className="flex rounded-md shadow-xs">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm font-mono">
                🇮🇳 +91
              </span>
              <input
                type="text"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                placeholder="9876543210"
                className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border border-slate-300 text-sm focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Enter 10-digit mobile number.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Message Preview
              </label>
              <button
                onClick={handleCopy}
                className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
            <textarea
              rows={8}
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="font-semibold text-slate-800">Tip: </span>
            Clicking &quot;Open WhatsApp&quot; will launch WhatsApp Web or mobile app with this bill summary ready to send with 1 click.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSendWhatsApp}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Open WhatsApp Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
