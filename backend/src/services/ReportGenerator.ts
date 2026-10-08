import PDFDocument from 'pdfkit';
import { StudentProfile, Scheme, EligibilityEvaluationResult } from '../../../shared/types';

export interface ReportSchemeItem {
  scheme: Scheme;
  evaluation: EligibilityEvaluationResult;
  aiExplanation?: string;
}

export class ReportGenerator {
  /**
   * Generates a PDF buffer containing a personalized Student Scheme Report
   */
  public static generatePdfReport(
    profile: StudentProfile & { user?: { name: string; email: string } },
    items: ReportSchemeItem[]
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err) => reject(err));

      // Header Banner
      doc
        .fillColor('#1e3a8a')
        .rect(0, 0, doc.page.width, 80)
        .fill();

      doc
        .fillColor('#ffffff')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('GovAI — Personalized Scheme Report', 40, 25);

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(`Generated on ${new Date().toLocaleDateString()} for ${profile.user?.name || 'Student'} (${profile.user?.email || ''})`, 40, 52);

      doc.moveDown(4);

      // Student Profile Snapshot Section
      doc
        .fillColor('#1e293b')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Student Profile Overview', 40, 100);

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, 118)
        .lineTo(doc.page.width - 40, 118)
        .stroke();

      doc.moveDown(0.5);

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor('#334155');

      const col1X = 40;
      const col2X = 300;
      let startY = 128;

      doc.text(`State: ${profile.state || 'N/A'}`, col1X, startY);
      doc.text(`Category: ${profile.category || 'N/A'}`, col2X, startY);
      startY += 16;

      doc.text(`Education Level: ${profile.educationLevel || 'N/A'}`, col1X, startY);
      doc.text(`Course: ${profile.course || 'N/A'} (${profile.institution || 'N/A'})`, col2X, startY);
      startY += 16;

      doc.text(`Annual Family Income: ₹${profile.familyIncome ? profile.familyIncome.toLocaleString('en-IN') : 'N/A'}`, col1X, startY);
      doc.text(`Academic Marks: ${profile.academicPercentage ? profile.academicPercentage + '%' : 'N/A'}`, col2X, startY);
      startY += 20;

      // Matching Schemes Header
      doc
        .fillColor('#1e3a8a')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Matching & Eligible Government Schemes', 40, startY);

      startY += 20;

      doc
        .strokeColor('#cbd5e1')
        .lineWidth(1)
        .moveTo(40, startY)
        .lineTo(doc.page.width - 40, startY)
        .stroke();

      startY += 10;

      // Render each matching scheme
      items.forEach((item, index) => {
        // Page break if near bottom
        if (startY > doc.page.height - 120) {
          doc.addPage();
          startY = 40;
        }

        const { scheme, evaluation } = item;
        const statusColor = evaluation.eligibilityStatus === 'ELIGIBLE' ? '#16a34a' : evaluation.eligibilityStatus === 'LIKELY_ELIGIBLE' ? '#d97706' : '#dc2626';

        // Scheme title & status badge
        doc
          .fillColor('#0f172a')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(`${index + 1}. ${scheme.name}`, 40, startY);

        startY += 16;

        doc
          .fillColor(statusColor)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(`Status: ${evaluation.eligibilityStatus}  |  Match Score: ${evaluation.matchScore}/100  |  Verification: ${scheme.verificationStatus}`, 40, startY);

        startY += 14;

        doc
          .fillColor('#475569')
          .fontSize(9)
          .font('Helvetica')
          .text(`Department: ${scheme.department} (${scheme.centralOrState})`, 40, startY);

        startY += 14;

        doc
          .fillColor('#334155')
          .fontSize(9.5)
          .font('Helvetica')
          .text(scheme.shortDescription, 40, startY, { width: doc.page.width - 80 });

        startY += doc.heightOfString(scheme.shortDescription, { width: doc.page.width - 80 }) + 6;

        if (scheme.officialSourceUrl) {
          doc
            .fillColor('#2563eb')
            .fontSize(8.5)
            .font('Helvetica-Oblique')
            .text(`Official Source: ${scheme.officialSourceUrl}`, 40, startY);
          startY += 14;
        }

        doc
          .strokeColor('#e2e8f0')
          .lineWidth(0.5)
          .moveTo(40, startY)
          .lineTo(doc.page.width - 40, startY)
          .stroke();

        startY += 12;
      });

      // Footer
      doc
        .fontSize(8)
        .fillColor('#94a3b8')
        .text('GovAI Platform — Disclaimer: Verification with official portals is recommended before application submission.', 40, doc.page.height - 30, { align: 'center' });

      doc.end();
    });
  }
}
