import React, { useState, useRef, useEffect } from 'react';
import {
  DocumentRecord,
  DocumentType,
  LineItem,
  BusinessProfile,
  Customer,
  PaymentMode,
} from '../types/index.ts';
import { storage } from '../services/storage.ts';
import { formatCurrency, formatDate } from '../utils/formatters.ts';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Save,
  ArrowRight,
  Layers,
  Building,
  RotateCw,
} from 'lucide-react';

interface AIScanBillModalProps {
  profile: BusinessProfile;
  onClose: () => void;
  onStoredBill: (doc: DocumentRecord) => void;
  onOpenInEditor?: (draftDoc: Partial<DocumentRecord>) => void;
}

type ScanTab = 'camera' | 'upload';

export const AIScanBillModal: React.FC<AIScanBillModalProps> = ({
  profile,
  onClose,
  onStoredBill,
  onOpenInEditor,
}) => {
  const [activeTab, setActiveTab] = useState<ScanTab>('camera');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [extractedDoc, setExtractedDoc] = useState<DocumentRecord | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize camera when activeTab === 'camera' and no preview image
  useEffect(() => {
    if (activeTab === 'camera' && !previewImage && !extractedDoc) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab, facingMode, previewImage, extractedDoc]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access not available or permission denied. Please upload a photo instead.');
      setIsCameraActive(false);
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setPreviewImage(dataUrl);
    stopCamera();
    triggerGeminiScan(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewImage(dataUrl);
      triggerGeminiScan(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const triggerGeminiScan = async (base64Image: string) => {
    setIsScanning(true);
    setScanError(null);
    setExtractedDoc(null);

    try {
      const res = await fetch('/api/scan-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to scan bill. Please try again with a clearer picture.');
      }

      const raw = result.data;

      // Construct verified LineItems
      const items: LineItem[] = (raw.items || []).map((it: any, idx: number) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unitPrice) || 0;
        const taxRate = Number(it.taxRate) || 18;
        const taxable = Number(it.taxableAmount) || qty * price;
        const total = Number(it.totalAmount) || taxable * (1 + taxRate / 100);

        const isInterState = Boolean(raw.isInterState);
        const cgst = isInterState ? 0 : Number(it.cgstAmount) || (taxable * (taxRate / 2)) / 100;
        const sgst = isInterState ? 0 : Number(it.sgstAmount) || (taxable * (taxRate / 2)) / 100;
        const igst = isInterState ? Number(it.igstAmount) || (taxable * taxRate) / 100 : 0;

        return {
          id: `item-scan-${idx}-${Date.now()}`,
          name: it.name || `Item ${idx + 1}`,
          hsnSacCode: it.hsnSacCode || '',
          quantity: qty,
          unit: it.unit || 'NOS',
          unitPrice: price,
          discountPercent: Number(it.discountPercent) || 0,
          discountAmount: 0,
          taxRate,
          taxableAmount: taxable,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: igst,
          totalAmount: total,
        };
      });

      const grandTotal = Number(raw.grandTotal) || items.reduce((acc, i) => acc + i.totalAmount, 0);
      const paid = Number(raw.paidAmount) || grandTotal;
      const balanceDue = Number(raw.balanceDue) || Math.max(0, grandTotal - paid);

      const docRecord: DocumentRecord = {
        id: `doc-scan-${Date.now()}`,
        docNumber: raw.docNumber || `OLD-${Date.now().toString().slice(-4)}`,
        docType: (raw.docType as DocumentType) || 'tax_invoice',
        docDate: raw.docDate || new Date().toISOString().split('T')[0],
        poNumber: raw.poNumber || '',
        poDate: raw.poDate || '',
        vehicleNo: raw.vehicleNo || '',
        eWayBillNo: raw.eWayBillNo || '',
        isB2B: Boolean(raw.isB2B),
        customerName: raw.customerName || 'Walk-in Customer',
        customerPhone: raw.customerPhone || '',
        customerGstin: raw.customerGstin || '',
        customerBillingAddress: raw.customerBillingAddress || '',
        placeOfSupply: raw.placeOfSupply || profile.state || 'Delhi',
        isInterState: Boolean(raw.isInterState),
        reverseCharge: Boolean(raw.reverseCharge),
        items,
        subtotal: Number(raw.subtotal) || items.reduce((acc, i) => acc + i.unitPrice * i.quantity, 0),
        totalDiscount: Number(raw.totalDiscount) || 0,
        totalTaxable: Number(raw.totalTaxable) || items.reduce((acc, i) => acc + i.taxableAmount, 0),
        cgstTotal: Number(raw.cgstTotal) || items.reduce((acc, i) => acc + i.cgstAmount, 0),
        sgstTotal: Number(raw.sgstTotal) || items.reduce((acc, i) => acc + i.sgstAmount, 0),
        igstTotal: Number(raw.igstTotal) || items.reduce((acc, i) => acc + i.igstAmount, 0),
        totalTax: Number(raw.totalTax) || (Number(raw.cgstTotal) || 0) + (Number(raw.sgstTotal) || 0) + (Number(raw.igstTotal) || 0),
        roundOff: Number(raw.roundOff) || 0,
        grandTotal,
        paidAmount: paid,
        balanceDue,
        paymentMode: (raw.paymentMode as PaymentMode) || 'cash',
        notes: raw.notes ? `[Scanned with Gemini Flash AI] ${raw.notes}` : '[Scanned with Gemini Flash AI]',
        status: balanceDue <= 0 ? 'paid' : paid > 0 ? 'partially_paid' : 'unpaid',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setExtractedDoc(docRecord);
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || 'Error communicating with Gemini Flash. Please check your network or try another photo.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleRetake = () => {
    setPreviewImage(null);
    setExtractedDoc(null);
    setScanError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  const handleSaveDocDirectly = () => {
    if (!extractedDoc) return;

    // Check if customer exists or create new
    if (extractedDoc.customerName && extractedDoc.customerName !== 'Walk-in Customer') {
      const existingCustomers = storage.getCustomers();
      const match = existingCustomers.find(
        (c) =>
          c.name.toLowerCase() === extractedDoc.customerName.toLowerCase() ||
          (extractedDoc.customerGstin && c.gstin === extractedDoc.customerGstin)
      );

      if (!match) {
        // Automatically save new customer to database
        const newCust: Customer = {
          id: `cust-${Date.now()}`,
          name: extractedDoc.customerName,
          companyName: extractedDoc.customerName,
          phone: extractedDoc.customerPhone || '',
          gstin: extractedDoc.customerGstin || '',
          billingAddress: extractedDoc.customerBillingAddress || '',
          state: extractedDoc.placeOfSupply || profile.state || 'Delhi',
          stateCode: '',
          pincode: '',
          openingBalance: 0,
          notes: 'Auto-added from Gemini Flash scan',
          createdAt: new Date().toISOString(),
        };
        storage.saveCustomer(newCust);
        extractedDoc.customerId = newCust.id;
      } else {
        extractedDoc.customerId = match.id;
      }
    }

    // Save document to database
    storage.saveDocument(extractedDoc);
    onStoredBill(extractedDoc);
    onClose();
  };

  const handleOpenInBillEditor = () => {
    if (!extractedDoc) return;
    if (onOpenInEditor) {
      onOpenInEditor(extractedDoc);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">AI Old Bill Scanner</h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-full font-semibold border border-amber-400/30">
                  Gemini Flash Model
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-none mt-0.5">
                Scan or photograph any paper invoice/receipt to auto-extract and store in database
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 space-y-4">
          {/* Mode Switcher Tabs (Only if not extracted) */}
          {!extractedDoc && !isScanning && (
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('camera');
                  setPreviewImage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'camera'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Open Camera</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('upload');
                  setPreviewImage(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>Upload Bill Image</span>
              </button>
            </div>
          )}

          {/* STEP 1: CAPTURE OR UPLOAD VIEW */}
          {!previewImage && !extractedDoc && (
            <>
              {activeTab === 'camera' ? (
                <div className="space-y-3">
                  {cameraError ? (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">{cameraError}</p>
                        <p className="mt-1">
                          You can switch to the Upload tab to choose a file or take a picture using your native camera.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-[4/3] flex items-center justify-center shadow-inner">
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="w-full h-full object-cover"
                      />

                      {/* Viewfinder Target Overlay */}
                      <div className="absolute inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                        <div className="flex justify-between text-[10px] text-white/80 font-mono font-semibold bg-black/40 px-2 py-0.5 rounded self-center">
                          Fit whole bill inside frame
                        </div>
                      </div>

                      {/* Controls inside camera overlay */}
                      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-10">
                        <button
                          type="button"
                          onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                          title="Switch Camera"
                          className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-all cursor-pointer"
                        >
                          <RotateCw className="w-5 h-5" />
                        </button>

                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          className="w-16 h-16 rounded-full bg-white border-4 border-indigo-600 shadow-lg active:scale-95 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <div className="w-11 h-11 rounded-full bg-indigo-600 flex items-center justify-center text-white">
                            <Camera className="w-5 h-5" />
                          </div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Upload Mode Dropzone */
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/40 rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-colors space-y-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Click to choose or take a picture of the bill
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Supports JPG, PNG, WEBP, or scanned PDF photos
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-white border border-indigo-200 rounded-lg shadow-2xs">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Select Bill Photo</span>
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          {/* STEP 2: SCANNING IN PROGRESS ANIMATION */}
          {isScanning && previewImage && (
            <div className="space-y-4 text-center py-6">
              <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100">
                <img src={previewImage} alt="Scanning" className="w-full max-h-56 object-contain" />
                {/* Laser scan line animation */}
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent shadow-[0_0_12px_#6366f1] animate-[bounce_2s_infinite]" />
              </div>

              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold text-xs">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Gemini Flash Model Processing</span>
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  Reading Bill & Extracting Line Items...
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Automatically identifying bill numbers, buyer GSTIN, HSN codes, tax rates, and totals.
                </p>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          {scanError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                <AlertCircle className="w-4 h-4" />
                <span>Scan Error</span>
              </div>
              <p className="text-xs text-rose-600">{scanError}</p>
              <button
                type="button"
                onClick={handleRetake}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Try Again</span>
              </button>
            </div>
          )}

          {/* STEP 3: EXTRACTED RESULTS REVIEW & STORE */}
          {extractedDoc && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">Bill Successfully Extracted!</span>
                    <p className="text-[11px] text-emerald-700">
                      Processed by Gemini Flash. Review the details below before storing.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Retake</span>
                </button>
              </div>

              {/* Bill Details Summary Card */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xs">
                {/* Header Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-100 pb-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Bill Number</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {extractedDoc.docNumber}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Bill Date</span>
                    <span className="font-semibold text-slate-800">
                      {formatDate(extractedDoc.docDate)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Type</span>
                    <span className="uppercase text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded inline-block">
                      {extractedDoc.docType.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Grand Total</span>
                    <span className="font-bold text-slate-900 text-sm tabular-nums">
                      {formatCurrency(extractedDoc.grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Customer / Party</span>
                    <span className="font-bold text-slate-900">{extractedDoc.customerName}</span>
                    {extractedDoc.customerGstin && (
                      <span className="block font-mono text-[10px] text-indigo-700 mt-0.5">
                        GST: {extractedDoc.customerGstin}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Payment & State</span>
                    <span className="text-slate-700 block">
                      Place of Supply: <strong>{extractedDoc.placeOfSupply}</strong>
                    </span>
                    <span className="text-slate-700 block text-[11px]">
                      Mode: <strong className="uppercase">{extractedDoc.paymentMode}</strong> | Status: <strong className="uppercase text-emerald-700">{extractedDoc.status}</strong>
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
                    <span>Extracted Items ({extractedDoc.items.length})</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Taxable: {formatCurrency(extractedDoc.totalTaxable)}
                    </span>
                  </div>

                  <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-44">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-semibold border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-2">Item</th>
                          <th className="p-2 text-center">HSN</th>
                          <th className="p-2 text-right">Qty</th>
                          <th className="p-2 text-right">Rate</th>
                          <th className="p-2 text-right">GST %</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        {extractedDoc.items.map((item, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="p-2 font-sans font-medium text-slate-800">{item.name}</td>
                            <td className="p-2 text-center text-slate-500">{item.hsnSacCode || '-'}</td>
                            <td className="p-2 text-right">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                            <td className="p-2 text-right text-indigo-700">{item.taxRate}%</td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {formatCurrency(item.totalAmount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tax Breakdown footer */}
                <div className="flex justify-between items-center text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span>
                    Tax Breakdown:{' '}
                    <strong>
                      CGST {formatCurrency(extractedDoc.cgstTotal)} + SGST {formatCurrency(extractedDoc.sgstTotal)}
                      {extractedDoc.igstTotal > 0 && ` + IGST ${formatCurrency(extractedDoc.igstTotal)}`}
                    </strong>
                  </span>
                  <span className="font-bold text-slate-900">
                    Grand Total: {formatCurrency(extractedDoc.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {extractedDoc && (
            <div className="flex items-center gap-2">
              {onOpenInEditor && (
                <button
                  type="button"
                  onClick={handleOpenInBillEditor}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer"
                >
                  <span>Edit in Bill Creator</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveDocDirectly}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-98 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Store as Old Bill</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
