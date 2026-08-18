/**
 * Utility to generate a professional A4 Medical Prescription HTML document
 * and open it in a dedicated window/preview for printing or saving as PDF.
 */

export function generatePrescriptionHTML(params = {}) {
  const { rx = {}, consultation = {}, clinicSettings = {}, diagnoses = [] } = params || {};

  const patient = consultation?.patient || rx?.patient || {};
  const doctor = rx?.recordedBy || consultation?.doctor || {};

  const patientName = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') || 'Patient';
  const doctorName = doctor?.name ? `Dr. ${doctor.name}` : 'Doctor';
  const doctorQual = doctor?.specialization || 'BDS, MDS - Dental Specialist & Oral Surgeon';
  const rxDate = new Date(rx?.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const opNoStr = String(patient?.opNumber || '0000').replace(/[^0-9A-Za-z-]/g, '');
  const rxIdStr = String(rx?._id || rx?.id || '000000').slice(-6).toUpperCase();
  const rxRefNo = `RX-${opNoStr || '0000'}-${rxIdStr}`;

  const visitId = consultation?._id
    ? `VISIT-${String(consultation._id).slice(-6).toUpperCase()}`
    : (rx?.consultation
        ? `VISIT-${String(rx.consultation._id || rx.consultation).slice(-6).toUpperCase()}`
        : 'N/A');

  const diagnosisList = Array.isArray(diagnoses) && diagnoses.length > 0
    ? diagnoses.map((d) => `${d?.diagnosis || ''}${d?.relatedTeeth?.length ? ` (Teeth: #${d.relatedTeeth.join(', #')})` : ''}`).filter(Boolean).join(', ')
    : '';

  const safeClinicName = clinicSettings?.clinicName || 'Sai Dental Clinic';
  const safeAddress = clinicSettings?.address || '123 Healthcare Ave, Medical District';
  const safePhone = clinicSettings?.phone || '+91 98765 43210';
  const safeEmail = clinicSettings?.email || 'contact@sai-dentalclinic.com';

  const medicinesRows = (rx?.medicines || []).map((m, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; font-size: 12px; word-wrap: break-word;">${m.medicine || ''}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">${m.dosage || '—'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; color: #0d9488; font-size: 12px;">${m.frequency || '—'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">${m.duration || '—'}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #475569; font-style: italic; font-size: 11px; word-wrap: break-word;">${m.instructions || '—'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title></title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #f1f5f9;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.5;
        }
        .prescription-wrapper {
          max-width: 800px;
          margin: 64px auto 32px auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          padding: 36px 40px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 16px;
          margin-bottom: 16px;
        }
        .clinic-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .clinic-logo-icon {
          width: 46px;
          height: 46px;
          background: #0d9488;
          color: #ffffff;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 900;
        }
        .clinic-title {
          font-size: 20px;
          font-weight: 900;
          color: #0f172a;
          text-transform: uppercase;
          letter-spacing: -0.3px;
          margin: 0;
        }
        .clinic-subtitle {
          font-size: 11px;
          font-weight: 700;
          color: #0d9488;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin: 2px 0 0 0;
        }
        .clinic-contact {
          text-align: right;
          font-size: 11px;
          color: #475569;
          line-height: 1.4;
        }
        .doctor-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 12px 18px;
          margin-bottom: 16px;
        }
        .doctor-name {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .doctor-qual {
          font-size: 11px;
          font-weight: 700;
          color: #0d9488;
          margin: 1px 0 0 0;
        }
        .patient-card {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 14px 18px;
          margin-bottom: 16px;
          background: #ffffff;
        }
        .patient-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        .patient-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          color: #64748b;
          margin-bottom: 2px;
        }
        .patient-value {
          font-size: 12px;
          font-weight: 800;
          color: #0f172a;
        }
        .diagnosis-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
          font-size: 11px;
        }
        .rx-header {
          display: flex;
          align-items: center;
          gap: 8px;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 4px;
          margin-bottom: 12px;
          margin-top: 8px;
        }
        .rx-symbol {
          font-size: 32px;
          font-weight: 900;
          font-family: Georgia, serif;
          color: #0d9488;
          line-height: 1;
        }
        .med-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
        }
        .med-table th {
          background: #f1f5f9;
          font-weight: 700;
          color: #334155;
          text-align: left;
          padding: 10px 12px;
          font-size: 11px;
          text-transform: uppercase;
          border-bottom: 1px solid #cbd5e1;
        }
        .advice-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 24px;
          font-size: 11px;
        }
        .advice-title {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .footer-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #cbd5e1;
        }
        .signature-box {
          text-align: center;
          width: 210px;
        }
        .signature-line {
          border-bottom: 1px solid #0f172a;
          height: 44px;
          margin-bottom: 6px;
        }
        .toolbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background: #0f172a;
          color: #ffffff;
          padding: 12px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          z-index: 99999;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: 100% !important;
          }
          .toolbar { display: none !important; }
          .prescription-wrapper {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 12mm 16mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="toolbar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 18px;">📄</span>
          <span style="font-weight: 800; font-size: 14px;">Medical Prescription PDF Preview</span>
        </div>
        <div style="display: flex; gap: 10px;">
          <button onclick="window.print()" style="background: #0d9488; color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>🖨️</span> Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #334155; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
            Close Preview
          </button>
        </div>
      </div>

      <div class="prescription-wrapper">
        <!-- HEADER -->
        <div class="header">
          <div class="clinic-brand">
            <img src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png" alt="Sai Dental Logo" style="height: 48px; width: auto; object-fit: contain; border-radius: 8px;" />
            <div>
              <h1 class="clinic-title">${safeClinicName}</h1>
              <p class="clinic-subtitle">Center for Digital Dentistry & Super-Specialty Oral Care</p>
            </div>
          </div>
          <div class="clinic-contact">
            <p style="margin: 0; font-weight: 700; color: #0f172a;">${safeAddress}</p>
            <p style="margin: 2px 0 0 0;">Phone: <strong>${safePhone}</strong></p>
            <p style="margin: 2px 0 0 0;">Email: ${safeEmail}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Reg No: KDC-84920 / Lic: 2026-DNT</p>
          </div>
        </div>

        <!-- DOCTOR BAR -->
        <div class="doctor-bar">
          <div>
            <h2 class="doctor-name">${doctorName}</h2>
            <p class="doctor-qual">${doctorQual}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Dental Surgeon & Clinical Consultant</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; font-weight: 700;">Date: <span style="font-family: monospace;">${rxDate}</span></p>
            <p style="margin: 2px 0 0 0; font-size: 11px; font-family: monospace; font-weight: 700; color: #0d9488;">${rxRefNo}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">${visitId}</p>
          </div>
        </div>

        <!-- PATIENT DETAILS CARD -->
        <div class="patient-card">
          <div class="patient-grid">
            <div>
              <div class="patient-label">Patient Name</div>
              <div class="patient-value">${patientName}</div>
            </div>
            <div>
              <div class="patient-label">Patient ID (OP#)</div>
              <div class="patient-value" style="font-family: monospace; color: #0d9488;">${patient.opNumber || 'N/A'}</div>
            </div>
            <div>
              <div class="patient-label">Age / Gender</div>
              <div class="patient-value">${patient.age !== undefined && patient.age !== null ? `${patient.age} Yrs` : 'N/A'} ${patient.sex ? `/ ${patient.sex}` : ''}</div>
            </div>
            <div>
              <div class="patient-label">Phone Number</div>
              <div class="patient-value" style="font-family: monospace;">${patient.phone || 'N/A'}</div>
            </div>
          </div>

          ${patient.vitals?.bp || patient.vitals?.rbs || patient.address ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; gap: 20px; font-size: 11px; color: #334155;">
              ${patient.vitals?.bp ? `<div><strong>BP:</strong> ${patient.vitals.bp}</div>` : ''}
              ${patient.vitals?.rbs ? `<div><strong>RBS:</strong> ${patient.vitals.rbs}</div>` : ''}
              ${patient.address ? `<div style="flex: 1;"><strong>Address:</strong> ${patient.address}</div>` : ''}
            </div>
          ` : ''}
        </div>

        <!-- DIAGNOSIS & CLINICAL NOTES -->
        ${diagnosisList ? `
          <div class="diagnosis-box">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 3px;">Clinical Diagnosis & Findings:</div>
            <div style="font-weight: 700; color: #0f172a;">${diagnosisList}</div>
          </div>
        ` : ''}

        <!-- RX MEDICINES TABLE -->
        <div style="margin-bottom: 6px;">
          <div class="rx-header">
            <span class="rx-symbol">Rx</span>
            <span style="font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #334155;">Prescribed Medications</span>
          </div>

          <table class="med-table">
            <thead>
              <tr>
                <th style="width: 36px; text-align: center;">#</th>
                <th>Medicine Name & Strength</th>
                <th style="width: 90px;">Dosage</th>
                <th style="width: 110px;">Frequency</th>
                <th style="width: 90px;">Duration</th>
                <th>Instructions & Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${medicinesRows}
            </tbody>
          </table>
        </div>

        <!-- GENERAL ADVICE & PRECAUTIONS -->
        <div class="advice-box">
          <div class="advice-title">General Post-Treatment Instructions & Precautions:</div>
          <ul style="margin: 0; padding-left: 18px; color: #334155; line-height: 1.6;">
            <li>Take all medicines as directed at the specified intervals.</li>
            <li>Complete the full course of prescribed antibiotics.</li>
            <li>Rinse mouth with warm saline water 3-4 times daily after meals.</li>
            <li>Avoid hard, hot, or spicy food items for 24-48 hours.</li>
          </ul>
        </div>

        <!-- FOOTER & SIGNATURE -->
        <div class="footer-section">
          <div style="font-size: 10px; color: #64748b; line-height: 1.5;">
            <p style="margin: 0; font-weight: 700; color: #334155;">${safeClinicName} — Patient Care Services</p>
            <p style="margin: 0;">Emergency Helpline: <strong>${safePhone}</strong> | Next Follow-Up: As advised</p>
            <p style="margin: 2px 0 0 0; font-style: italic;">This is a valid computerized medical prescription issued by a registered practitioner.</p>
          </div>

          <div class="signature-box">
            <div class="signature-line"></div>
            <div style="font-size: 12px; font-weight: 800; color: #0f172a;">${doctorName}</div>
            <div style="font-size: 10px; color: #64748b;">${doctorQual}</div>
            <div style="font-size: 9px; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-top: 2px;">Doctor's Signature & Stamp</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function openPrescriptionPDFWindow(params, autoPrint = false) {
  const htmlContent = generatePrescriptionHTML(params);
  const printWindow = window.open('', '_blank', 'width=900,height=950');
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
    alert('Please allow popups to open the PDF Prescription preview.');
  }
}
