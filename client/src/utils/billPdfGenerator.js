import api from '../api/axios.js';
import { formatAge, formatPatientFullName, capitalizeWords } from './formatters.js';

export function generateBillHTML(params = {}) {
  const { invoice = {}, clinicSettings = {}, doctor = null } = params || {};

  const patient = invoice?.patient || {};
  const docObj = doctor || invoice?.doctor || {};

  const patientName = formatPatientFullName(patient) || 'Patient';

  let rawDocName = docObj?.name || 'Doctor';
  if (rawDocName !== 'Doctor' && !rawDocName.startsWith('Dr.')) {
    rawDocName = `Dr. ${rawDocName}`;
  }
  const doctorName = capitalizeWords(rawDocName);
  const doctorQual = capitalizeWords(docObj?.qualification || docObj?.doctorProfile?.qualification || 'BDS, MDS');
  const doctorSpec = capitalizeWords(docObj?.specialization || docObj?.doctorProfile?.specialization || 'Dental Specialist & Surgeon');

  const billDate = new Date(invoice?.createdAt || invoice?.date || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const billTime = new Date(invoice?.createdAt || invoice?.date || Date.now()).toLocaleTimeString('en-IN', {
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
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; color: #0f172a;">
          <div style="font-weight: 700;">${item.name}</div>
          ${item.details ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${item.details}</div>` : ''}
        </td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-size: 12px; color: #334155;">${item.quantity}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-size: 12px; color: #334155;">₹${item.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: 700; font-size: 12px; color: #0f172a;">₹${itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join('');

  const payments = invoice?.payments || [];
  const paymentsSection = payments.length > 0 ? `
    <div style="margin-top: 24px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 8px;">Payment & Transaction History</div>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 1px solid #cbd5e1; text-align: left;">
            <th style="padding: 6px 10px; font-weight: 700; color: #475569;">#</th>
            <th style="padding: 6px 10px; font-weight: 700; color: #475569;">Date & Time</th>
            <th style="padding: 6px 10px; font-weight: 700; color: #475569;">Payment Method</th>
            <th style="padding: 6px 10px; font-weight: 700; color: #475569;">Type / Reference</th>
            <th style="padding: 6px 10px; font-weight: 700; color: #475569; text-align: right;">Amount Paid</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map((p, idx) => `
            <tr style="border-bottom: 1px solid #f1f5f9;">
              <td style="padding: 6px 10px; color: #64748b;">${idx + 1}</td>
              <td style="padding: 6px 10px; color: #334155;">${new Date(p.date || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
              <td style="padding: 6px 10px; font-weight: 600; color: #0f172a;">${capitalizeWords(p.method || 'Cash')}</td>
              <td style="padding: 6px 10px; color: #64748b; font-style: italic;">${capitalizeWords(p.reason || p.type || 'Payment Received')}</td>
              <td style="padding: 6px 10px; text-align: right; font-family: monospace; font-weight: 700; color: #047857;">₹${(Number(p.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `).join('')}
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
          margin: 10mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #f8fafc;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.45;
        }
        .screen-toolbar {
          position: sticky;
          top: 0;
          left: 0;
          right: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 10px 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .toolbar-btn {
          background: #0d9488;
          color: #ffffff;
          border: none;
          padding: 8px 18px;
          border-radius: 8px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.15s ease;
        }
        .toolbar-btn:hover {
          background: #0f766e;
        }
        .toolbar-close {
          background: #334155;
          color: #f1f5f9;
        }
        .toolbar-close:hover {
          background: #475569;
        }
        .invoice-container {
          max-width: 820px;
          margin: 20px auto 40px auto;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
          padding: 32px 36px;
        }
        @media print {
          body {
            background: #ffffff;
            color: #000000;
          }
          .screen-toolbar, .no-print {
            display: none !important;
          }
          .invoice-container {
            border: none;
            box-shadow: none;
            padding: 0;
            margin: 0;
            max-width: 100%;
            border-radius: 0;
          }
        }
      </style>
    </head>
    <body>
      <div class="screen-toolbar no-print">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-weight: 700; font-size: 14px;">🧾 Medical Bill / Invoice Preview</span>
          <span style="background: rgba(255,255,255,0.2); padding: 2px 8px; border-radius: 6px; font-family: monospace; font-size: 11px;">${invoiceNo}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <button class="toolbar-btn toolbar-close" onclick="window.close()">Close Window</button>
          <button class="toolbar-btn" onclick="window.print()">🖨️ Print Bill / Save PDF</button>
        </div>
      </div>

      <div class="invoice-container">
        <!-- HEADER: CLINIC BRANDING & BILL BADGE -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 20px;">
          <div style="max-width: 60%;">
            <div style="font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; line-height: 1.2;">
              ${safeClinicName}
            </div>
            <div style="font-size: 11px; font-weight: 600; color: #0d9488; margin-top: 3px;">
              ${safeTagline}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.4;">
              ${safeAddress}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              Phone: <strong>${safePhone}</strong> | Email: <strong>${safeEmail}</strong>
            </div>
            ${safeTaxId ? `<div style="font-size: 10px; color: #64748b; margin-top: 2px; font-family: monospace;">GSTIN / Reg No: <strong>${safeTaxId}</strong></div>` : ''}
          </div>

          <div style="text-align: right;">
            <div style="display: inline-block; background: #0f172a; color: #ffffff; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">
              Tax Invoice / Bill
            </div>
            <div style="font-size: 14px; font-weight: 800; font-family: monospace; color: #0f172a;">
              ${invoiceNo}
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px;">
              Date: <strong>${billDate}</strong>
            </div>
            <div style="font-size: 11px; color: #64748b;">
              Time: ${billTime}
            </div>
            <div style="margin-top: 8px;">
              <span style="display: inline-block; padding: 3px 10px; border-radius: 9999px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; background-color: ${statusTheme.bg}; color: ${statusTheme.text}; border: 1px solid ${statusTheme.border};">
                ● ${paymentStatus}
              </span>
            </div>
          </div>
        </div>

        <!-- 2-COLUMN INFO BOX: PATIENT & DOCTOR / VISIT -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 22px;">
          <!-- Patient Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin-bottom: 6px;">
              Billed To (Patient Information)
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
              ${patientName}
            </div>
            <div style="font-size: 11px; color: #334155; margin-top: 3px;">
              OP Number: <strong style="font-family: monospace; color: #0d9488;">#${patient?.opNumber || invoice?.opNumber || 'N/A'}</strong>
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              Age / Sex: <strong>${patient?.age !== undefined && patient?.age !== null ? `${formatAge(patient.age)} yrs` : 'N/A'}</strong> / <strong>${patient?.sex || 'N/A'}</strong>
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 2px;">
              Contact: <strong>${patient?.primaryPhone || patient?.phone || 'N/A'}</strong>
            </div>
            ${patient?.address ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">Address: ${capitalizeWords(patient.address)}</div>` : ''}
          </div>

          <!-- Doctor & Visit Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 14px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #0d9488; margin-bottom: 6px;">
              Attending Doctor & Consultation
            </div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">
              ${doctorName}
            </div>
            <div style="font-size: 11px; color: #334155; margin-top: 3px;">
              ${doctorSpec}
            </div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
              Qualification: <strong>${doctorQual}</strong>
            </div>
            <div style="font-size: 11px; color: #475569; margin-top: 4px; border-top: 1px dashed #cbd5e1; pt-1;">
              Payment Method: <strong>${capitalizeWords(invoice?.payments?.[0]?.method || invoice?.paymentMethod || 'Cash')}</strong>
            </div>
          </div>
        </div>

        <!-- ITEMIZED SERVICES TABLE -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em;">
              <th style="padding: 10px 12px; width: 45px; text-align: center;">#</th>
              <th style="padding: 10px 12px;">Service / Procedure Description</th>
              <th style="padding: 10px 12px; width: 60px; text-align: center;">Qty</th>
              <th style="padding: 10px 12px; width: 120px; text-align: right;">Unit Rate (₹)</th>
              <th style="padding: 10px 12px; width: 130px; text-align: right;">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- TOTALS & FINANCIAL SUMMARY -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
          <!-- Left side: Terms / Notes -->
          <div style="flex: 1; padding: 12px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 10.5px; color: #64748b; line-height: 1.5;">
            <div style="font-weight: 700; color: #334155; margin-bottom: 4px; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em;">Terms & Notes:</div>
            <p style="margin: 0 0 4px 0;">1. This is a computer-generated official billing statement.</p>
            <p style="margin: 0 0 4px 0;">2. Prescribed medicines and dental services are subject to clinical guidelines.</p>
            <p style="margin: 0;">3. For any invoice queries or follow-up appointments, please quote the Invoice Ref <strong>#${invoiceNo}</strong>.</p>
          </div>

          <!-- Right side: Amount calculation block -->
          <div style="width: 320px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden;">
            <div style="padding: 10px 14px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; border-bottom: 1px solid #f1f5f9;">
              <span>Subtotal:</span>
              <span style="font-family: monospace; font-weight: 600; color: #0f172a;">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            ${discount > 0 ? `
              <div style="padding: 8px 14px; display: flex; justify-content: space-between; font-size: 11px; color: #047857; border-bottom: 1px solid #f1f5f9;">
                <span>Discount:</span>
                <span style="font-family: monospace; font-weight: 600;">-₹${discount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}

            ${tax > 0 ? `
              <div style="padding: 8px 14px; display: flex; justify-content: space-between; font-size: 11px; color: #475569; border-bottom: 1px solid #f1f5f9;">
                <span>Tax / GST:</span>
                <span style="font-family: monospace; font-weight: 600; color: #0f172a;">+₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            ` : ''}

            <div style="padding: 12px 14px; display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; background-color: #f1f5f9; color: #0f172a; border-bottom: 1px solid #e2e8f0;">
              <span>Total Bill Amount:</span>
              <span style="font-family: monospace; font-size: 14px; color: #0f766e;">₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style="padding: 10px 14px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; color: #047857; border-bottom: 1px solid #f1f5f9;">
              <span>Amount Paid:</span>
              <span style="font-family: monospace;">₹${amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div style="padding: 10px 14px; display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; background-color: ${balance > 0 ? '#fef2f2' : '#f0fdf4'}; color: ${balance > 0 ? '#b91c1c' : '#15803d'};">
              <span>Balance Due:</span>
              <span style="font-family: monospace; font-size: 13px;">₹${balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        ${paymentsSection}

        <!-- FOOTER: SIGNATURE AND CLINIC SALUTATION -->
        <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-size: 12px; font-weight: 700; color: #0d9488;">Thank you for trusting ${safeClinicName}!</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">For appointments & queries, reach us at ${safePhone}</div>
          </div>

          <div style="text-align: center; min-width: 180px;">
            <div style="height: 40px;"></div>
            <div style="border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 800; color: #0f172a;">
              Authorized Signatory
            </div>
            <div style="font-size: 10px; color: #64748b;">${safeClinicName}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function openBillPrintWindow(params = {}, autoPrint = true) {
  let { invoice = {}, clinicSettings = {}, doctor = null } = params || {};

  // Fetch clinic settings dynamically if not provided
  if (!clinicSettings || !clinicSettings.clinicName || clinicSettings.clinicName.includes('Digital Platform')) {
    try {
      const res = await api.get('/settings');
      if (res.data?.settings) {
        clinicSettings = { ...clinicSettings, ...res.data.settings };
      }
    } catch (err) {
      console.warn('Clinic settings fetch warning:', err);
    }
  }

  // Determine doctor object
  let docObj = doctor || invoice?.doctor || {};
  const docId = typeof docObj === 'string' ? docObj : (docObj?._id || docObj?.id);

  if (docId && (!docObj.qualification || !docObj.specialization)) {
    try {
      const docRes = await api.get(`/doctor-profiles/${docId}`);
      if (docRes.data?.profile) {
        const prof = docRes.data.profile;
        docObj = {
          ...docObj,
          specialization: prof.specialization || docObj.specialization,
          qualification: prof.qualification || docObj.qualification,
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
