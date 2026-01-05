import jsPDF from 'jspdf';

export function generateCommissionFormPDF() {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = 20;

  // Helper function for drawing lines
  const drawLine = (startY: number) => {
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, startY, pageWidth - margin, startY);
  };

  // Helper function for section headers
  const sectionHeader = (text: string, yPos: number) => {
    doc.setFillColor(37, 99, 235); // primary blue
    doc.rect(margin, yPos, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(text, margin + 4, yPos + 5.5);
    doc.setTextColor(0, 0, 0);
    return yPos + 14;
  };

  // Helper for form fields with underline
  const formField = (label: string, yPos: number, width: number = contentWidth) => {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, margin, yPos);
    const labelWidth = doc.getTextWidth(label) + 2;
    doc.setDrawColor(150, 150, 150);
    doc.line(margin + labelWidth, yPos, margin + width - 5, yPos);
    return yPos + 12;
  };

  // Two column form fields
  const twoColumnFields = (label1: string, label2: string, yPos: number) => {
    const halfWidth = contentWidth / 2 - 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left field
    doc.text(label1, margin, yPos);
    const label1Width = doc.getTextWidth(label1) + 2;
    doc.line(margin + label1Width, yPos, margin + halfWidth, yPos);
    
    // Right field
    const rightStart = margin + halfWidth + 10;
    doc.text(label2, rightStart, yPos);
    const label2Width = doc.getTextWidth(label2) + 2;
    doc.line(rightStart + label2Width, yPos, pageWidth - margin, yPos);
    
    return yPos + 12;
  };

  // Header - Company Logo Area
  doc.setFillColor(30, 41, 59); // dark slate
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('TSM ROOFING', margin, 20);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text('COMMISSION FORM', margin, 32);
  
  doc.setFontSize(10);
  doc.text('Internal Use Only', pageWidth - margin - 35, 20);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  y = 55;

  // Sales Representative Info
  y = sectionHeader('SALES REPRESENTATIVE INFORMATION', y);
  y = twoColumnFields('Name:', 'Date:', y);
  y = formField('Employee ID:', y);
  y += 4;

  // Job Information
  y = sectionHeader('JOB INFORMATION', y);
  y = twoColumnFields('Job Number:', 'Job Date:', y);
  y = formField('Customer Name:', y);
  y = formField('Customer Address:', y);
  y = formField('City, State, ZIP:', y);
  
  // Job Type Checkboxes
  doc.setFontSize(10);
  doc.text('Job Type:', margin, y);
  
  // Residential checkbox
  doc.rect(margin + 25, y - 4, 4, 4);
  doc.text('Residential', margin + 31, y);
  
  // Commercial checkbox
  doc.rect(margin + 60, y - 4, 4, 4);
  doc.text('Commercial', margin + 66, y);
  
  // Repair checkbox
  doc.rect(margin + 95, y - 4, 4, 4);
  doc.text('Repair', margin + 101, y);
  
  // New Construction checkbox
  doc.rect(margin + 120, y - 4, 4, 4);
  doc.text('New Construction', margin + 126, y);
  
  y += 16;

  // Sale Details
  y = sectionHeader('SALE DETAILS', y);
  
  // Create a table-like structure for financial info
  const colWidth = contentWidth / 2;
  
  y = twoColumnFields('Total Contract Amount: $', 'Deposit Received: $', y);
  y = twoColumnFields('Material Cost: $', 'Balance Due: $', y);
  y = twoColumnFields('Labor Cost: $', 'Payment Terms:', y);
  y = formField('Other Expenses: $', y, colWidth - 10);
  y += 4;

  // Commission Calculation
  y = sectionHeader('COMMISSION CALCULATION', y);
  
  // Commission calculation table
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 40, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 40);
  
  const calcY = y + 8;
  doc.setFontSize(10);
  doc.text('Commission Rate:', margin + 5, calcY);
  doc.line(margin + 45, calcY, margin + 80, calcY);
  doc.text('%', margin + 82, calcY);
  
  doc.text('Gross Profit: $', margin + 95, calcY);
  doc.line(margin + 125, calcY, margin + 165, calcY);
  
  doc.text('Gross Commission: $', margin + 5, calcY + 12);
  doc.line(margin + 55, calcY + 12, margin + 95, calcY + 12);
  
  doc.text('Less Advances: $', margin + 100, calcY + 12);
  doc.line(margin + 140, calcY + 12, pageWidth - margin - 5, calcY + 12);
  
  doc.setFont('helvetica', 'bold');
  doc.setFillColor(37, 99, 235);
  doc.setTextColor(37, 99, 235);
  doc.text('NET COMMISSION DUE: $', margin + 5, calcY + 26);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.line(margin + 65, calcY + 26, margin + 120, calcY + 26);
  
  y += 50;

  // Notes Section
  y = sectionHeader('ADDITIONAL NOTES', y);
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 30);
  y += 40;

  // Signatures
  y = sectionHeader('SIGNATURES & APPROVAL', y);
  
  // Sales Rep signature
  doc.text('Sales Representative:', margin, y);
  doc.line(margin + 50, y, margin + 120, y);
  doc.text('Date:', margin + 125, y);
  doc.line(margin + 140, y, pageWidth - margin, y);
  y += 15;
  
  // Manager signature
  doc.text('Manager Approval:', margin, y);
  doc.line(margin + 50, y, margin + 120, y);
  doc.text('Date:', margin + 125, y);
  doc.line(margin + 140, y, pageWidth - margin, y);
  y += 15;
  
  // Accounting signature
  doc.text('Accounting:', margin, y);
  doc.line(margin + 50, y, margin + 120, y);
  doc.text('Date:', margin + 125, y);
  doc.line(margin + 140, y, pageWidth - margin, y);

  // Footer
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 280, pageWidth, 17, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text('Submit completed form through TSM Portal for approval. For questions, contact your manager.', pageWidth / 2, 288, { align: 'center' });
  doc.text('TSM Roofing • Confidential', pageWidth / 2, 294, { align: 'center' });

  // Save the PDF
  doc.save('TSM_Commission_Form.pdf');
}
