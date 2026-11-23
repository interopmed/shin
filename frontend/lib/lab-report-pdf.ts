import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface DownloadPdfOptions {
  elementId?: string;
  filename?: string;
}

/**
 * Downloads the lab report container as a high-resolution, multi-page ready A4 PDF.
 */
export async function downloadLabReportPdf(options?: DownloadPdfOptions): Promise<void> {
  const elementId = options?.elementId || 'lab-report-printable-area';
  const element = document.getElementById(elementId);

  if (!element) {
    console.error(`Element with id "${elementId}" not found for PDF export.`);
    // Fallback to window.print if element is not directly accessible
    window.print();
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // 2x DPI for crisp text
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1100,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

    const margin = 8; // 8mm margin
    const contentWidth = pdfWidth - margin * 2;
    const contentHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = contentHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
    heightLeft -= pdfHeight - margin * 2;

    // Subsequent pages if report spans multiple pages
    while (heightLeft > 0) {
      position = heightLeft - contentHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, contentHeight, undefined, 'FAST');
      heightLeft -= pdfHeight - margin * 2;
    }

    const filename = options?.filename || 'Lab_Report.pdf';
    pdf.save(filename);
  } catch (err) {
    console.error('Failed to generate PDF via html2canvas:', err);
    // Graceful fallback to browser print dialog (Save as PDF)
    window.print();
  }
}
