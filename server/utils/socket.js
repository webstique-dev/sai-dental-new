const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;

function initSocket(httpServer) {
  const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim());

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes('*') ||
          allowedOrigins.includes(origin) ||
          origin.endsWith('.vercel.app') ||
          process.env.NODE_ENV !== 'production'
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
  });

  // JWT Authentication middleware for Socket connections
  io.use(async (socket, next) => {
    try {
      const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
      let token = null;

      if (authHeader) {
        token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
      } else if (socket.handshake.query?.token) {
        token = socket.handshake.query.token;
      }

      if (!token) {
        // Allow unauthenticated connection with guest socket, but marked unauth
        socket.user = null;
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('_id name role status');

      if (user && user.status === 'active') {
        socket.user = {
          id: user._id.toString(),
          name: user.name,
          role: user.role,
        };
      } else {
        socket.user = null;
      }
      next();
    } catch (err) {
      // Don't fail socket connection outright to preserve resilience; mark user as null
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    if (socket.user) {
      const { id, role } = socket.user;
      // Join role room (role:admin, role:receptionist, role:doctor)
      if (role) socket.join(`role:${role}`);
      // Join user specific room
      if (id) socket.join(`user:${id}`);
      // If doctor, join doctor specific room
      if (role === 'doctor' && id) socket.join(`doctor:${id}`);
    }

    socket.on('disconnect', () => {
      // Clean Disconnection
    });
  });

  return io;
}

function getIO() {
  return io;
}

/**
 * Emit Appointment Update event to relevant role rooms & doctor room
 */
function emitAppointmentUpdate(appointmentData, doctorId = null) {
  if (!io) return;
  const payload = {
    type: 'APPOINTMENT_UPDATED',
    timestamp: new Date().toISOString(),
    appointment: appointmentData,
  };

  io.to('role:admin').to('role:receptionist').emit('APPOINTMENT_UPDATED', payload);

  const docIdStr = doctorId || appointmentData?.doctor?._id || appointmentData?.doctor;
  if (docIdStr) {
    io.to(`doctor:${docIdStr.toString()}`).emit('APPOINTMENT_UPDATED', payload);
  }
}

/**
 * Emit Queue / Check-In Update event
 */
function emitQueueUpdate(queueData, doctorId = null) {
  if (!io) return;
  const payload = {
    type: 'QUEUE_UPDATED',
    timestamp: new Date().toISOString(),
    queueEntry: queueData,
  };

  io.to('role:admin').to('role:receptionist').to('role:doctor').emit('QUEUE_UPDATED', payload);

  const docIdStr = doctorId || queueData?.doctor?._id || queueData?.doctor;
  if (docIdStr) {
    io.to(`doctor:${docIdStr.toString()}`).emit('QUEUE_UPDATED', payload);
  }
}

/**
 * Emit Patient Created or Updated event
 */
function emitPatientUpdate(patientData, isNew = false) {
  if (!io) return;
  const eventName = isNew ? 'PATIENT_CREATED' : 'PATIENT_UPDATED';
  const payload = {
    type: eventName,
    timestamp: new Date().toISOString(),
    patient: patientData,
  };

  io.to('role:admin').to('role:receptionist').to('role:doctor').emit(eventName, payload);
}

/**
 * Emit Consultation Start / Completed event
 */
function emitConsultationUpdate(consultationData, eventType = 'CONSULTATION_STARTED', doctorId = null) {
  if (!io) return;
  const payload = {
    type: eventType,
    timestamp: new Date().toISOString(),
    consultation: consultationData,
  };

  io.to('role:admin').to('role:receptionist').emit(eventType, payload);

  const docIdStr = doctorId || consultationData?.doctor?._id || consultationData?.doctor;
  if (docIdStr) {
    io.to(`doctor:${docIdStr.toString()}`).emit(eventType, payload);
  }
}

/**
 * Emit User Status (Enable/Disable/Role) Change event
 */
function emitUserStatusUpdate(userData) {
  if (!io) return;
  const payload = {
    type: 'USER_STATUS_UPDATED',
    timestamp: new Date().toISOString(),
    user: userData,
  };

  io.to('role:admin').emit('USER_STATUS_UPDATED', payload);
  if (userData?.id || userData?._id) {
    const uId = (userData.id || userData._id).toString();
    io.to(`user:${uId}`).emit('USER_STATUS_UPDATED', payload);
  }
}

module.exports = {
  initSocket,
  getIO,
  emitAppointmentUpdate,
  emitQueueUpdate,
  emitPatientUpdate,
  emitConsultationUpdate,
  emitUserStatusUpdate,
};
