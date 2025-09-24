import { Router } from 'express';
import { getWorkflows } from './workflows.controller.js';

const router = Router();

router.route('/')
    .get(getWorkflows);

export default router;
