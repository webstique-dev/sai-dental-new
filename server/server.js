require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const connectDB = require('./config/db');

const path = require('path');

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
const clinicSettingsRoutes = require('./routes/clinicSettingsRoutes');
const documentRoutes = require('./routes/documentRoutes');
const auditLogRoutes = require('./routes/auditLogRoutes');
const backupRoutes = require('./routes/backupRoutes');
const doctorProfileRoutes = require('./routes/doctorProfileRoutes');
const treatmentRecordRoutes = require('./routes/treatmentRecordRoutes');
const treatmentRoutes = require('./routes/treatmentRoutes');
const medicineRoutes = require('./routes/medicineRoutes');
const { seedInitialMedicines } = require('./utils/seedMedicines');

const app = express();

// --- Core middleware ---
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.includes('*') ||
      allowedOrigins.includes(origin) ||
      origin.endsWith('.vercel.app') ||
      origin.endsWith('.hostingersite.com') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      process.env.NODE_ENV !== 'production'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Extra CORS safety fallback headers
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  }
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Serve uploaded documents statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Root endpoint ---
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'Dental Clinic Management API',
    timestamp: new Date().toISOString(),
  });
});

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
app.use('/api/settings', clinicSettingsRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/doctor-profiles', doctorProfileRoutes);
app.use('/api/treatments', treatmentRoutes);
app.use('/api/treatment-records', treatmentRecordRoutes);
app.use('/api/medicines', medicineRoutes);

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

const http = require('http');
const { initSocket } = require('./utils/socket');
const { autoCheckInScheduledAppointments, checkAndMarkMissedAppointments } = require('./utils/statusSync');

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';
const server = http.createServer(app);

// Initialize Socket.IO
initSocket(server);

// Start server immediately so cloud platforms/Hostinger health checks pass without delay
server.listen(PORT, HOST, () => {
  console.log(`Dental Clinic API & Socket.IO running on http://${HOST}:${PORT}`);

  // Connect to MongoDB asynchronously
  connectDB()
    .then(() => {
      seedInitialMedicines().catch((err) => console.error('Error seeding medicines:', err));
      autoCheckInScheduledAppointments();
      checkAndMarkMissedAppointments();

      setInterval(() => {
        autoCheckInScheduledAppointments();
        checkAndMarkMissedAppointments();
      }, 15 * 1000);
    })
    .catch((err) => {
      console.error('MongoDB initialization error:', err);
    });
});
