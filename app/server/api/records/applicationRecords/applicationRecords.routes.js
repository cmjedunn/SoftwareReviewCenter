import { Router } from 'express';
import { 
    getApplicationRecord,
    getApplicationRecords, 
    createApplicationRecord, 
    createControlInstances, 
    updateControlInstances, 
    deleteApplicationRecord,
    getJobStatus,       
    getQueueStatus,
    getActiveJobs      // NEW
} from './applicationRecords.controller.js';

const router = Router();

// Existing routes
router.route('/')
    .get(getApplicationRecords)
    .post(createApplicationRecord);  // Now returns jobId instead of processing directly

router.route('/:id')
    .get(getApplicationRecord)
    .delete(deleteApplicationRecord); // Now returns jobId instead of processing directly

router.route('/:id/controls')
    .patch(updateControlInstances);

router.route('/controls')
    .post(createControlInstances);

// NEW: Job status routes
router.route('/jobs/:jobId')
    .get(getJobStatus);              // GET /api/applications/jobs/12345-abc

router.route('/queue/status')
    .get(getQueueStatus);            // GET /api/applications/queue/status

router.route('/active-jobs')
    .get(getActiveJobs);

export default router;