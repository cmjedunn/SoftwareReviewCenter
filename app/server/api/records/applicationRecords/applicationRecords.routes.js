import { Router } from 'express';
import { getApplicationRecord,getApplicationRecords, createApplicationRecord, createControlInstances, updateControlInstances} from './applicationRecords.controller.js';

const router = Router();

router.route('/')
    .get(getApplicationRecords)
    .post(createApplicationRecord);
router.route('/:id')
    .get(getApplicationRecord);
router.route('/:id/controls')
    .patch(updateControlInstances);
router.route('/controls')
    .post(createControlInstances);
export default router;
