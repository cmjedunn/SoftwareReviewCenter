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
    getActiveJobs      
} from './applicationRecords.controller.js';

const router = Router();

// IMPORTANT: More specific routes MUST come before generic routes
// Put specific routes like /active-jobs BEFORE parameterized routes like /:id

// Job status routes (these must come first!)
router.route('/active-jobs')
    .get(getActiveJobs);                 // GET /api/applications/active-jobs

router.route('/jobs/:jobId')
    .get(getJobStatus);                  // GET /api/applications/jobs/12345-abc

router.route('/queue/status')
    .get(getQueueStatus);                // GET /api/applications/queue/status

// Control routes
router.route('/controls')
    .post(createControlInstances);

// Main application routes
router.route('/')
    .get(getApplicationRecords)
    .post(createApplicationRecord);      

// Parameterized routes (these must come last!)
router.route('/:id')
    .get(getApplicationRecord)
    .delete(deleteApplicationRecord);    

router.route('/:id/controls')
    .patch(updateControlInstances);

export default router;