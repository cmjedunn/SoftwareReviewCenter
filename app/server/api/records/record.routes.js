import { Router } from 'express';
import { deleteLinkedRecords } from './record.controller.js';

const router = Router();

router.post('/delete-linked', deleteLinkedRecords);

export default router;
