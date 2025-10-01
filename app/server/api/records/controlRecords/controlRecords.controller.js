import { getToken } from '../../utils/getToken.js';
import { logRequest } from '../../utils/logRequest.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflows } from '../../workflows/workflows.controller.js';
import { getRecordV1 } from '../../utils/getRecordV1.js';
import { getRecordsData, updateRecordData, getLinkedRecordsData, submitRecordData } from '../records.controller.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;
const SCF_ID = process.env.SCF_ID;

/**
 * HELPER FUNCTIONS
 */

async function findFirstControlRecord(record) {
    // Get the linkedRecords.workflow object
    const workflows = record.linkedRecords?.workflow;

    if (!workflows) {
        return null;
    }

    let firstMatch = null;
    let matchCount = 0;
    const matchingRecords = [];

    // Iterate through all workflow arrays
    for (const workflowId in workflows) {
        const records = workflows[workflowId];

        // Check each record in this workflow
        for (const recordWrapper of records) {
            const record = recordWrapper.record;

            if (!record) continue;

            const recordName = record.recordName || '';
            const workflowName = record.workflow?.name || '';

            // Check if both contain "control" (case-insensitive)
            const recordContainsControl = recordName.toLowerCase().includes('control');
            const workflowContainsControl = workflowName.toLowerCase().includes('control');

            if (recordContainsControl && workflowContainsControl) {
                matchCount++;
                matchingRecords.push({
                    recordName: record.recordName || record.name,
                    workflowName: record.workflow?.name,
                    recordId: record.id
                });

                if (firstMatch === null) {
                    firstMatch = record;
                }
            }
        }
    }

    // Log warning if multiple matches found
    if (matchCount > 1) {
        console.warn(`Warning: Found ${matchCount} matching records. Using the first one. Matches: ${matchingRecords.map(m => `"${m.recordName}" in workflow "${m.workflowName}"`).join(', ')}`);
    }

    return firstMatch;
}


export async function updateControlRecordData(id, controlFrameworkWorkflowIds, applicationRecordId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get record
    let record = await getLinkedRecordsData(id, controlFrameworkWorkflowIds);

    const parentRecord = await findFirstControlRecord(record);
    const applicationRecord = await getRecordsData({ id: applicationRecordId });

    const controlNameFieldId = record.record.fields.find(field => field.label === "Control Name").id
    const applicationNameFieldId = record.record.fields.find(field => field.label === "Application Name").id
    const instanceOwnerFieldId = record.record.fields.find(field => field.label === "Instance Owner").id

    // Pass just the array, not wrapped in an object
    const fields = [
        { "fieldId": controlNameFieldId, "values": [`${parentRecord.name}`] },
        { "fieldId": applicationNameFieldId, "values": [`${applicationRecord.name}`] },
        { "fieldId": instanceOwnerFieldId, "values": [`${record.record.assignee.email}`] }
    ];

    console.log(`☑️ Updating control instance: ${id}`);

    // Update control instance
    const res = await updateRecordData(id, fields);

    return res;
}


export async function submitControlRecordData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    const res = await submitRecordData(id, "END");
    return res;
}



/**
 * ENDPOINT FUNCTIONS
 */

export async function updateControlRecord(req, res) {
    logRequest(req);

    const { id, controlFrameworkWorkflowId, applicationRecordId } = req.body

    try {
        const data = await updateControlRecordData(id, controlFrameworkWorkflowId, applicationRecordId);
        return res.json(data);
    } catch (error) {
        console.error('❌ Error updating control record:', error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function submitControlRecord(req, res) {
    logRequest(req);

    const { id, step } = req.body

    try {
        const data = await submitControlRecordData(id, step);
        return res.json(data);
    } catch (error) {
        console.error('❌ Error submitting control records', error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}



