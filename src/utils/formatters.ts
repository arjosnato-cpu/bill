// Utility functions for Indian GST billing and currency operations

export const INDIAN_STATES: { code: string; name: string }[] = [
  { code: '01', name: 'Jammu and Kashmir' },
  { code: '02', name: 'Himachal Pradesh' },
  { code: '03', name: 'Punjab' },
  { code: '04', name: 'Chandigarh' },
  { code: '05', name: 'Uttarakhand' },
  { code: '06', name: 'Haryana' },
  { code: '07', name: 'Delhi' },
  { code: '08', name: 'Rajasthan' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '10', name: 'Bihar' },
  { code: '11', name: 'Sikkim' },
  { code: '12', name: 'Arunachal Pradesh' },
  { code: '13', name: 'Nagaland' },
  { code: '14', name: 'Manipur' },
  { code: '15', name: 'Mizoram' },
  { code: '16', name: 'Tripura' },
  { code: '17', name: 'Meghalaya' },
  { code: '18', name: 'Assam' },
  { code: '19', name: 'West Bengal' },
  { code: '20', name: 'Jharkhand' },
  { code: '21', name: 'Odisha' },
  { code: '22', name: 'Chhattisgarh' },
  { code: '23', name: 'Madhya Pradesh' },
  { code: '24', name: 'Gujarat' },
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '30', name: 'Goa' },
  { code: '32', name: 'Kerala' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '36', name: 'Telangana' },
  { code: '37', name: 'Andhra Pradesh' },
];

export function getStateCodeByName(stateName: string): string {
  const match = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.trim().toLowerCase());
  return match ? match.code : '07';
}

export function getStateNameByCode(code: string): string {
  const match = INDIAN_STATES.find(s => s.code === code);
  return match ? match.name : 'Delhi';
}

/**
 * Extracts Indian State name directly from a 15-digit GSTIN (first 2 digits)
 */
export function extractStateFromGstin(gstin: string): { stateCode: string; stateName: string } | null {
  if (!gstin || gstin.trim().length < 2) return null;
  const clean = gstin.trim().toUpperCase();
  const code = clean.substring(0, 2);
  const match = INDIAN_STATES.find(s => s.code === code);
  if (match) {
    return { stateCode: match.code, stateName: match.name };
  }
  return null;
}

export function isValidGstinFormat(gstin: string): boolean {
  if (!gstin) return false;
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return regex.test(gstin.trim().toUpperCase());
}

/**
 * Groups line items by HSN/SAC code to generate mandatory B2B GST tax summary
 */
export function groupItemsByHsn(items: { hsnSacCode: string; taxableAmount: number; cgstAmount: number; sgstAmount: number; igstAmount: number; totalAmount: number; taxRate: number }[]) {
  const map = new Map<string, { hsn: string; taxable: number; taxRate: number; cgst: number; sgst: number; igst: number; totalTax: number }>();
  items.forEach(i => {
    const hsn = i.hsnSacCode || 'N/A';
    const existing = map.get(hsn) || { hsn, taxable: 0, taxRate: i.taxRate, cgst: 0, sgst: 0, igst: 0, totalTax: 0 };
    existing.taxable += i.taxableAmount;
    existing.cgst += i.cgstAmount;
    existing.sgst += i.sgstAmount;
    existing.igst += i.igstAmount;
    existing.totalTax += (i.cgstAmount + i.sgstAmount + i.igstAmount);
    map.set(hsn, existing);
  });
  return Array.from(map.values());
}

/**
 * Formats a number to Indian currency format e.g. ₹1,25,450.00
 */
export function formatCurrency(amount: number, symbol = '₹'): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${symbol}0.00`;
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format using Indian locale
  const formatted = absAmount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${isNegative ? '-' : ''}${symbol}${formatted}`;
}

export function formatDate(dateString?: string): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

/**
 * Converts numeric value to Words in Indian numbering format (Lakhs, Crores)
 */
export function numberToWordsIndian(num: number): string {
  if (num === 0) return 'Rupees Zero Only';
  if (num < 0) return 'Minus ' + numberToWordsIndian(Math.abs(num));

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    let str = '';
    if (n > 99) {
      str += a[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    } else if (n > 0) {
      str += a[n] + ' ';
    }
    return str.trim();
  }

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = '';
  let n = integerPart;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const hundred = n;

  if (crore > 0) {
    result += convertHundreds(crore) + ' Crore ';
  }
  if (lakh > 0) {
    result += convertHundreds(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    result += convertHundreds(thousand) + ' Thousand ';
  }
  if (hundred > 0) {
    result += convertHundreds(hundred) + ' ';
  }

  result = result.trim();
  if (!result) result = 'Zero';

  let finalWords = `Rupees ${result}`;
  if (decimalPart > 0) {
    finalWords += ` and ${convertHundreds(decimalPart)} Paise`;
  }
  finalWords += ' Only';

  return finalWords.replace(/\s+/g, ' ');
}

export function generateWhatsAppMessage(
  businessName: string,
  docTypeTitle: string,
  docNumber: string,
  customerName: string,
  grandTotal: number,
  balanceDue: number,
  itemsCount: number,
  businessPhone: string,
  docDate: string
): string {
  let message = `*${businessName}* 📄\n`;
  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Dear *${customerName}*,\n`;
  message += `Here is your *${docTypeTitle}* details:\n\n`;
  message += `📋 *Bill No:* ${docNumber}\n`;
  message += `📅 *Date:* ${formatDate(docDate)}\n`;
  message += `📦 *Total Items:* ${itemsCount}\n`;
  message += `💰 *Bill Amount:* ${formatCurrency(grandTotal)}\n`;
  
  if (balanceDue > 0) {
    message += `⚠️ *Balance Due:* ${formatCurrency(balanceDue)}\n`;
  } else {
    message += `✅ *Payment Status:* Full Paid\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━━━━\n`;
  message += `Thank you for your business! For any questions, please contact us at ${businessPhone}.\n`;

  return message;
}

export function createWhatsAppLink(phone: string, text: string): string {
  // Clean phone number (strip spaces, dashes, +)
  let cleanPhone = phone.replace(/[^0-9]/g, '');
  if (cleanPhone.length === 10) {
    cleanPhone = '91' + cleanPhone; // Default to India prefix
  }
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
}
