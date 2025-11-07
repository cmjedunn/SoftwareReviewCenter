import { Router } from 'express';
import { getEnvironmentRecords, getEnvironmentControlFrameworks } from './environmentRecords.controller.js';

const router = Router();

router.route('/')
    .get(getEnvironmentRecords);
router.route('/:id')
    .get(getEnvironmentRecords);
router.route('/:id/controlFrameworks')
    .get(getEnvironmentControlFrameworks);

export default router;
