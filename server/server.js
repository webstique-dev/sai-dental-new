require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const queueRoutes = require('./routes/queueRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const followUpRoutes = require('./routes/followUpRoutes');
const reportRoutes = require('./routes/reportRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const examinationRoutes = require('./routes/examinationRoutes');
const toothChartRoutes = require('./routes/toothChartRoutes');
const diagnosisRoutes = require('./routes/diagnosisRoutes');
const treatmentPlanRoutes = require('./routes/treatmentPlanRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const investigationRoutes = require('./routes/investigationRoutes');

const app = express();

// --- Core middleware ---
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --- Health check ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/follow-ups', followUpRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/examinations', examinationRoutes);
app.use('/api/tooth-chart', toothChartRoutes);
app.use('/api/diagnoses', diagnosisRoutes);
app.use('/api/treatment-plans', treatmentPlanRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/investigations', investigationRoutes);

// Phase 2+ routes (patients, appointments, consultations, tooth chart,
// billing, follow-ups, reports) get mounted here in the same pattern:
//   app.use('/api/patients', patientRoutes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// --- Central error handler ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error.',
  });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Dental Clinic API running on port ${PORT}`);
  });
});
