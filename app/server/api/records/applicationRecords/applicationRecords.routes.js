import { Router } from 'express';
import { getApplicationRecords, createApplicationRecord, createControlInstances, updateControlInstances} from './applicationRecords.controller.js';

const router = Router();

router.route('/')
    .post(createApplicationRecord);
router.route('/:id')
    .get(getApplicationRecords);
router.route('/:id/controls')
    .patch(updateControlInstances);
router.route('/controls')
    .post(createControlInstances);
export default router;
