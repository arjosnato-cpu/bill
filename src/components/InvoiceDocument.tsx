import React, { useState } from 'react';
import { DocumentRecord, BusinessProfile } from '../types/index.ts';
import { formatCurrency, formatDate, numberToWordsIndian } from '../utils/formatters.ts';
import {
  Printer,
  Share2,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  Loader2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface InvoiceDocumentProps {
  document: DocumentRecord;
  profile: BusinessProfile;
  onClose: () => void;
  onShareWhatsApp: (doc: DocumentRecord) => void;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({
  document: doc,
  profile,
  onClose,
  onShareWhatsApp,
}) => {
  const [layoutMode, setLayoutMode] = useState<'a4' | 'thermal'>('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    const elementId = layoutMode === 'a4' ? 'printable-invoice' : 'printable-thermal';
    const element = document.getElementById(elementId);
    if (!element) return;

    try {
      setIsGeneratingPdf(true);

      const canvas = await html2canvas(element, {
        scale: 2.5, // High resolution for crisp professional print quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const safeDocNo = doc.docNumber.replace(/[\/\\]/g, '-');
      const safeCustomer = doc.customerName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20);

      if (layoutMode === 'a4') {
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        });

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        const pageHeight = pdf.internal.pageSize.getHeight();

        if (pdfHeight <= pageHeight) {
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        } else {
          // Multi-page splitting if bill has dozens of line items
          let heightLeft = pdfHeight;
          let position = 0;

          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;

          while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, pdfHeight);
            heightLeft -= pageHeight;
          }
        }

        pdf.save(`${safeDocNo}_${safeCustomer}_Invoice.pdf`);
      } else {
        // Thermal roll slip (80mm width)
        const slipWidth = 80;
        const slipHeight = (canvas.height * slipWidth) / canvas.width;
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: [slipWidth, Math.max(slipHeight, 80)],
        });

        pdf.addImage(imgData, 'JPEG', 0, 0, slipWidth, slipHeight);
        pdf.save(`${safeDocNo}_thermal_slip.pdf`);
      }
    } catch (err) {
      console.error('Failed to generate PDF, falling back to browser print:', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const getDocTitle = () => {
    switch (doc.docType) {
      case 'invoice_cum_challan':
        return 'INVOICE CUM CHALLAN';
      case 'tax_invoice':
        return 'TAX INVOICE';
      case 'bill_of_supply':
        return 'BILL OF SUPPLY';
      case 'delivery_challan':
        return 'DELIVERY CHALLAN';
      case 'quotation':
        return 'QUOTATION / ESTIMATE';
      default:
        return 'INVOICE';
    }
  };

  const isGSTInvoice = doc.docType === 'tax_invoice' || doc.docType === 'invoice_cum_challan';
  const isChallan = doc.docType === 'delivery_challan';
  const isQuote = doc.docType === 'quotation';

  // Default logo fallback from assets if profile.logoUrl is empty
  const defaultLogo = '/src/assets/images/business_invoice_logo_1791107504926.jpg';
  const displayLogo = profile.logoUrl || defaultLogo;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl flex flex-col max-h-[96vh]">
        {/* Top Control Bar (Never Printed) */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 rounded-t-xl shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              {getDocTitle()} - {doc.docNumber}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                doc.status === 'paid'
                  ? 'bg-emerald-100 text-emerald-800'
                  : doc.status === 'partially_paid'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-rose-100 text-rose-800'
              }`}
            >
              {doc.status.toUpperCase()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Layout switch */}
            <div className="flex items-center bg-slate-200 p-0.5 rounded-lg text-xs font-medium mr-2">
              <button
                onClick={() => setLayoutMode('a4')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  layoutMode === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Standard A4
              </button>
              <button
                onClick={() => setLayoutMode('thermal')}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  layoutMode === 'thermal' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thermal Slip (3")
              </button>
            </div>

            <button
              onClick={() => onShareWhatsApp(doc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-emerald-600" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-98 transition-all shadow-xs cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              title="Download high-resolution PDF file directly"
            >
              {isGeneratingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download as PDF</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Open system print dialog"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ml-1"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Canvas */}
        <div className="overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          {layoutMode === 'a4' ? (
            /* ================= STANDARD A4 INVOICE ================= */
            <div
              id="printable-invoice"
              className="print-only-container w-full max-w-[800px] bg-white border border-slate-300 text-slate-900 shadow-sm p-6 sm:p-8 text-[12px] leading-tight"
            >
              {/* Document Header */}
              <div className="border-b-2 border-slate-800 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-4">
                    {displayLogo && (
                      <img
                        src={displayLogo}
                        alt="Logo"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 object-contain rounded border border-slate-200 p-0.5"
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-extrabold tracking-tight text-slate-900 uppercase">
                        {profile.businessName}
                      </h1>
                      <p className="text-[11px] text-slate-600 max-w-md mt-0.5">
                        {profile.tagline}
                      </p>
                      <p className="text-[11px] text-slate-700 mt-1">
                        {profile.address}, {profile.city}, {profile.state} - {profile.pincode}
                      </p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-slate-700 font-medium mt-1">
                        <span>Phone: <strong className="text-slate-900">{profile.phone}</strong></span>
                        {profile.email && <span>Email: <strong className="text-slate-900">{profile.email}</strong></span>}
                      </div>
                      <div className="flex gap-4 text-[11px] text-slate-800 font-mono font-semibold mt-1">
                        {profile.gstNumber && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            GSTIN: {profile.gstNumber}
                          </span>
                        )}
                        {profile.pan && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                            PAN: {profile.pan}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Title & Document Meta */}
                  <div className="text-right">
                    <div className="inline-block bg-slate-900 text-white font-bold text-xs tracking-wider px-3 py-1 rounded uppercase mb-2">
                      {getDocTitle()}
                    </div>
                    <div className="space-y-1 font-mono text-[11px]">
                      <div>
                        <span className="text-slate-500">Tax Invoice No: </span>
                        <strong className="text-slate-900 text-[12px]">{doc.docNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500">Date: </span>
                        <span className="text-slate-800">{formatDate(doc.docDate)}</span>
                      </div>
                      {doc.poNumber && (
                        <div>
                          <span className="text-slate-500">Order No: </span>
                          <span className="text-slate-800">{doc.poNumber}</span>
                        </div>
                      )}
                      {doc.vehicleNo && (
                        <div>
                          <span className="text-slate-500">Vehicle No: </span>
                          <strong className="text-slate-900">{doc.vehicleNo}</strong>
                        </div>
                      )}
                      {doc.eWayBillNo && (
                        <div>
                          <span className="text-slate-500">E-Way Bill No: </span>
                          <span className="text-slate-800">{doc.eWayBillNo}</span>
                        </div>
                      )}
                      {isQuote && doc.quotationValidity && (
                        <div>
                          <span className="text-slate-500">Valid Until: </span>
                          <span className="text-slate-800">{formatDate(doc.quotationValidity)}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-slate-500">Place of Supply: </span>
                        <span className="text-slate-800 font-sans font-semibold">{doc.placeOfSupply}</span>
                      </div>
                      {isGSTInvoice && (
                        <div>
                          <span className="text-slate-500">Reverse Charge: </span>
                          <span className="text-slate-800 font-sans">{doc.reverseCharge ? 'Yes' : 'No'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Challan Specific Transport Banner */}
              {isChallan && (
                <div className="bg-amber-50 border border-amber-300 rounded p-2.5 mb-4 text-[11px]">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-amber-800 font-semibold">Vehicle Number:</span>{' '}
                      <strong className="font-mono text-slate-900">{doc.vehicleNo || 'N/A'}</strong>
                    </div>
                    <div>
                      <span className="text-amber-800 font-semibold">Transport Mode:</span>{' '}
                      <span className="text-slate-900">{doc.transportMode || 'Road'}</span>
                    </div>
                    <div>
                      <span className="text-amber-800 font-semibold">Purpose of Transport:</span>{' '}
                      <span className="text-slate-900 font-bold">{doc.challanPurpose || 'Delivery on Approval'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Bill To & Ship To Boxes */}
              <div className="grid grid-cols-2 gap-4 mb-4 border border-slate-300 rounded p-3 bg-slate-50/50">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
                    Billed To (Customer Details)
                  </div>
                  <div className="font-bold text-[13px] text-slate-900">{doc.customerName}</div>
                  <div className="text-slate-700 whitespace-pre-line mt-0.5">{doc.customerBillingAddress}</div>
                  <div className="mt-1 text-slate-700">
                    Phone: <strong className="text-slate-900">{doc.customerPhone}</strong>
                  </div>
                  {doc.customerGstin && (
                    <div className="mt-0.5 font-mono text-[11px] font-semibold text-slate-900">
                      GSTIN: {doc.customerGstin}
                    </div>
                  )}
                </div>

                <div className="border-l border-slate-200 pl-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-200 pb-0.5">
                    Shipped To / Consignee
                  </div>
                  {doc.customerShippingAddress ? (
                    <>
                      <div className="font-semibold text-slate-900">{doc.customerName}</div>
                      <div className="text-slate-700 whitespace-pre-line mt-0.5">{doc.customerShippingAddress}</div>
                    </>
                  ) : (
                    <div className="text-slate-500 italic mt-1">Same as billing address</div>
                  )}
                  <div className="mt-2 text-[11px] text-slate-600">
                    State: <strong className="text-slate-800">{doc.placeOfSupply}</strong>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full border-collapse border border-slate-300 text-left mb-4">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-semibold text-[11px] uppercase border-b border-slate-300">
                    <th className="p-2 border-r border-slate-300 w-8 text-center">#</th>
                    <th className="p-2 border-r border-slate-300">Item Description</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-center">HSN/SAC</th>
                    <th className="p-2 border-r border-slate-300 w-16 text-right">Qty</th>
                    <th className="p-2 border-r border-slate-300 w-20 text-right">Rate</th>
                    {doc.totalDiscount > 0 && (
                      <th className="p-2 border-r border-slate-300 w-16 text-right">Disc</th>
                    )}
                    {isGSTInvoice && (
                      <>
                        <th className="p-2 border-r border-slate-300 w-20 text-right">Taxable</th>
                        {doc.isInterState ? (
                          <th className="p-2 border-r border-slate-300 w-20 text-right">IGST</th>
                        ) : (
                          <>
                            <th className="p-2 border-r border-slate-300 w-16 text-right">CGST</th>
                            <th className="p-2 border-r border-slate-300 w-16 text-right">SGST</th>
                          </>
                        )}
                      </>
                    )}
                    <th className="p-2 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {doc.items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-slate-300">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.description && (
                          <div className="text-[10px] text-slate-500 mt-0.5">{item.description}</div>
                        )}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono text-slate-700">
                        {item.hsnSacCode || '-'}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums">
                        {formatCurrency(item.unitPrice)}
                      </td>
                      {doc.totalDiscount > 0 && (
                        <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums text-slate-600">
                          {item.discountAmount > 0 ? formatCurrency(item.discountAmount) : '-'}
                        </td>
                      )}
                      {isGSTInvoice && (
                        <>
                          <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums">
                            {formatCurrency(item.taxableAmount)}
                          </td>
                          {doc.isInterState ? (
                            <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums text-[10px]">
                              <div>{formatCurrency(item.igstAmount)}</div>
                              <span className="text-slate-500">({item.taxRate}%)</span>
                            </td>
                          ) : (
                            <>
                              <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums text-[10px]">
                                <div>{formatCurrency(item.cgstAmount)}</div>
                                <span className="text-slate-500">({item.taxRate / 2}%)</span>
                              </td>
                              <td className="p-2 border-r border-slate-300 text-right font-mono tabular-nums text-[10px]">
                                <div>{formatCurrency(item.sgstAmount)}</div>
                                <span className="text-slate-500">({item.taxRate / 2}%)</span>
                              </td>
                            </>
                          )}
                        </>
                      )}
                      <td className="p-2 text-right font-mono font-bold tabular-nums text-slate-900">
                        {formatCurrency(item.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Lower Section: Words, Bank Details, and Calculation Summary */}
              <div className="grid grid-cols-12 gap-4 mb-4 border border-slate-300 rounded p-3">
                {/* Left 7 cols: Amount in Words & Bank Info */}
                <div className="col-span-7 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">
                      Total Invoice Amount (in words):
                    </span>
                    <span className="font-semibold text-slate-800 text-[11px] italic">
                      {numberToWordsIndian(doc.grandTotal)}
                    </span>
                  </div>

                  {/* Bank Details */}
                  {profile.bankDetails.accountNo && (
                    <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                        Bank Details for Payment
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono text-[11px]">
                        <div><span className="text-slate-500 font-sans">Bank:</span> {profile.bankDetails.bankName}</div>
                        <div><span className="text-slate-500 font-sans">A/c No:</span> {profile.bankDetails.accountNo}</div>
                        <div><span className="text-slate-500 font-sans">IFSC:</span> {profile.bankDetails.ifscCode}</div>
                        <div><span className="text-slate-500 font-sans">Branch:</span> {profile.bankDetails.branch}</div>
                        {profile.bankDetails.upiId && (
                          <div className="col-span-2 text-indigo-700 font-semibold">
                            <span className="text-slate-500 font-sans">UPI ID:</span> {profile.bankDetails.upiId}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Terms */}
                  {profile.termsAndConditions && (
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                        Terms & Conditions:
                      </span>
                      <p className="text-[10px] text-slate-600 whitespace-pre-line leading-relaxed">
                        {doc.terms || profile.termsAndConditions}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right 5 cols: Totals summary */}
                <div className="col-span-5 border-l border-slate-200 pl-3 space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="tabular-nums">{formatCurrency(doc.subtotal)}</span>
                  </div>

                  {doc.totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Total Discount:</span>
                      <span className="tabular-nums">-{formatCurrency(doc.totalDiscount)}</span>
                    </div>
                  )}

                  {isGSTInvoice && (
                    <>
                      <div className="flex justify-between text-slate-700 font-semibold border-t border-slate-200 pt-1">
                        <span>Taxable Amount:</span>
                        <span className="tabular-nums">{formatCurrency(doc.totalTaxable)}</span>
                      </div>

                      {doc.isInterState ? (
                        <div className="flex justify-between text-slate-600">
                          <span>Integrated Tax (IGST):</span>
                          <span className="tabular-nums">{formatCurrency(doc.igstTotal)}</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between text-slate-600">
                            <span>Central Tax (CGST):</span>
                            <span className="tabular-nums">{formatCurrency(doc.cgstTotal)}</span>
                          </div>
                          <div className="flex justify-between text-slate-600">
                            <span>State Tax (SGST):</span>
                            <span className="tabular-nums">{formatCurrency(doc.sgstTotal)}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {doc.roundOff !== 0 && (
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>Round Off:</span>
                      <span className="tabular-nums">{formatCurrency(doc.roundOff)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-base font-extrabold text-slate-900 border-t-2 border-slate-800 pt-1.5 pb-1">
                    <span>Grand Total:</span>
                    <span className="tabular-nums text-indigo-700">{formatCurrency(doc.grandTotal)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-emerald-700 pt-1 border-t border-slate-200">
                    <span>Amount Paid:</span>
                    <span className="tabular-nums font-semibold">{formatCurrency(doc.paidAmount)}</span>
                  </div>

                  <div className="flex justify-between text-[11px] text-rose-700 font-bold">
                    <span>Balance Due:</span>
                    <span className="tabular-nums">{formatCurrency(doc.balanceDue)}</span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-sans text-right pt-0.5">
                    Payment Mode: <strong className="uppercase text-slate-700">{doc.paymentMode}</strong>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-300 items-end">
                <div>
                  <p className="text-[10px] text-slate-500 italic">
                    {profile.invoiceNote || 'This is a computer generated document.'}
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-[11px] font-bold text-slate-800">
                    For {profile.businessName}
                  </div>
                  <div className="h-14 flex items-end justify-end">
                    <div className="border-b border-slate-400 w-44 text-center pb-1 text-[10px] text-slate-500 font-medium">
                      {profile.authorizedSignatoryTitle || 'Authorized Signatory'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ================= COMPACT THERMAL SLIP (3 INCH) ================= */
            <div
              id="printable-thermal"
              className="print-only-container w-[320px] bg-white border border-slate-300 font-mono text-[11px] p-4 text-slate-900 shadow-sm leading-tight"
            >
              <div className="text-center pb-2 border-b border-dashed border-slate-400">
                <div className="text-sm font-bold uppercase">{profile.businessName}</div>
                <div className="text-[10px] text-slate-600">{profile.address}</div>
                <div className="text-[10px]">Ph: {profile.phone}</div>
                {profile.gstNumber && <div className="text-[10px] font-bold">GSTIN: {profile.gstNumber}</div>}
                <div className="mt-1 font-bold bg-slate-100 py-0.5">{getDocTitle()}</div>
              </div>

              <div className="py-2 border-b border-dashed border-slate-400 text-[10px] space-y-0.5">
                <div className="flex justify-between">
                  <span>No: {doc.docNumber}</span>
                  <span>{formatDate(doc.docDate)}</span>
                </div>
                <div>Cust: <strong>{doc.customerName}</strong></div>
                {doc.customerPhone && <div>Ph: {doc.customerPhone}</div>}
              </div>

              <table className="w-full my-2 text-[10px]">
                <thead>
                  <tr className="border-b border-slate-400 text-left">
                    <th className="py-1">Item</th>
                    <th className="text-right py-1">Qty</th>
                    <th className="text-right py-1">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {doc.items.map(item => (
                    <tr key={item.id}>
                      <td className="py-1">
                        <div>{item.name}</div>
                        <div className="text-[9px] text-slate-500">@{formatCurrency(item.unitPrice)}</div>
                      </td>
                      <td className="text-right py-1 align-top">{item.quantity}</td>
                      <td className="text-right py-1 align-top font-bold">{formatCurrency(item.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="py-2 border-t border-dashed border-slate-400 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(doc.subtotal)}</span>
                </div>
                {isGSTInvoice && (
                  <div className="flex justify-between text-[10px] text-slate-600">
                    <span>Tax (GST):</span>
                    <span>{formatCurrency(doc.totalTax)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-slate-400 pt-1">
                  <span>Total:</span>
                  <span>{formatCurrency(doc.grandTotal)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Paid ({doc.paymentMode}):</span>
                  <span>{formatCurrency(doc.paidAmount)}</span>
                </div>
                {doc.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-rose-600">
                    <span>Balance Due:</span>
                    <span>{formatCurrency(doc.balanceDue)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 border-t border-dashed border-slate-400 text-[9px] text-slate-600">
                <p>Thank you for shopping with us!</p>
                <p>Visit Again</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
