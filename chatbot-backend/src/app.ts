import express from 'express';
import cors from 'cors';
import path from 'path';

import userRoutes from './modules/user/user.routes';
import chatRouter from './modules/chat/chat.route';
import knowledgeRoutes from './modules/knowledge/knowledge.route';

import {
  syncFaqDatabase,
  getSearchAnalytics,
  getSites,
  getAuditLogs
} from './modules/faq/faq.controller';

import { adminLogin } from './modules/auth/auth.controller';
import { verifyToken } from './middlewares/auth.middleware';

const app = express();


// ======================
// 1. MIDDLEWARE (PHẢI ĐẶT TRƯỚC ROUTES)
// ======================

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/uploads', express.static('uploads'));
app.use('/static', express.static(path.join(__dirname, '../public/static')));


// ======================
// 2. ROUTES
// ======================

app.use('/api/v1/knowledge', knowledgeRoutes);
app.use('/api/v1/chat', chatRouter);
app.use('/api/v1/staff-users', userRoutes);

app.post('/api/v1/auth/admin/login', adminLogin);

app.post('/api/v1/admin/faq/sync', syncFaqDatabase);
app.get('/api/v1/admin/analytics', getSearchAnalytics);
app.get('/api/v1/admin/sites', verifyToken, getSites);
app.get('/api/v1/admin/audit-logs', getAuditLogs);

export default app;