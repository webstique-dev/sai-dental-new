import ExcelJS from 'exceljs';
import { capitalizeName } from './formatters.js';


// Primary styling definitions
const HEADER_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF0F766E' }, // Teal / Clinical Brand
};

const HEADER_FONT = {
  name: 'Calibri',
  size: 11,
  bold: true,
  color: { argb: 'FFFFFFFF' },
};

const BORDER_STYLE = {
  top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
  right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
};

const DATA_FONT = {
  name: 'Calibri',
  size: 10,
  color: { argb: 'FF1E293B' },
};

/**
 * Applies header styling, freeze panes, auto-filter, and column dimensions to a worksheet.
 */
function styleWorksheet(worksheet, columns) {
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 18,
    style: col.style || {},
  }));

  // Freeze top header row
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Enable auto filter
  if (columns.length > 0) {
    const colCount = columns.length;
    let colLetter = '';
    if (colCount <= 26) {
      colLetter = String.fromCharCode(64 + colCount);
    } else {
      colLetter = 'A' + String.fromCharCode(64 + (colCount - 26));
    }
    worksheet.autoFilter = `A1:${colLetter}1`;
  }

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = BORDER_STYLE;
  });
}

/**
 * Formats and adds rows with borders, alternating fills, column alignment, and number formatting.
 */
function populateWorksheetRows(worksheet, rows, columns = []) {
  rows.forEach((rowData, index) => {
    const row = worksheet.addRow(rowData);
    row.height = 22;

    const isEven = index % 2 === 0;
    const rowBgColor = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      cell.font = cell.font || DATA_FONT;
      cell.border = BORDER_STYLE;
      
      if (!cell.fill) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: rowBgColor },
        };
      }

      // Inherit column alignment and numFmt if specified
      const align = colDef?.align || (colDef?.numFmt ? 'right' : 'left');
      cell.alignment = {
        vertical: 'middle',
        horizontal: align,
        wrapText: colDef?.wrapText || false,
      };

      if (colDef?.numFmt && typeof cell.value === 'number') {
        cell.numFmt = colDef.numFmt;
      }
    });
  });
}

/**
 * Triggers file download in browser from ExcelJS workbook buffer.
 */
async function saveWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/**
 * Exports comprehensive Clinic & Doctor reports into an organized Excel workbook.
 */
export async function exportReportsToExcel({
  filename = 'Clinic_Reports.xlsx',
  isDoctor = false,
  dateFrom = '',
  dateTo = '',
  performanceData = null,
  appointmentsData = null,
  followUpsData = null,
  financialData = null,
  treatmentData = null,
  doctorData = null,
  activeTab = null,
}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sai Dental Clinic System';
  workbook.lastModifiedBy = 'Dental Clinic Management';
  workbook.created = new Date();
  workbook.modified = new Date();

  const formatDate = (d) => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (d) => {
    if (!d) return '—';
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? '—' : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 1. WORKSHEET: APPOINTMENTS
  if (appointmentsData?.appointments) {
    const aptSheet = workbook.addWorksheet('Appointments');
    const aptCols = [
      { header: 'Patient Name', key: 'patientName', width: 24, align: 'left' },
      { header: 'OP Number', key: 'opNumber', width: 14, align: 'center' },
      { header: 'Phone', key: 'phone', width: 16, align: 'center' },
      { header: 'Patient Type', key: 'patientType', width: 14, align: 'center' },
      { header: 'Doctor', key: 'doctorName', width: 22, align: 'left' },
      { header: 'Date', key: 'date', width: 16, align: 'center' },
      { header: 'Time', key: 'time', width: 14, align: 'center' },
      { header: 'Type', key: 'type', width: 16, align: 'center' },
      { header: 'Reason / Notes', key: 'reason', width: 28, align: 'left', wrapText: true },
      { header: 'Status', key: 'status', width: 16, align: 'center' },
      { header: 'Check-In Time', key: 'checkInTime', width: 16, align: 'center' },
      { header: 'Start Time', key: 'startTime', width: 16, align: 'center' },
      { header: 'End Time', key: 'endTime', width: 16, align: 'center' },
    ];
    styleWorksheet(aptSheet, aptCols);

    const aptRows = (appointmentsData.appointments || []).map((apt) => ({
      patientName: capitalizeName(apt.patientName) || 'Patient',
      opNumber: apt.opNumber ? `#${apt.opNumber}` : '—',
      phone: apt.phone || '—',
      patientType: apt.patientType === 'child' ? 'Child' : 'Adult',
      doctorName: apt.doctorName || '—',
      date: formatDate(apt.date),
      time: apt.time || '—',
      type: apt.type || 'Appointment',
      reason: apt.reason || 'General Dental Visit',
      status: apt.status || 'Scheduled',
      checkInTime: formatTime(apt.checkInTime),
      startTime: formatTime(apt.startTime),
      endTime: formatTime(apt.endTime),
    }));
    populateWorksheetRows(aptSheet, aptRows, aptCols);
  }

  // 2. WORKSHEET: FOLLOW-UPS
  if (followUpsData?.followUps) {
    const fSheet = workbook.addWorksheet('Follow-Ups');
    const fCols = [
      { header: 'Patient Name', key: 'patientName', width: 24, align: 'left' },
      { header: 'OP Number', key: 'opNumber', width: 14, align: 'center' },
      { header: 'Phone', key: 'phone', width: 16, align: 'center' },
      { header: 'Doctor', key: 'doctorName', width: 22, align: 'left' },
      { header: 'Recall Date', key: 'date', width: 16, align: 'center' },
      { header: 'Booked Time', key: 'time', width: 14, align: 'center' },
      { header: 'Reason for Follow-Up', key: 'reason', width: 26, align: 'left', wrapText: true },
      { header: 'Treatment Status', key: 'treatmentStatus', width: 22, align: 'left' },
      { header: 'Instructions / Notes', key: 'instructions', width: 32, align: 'left', wrapText: true },
      { header: 'Status', key: 'status', width: 16, align: 'center' },
    ];
    styleWorksheet(fSheet, fCols);

    const fRows = (followUpsData.followUps || []).map((f) => ({
      patientName: capitalizeName(f.patientName) || 'Patient',
      opNumber: f.opNumber ? `#${f.opNumber}` : '—',
      phone: f.phone || '—',
      doctorName: f.doctorName || '—',
      date: formatDate(f.date),
      time: f.time || '—',
      reason: f.reason || 'Follow-Up Review',
      treatmentStatus: f.treatmentStatus || 'Ongoing / Under Review',
      instructions: f.instructions || '—',
      status: f.status || 'Pending',
    }));
    populateWorksheetRows(fSheet, fRows, fCols);
  }

  // 3. WORKSHEET: FINANCIAL & BILLING
  if (financialData) {
    const finSheet = workbook.addWorksheet('Financial & Billing');
    const finCols = [
      { header: 'Date', key: 'date', width: 18, align: 'center' },
      { header: 'Invoiced Amount (₹)', key: 'invoiced', width: 22, align: 'right', numFmt: '₹#,##0.00' },
      { header: 'Collected Revenue (₹)', key: 'collected', width: 24, align: 'right', numFmt: '₹#,##0.00' },
      { header: 'Invoice Count', key: 'invoiceCount', width: 16, align: 'right', numFmt: '#,##0' },
    ];
    styleWorksheet(finSheet, finCols);

    const finRows = (financialData.dailyRevenue || []).map((d) => ({
      date: d.date,
      invoiced: Number(d.invoiced || 0),
      collected: Number(d.collected || d.revenue || 0),
      invoiceCount: Number(d.invoiceCount || 0),
    }));
    populateWorksheetRows(finSheet, finRows, finCols);

    // If pending invoices exist, add Pending Receivables Worksheet
    if (financialData.pendingInvoicesList && financialData.pendingInvoicesList.length > 0) {
      const pSheet = workbook.addWorksheet('Pending Receivables');
      const pCols = [
        { header: 'Patient Name', key: 'patientName', width: 24, align: 'left' },
        { header: 'OP Number', key: 'opNumber', width: 14, align: 'center' },
        { header: 'Doctor', key: 'doctorName', width: 22, align: 'left' },
        { header: 'Total Invoiced (₹)', key: 'total', width: 20, align: 'right', numFmt: '₹#,##0.00' },
        { header: 'Amount Paid (₹)', key: 'amountPaid', width: 20, align: 'right', numFmt: '₹#,##0.00' },
        { header: 'Balance Due (₹)', key: 'balance', width: 20, align: 'right', numFmt: '₹#,##0.00' },
        { header: 'Payment Status', key: 'paymentStatus', width: 16, align: 'center' },
      ];
      styleWorksheet(pSheet, pCols);

      const pRows = financialData.pendingInvoicesList.map((inv) => ({
        patientName: capitalizeName(inv.patientName) || 'Patient',

        opNumber: inv.opNumber ? `#${inv.opNumber}` : '—',
        doctorName: inv.doctorName || '—',
        total: Number(inv.total || 0),
        amountPaid: Number(inv.amountPaid || 0),
        balance: Number(inv.balance || 0),
        paymentStatus: inv.paymentStatus || 'Pending',
      }));
      populateWorksheetRows(pSheet, pRows, pCols);
    }
  }

  // 4. WORKSHEET: CLINICAL TREATMENTS
  if (treatmentData?.rankedTreatments) {
    const treatSheet = workbook.addWorksheet('Clinical Treatments');
    const treatCols = [
      { header: 'Rank', key: 'rank', width: 10, align: 'center' },
      { header: 'Treatment / Procedure', key: 'treatment', width: 34, align: 'left', wrapText: true },
      { header: 'Frequency / Case Count', key: 'count', width: 24, align: 'right', numFmt: '#,##0' },
      { header: 'Total Generated Value (₹)', key: 'totalRevenue', width: 26, align: 'right', numFmt: '₹#,##0.00' },
    ];
    styleWorksheet(treatSheet, treatCols);

    const treatRows = (treatmentData.rankedTreatments || []).map((t, idx) => ({
      rank: idx + 1,
      treatment: t.treatment || 'Procedure',
      count: Number(t.count || 0),
      totalRevenue: Number(t.totalRevenue || t.estimatedRevenue || 0),
    }));
    populateWorksheetRows(treatSheet, treatRows, treatCols);
  }

  // 5. WORKSHEET: DOCTOR PRODUCTIVITY
  if (doctorData?.doctors) {
    const docSheet = workbook.addWorksheet(isDoctor ? 'My Productivity' : 'Doctor Productivity');
    const docCols = [
      { header: 'Doctor Name', key: 'doctorName', width: 24, align: 'left' },
      { header: 'Specialization', key: 'specialization', width: 22, align: 'left' },
      { header: 'Patients Handled', key: 'patientsHandled', width: 18, align: 'right', numFmt: '#,##0' },
      { header: 'Total Consultations', key: 'consultationsCount', width: 20, align: 'right', numFmt: '#,##0' },
      { header: 'Completed Consultations', key: 'completedConsultations', width: 24, align: 'right', numFmt: '#,##0' },
      { header: 'Avg Duration (Mins)', key: 'avgConsultationMinutes', width: 20, align: 'right', numFmt: '0.0' },
      { header: 'Billed Value (₹)', key: 'billedAmount', width: 20, align: 'right', numFmt: '₹#,##0.00' },
      { header: 'Revenue Collected (₹)', key: 'revenueGenerated', width: 22, align: 'right', numFmt: '₹#,##0.00' },
      { header: 'Treatments Planned', key: 'treatmentsCount', width: 20, align: 'right', numFmt: '#,##0' },
      { header: 'Follow-ups Assigned', key: 'followUpsCount', width: 20, align: 'right', numFmt: '#,##0' },
    ];
    styleWorksheet(docSheet, docCols);

    const docRows = (doctorData.doctors || []).map((d) => ({
      doctorName: d.doctorName || 'Doctor',
      specialization: d.specialization || 'General Dentistry',
      patientsHandled: Number(d.patientsHandled || 0),
      consultationsCount: Number(d.consultationsCount || 0),
      completedConsultations: Number(d.completedConsultations || 0),
      avgConsultationMinutes: Number(d.avgConsultationMinutes || 0),
      billedAmount: Number(d.billedAmount || 0),
      revenueGenerated: Number(d.revenueGenerated || 0),
      treatmentsCount: Number(d.treatmentsCount || 0),
      followUpsCount: Number(d.followUpsCount || 0),
    }));
    populateWorksheetRows(docSheet, docRows, docCols);
  }

  // 6. WORKSHEET: OPERATIONS & PERFORMANCE SUMMARY
  if (performanceData) {
    const perfSheet = workbook.addWorksheet('Operations Summary');
    const perfCols = [
      { header: 'Operational Metric', key: 'metric', width: 42, align: 'left' },
      { header: 'Value / Count', key: 'value', width: 20, align: 'right', numFmt: '#,##0' },
    ];
    styleWorksheet(perfSheet, perfCols);

    const perfRows = [
      { metric: isDoctor ? 'My Total Patients Handled' : 'Total Clinic Patients Registered', value: Number(performanceData.totalPatients || 0) },
      { metric: 'New Patients in Selected Period', value: Number(performanceData.newPatients || 0) },
      { metric: 'Returning Multi-Visit Patients', value: Number(performanceData.returningPatients || 0) },
      { metric: 'Total Scheduled Appointments', value: Number(performanceData.appointments || 0) },
      { metric: 'Completed Consultations', value: Number(performanceData.completedConsultations || 0) },
      { metric: 'In-Progress Consultations', value: Number(performanceData.inProgressConsultations || 0) },
      { metric: 'Average Patient Wait Time (Minutes)', value: Number(performanceData.avgWaitMinutes || 0) },
      { metric: 'Average Consultation Chair Time (Minutes)', value: Number(performanceData.avgConsultationMinutes || 0) },
      { metric: 'Cancelled Appointments', value: Number(performanceData.cancelledAppointments || 0) },
      { metric: 'No-Show / Missed Appointments', value: Number(performanceData.noShows || 0) },
      { metric: 'Walk-In Intakes', value: Number(performanceData.intakeChannels?.walkIns || 0) },
      { metric: 'Phone Booking Intakes', value: Number(performanceData.intakeChannels?.phoneBookings || 0) },
      { metric: 'Online Booking Intakes', value: Number(performanceData.intakeChannels?.onlineBookings || 0) },
    ];
    populateWorksheetRows(perfSheet, perfRows, perfCols);
  }

  await saveWorkbook(workbook, filename);
}
