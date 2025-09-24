import { Router } from 'express';
import { deleteLinkedRecords, deleteRecord, getLinkedRecords, getRecords, restoreRecord} from './records.controller.js';

const router = Router();

router.route('/')
    .get(getRecords)
    .delete(deleteRecord);
    //.post();

router.route('/restore')
    .post(restoreRecord);
    
router.route('/linked')
    .get(getLinkedRecords)
    .delete(deleteLinkedRecords);

export default router;
