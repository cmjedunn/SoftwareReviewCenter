import { Router } from 'express';
import { getApplicationRecords, createApplicationRecord, createControlInstances} from './applicationRecords.controller.js';

const router = Router();

router.route('/')
    .post(createApplicationRecord);
router.route('/:id')
    .get(getApplicationRecords);
router.route('/controls')
    .post(createControlInstances);
export default router;
