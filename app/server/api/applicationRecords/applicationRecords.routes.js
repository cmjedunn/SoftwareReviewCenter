import { Router } from 'express';
import { createApplicationRecord } from './applicationRecords.controller.js';

const router = Router();

router.route('/')
    .post(createApplicationRecord);

export default router;
