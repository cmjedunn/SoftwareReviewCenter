import { Router } from 'express';
import { getWorkflows } from './workflow.controller.js';

const router = Router();

router.route('/')
    .get(getWorkflows);

export default router;
