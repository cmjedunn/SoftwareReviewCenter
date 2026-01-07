import { Router } from 'express';
import {
    getAuditRecords,
    getAuditRecord,
    getApplicationAuditsForApplication
} from './auditRecords.controler.js';

const router = Router();

// IMPORTANT: More specific routes MUST come before generic routes
// Put specific routes like /application/:applicationId BEFORE parameterized routes like /:id

// Application audits route (must come first!)
router.route('/application/:applicationId')
    .get(getApplicationAuditsForApplication);  // GET /api/audits/application/:applicationId

// Main audit routes
router.route('/')
    .get(getAuditRecords);                     // GET /api/audits

// Parameterized routes (must come last!)
router.route('/:id')
    .get(getAuditRecord);                      // GET /api/audits/:id

export default router;
