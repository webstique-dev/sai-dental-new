import api from '../api/axios.js';
import { formatAge, formatPatientFullName, capitalizeWords } from './formatters.js';

export function generatePrescriptionHTML(params = {}) {
  const { rx = {}, consultation = {}, clinicSettings = {}, doctor = null, diagnoses = [] } = params || {};

  const patient = consultation?.patient || rx?.patient || {};
  const docObj = doctor || rx?.recordedBy || consultation?.doctor || {};

  const patientName = formatPatientFullName(patient) || 'Patient';

  // Doctor name without "Dr." prefix
  let rawDocName = docObj?.name || 'Doctor';
  const doctorName = capitalizeWords(rawDocName.replace(/^Dr\.?\s*/i, '').trim()) || 'Doctor';

  // Doctor specialization defaulting to Dental Surgeon
  let doctorSpec = docObj?.specialization || docObj?.doctorProfile?.specialization || 'Dental Surgeon';
  if (!doctorSpec || doctorSpec.includes('Dental Specialist')) {
    doctorSpec = doctorSpec.replace('Dental Specialist & Surgeon', 'Dental Surgeon').replace('Dental Specialist', 'Dental Surgeon');
  }
  doctorSpec = capitalizeWords(doctorSpec);

  const rxDate = new Date(rx?.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const diagnosisList = Array.isArray(diagnoses) && diagnoses.length > 0
    ? diagnoses.map((d) => `${capitalizeWords(d?.diagnosis || '')}${d?.relatedTeeth?.length ? ` (Teeth: #${d.relatedTeeth.join(', #')})` : ''}`).filter(Boolean).join(', ')
    : '';

  const safeClinicName = capitalizeWords(clinicSettings?.clinicName || 'Sai Dental Clinic');
  const safeAddress = capitalizeWords(clinicSettings?.address || '123 Healthcare Avenue, Medical District, City');
  const safePhone = clinicSettings?.phone || '+91 98765 43210';
  const safeEmail = clinicSettings?.email || 'contact@sai-dentalclinic.com';

  const medicinesRows = (rx?.medicines || []).map((m, idx) => `
    <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; text-align: center; color: #64748b; font-size: 11px;">${idx + 1}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a; font-size: 12px; word-wrap: break-word;">${capitalizeWords(m.medicine || '')}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">${capitalizeWords(m.dosage || '—')}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace; font-weight: 700; color: #0d9488; font-size: 12px;">${m.frequency || '—'}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; font-size: 11px;">${capitalizeWords(m.duration || '—')}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; color: #475569; font-style: italic; font-size: 11px; word-wrap: break-word;">${capitalizeWords(m.instructions || '—')}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${safeClinicName} - Medical Prescription</title>
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
          max-width: 960px;
          width: 95%;
          margin: 52px auto 24px auto;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          padding: 24px 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 3px solid #0f172a;
          padding-bottom: 14px;
          margin-bottom: 14px;
        }
        .clinic-brand {
          display: flex;
          align-items: center;
          gap: 14px;
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
          background: #f0f9ff;
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 14px;
        }
        .doctor-name-wrapper {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }
        .doctor-name {
          font-size: 14px;
          font-weight: 800;
          color: #0B1A2E;
          margin: 0;
        }
        .doctor-qual {
          font-size: 12px;
          font-weight: 700;
          color: #1E64EA;
          margin: 0;
        }
        .patient-card {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
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
          color: #0B1A2E;
        }
        .diagnosis-box {
          background: #fffbeb;
          border: 1px solid #fde68a;
          border-radius: 10px;
          padding: 8px 12px;
          margin-bottom: 14px;
          font-size: 11px;
        }
        .rx-header {
          display: flex;
          align-items: center;
          gap: 10px;
          border-bottom: 2px solid #0f172a;
          padding-bottom: 4px;
          margin-bottom: 12px;
          margin-top: 6px;
        }
        .rx-symbol {
          font-size: 38px;
          font-weight: 800;
          font-family: "Times New Roman", Times, "Playfair Display", Georgia, serif;
          color: #0f172a;
          line-height: 0.9;
          display: inline-flex;
          align-items: center;
          user-select: none;
        }
        .med-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          overflow: hidden;
        }
        .med-table th {
          background: #f1f5f9;
          font-weight: 700;
          color: #334155;
          text-align: left;
          padding: 8px 10px;
          font-size: 11px;
          text-transform: uppercase;
          border-bottom: 1px solid #cbd5e1;
        }
        .footer-section {
          margin-top: 24px;
          padding-top: 14px;
          border-top: 1px solid #cbd5e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
        .page-2 {
          margin-top: 24px !important;
        }
        .screen-page-divider {
          max-width: 960px;
          width: 95%;
          margin: 16px auto;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .screen-page-divider::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          border-top: 2px dashed #cbd5e1;
          z-index: 1;
        }
        .page-badge {
          position: relative;
          z-index: 2;
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 14px;
          border-radius: 9999px;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
        }
        .edu-section {
          margin-bottom: 20px;
        }
        .edu-title-wrapper {
          text-align: center;
          margin-bottom: 12px;
        }
        .edu-section-title-box {
          display: inline-block;
          border: 2px solid #0f172a;
          border-radius: 8px;
          padding: 6px 20px;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          background: #f8fafc;
          letter-spacing: 0.3px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .edu-grid {
          display: grid;
          grid-template-columns: 1.15fr 1fr;
          gap: 8px 24px;
        }
        .edu-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }
        .edu-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 12px;
          color: #1e293b;
          line-height: 1.5;
        }
        .edu-bullet {
          color: #1E64EA;
          font-size: 14px;
          line-height: 1.3;
          flex-shrink: 0;
          font-weight: 900;
        }
        .edu-banner {
          margin-top: 22px;
          padding: 10px 16px;
          text-align: center;
          font-size: 13.5px;
          font-weight: 800;
          color: #0f172a;
          border-top: 2px dashed #0f172a;
          border-bottom: 2px dashed #0f172a;
          background: #f0f9ff;
          letter-spacing: 0.5px;
          border-radius: 4px;
        }
        .page-break {
          display: none;
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
          .screen-page-divider { display: none !important; }
          .prescription-wrapper {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 8mm 8mm !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: #ffffff !important;
          }
          .page-break {
            display: block !important;
            page-break-before: always !important;
            break-before: page !important;
            height: 0 !important;
            margin: 0 !important;
            border: none !important;
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
          <button onclick="window.print()" style="background: linear-gradient(135deg, #1E64EA 0%, #2090F0 50%, #14C9FE 100%); color: #ffffff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px;">
            <span>🖨️</span> Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #0B1A2E; color: #ffffff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer;">
            Close Preview
          </button>
        </div>
      </div>

      <!-- PAGE 1: CLINICAL PRESCRIPTION -->
      <div class="prescription-wrapper">
        <div class="header">
          <div class="clinic-brand">
            <img src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png" alt="Sai Dental Logo" style="height: 48px; width: auto; object-fit: contain; border-radius: 8px;" />
          </div>
          <div class="clinic-contact">
            <p style="margin: 0; font-weight: 700; color: #0B1A2E;">${safeClinicName}</p>
            <p style="margin: 2px 0 0 0;">${safeAddress}</p>
            <p style="margin: 2px 0 0 0;">Phone: <strong>${safePhone}</strong> | Email: ${safeEmail}</p>
          </div>
        </div>

        <div class="doctor-bar">
          <div>
            <div class="doctor-name-wrapper">
              <h2 class="doctor-name">${doctorName}</h2>
              <span class="doctor-qual">BBD</span>
            </div>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-weight: 600;">${doctorSpec}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; font-size: 12px; font-weight: 700; color: #0B1A2E;">Date: <span style="font-weight: 700;">${rxDate}</span></p>
          </div>
        </div>

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
              <div class="patient-value">${patient.age !== undefined && patient.age !== null ? `${formatAge(patient.age, 'Yrs')}` : 'N/A'} ${patient.sex ? `/ ${patient.sex}` : ''}</div>
            </div>
            <div>
              <div class="patient-label">Phone Number</div>
              <div class="patient-value" style="font-family: monospace;">${[patient.primaryPhone || patient.phone, patient.secondaryPhone].filter(Boolean).join(' / ') || 'N/A'}</div>
            </div>
          </div>

          ${patient.vitals?.bp || patient.vitals?.rbs || patient.address ? `
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; gap: 20px; font-size: 11px; color: #334155;">
              ${patient.vitals?.bp ? `<div><strong>BP:</strong> ${patient.vitals.bp}</div>` : ''}
              ${patient.vitals?.rbs ? `<div><strong>RBS:</strong> ${patient.vitals.rbs}</div>` : ''}
              ${patient.address ? `<div style="flex: 1;"><strong>Address:</strong> ${capitalizeWords(patient.address)}</div>` : ''}
            </div>
          ` : ''}
        </div>

        ${diagnosisList ? `
          <div class="diagnosis-box">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #92400e; margin-bottom: 3px;">Clinical Diagnosis & Findings:</div>
            <div style="font-weight: 700; color: #0f172a;">${diagnosisList}</div>
          </div>
        ` : ''}

        <div style="margin-bottom: 6px;">
          <div class="rx-header">
            <span class="rx-symbol" title="Prescription (℞)">&#8478;</span>
            <span style="font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b;">Prescribed Medications</span>
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

        ${rx?.notes ? `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 14px; margin-top: 10px; margin-bottom: 14px; font-size: 11px;">
            <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 2px;">Prescription Notes / Remarks:</div>
            <div style="color: #0f172a; font-weight: 500;">${capitalizeWords(rx.notes)}</div>
          </div>
        ` : ''}

        <div class="footer-section">
          <div style="font-size: 10px; color: #64748b; line-height: 1.5;">
            <p style="margin: 0; font-weight: 700; color: #334155;">${safeClinicName}</p>
            <p style="margin: 0;">Emergency Helpline: <strong>${safePhone}</strong> | Next Follow-Up: As advised</p>
            <p style="margin: 2px 0 0 0; font-style: italic;">This is a valid computerized medical prescription issued by a registered dental practitioner.</p>
          </div>
        </div>
      </div>

      <!-- VISUAL SEPARATOR FOR SCREEN PREVIEW -->
      <div class="screen-page-divider">
        <span class="page-badge">Page 2 — Patient Dental Care Guide</span>
      </div>

      <!-- PAGE BREAK FOR PRINT -->
      <div class="page-break"></div>

      <!-- PAGE 2: PATIENT DENTAL EDUCATION & INSTRUCTIONS -->
      <div class="prescription-wrapper page-2">
        <!-- Clinic Branding Mini-Header -->
        <div class="header" style="margin-bottom: 16px; padding-bottom: 10px;">
          <div class="clinic-brand">
            <img src="https://res.cloudinary.com/rlokioxu/image/upload/v1787051057/Sai-dental_logo_xkwusa.png" alt="Sai Dental Logo" style="height: 42px; width: auto; object-fit: contain; border-radius: 8px;" />
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0B1A2E;">${safeClinicName}</h3>
              <p style="margin: 0; font-size: 11px; color: #64748b; font-weight: 600;">Dental Healthcare & Patient Education Guide</p>
            </div>
          </div>
          <div class="clinic-contact">
            <p style="margin: 0; font-weight: 700; color: #0B1A2E;">Helpline: <strong>${safePhone}</strong></p>
            <p style="margin: 2px 0 0 0;">${safeAddress}</p>
          </div>
        </div>

        <!-- SECTION 1: TREATMENTS / SERVICES LIST -->
        <div class="edu-section">
          <div class="edu-title-wrapper">
            <div class="edu-section-title-box">பல் மருத்துவ சிகிச்சை முறைகள் :</div>
          </div>
          <div class="edu-grid">
            <div class="edu-list">
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>குழந்தைகள் பல் பராமரிப்பு (Child Dental Care)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>பல் சொத்தை அடைத்தல் (Fillings)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>பல் அகற்றுதல் (Extraction)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>பற் கறை அகற்றுதல் (Teeth Whitening)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>செயற்கை பல் கட்டுதல் (Implants, Crown &amp; Bridges, Dentures)</div>
              </div>
            </div>
            <div class="edu-list">
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>பற்களை சீரமைத்தல் (Dental Braces)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>வேர் சிகிச்சை (Root Canal Treatment)</div>
              </div>
              <div class="edu-item">
                <span class="edu-bullet">▪</span>
                <div>பல் சுத்தம் செய்தல் (Scaling &amp; Polishing)</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION 2: SPECIAL DENTAL CARE ADVICES -->
        <div class="edu-section">
          <div class="edu-title-wrapper">
            <div class="edu-section-title-box">சிறப்பு பல் மருத்துவ ஆலோசனைகள் :</div>
          </div>
          <div class="edu-list">
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>பற்களில் நிறமாற்றமோ, துவாரமோ இருந்தால் பல் மருத்துவரை அணுகவும். வலி வந்தபிறகு அடைப்பது கடினம்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>வாயில் துர்நாற்றம், ஈறுகளில் இரத்தம் வடிதல் போன்றவற்றிற்கு உடனடியாக சிகிச்சை பெறவும்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>முன்பற்கள் வெளியே ஏந்திக்கொண்டு இருந்தால் கிளிப் போட்டு சரிசெய்து கொள்ளவும்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>குழந்தைகளுக்கு பால் பற்களில் சொத்தை இருந்தால் நிரந்தர பற்களில் சொத்தை வரும் வாய்ப்புகள் அதிகம் என்பதால் பல் மருத்துவர் ஆலோசனை பெறவும்.</div>
            </div>
          </div>
        </div>

        <!-- SECTION 3: POST-EXTRACTION PRECAUTIONS (2 DAYS) -->
        <div class="edu-section">
          <div class="edu-title-wrapper">
            <div class="edu-section-title-box" style="line-height: 1.4; text-align: center;">
              பல் எடுத்தபின் இரண்டு நாட்களுக்கு<br/>கவனிக்க வேண்டிய விதிமுறைகள் :
            </div>
          </div>
          <div class="edu-list">
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>பல் எடுத்த இடத்தில் வைக்கப்பட்டுள்ள பஞ்சை ஒரு மணி நேரம் வரை கடித்திருக்க வேண்டும்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>பல் எடுத்த அன்று எச்சில் துப்புதல், வாய் கொப்பளித்தல், பற்களை பிரஷ் கொண்டு துலக்குதல் கூடாது.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>பல் எடுத்த இடத்தில் கட்டாயமாக நாக்கையோ விரலையோ விட்டு துளாவக்கூடாது.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>வலி நிவாரண மாத்திரையினை பல் மருத்துவர் அறிவுரைப்படி சாப்பிட வேண்டும்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>சில நேரங்களில் பல் எடுத்த இடத்தில் வீக்கம் இருந்தால் ஐஸ் ஒத்தடம் கொடுப்பதனால் நிவாரணம் பெறலாம்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>சூடான, காரமான உணவு வகைகளை இரண்டு நாட்களுக்கு தவிர்க்கவும்.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>புகை பிடித்தல் மற்றும் மது அருந்துதல் கூடாது.</div>
            </div>
            <div class="edu-item">
              <span class="edu-bullet">▪</span>
              <div>பல் எடுக்கப்பட்ட பகுதியில் 4 வாரத்திற்குள் செயற்கை பல் வைக்க வேண்டும்.</div>
            </div>
          </div>
        </div>

        <!-- BOTTOM CALLOUT BANNER -->
        <div class="edu-banner">
          ✶ 6 மாதத்திற்கு ஒருமுறை பல் மருத்துவ ஆலோசனை பெறவும் ✶
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function openPrescriptionPDFWindow(params = {}, autoPrint = false) {
  let { rx = {}, consultation = {}, clinicSettings = {}, doctor = null, diagnoses = [] } = params || {};

  // Fetch clinic settings dynamically if not passed
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
  let docObj = doctor || rx?.recordedBy || consultation?.doctor || {};
  const docId = typeof docObj === 'string' ? docObj : (docObj?._id || docObj?.id);

  // Fetch doctor profile if qualification/specialization missing
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

  const htmlContent = generatePrescriptionHTML({
    rx,
    consultation,
    clinicSettings,
    doctor: docObj,
    diagnoses,
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
    alert('Please allow popups to open the PDF Prescription preview.');
  }
}
