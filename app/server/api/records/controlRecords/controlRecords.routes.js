import { Router } from 'express';
import { updateControlRecord, submitControlRecord } from './controlRecords.controller.js';

const router = Router();

router.route('/')
    .patch(updateControlRecord)
    .put(submitControlRecord);

export default router;
