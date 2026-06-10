/**
 * Strips all HTML tags from a given string to prevent XSS attacks.
 * 
 * @param input The string potentially containing HTML tags
 * @returns A plain text string with all HTML tags removed
 */
export function stripHtmlTags(input: string | undefined | null): string {
    if (!input) return '';
    // This regex matches anything enclosed in angle brackets.
    // It is a simple but effective way to strip HTML/XML tags from untrusted text.
    return input.replace(/<\/?[^>]+(>|$)/g, '');
}
