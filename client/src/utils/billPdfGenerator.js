import api from '../api/axios.js';
import { formatAge, formatPatientFullName, formatDoctorName, capitalizeWords } from './formatters.js';

export function generateBillHTML(params = {}) {
  const { invoice = {}, clinicSettings = {}, doctor = null } = params || {};

  const patient = invoice?.patient || {};
  const docObj = doctor || invoice?.doctor || {};

  const patientName = formatPatientFullName(patient) || 'Patient';

  const invoiceDateValue = invoice?.date || invoice?.createdAt || Date.now();
  const invoiceDateObj = new Date(invoiceDateValue);
  const isValidDate = !isNaN(invoiceDateObj.getTime());
  const validInvoiceDate = isValidDate ? invoiceDateObj : new Date();

  const billDate = validInvoiceDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const billTime = validInvoiceDate.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rawInvId = String(invoice?._id || invoice?.id || '000000');
  const invIdStr = rawInvId.length > 6 ? rawInvId.slice(-6).toUpperCase() : rawInvId.toUpperCase();
  const opNoStr = String(invoice?.opNumber || patient?.opNumber || '0000').replace(/[^0-9A-Za-z-]/g, '');
  const invoiceNo = `INV-${opNoStr ? `${opNoStr}-` : ''}${invIdStr}`;

  const safeClinicName = capitalizeWords(clinicSettings?.clinicName || 'Sai Dental Clinic');
  const safeTagline = capitalizeWords(clinicSettings?.tagline || 'Advanced Dental Care & Implant Center');
  const safeAddress = capitalizeWords(clinicSettings?.address || '123 Healthcare Avenue, Medical District, City');
  const safePhone = clinicSettings?.phone || '+91 98765 43210';
  const safeEmail = clinicSettings?.email || 'contact@sai-dentalclinic.com';
  const safeTaxId = clinicSettings?.taxId || clinicSettings?.gstNumber || clinicSettings?.gst || '';

  const items = (invoice?.items || []).map((it) => ({
    name: capitalizeWords((it.service || it.treatment || 'Dental Service / Procedure').trim()),
    details: it.treatment && it.treatment !== it.service ? capitalizeWords(it.treatment.trim()) : '',
    quantity: Math.max(1, Number(it.quantity) || 1),
    unitPrice: Math.max(0, Number(it.unitPrice) || 0),
  }));

  if (items.length === 0) {
    items.push({
      name: 'General Dental Consultation & Services',
      details: '',
      quantity: 1,
      unitPrice: Number(invoice?.total) || 0,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const discount = Math.max(0, Number(invoice?.discount) || 0);
  const tax = Math.max(0, Number(invoice?.tax) || 0);
  const total = Number(invoice?.total ?? Math.max(0, subtotal - discount + tax)) || 0;
  const amountPaid = Number(invoice?.amountPaid ?? (invoice?.payments || []).reduce((sum, p) => sum + (p.amount || 0), 0)) || 0;
  const balance = Number(invoice?.balance ?? Math.max(0, total - amountPaid)) || 0;

  const paymentStatus = (invoice?.paymentStatus || (amountPaid >= total && total > 0 ? 'Paid' : amountPaid > 0 ? 'Partially Paid' : 'Pending')).toUpperCase();

  const statusColorMap = {
    PAID: { bg: '#ecfdf5', text: '#065f46', border: '#a7f3d0' },
    'PARTIALLY PAID': { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
    PENDING: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca' },
    REFUNDED: { bg: '#f5f3ff', text: '#5b21b6', border: '#ddd6fe' },
  };
  const statusTheme = statusColorMap[paymentStatus] || statusColorMap.PENDING;

  const itemsRows = items.map((item, idx) => {
    const itemTotal = item.quantity * item.unitPrice;
    const isEven = idx % 2 === 0;
    return `
      <tr style="background-color: ${isEven ? '#ffffff' : '#f8fafc'};">
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-align: center; color: #64748b; font-size: 10.5px;">${idx + 1}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #0B1A2E;">
          <div style="font-weight: 700;">${item.name}</div>
          ${item.details ? `<div style="font-size: 9.5px; color: #64748b; margin-top: 1px;">${item.details}</div>` : ''}
        </td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-size: 11px; color: #334155;">${item.quantity}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 11px; color: #334155;">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; font-size: 11px; color: #0B1A2E;">₹${itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const payments = invoice?.payments || [];
  const paymentsSection = payments.length > 0 ? `
    <div style="margin-top: 12px;">
      <div style="font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 5px;">Payment History</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: left;">
            <th style="padding: 5px 8px; font-weight: 700; color: #334155; width: 30px; text-align: center;">#</th>
            <th style="padding: 5px 8px; font-weight: 700; color: #334155;">Date & Time</th>
            <th style="padding: 5px 8px; font-weight: 700; color: #334155;">Method</th>
            <th style="padding: 5px 8px; font-weight: 700; color: #334155;">Type / Reference</th>
            <th style="padding: 5px 8px; font-weight: 700; color: #334155; text-align: right;">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map((p, idx) => {
            const pDate = p.date ? new Date(p.date) : new Date();
            const dateStr = pDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            const timeStr = p.time || pDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
            return `
            <tr style="border-bottom: 1px solid #f1f5f9; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 5px 8px; color: #64748b; text-align: center;">${idx + 1}</td>
              <td style="padding: 5px 8px; color: #334155;">${dateStr} <span style="font-size: 9px; color: #64748b;">(${timeStr})</span></td>
              <td style="padding: 5px 8px; font-weight: 600; color: #0B1A2E;">${capitalizeWords(p.method || 'Cash')}</td>
              <td style="padding: 5px 8px; color: #64748b;">${capitalizeWords(p.notes || p.reason || p.type || 'Payment Received')}</td>
              <td style="padding: 5px 8px; text-align: right; font-family: monospace; font-weight: 700; color: #0B1A2E;">₹${(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;}).join('')}
        </tbody>
      </table>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeClinicName} - Bill Receipt #${invoiceNo}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 8mm 12mm 8mm 12mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        html, body {
          margin: 0;
          padding: 0;
          background: #cbd5e1;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.4;
        }
        body {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* SCREEN TOOLBAR */
        .screen-toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
          z-index: 99999;
        }
        .toolbar-btn {
          background: #1E64EA;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .toolbar-btn:hover {
          background: #1550c0;
        }
        .toolbar-close {
          background: #334155;
          color: #f1f5f9;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
        }
        .toolbar-close:hover {
          background: #475569;
        }

        /* A4 PAGE CONTAINER */
        .a4-page {
          width: 210mm;
          min-height: 297mm;
          margin: 56px auto 20px auto;
          background: #ffffff;
          border-radius: 4px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.08);
          padding: 12mm 14mm 10mm 14mm;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-sizing: border-box;
          position: relative;
        }

        .page-content {
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }

        .page-footer {
          margin-top: auto;
          flex-shrink: 0;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2.5px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
        }

        .patient-card {
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 10px 14px;
          margin-bottom: 12px;
          background: #ffffff;
        }
        .patient-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .patient-label {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .patient-value {
          font-size: 11.5px;
          font-weight: 800;
          color: #0B1A2E;
        }

        .bill-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          border-radius: 6px;
          overflow: hidden;
          border: 1px solid #cbd5e1;
        }
        .bill-table th {
          background-color: #f1f5f9;
          color: #334155;
          text-align: left;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 6px 10px;
          border-bottom: 1px solid #cbd5e1;
          font-weight: 700;
        }

        /* PRINT STYLES */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 12mm 8mm 12mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
            height: auto !important;
          }
          .screen-toolbar, .no-print {
            display: none !important;
          }
          .a4-page {
            width: 100% !important;
            min-height: 270mm !important;
            height: 270mm !important;
            max-height: 270mm !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border-radius: 0 !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            position: relative !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar no-print">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; font-size: 14px;">🧾 Medical Bill / Invoice Preview (A4 Format)</span>
          <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 11px;">${invoiceNo}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="toolbar-close" onclick="window.close()">Close Preview</button>
          <button class="toolbar-btn" onclick="window.print()">🖨️ Print Bill / Save PDF</button>
        </div>
      </div>

      <div class="a4-page last-page">
        <div class="page-content">
          <!-- HEADER: CLINIC BRANDING (TOP LOGO, BOTTOM ADDRESS) & BILL BADGE -->
          <div class="header">
            <div style="max-width: 60%;">
              <img src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png" alt="Sai Dental Logo" style="height: 46px; width: auto; object-fit: contain; border-radius: 6px; display: block; margin-bottom: 5px;" />
              <div style="font-size: 10px; color: #475569; line-height: 1.35;">
                <div>${safeAddress}</div>
                <div style="margin-top: 1px;">Phone: <strong>${safePhone}</strong> | Email: <strong>${safeEmail}</strong></div>
                ${safeTaxId ? `<div style="font-size: 9px; color: #64748b; margin-top: 1px; font-family: monospace;">GSTIN / Reg No: <strong>${safeTaxId}</strong></div>` : ''}
              </div>
            </div>

            <div style="text-align: right;">
              <div style="font-size: 14px; font-weight: 800; color: #0B1A2E; letter-spacing: 0.5px;">
                INVOICE / BILL
              </div>
              <div style="font-size: 12px; font-weight: 700; font-family: monospace; color: #1E64EA; margin-top: 2px;">
                ${invoiceNo}
              </div>
              <div style="font-size: 10px; color: #475569; margin-top: 2px;">
                Date: <strong>${billDate}</strong> | Time: ${billTime}
              </div>
              <div style="margin-top: 4px;">
                <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1;">
                  Status: ${paymentStatus}
                </span>
              </div>
            </div>
          </div>

          <!-- PATIENT INFORMATION CARD -->
          <div class="patient-card">
            <div class="patient-grid">
              <div>
                <div class="patient-label">Patient Name</div>
                <div class="patient-value">${patientName}</div>
              </div>
              <div>
                <div class="patient-label">Patient ID (OP#)</div>
                <div class="patient-value" style="color: #1E64EA; font-family: monospace;">#${patient?.opNumber || invoice?.opNumber || 'N/A'}</div>
              </div>
              <div>
                <div class="patient-label">Age / Gender</div>
                <div class="patient-value">${patient?.age !== undefined && patient?.age !== null ? `${formatAge(patient.age)} yrs` : 'N/A'} ${patient?.sex ? `/ ${patient.sex}` : ''}</div>
              </div>
              <div>
                <div class="patient-label">Phone Number</div>
                <div class="patient-value" style="font-family: monospace;">${patient?.primaryPhone || patient?.phone || 'N/A'}</div>
              </div>
            </div>
            ${patient?.address ? `
              <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e2e8f0; font-size: 9.5px; color: #475569;">
                <strong>Address:</strong> ${capitalizeWords(patient.address)}
              </div>
            ` : ''}
          </div>

          <!-- ITEMIZED SERVICES TABLE -->
          <table class="bill-table">
            <thead>
              <tr>
                <th style="width: 35px; text-align: center;">#</th>
                <th>Service / Procedure Description</th>
                <th style="width: 50px; text-align: center;">Qty</th>
                <th style="width: 100px; text-align: right;">Unit Rate (₹)</th>
                <th style="width: 110px; text-align: right;">Total (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <!-- TOTALS & FINANCIAL SUMMARY -->
          <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
            <!-- Amount calculation block -->
            <div style="width: 280px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden;">
              <div style="padding: 5px 12px; display: flex; justify-content: space-between; font-size: 10.5px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                <span>Subtotal:</span>
                <span style="font-family: monospace; font-weight: 600; color: #0B1A2E;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              ${discount > 0 ? `
                <div style="padding: 5px 12px; display: flex; justify-content: space-between; font-size: 10.5px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                  <span>Discount:</span>
                  <span style="font-family: monospace; font-weight: 600; color: #0B1A2E;">-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ''}

              ${tax > 0 ? `
                <div style="padding: 5px 12px; display: flex; justify-content: space-between; font-size: 10.5px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                  <span>Tax / GST:</span>
                  <span style="font-family: monospace; font-weight: 600; color: #0B1A2E;">+₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              ` : ''}

              <div style="padding: 6px 12px; display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 800; background-color: #f1f5f9; color: #0B1A2E; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1;">
                <span>Total Bill Amount:</span>
                <span style="font-family: monospace; font-size: 12px; color: #0B1A2E;">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div style="padding: 5px 12px; display: flex; justify-content: space-between; font-size: 10.5px; font-weight: 700; color: #334155; border-bottom: 1px solid #f1f5f9;">
                <span>Amount Paid:</span>
                <span style="font-family: monospace; color: #0B1A2E;">₹${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>

              <div style="padding: 5px 12px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #0B1A2E; background-color: #ffffff;">
                <span>Balance Due:</span>
                <span style="font-family: monospace; font-size: 11.5px; color: #0B1A2E;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          ${paymentsSection}
        </div>

        <!-- FOOTER: CLINIC SALUTATION (PINNED TO BOTTOM OF A4) -->
        <div class="page-footer">
          <div style="padding-top: 10px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 10.5px; font-weight: 700; color: #0B1A2E;">Thank you for trusting Sai Dental Clinic!</div>
              <div style="font-size: 9px; color: #64748b; margin-top: 1px;">For appointments & queries, reach us at ${safePhone}</div>
              <div style="font-size: 8.5px; color: #94a3b8; margin-top: 1px; font-style: italic;">Computer generated official invoice receipt.</div>
            </div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function openBillPrintWindow(params = {}, autoPrint = true) {
  let { invoice = {}, clinicSettings = {}, doctor = null } = params || {};

  // Fetch clinic settings dynamically from admin clinic settings
  try {
    const res = await api.get('/settings');
    if (res.data?.settings) {
      clinicSettings = { ...clinicSettings, ...res.data.settings };
    }
  } catch (err) {
    console.warn('Clinic settings fetch warning:', err);
  }

  // Determine doctor object
  let docObj = doctor || invoice?.doctor || {};
  const docId = typeof docObj === 'string' ? docObj : (docObj?._id || docObj?.id || docObj?.user?._id || docObj?.user);

  // Fetch latest doctor profile from My Account to ensure up-to-date name, specialization, qualification, phone
  if (docId) {
    try {
      const docRes = await api.get(`/doctor-profiles/${docId}`);
      if (docRes.data?.profile) {
        const prof = docRes.data.profile;
        const u = prof.user || {};
        docObj = {
          ...docObj,
          name: u.name || prof.name || docObj.name,
          specialization: prof.specialization || u.specialization || docObj.specialization,
          qualification: prof.qualification || docObj.qualification,
          phone: u.phone || prof.phone || docObj.phone,
        };
      }
    } catch (err) {
      console.warn('Doctor profile fetch warning:', err);
    }
  }

  const htmlContent = generateBillHTML({
    invoice,
    clinicSettings,
    doctor: docObj,
  });

  const printWindow = window.open('', '_blank', 'width=950,height=950');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    if (autoPrint) {
      setTimeout(() => {
        try {
          printWindow.print();
        } catch (e) {
          console.error('Failed to trigger print on popup window:', e);
        }
      }, 350);
    }
  } else {
    alert('Please allow popups to open the Print Bill preview window.');
  }
}
