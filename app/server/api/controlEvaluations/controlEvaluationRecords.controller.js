import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflowsData } from '../workflows/workflows.controller.js';
import { getLinkedRecordsData, getRecordsData } from '../records/records.controller.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;

/**
 * HELPER FUNCTIONS
 */

/**
 * Get control evaluation records with optional linked application audits
 * @param {string} id - Optional control evaluation record ID to fetch specific evaluation
 * @returns {Promise<Object>} Control evaluation record(s) with linked application audits if ID provided
 */
export async function getControlEvaluationRecordsData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows to find Control Evaluations workflow
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the main Control Evaluations workflow
    const controlEvaluationsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Control Evaluations")?.id
    );

    if (!controlEvaluationsWorkflow) {
        throw new Error('Control Evaluations workflow not found');
    }

    // Get control evaluation records
    if (!id) {
        // Return all control evaluation records
        return await getRecordsData({ 'workflow-id': controlEvaluationsWorkflow.workflow.id, size: 5000 });
    } else {
        // Get specific control evaluation record
        const record = await getRecordsData({ id: id });

        // Fetch linked Application Audits records
        const applicationAuditsWorkflowSummary = applicationWorkflows.find(item => item.name === "Application Audits");
        if (applicationAuditsWorkflowSummary) {
            // Get the full workflow details
            const applicationAuditsWorkflow = await getWorkflowData(applicationAuditsWorkflowSummary.id);
            const linkedRecords = await getLinkedRecordsData(id, [applicationAuditsWorkflow.workflow.id], APPLICATIONS_ID);
            // Merge linked records into the control evaluation record
            record.linkedRecords = linkedRecords.linkedRecords;
        }

        return record;
    }
}

/**
 * Get control evaluations for a specific application audit
 * @param {string} applicationAuditId - Application Audit record ID
 * @returns {Promise<Object>} Control evaluation records linked to the application audit
 */
export async function getControlEvaluationsForApplicationAuditData(applicationAuditId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the Control Evaluations workflow
    const controlEvaluationsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Control Evaluations")?.id
    );

    if (!controlEvaluationsWorkflow) {
        throw new Error('Control Evaluations workflow not found');
    }

    // Get linked Control Evaluations for this application audit
    const linkedRecords = await getLinkedRecordsData(
        applicationAuditId,
        [controlEvaluationsWorkflow.workflow.id],
        APPLICATIONS_ID
    );

    return linkedRecords;
}

/**
 * Get control evaluations for a specific control instance
 * @param {string} controlInstanceId - Control Instance record ID
 * @returns {Promise<Object>} Control evaluation records linked to the control instance
 */
export async function getControlEvaluationsForControlInstanceData(controlInstanceId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the Control Evaluations workflow
    const controlEvaluationsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Control Evaluations")?.id
    );

    if (!controlEvaluationsWorkflow) {
        throw new Error('Control Evaluations workflow not found');
    }

    // Get linked Control Evaluations for this control instance
    const linkedRecords = await getLinkedRecordsData(
        controlInstanceId,
        [controlEvaluationsWorkflow.workflow.id],
        APPLICATIONS_ID
    );

    return linkedRecords;
}

/**
 * Bulk create control evaluation records for an application audit.
 *
 * How it works:
 * The LogicGate bulk-create-and-link endpoint creates child records (Control Evaluations)
 * for each source record (Control Instances linked to the application), all parented under
 * the Application Audit. The workflow link that defines this relationship lives on the
 * Application Audits CHAIN step — not on the Control Evaluations workflow itself.
 *
 * Payload: { bulkCreateSourceId, parentRecordId, sourceRecordIds }
 *   - bulkCreateSourceId: discovered from the Application Audits CHAIN step's workflow link
 *   - parentRecordId:     the Application Audit record
 *   - sourceRecordIds:    all Control Instance IDs linked to the application
 *
 * @param {string} applicationAuditId - Application Audit record ID (parent)
 * @param {string} applicationId - Application record ID (used to find linked Control Instances)
 * @returns {Promise<Object>} Result of bulk creation operation
 */
export async function bulkCreateControlEvaluationsData(applicationAuditId, applicationId, progressCallback = () => {}) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔍 Bulk creating control evaluations for application audit: ${applicationAuditId}, application: ${applicationId}`);

    const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
    const REQUEST_TIMEOUT_MS = 30 * 1000;  // 30 seconds

    // Hardcoded bulk create source ID — observed from LogicGate UI network traffic.
    // Maps: Control Instances (source) → Control Evaluations (child) under an Application Audit (parent).
    const BULK_CREATE_SOURCE_ID = 'yirBgxEh';

    // Get all workflows in the application
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Extract workflow IDs directly — no need to fetch full workflow objects
    const controlEvaluationsWorkflowId = applicationWorkflows.find(w => w.name === "Control Evaluations")?.id;
    if (!controlEvaluationsWorkflowId) throw new Error('Control Evaluations workflow not found');

    const controlInstancesWorkflowId = applicationWorkflows.find(w => w.name === "Control Instances")?.id;
    if (!controlInstancesWorkflowId) throw new Error('Control Instances workflow not found');

    // Get all control instances linked to this application record
    const applicationRecord = await getLinkedRecordsData(applicationId, [controlInstancesWorkflowId]);
    const linkedControls = applicationRecord.linkedRecords.workflow[controlInstancesWorkflowId];

    if (!linkedControls || linkedControls.length === 0) {
        console.warn('⚠️  No control instances found for application');
        return { created: 0, applicationAuditId, message: 'No control instances found for application' };
    }

    const sourceRecordIds = linkedControls.map(r => r.record.id);
    console.log(`📋 Found ${sourceRecordIds.length} control instances`);

    const bulkCreateUrl = `${BASE_URL}/api/v1/bulk-create-and-link`;
    const bulkCreateBody = {
        bulkCreateSourceId: BULK_CREATE_SOURCE_ID,
        parentRecordId: applicationAuditId,
        sourceRecordIds: sourceRecordIds
    };

    console.log(`🚀 POST ${bulkCreateUrl}`);
    console.log(`📤 Request body:`, JSON.stringify(bulkCreateBody, null, 2));
    progressCallback(10, `Sending bulk create request for ${sourceRecordIds.length} Control Evaluations...`);

    let retryCount = 5;
    while (true) {
        if (retryCount > 0) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

                const bulkCreateResponse = await fetch(bulkCreateUrl, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(bulkCreateBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!bulkCreateResponse.ok) {
                    console.warn(`⚠️ Bulk create request failed: ${bulkCreateResponse.status}, retrying in ${REQUEST_TIMEOUT_MS / 1000}s... (${retryCount} left)`);
                    await new Promise(resolve => setTimeout(resolve, REQUEST_TIMEOUT_MS));
                    retryCount--;
                } else {
                    break;
                }
            } catch (error) {
                if (error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                    console.log(`⏱️ Request timed out, retrying in 5 minutes...`);
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                    continue;
                } else {
                    throw error;
                }
            }
        } else {
            throw new Error('Failed to bulk create and link Control Evaluations after 5 retries');
        }
    }

    console.log(`✅ Bulk create request accepted — polling for ${sourceRecordIds.length} Control Evaluations to appear...`);
    progressCallback(40, 'Request accepted, waiting for Control Evaluations to appear...');

    // Poll until all Control Evaluations are linked to the application audit record
    let remaining = sourceRecordIds.length;
    while (remaining > 0) {
        try {
            const auditRecord = await getLinkedRecordsData(applicationAuditId, [controlEvaluationsWorkflowId]);
            const linkedEvals = auditRecord.linkedRecords.workflow[controlEvaluationsWorkflowId];
            remaining = sourceRecordIds.length - linkedEvals.length;

            if (remaining > 0) {
                console.log(`📊 Records remaining: ${remaining}, checking again in 10 seconds...`);
                progressCallback(60, `${remaining} of ${sourceRecordIds.length} Control Evaluations remaining...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                console.log(`✅ All ${sourceRecordIds.length} Control Evaluations confirmed!`);
                progressCallback(90, `All ${sourceRecordIds.length} Control Evaluations confirmed!`);
            }
        } catch (error) {
            console.error(`❌ Error polling Control Evaluation status:`, error.message);
            throw error;
        }
    }

    return {
        created: sourceRecordIds.length,
        applicationAuditId,
        message: `Successfully created ${sourceRecordIds.length} control evaluations`
    };
}

/**
 * ENDPOINT FUNCTIONS
 */

/**
 * GET /api/control-evaluations
 * Get all control evaluation records
 */
export async function getControlEvaluationRecords(req, res) {
    logRequest(req);

    try {
        const result = await getControlEvaluationRecordsData();
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting control evaluation records:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * GET /api/control-evaluations/:id
 * Get a specific control evaluation record with linked application audits
 */
export async function getControlEvaluationRecord(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await getControlEvaluationRecordsData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting control evaluation record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * GET /api/control-evaluations/application-audit/:applicationAuditId
 * Get control evaluations for a specific application audit
 */
export async function getControlEvaluationsForApplicationAudit(req, res) {
    logRequest(req);

    const applicationAuditId = req.params.applicationAuditId || null;

    if (!applicationAuditId) {
        return res.status(400).json(createErrorResponse(req, 'Application Audit ID is required', 400));
    }

    try {
        const result = await getControlEvaluationsForApplicationAuditData(applicationAuditId);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting control evaluations for application audit:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * GET /api/control-evaluations/control-instance/:controlInstanceId
 * Get control evaluations for a specific control instance
 */
export async function getControlEvaluationsForControlInstance(req, res) {
    logRequest(req);

    const controlInstanceId = req.params.controlInstanceId || null;

    if (!controlInstanceId) {
        return res.status(400).json(createErrorResponse(req, 'Control Instance ID is required', 400));
    }

    try {
        const result = await getControlEvaluationsForControlInstanceData(controlInstanceId);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting control evaluations for control instance:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * POST /api/control-evaluations/bulk-create
 * Bulk create control evaluations for an application audit
 */
export async function bulkCreateControlEvaluations(req, res) {
    logRequest(req);

    const { applicationAuditId, applicationId } = req.body;

    if (!applicationAuditId || !applicationId) {
        return res.status(400).json(createErrorResponse(req, 'Missing required fields: applicationAuditId, applicationId', 400));
    }

    try {
        const result = await bulkCreateControlEvaluationsData(applicationAuditId, applicationId);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error bulk creating control evaluations:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}
