import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Support large base64 image uploads from camera captures
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Initialize Google GenAI with recommended telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API endpoint to scan and extract invoice/bill data via Gemini Flash
app.post('/api/scan-bill', async (req: Request, res: Response) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    // Strip data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');

    const promptText = `
You are an expert Indian GST Accounting and B2B Invoicing AI specialist.
Analyze this image of an invoice, bill, cash memo, delivery challan, or quotation.
Carefully extract all fields into structured JSON according to Indian GST standards.

Extraction instructions:
1. docNumber: The invoice/bill/challan/memo number printed on the bill (e.g. "INV-102", "20/26-27"). If not found, create a reasonable serial like "SCAN-001".
2. docDate: The invoice date in YYYY-MM-DD format. If only DD/MM/YYYY is printed, convert to YYYY-MM-DD. If year is missing or partial, deduce the correct year.
3. docType: Choose the most appropriate:
   - 'tax_invoice' (if GST / Tax Invoice)
   - 'invoice_cum_challan' (if Invoice Cum Delivery Challan)
   - 'bill_of_supply' (if Retail / Non-GST cash memo)
   - 'delivery_challan' (if Delivery Challan / Dispatch slip)
   - 'quotation' (if Estimate / Quotation / Proforma)
4. customerName: Name of the Buyer / Customer / Consignee / Billed To party.
5. customerPhone: Customer phone/mobile number if visible.
6. customerGstin: 15-digit GSTIN of the buyer if printed.
7. customerBillingAddress: Complete address of the buyer.
8. placeOfSupply: State name of the buyer/delivery place (e.g. "West Bengal", "Maharashtra", "Delhi").
9. isB2B: true if buyer has a GSTIN or company name, false for retail walk-in.
10. items: Array of line items printed in the bill:
    - name: Item/goods or service description.
    - hsnSacCode: HSN or SAC code (e.g. "8481", "9983"), or "" if not found.
    - quantity: Numeric quantity (default 1).
    - unit: Unit of measurement (e.g. "NOS", "PCS", "KG", "SET", "MTR", "BOX").
    - unitPrice: Rate / Price per unit before or after discount.
    - discountPercent: Discount percentage if mentioned (default 0).
    - taxRate: GST rate percentage (e.g. 0, 5, 12, 18, 28).
    - taxableAmount: Taxable value for this line item.
    - cgstAmount: CGST amount for this line item (0 if inter-state).
    - sgstAmount: SGST amount for this line item (0 if inter-state).
    - igstAmount: IGST amount for this line item (0 if intra-state).
    - totalAmount: Final total amount for this line item.
11. subtotal: Sum of items before taxes/discounts.
12. totalTaxable: Total taxable value.
13. cgstTotal: Total Central GST.
14. sgstTotal: Total State GST.
15. igstTotal: Total Integrated GST.
16. totalTax: Total tax amount (CGST + SGST + IGST).
17. roundOff: Round off adjustment value if present.
18. grandTotal: Final total bill amount payable.
19. paidAmount: Amount already paid (if marked paid, equal to grandTotal; if marked unpaid, 0).
20. balanceDue: Remaining unpaid balance (grandTotal - paidAmount).
21. paymentMode: 'cash', 'upi', 'bank_transfer', 'cheque', or 'credit'.
22. poNumber: Purchase order number / ref if present.
23. vehicleNo: Transport vehicle registration number if present.
24. eWayBillNo: E-way bill number if present.
25. notes: Any terms, note, or notes from the bill.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: cleanBase64,
              },
            },
            {
              text: promptText,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            docNumber: { type: Type.STRING },
            docDate: { type: Type.STRING },
            docType: {
              type: Type.STRING,
              enum: [
                'tax_invoice',
                'invoice_cum_challan',
                'bill_of_supply',
                'delivery_challan',
                'quotation',
              ],
            },
            customerName: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            customerGstin: { type: Type.STRING },
            customerBillingAddress: { type: Type.STRING },
            placeOfSupply: { type: Type.STRING },
            isB2B: { type: Type.BOOLEAN },
            isInterState: { type: Type.BOOLEAN },
            reverseCharge: { type: Type.BOOLEAN },
            poNumber: { type: Type.STRING },
            poDate: { type: Type.STRING },
            vehicleNo: { type: Type.STRING },
            eWayBillNo: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hsnSacCode: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  unitPrice: { type: Type.NUMBER },
                  discountPercent: { type: Type.NUMBER },
                  taxRate: { type: Type.NUMBER },
                  taxableAmount: { type: Type.NUMBER },
                  cgstAmount: { type: Type.NUMBER },
                  sgstAmount: { type: Type.NUMBER },
                  igstAmount: { type: Type.NUMBER },
                  totalAmount: { type: Type.NUMBER },
                },
                required: ['name', 'quantity', 'unitPrice', 'totalAmount'],
              },
            },
            subtotal: { type: Type.NUMBER },
            totalDiscount: { type: Type.NUMBER },
            totalTaxable: { type: Type.NUMBER },
            cgstTotal: { type: Type.NUMBER },
            sgstTotal: { type: Type.NUMBER },
            igstTotal: { type: Type.NUMBER },
            totalTax: { type: Type.NUMBER },
            roundOff: { type: Type.NUMBER },
            grandTotal: { type: Type.NUMBER },
            paidAmount: { type: Type.NUMBER },
            balanceDue: { type: Type.NUMBER },
            paymentMode: {
              type: Type.STRING,
              enum: ['cash', 'upi', 'bank_transfer', 'cheque', 'credit'],
            },
            notes: { type: Type.STRING },
          },
          required: ['docNumber', 'docDate', 'docType', 'customerName', 'grandTotal', 'items'],
        },
      },
    });

    const textOutput = response.text?.trim();
    if (!textOutput) {
      return res.status(500).json({ error: 'AI was unable to extract bill details.' });
    }

    const parsedData = JSON.parse(textOutput);
    return res.json({ success: true, data: parsedData });
  } catch (err: any) {
    console.error('Error scanning bill with Gemini Flash:', err);
    return res.status(500).json({
      error: err.message || 'Failed to analyze bill image. Please ensure the image is clear and legible.',
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
