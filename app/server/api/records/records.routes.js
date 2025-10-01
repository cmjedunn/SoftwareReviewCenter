import { Router } from 'express';
import { deleteLinkedRecords, deleteRecord, getLinkedRecords, getParentRecord, getRecords, restoreRecord, submitRecord, updateRecord } from './records.controller.js';

const router = Router();

router.route('/')
    .get(getRecords)
    .patch(updateRecord)
    .put(submitRecord)
    .delete(deleteRecord);
//.post();
router.route('/parent')
    .get(getParentRecord);

router.route('/restore')
    .post(restoreRecord);

router.route('/linked')
    .get(getLinkedRecords)
    .delete(deleteLinkedRecords);

export default router;
