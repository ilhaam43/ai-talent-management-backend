/**
 * Zero-trust PII masking shared by the WS gateway (chat content) and the
 * download endpoint (text artifacts). The CV data owner company sees raw PII;
 * every other company gets masked output — including downloaded files, so
 * agent-written artifacts (extraction JSON, reports) cannot leak PII.
 */

/** The CV data owner company — only this company sees unmasked PII */
export const DATA_OWNER_COMPANY = 'lintasarta';

/**
 * Extract company name from email domain.
 * e.g. 'hr@lintasarta.co.id' → 'lintasarta'
 */
export function companyFromEmail(email?: string): string {
  if (!email || !email.includes('@')) return '';
  const domain = email.split('@')[1].toLowerCase();
  return domain.split('.')[0];
}

/**
 * Check whether a company is the data-owning company (or a demo account).
 * Empty/unknown company is treated as non-owner (Zero-Trust default).
 */
export function isDataOwnerCompany(company?: string): boolean {
  if (!company) return false;
  return company === DATA_OWNER_COMPANY || company === 'example';
}

/**
 * Mask PII patterns in text.
 * Masks: email addresses, phone numbers, LinkedIn URLs, and ID card numbers.
 */
export function maskPiiInText(text: string): string {
  if (!text || typeof text !== 'string') return text;

  // Mask email addresses: user@domain.com → u***@d***.com
  text = text.replace(
    /\b([A-Za-z0-9])[A-Za-z0-9._%+-]*@([A-Za-z0-9])[A-Za-z0-9.-]*\.([A-Za-z]{2,})\b/g,
    (_, localFirst, domainFirst, tld) =>
      `${localFirst}***@${domainFirst}***.${tld}`,
  );

  // Mask phone numbers: +62 85883725857 → +62 ********57
  // Handles various formats: +62xxx, 08xxx, (021) xxx
  text = text.replace(
    /(?:\+\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d[\d\s-]{6,}\d/g,
    (match) => {
      const digits = match.replace(/\D/g, '');
      if (digits.length < 7) return match; // Too short, probably not a phone
      return digits.slice(0, 3) + '*'.repeat(digits.length - 5) + digits.slice(-2);
    },
  );

  // Mask LinkedIn URLs
  text = text.replace(
    /https?:\/\/(www\.)?linkedin\.com\/in\/[^\s)"\]]+/gi,
    '[LinkedIn - masked]',
  );

  // Mask ID card numbers (16 digits)
  text = text.replace(
    /\b(\d{4})\d{8}(\d{4})\b/g,
    '$1********$2',
  );

  return text;
}
