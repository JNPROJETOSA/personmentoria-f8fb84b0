import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { savePdf } from './pdf-helpers';

export class PdfService {
    private doc: jsPDF;
    private readonly pageWidth: number;
    private readonly pageHeight: number;
    private readonly margin: number = 20;
    private currentY: number;

    // Constants
    private static readonly HEADER_TITLE = "MENTORIA REGISDÊNCIA";
    private static readonly WATERMARK_URL = "/watermark_v2.png";
    private static readonly PRIMARY_COLOR: [number, number, number] = [13, 148, 136]; // Teal/Primary
    private static readonly TEXT_COLOR: [number, number, number] = [60, 60, 60]; // Dark Gray

    constructor() {
        this.doc = new jsPDF();
        this.pageWidth = this.doc.internal.pageSize.width;
        this.pageHeight = this.doc.internal.pageSize.height;
        this.currentY = this.margin;
    }

    /**
     * Initializes the document with the watermark and header.
     * Must be called before adding content.
     */
    async initialize(documentTitle: string): Promise<void> {
        // Load watermark
        try {
            const watermarkBase64 = await this.loadImage(PdfService.WATERMARK_URL);

            // Add watermark to all pages (current and future)
            // We'll add it to the current page, and hook into addPage
            // Note: jsPDF doesn't have a simple 'onPageAdd' hook exposed typings easily, 
            // so we'll manually add it or use a loop at the end? 
            // Better: Add to current page 1. And when we add a page, we add it. 
            // Or simpler: Add it at the end to all pages.
            // Let's store it for later application.
            this.watermarkBase64 = watermarkBase64;
        } catch (e) {
            console.error("Failed to load watermark", e);
        }

        this.addHeader();
        this.addDocumentTitle(documentTitle);
    }

    private watermarkBase64: string | null = null;

    /**
     * Adds the watermark image to the center of the specified page or current page
     */
    private addWatermark() {
        if (!this.watermarkBase64) return;

        const imgWidth = 100;
        const imgHeight = 100; // Aspect ratio? Assuming square-ish for avatar
        const x = (this.pageWidth - imgWidth) / 2;
        const y = (this.pageHeight - imgHeight) / 2;

        // Add with low opacity
        this.doc.saveGraphicsState();
        this.doc.setGState(new (this.doc as any).GState({ opacity: 0.1 }));
        this.doc.addImage(this.watermarkBase64, 'PNG', x, y, imgWidth, imgHeight);
        this.doc.restoreGraphicsState();
    }

    private addHeader() {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(16);
        this.doc.setTextColor(...PdfService.PRIMARY_COLOR);
        this.doc.text(PdfService.HEADER_TITLE, this.pageWidth / 2, 15, { align: 'center' });

        // Horizontal line
        this.doc.setDrawColor(...PdfService.PRIMARY_COLOR);
        this.doc.setLineWidth(0.5);
        this.doc.line(this.margin, 20, this.pageWidth - this.margin, 20);

        this.currentY = 30;
    }

    private addDocumentTitle(title: string) {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(18);
        this.doc.setTextColor(0, 0, 0); // Black
        this.doc.text(title, this.pageWidth / 2, this.currentY, { align: 'center' });
        this.currentY += 15;
    }

    /**
     * Add a Section Title
     * Uses larger font, bold, and adds spacing before/after
     */
    addSection(title: string) {
        // More space before section (e.g. 15mm)
        this.checkPageBreak(25);

        // Add minimal spacing if not at top of page
        if (this.currentY > this.margin + 10) {
            this.currentY += 5;
        }

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(14);
        this.doc.setTextColor(...PdfService.PRIMARY_COLOR);
        this.doc.text(title, this.margin, this.currentY);

        // Underline or accent
        // this.doc.setDrawColor(...PdfService.PRIMARY_COLOR);
        // this.doc.setLineWidth(0.3);
        // this.doc.line(this.margin, this.currentY + 2, this.margin + 50, this.currentY + 2);

        this.currentY += 10; // Space after title
    }

    /**
     * Add Body Text
     * Improved line height and hierarchy options
     */
    addText(text: string, size: number = 10, color: [number, number, number] = PdfService.TEXT_COLOR, options?: { indent?: number, bold?: boolean }) {
        this.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
        this.doc.setFontSize(size);
        this.doc.setTextColor(...color);

        const xPos = this.margin + (options?.indent || 0);
        const maxWidth = this.pageWidth - (this.margin * 2) - (options?.indent || 0);

        const lines = this.doc.splitTextToSize(text, maxWidth);
        // Increase line height slightly for better readability (factor 0.6 instead of 0.5)
        const lineHeight = size * 0.6;

        this.checkPageBreak(lines.length * lineHeight);

        this.doc.text(lines, xPos, this.currentY);
        this.currentY += (lines.length * lineHeight) + 3; // Minimal spacing after paragraph
    }

    /**
     * Add a key-value pair list
     */
    addKeyValuePairs(data: { label: string, value: string }[]) {
        data.forEach(item => {
            this.checkPageBreak(8);
            this.doc.setFont('helvetica', 'bold');
            this.doc.setFontSize(10);
            this.doc.setTextColor(50, 50, 50);
            this.doc.text(`${item.label}:`, this.margin, this.currentY);

            this.doc.setFont('helvetica', 'normal');
            const labelWidth = this.doc.getTextWidth(`${item.label}: `);
            this.doc.text(item.value, this.margin + labelWidth + 2, this.currentY);

            this.currentY += 6; // Tighter vertical spacing for list items
        });
        this.currentY += 5; // Space after list
    }

    /**
     * Add a table using jspdf-autotable
     */
    /**
     * Add a Subtitle below the main title
     */
    addSubtitle(text: string) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(10);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(text, this.pageWidth / 2, 40, { align: 'center' });
        this.currentY = 45; // Start content lower
    }

    /**
     * Add a table using jspdf-autotable
     * Now accepts generic options to allow custom column styles and hooks
     */
    addTable(headers: string[], body: string[][], options?: any) {
        autoTable(this.doc, {
            startY: this.currentY,
            head: [headers],
            body: body,
            theme: 'striped',
            headStyles: {
                fillColor: PdfService.PRIMARY_COLOR,
                halign: 'center',
                fontStyle: 'bold'
            },
            margin: { left: this.margin, right: this.margin },
            styles: {
                fontSize: 9,
                cellPadding: 4,
                overflow: 'linebreak'
            },
            ...options, // Merge custom options (columnStyles, didDrawCell, etc.)
            didDrawPage: (data) => {
                // Determine if we need to update currentY on the last page of table
                this.currentY = data.cursor?.y ? data.cursor.y + 10 : this.currentY;
            }
        });

        // Update currentY to after the table
        const finalY = (this.doc as any).lastAutoTable?.finalY;
        if (finalY) {
            this.currentY = finalY + 10;
        }
    }

    // --- Advanced Layout Methods ---

    /**
     * Draw a visual card (box with background/border)
     */
    drawCard(x: number, y: number, width: number, height: number, title?: string) {
        // Draw background/border
        this.doc.setDrawColor(200, 200, 200);
        this.doc.setFillColor(250, 250, 250); // Very light gray
        this.doc.roundedRect(x, y, width, height, 3, 3, 'FD');

        if (title) {
            this.doc.setFont('helvetica', 'bold');
            this.doc.setFontSize(11);
            this.doc.setTextColor(...PdfService.PRIMARY_COLOR);
            this.doc.text(title, x + 5, y + 8);

            // Divider line
            this.doc.setDrawColor(220, 220, 220);
            this.doc.line(x, y + 12, x + width, y + 12);
        }
    }

    /**
     * Add a metric (Label + Big Value) at specific position
     */
    addMetricAt(x: number, y: number, label: string, value: string, align: 'left' | 'center' = 'left') {
        // Value (Big & Bold)
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(14);
        this.doc.setTextColor(30, 30, 30);
        this.doc.text(value, x, y + 6, { align });

        // Label (Small & Subtle)
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(8);
        this.doc.setTextColor(100, 100, 100);
        this.doc.text(label, x, y + 11, { align });
    }

    /**
     * Add text at absolute position
     */
    addTextAt(x: number, y: number, text: string, size: number = 10, options?: { color?: [number, number, number], bold?: boolean, align?: 'left' | 'center' | 'right' }) {
        this.doc.setFont('helvetica', options?.bold ? 'bold' : 'normal');
        this.doc.setFontSize(size);
        this.doc.setTextColor(...(options?.color || PdfService.TEXT_COLOR));
        this.doc.text(text, x, y, { align: options?.align || 'left' });
    }

    /**
     * Helper to get page dimensions excluding margins
     */
    getContentWidth() {
        return this.pageWidth - (this.margin * 2);
    }

    getMargin() {
        return this.margin;
    }

    /**
     * Add custom content if needed
     */
    getDoc() {
        return this.doc;
    }

    getCurrentY() {
        return this.currentY;
    }

    moveY(amount: number) {
        this.currentY += amount;
    }

    /**
     * Save the PDF
     */
    save(filename: string) {
        // Apply watermark to all pages before saving
        const pageCount = this.doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            this.doc.setPage(i);
            this.addWatermark();

            // Add page numbering (Footer)
            this.doc.setFontSize(8);
            this.doc.setTextColor(150, 150, 150);
            this.doc.text(
                `Página ${i} de ${pageCount}`,
                this.pageWidth / 2,
                this.pageHeight - 10,
                { align: 'center' }
            );
        }

        savePdf(this.doc, filename);
    }

    // --- Helpers ---

    /**
     * Ensure there is enough space on the current page.
     * If not, adds a new page and resets Y.
     */
    ensureSpace(heightNeeded: number) {
        if (this.currentY + heightNeeded > this.pageHeight - this.margin) {
            this.doc.addPage();
            this.currentY = this.margin + 10; // Reset Y with top margin
            this.addHeaderSmall();
        }
    }

    private checkPageBreak(heightNeeded: number) {
        this.ensureSpace(heightNeeded);
    }

    private addHeaderSmall() {
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(10);
        this.doc.setTextColor(...PdfService.PRIMARY_COLOR);
        this.doc.text(PdfService.HEADER_TITLE, this.pageWidth / 2, 10, { align: 'center' });

        this.doc.setDrawColor(...PdfService.PRIMARY_COLOR);
        this.doc.setLineWidth(0.2);
        this.doc.line(this.margin, 13, this.pageWidth - this.margin, 13);

        this.currentY = 20;
    }

    private loadImage(url: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject('No canvas context');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = (e) => reject(e);
            img.src = url;
        });
    }
}
