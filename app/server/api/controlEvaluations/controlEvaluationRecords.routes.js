import { Router } from 'express';
import {
    getControlEvaluationRecords,
    getControlEvaluationRecord,
    getControlEvaluationsForApplicationAudit,
    getControlEvaluationsForControlInstance,
    bulkCreateControlEvaluations
} from './controlEvaluationRecords.controller.js';

const router = Router();

// IMPORTANT: More specific routes MUST come before generic routes
// Put specific routes like /application-audit/:applicationAuditId BEFORE parameterized routes like /:id

// Bulk create route (must come first!)
router.route('/bulk-create')
    .post(bulkCreateControlEvaluations);       // POST /api/control-evaluations/bulk-create

// Application audit route
router.route('/application-audit/:applicationAuditId')
    .get(getControlEvaluationsForApplicationAudit);  // GET /api/control-evaluations/application-audit/:applicationAuditId

// Control instance route
router.route('/control-instance/:controlInstanceId')
    .get(getControlEvaluationsForControlInstance);   // GET /api/control-evaluations/control-instance/:controlInstanceId

// Main control evaluation routes
router.route('/')
    .get(getControlEvaluationRecords);         // GET /api/control-evaluations

// Parameterized routes (must come last!)
router.route('/:id')
    .get(getControlEvaluationRecord);          // GET /api/control-evaluations/:id

export default router;
