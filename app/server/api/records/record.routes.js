import { Router } from 'express';
import { deleteLinkedRecords, getRectords } from './record.controller.js';

const router = Router();

router.route('/')
    .get(getRectords)
    .post(deleteLinkedRecords);

export default router;
