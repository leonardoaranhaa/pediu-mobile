/** Brazilian phone, money and distance fields shown in forms. */

export function maskBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function amountFromField(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.includes(",")
    ? trimmed.replace(/[^\d,]/g, "").replace(/\./g, "").replace(",", ".")
    : trimmed.replace(/[^\d.]/g, "");
  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : null;
}

/** Stored decimals such as "10.00" become "10,00". */
export function decimalToBrlInput(value: string) {
  const amount = amountFromField(value);
  if (amount === null) return "";
  return amount.toFixed(2).replace(".", ",");
}

/** Typing keeps digits and a single comma, with at most two fraction digits. */
export function maskBrlTyping(value: string) {
  const cleaned = value.replace(/[^\d,]/g, "");
  if (!cleaned) return "";
  const comma = cleaned.indexOf(",");
  if (comma < 0) return cleaned.replace(/^0+(?=\d)/, "");
  const whole = cleaned.slice(0, comma).replace(/^0+(?=\d)/, "") || "0";
  const fraction = cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  return `${whole},${fraction}`;
}

/** "10,50" or "10.50" becomes "10.50" for the API. Blank or invalid returns "". */
export function brlInputToDecimal(value: string) {
  const amount = amountFromField(value);
  if (amount === null) return "";
  return amount.toFixed(2);
}

/** "10.00" becomes "10". "10.50" becomes "10,5". */
export function decimalToKmInput(value: string) {
  const amount = amountFromField(value);
  if (amount === null) return "";
  const fixed = amount.toFixed(2).replace(".", ",");
  return fixed.replace(/,00$/, "").replace(/(\,\d)0$/, "$1");
}

export function kmInputToDecimal(value: string) {
  const amount = amountFromField(value);
  if (amount === null || amount <= 0) return "";
  return amount.toFixed(2);
}
