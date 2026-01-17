/**
 * PDF Helper Functions
 * Utility functions to ensure proper PDF file naming and handling
 */

/**
 * Ensures a filename has the .pdf extension
 * @param filename - The filename to check
 * @returns The filename with .pdf extension guaranteed
 */
export function ensurePdfExtension(filename: string): string {
    const trimmed = filename.trim();

    if (trimmed.toLowerCase().endsWith('.pdf')) {
        return trimmed;
    }

    return `${trimmed}.pdf`;
}

/**
 * Creates a standardized PDF filename with date
 * @param baseName - Base name for the file
 * @param includeDate - Whether to include current date
 * @returns Standardized filename with .pdf extension
 */
export function createPdfFilename(baseName: string, includeDate: boolean = true): string {
    let filename = baseName.replace(/\s+/g, '_');

    if (includeDate) {
        const date = new Date().toISOString().split('T')[0];
        filename = `${filename}_${date}`;
    }

    return ensurePdfExtension(filename);
}

/**
 * Saves the PDF ensuring the filename is respected
 * Uses Blob and Anchor tag method to bypass potential jsPDF.save() issues
 * @param doc - The jsPDF document instance
 * @param filename - The desired filename (will be ensured to have .pdf)
 */
export function savePdf(doc: any, filename: string): void {
    const finalName = ensurePdfExtension(filename);

    // Use blob method
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = finalName;

    // Append to body (required for Firefox)
    document.body.appendChild(link);
    link.click();

    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
