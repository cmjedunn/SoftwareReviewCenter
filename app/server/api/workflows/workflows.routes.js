import { Router } from 'express';
import { getWorkflows, getWorkflowMaps } from './workflows.controller.js';

const router = Router();

router.route('/')
    .get(getWorkflows);
router.route('/maps')
    .get(getWorkflowMaps);

export default router;
