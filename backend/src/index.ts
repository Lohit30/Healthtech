import express from 'express';
import cors from 'cors';
import patientsRouter from './routes/patients';
import appointmentsRouter from './routes/appointments';
import consultationsRouter from './routes/consultations';
import doctorsRouter from './routes/doctors';
import authRouter from './routes/auth';
import adminRouter from './routes/admin';
import availabilityRouter from './routes/availability';
import vitalsRouter from './routes/vitals';
import medicinesRouter from './routes/medicines';
import prescriptionsRouter from './routes/prescriptions';

// Initialize DB (runs schema creation & seeding)
import './db';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Rural Health API running' });
});

app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/consultations', consultationsRouter);
app.use('/api/doctors', doctorsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/vitals', vitalsRouter);
app.use('/api/medicines', medicinesRouter);
app.use('/api/prescriptions', prescriptionsRouter);

app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
