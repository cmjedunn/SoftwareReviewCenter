import { Router } from 'express';
import { getApplicationRecords, createApplicationRecord} from './applicationRecords.controller.js';

const router = Router();

router.route('/')
    .post(createApplicationRecord);
router.route('/:id')
    .get(getApplicationRecords);
export default router;
