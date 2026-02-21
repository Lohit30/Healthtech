"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const patients_1 = __importDefault(require("./routes/patients"));
const appointments_1 = __importDefault(require("./routes/appointments"));
const consultations_1 = __importDefault(require("./routes/consultations"));
const doctors_1 = __importDefault(require("./routes/doctors"));
const auth_1 = __importDefault(require("./routes/auth"));
const admin_1 = __importDefault(require("./routes/admin"));
const availability_1 = __importDefault(require("./routes/availability"));
const vitals_1 = __importDefault(require("./routes/vitals"));
const medicines_1 = __importDefault(require("./routes/medicines"));
const prescriptions_1 = __importDefault(require("./routes/prescriptions"));
const reports_1 = __importDefault(require("./routes/reports"));
// Initialize DB (runs schema creation & seeding)
require("./db");
const app = (0, express_1.default)();
const PORT = 3001;
app.use((0, cors_1.default)({ origin: 'http://localhost:5173' }));
app.use(express_1.default.json());
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', message: 'Rural Health API running' });
});
app.use('/api/patients', patients_1.default);
app.use('/api/appointments', appointments_1.default);
app.use('/api/consultations', consultations_1.default);
app.use('/api/doctors', doctors_1.default);
app.use('/api/auth', auth_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/availability', availability_1.default);
app.use('/api/vitals', vitals_1.default);
app.use('/api/medicines', medicines_1.default);
app.use('/api/prescriptions', prescriptions_1.default);
app.use('/api/reports', reports_1.default);
app.listen(PORT, () => {
    console.log(`✅ Backend running at http://localhost:${PORT}`);
});
