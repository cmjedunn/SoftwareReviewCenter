import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflowsData } from '../workflows/workflows.controller.js';
import { getLinkedRecordsData, getRecordsData } from '../records/records.controller.js';
import { JobManager } from '../../services/jobManager.js';
import { bulkCreateControlEvaluationsData } from '../controlEvaluations/controlEvaluationRecords.controller.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;

/**
 * HELPER FUNCTIONS
 */

/**
 * Get audit records with optional linked application audits
 * @param {string} id - Optional audit record ID to fetch specific audit
 * @returns {Promise<Object>} Audit record(s) with linked application audits if ID provided
 */
export async function getAuditRecordsData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows to find Audits workflow
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the main Audits workflow
    const auditsWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Audits")?.id);

    if (!auditsWorkflow) {
        throw new Error('Audits workflow not found');
    }

    // Get audit records
    if (!id) {
        // Return all audit records
        return await getRecordsData({ 'workflow-id': auditsWorkflow.workflow.id, size: 5000 });
    } else {
        // Get specific audit record
        const record = await getRecordsData({ id: id });

        // Fetch linked Application Audits records
        const applicationAuditsWorkflowSummary = applicationWorkflows.find(item => item.name === "Application Audits");
        if (applicationAuditsWorkflowSummary) {
            // Get the full workflow details
            const applicationAuditsWorkflow = await getWorkflowData(applicationAuditsWorkflowSummary.id);
            const linkedRecords = await getLinkedRecordsData(id, [applicationAuditsWorkflow.workflow.id], APPLICATIONS_ID);
            // Merge linked records into the audit record
            record.linkedRecords = linkedRecords.linkedRecords;
        }

        return record;
    }
}

/**
 * Get application audits for a specific application
 * @param {string} applicationId - Application record ID
 * @returns {Promise<Object>} Application audit records linked to the application
 */
export async function getApplicationAuditsForApplicationData(applicationId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    if (!applicationWorkflows || !Array.isArray(applicationWorkflows)) {
        console.error('❌ applicationWorkflows is not an array:', applicationWorkflows);
        throw new Error('Failed to fetch application workflows');
    }

    console.log(`📋 Found ${applicationWorkflows.length} workflows`);

    // Find the Application Audits workflow
    const applicationAuditsWorkflowSummary = applicationWorkflows.find(item => item.name === "Application Audits");

    if (!applicationAuditsWorkflowSummary) {
        console.error('❌ Application Audits workflow not found in:', applicationWorkflows.map(w => w.name));
        throw new Error('Application Audits workflow not found');
    }

    const applicationAuditsWorkflow = await getWorkflowData(applicationAuditsWorkflowSummary.id);

    if (!applicationAuditsWorkflow) {
        throw new Error('Application Audits workflow not found');
    }

    // Get linked Application Audits for this application
    const linkedRecords = await getLinkedRecordsData(
        applicationId,
        [applicationAuditsWorkflow.workflow.id],
        APPLICATIONS_ID
    );

    return linkedRecords;
}

/**
 * Create a new audit record
 * @param {string} name - Audit name
 * @param {string} year - Audit year
 * @param {string} scope - Audit scope
 * @param {string} userEmail - Email of the user creating the audit (for assignee and lead auditor)
 * @returns {Promise<Object>} Created audit record
 */
export async function createAuditRecordData(name, year, scope, userEmail) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔍 Creating audit record: ${name}`);

    // Get application workflows
    let applicationWorkflows;
    try {
        applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });
    } catch (workflowError) {
        console.error('❌ Error fetching workflows:', workflowError);
        throw new Error(`Failed to fetch workflows: ${workflowError.message}`);
    }

    if (!applicationWorkflows || !Array.isArray(applicationWorkflows)) {
        console.error('❌ applicationWorkflows is not an array:', applicationWorkflows);
        throw new Error('Failed to fetch application workflows');
    }

    console.log(`📋 Found ${applicationWorkflows.length} workflows`);

    // Find the Audits workflow
    const auditsWorkflowSummary = applicationWorkflows.find(item => item.name === "Audits");

    if (!auditsWorkflowSummary) {
        console.error('❌ Audits workflow not found in:', applicationWorkflows.map(w => w.name));
        throw new Error('Audits workflow not found');
    }

    const auditsWorkflow = await getWorkflowData(auditsWorkflowSummary.id);

    if (!auditsWorkflow) {
        throw new Error('Audits workflow not found');
    }

    console.log(`🔧 Audits workflow structure:`, JSON.stringify({
        hasWorkflow: !!auditsWorkflow.workflow,
        hasSteps: !!auditsWorkflow.steps,
        stepsIsArray: Array.isArray(auditsWorkflow.steps),
        stepsLength: auditsWorkflow.steps?.length
    }));

    if (!auditsWorkflow.steps || !Array.isArray(auditsWorkflow.steps)) {
        throw new Error('Audits workflow steps not found or invalid');
    }

    // Find the ORIGIN step
    const originStep = auditsWorkflow.steps.find(step => step.type === "ORIGIN");
    if (!originStep) {
        console.error('❌ Available step types:', auditsWorkflow.steps.map(s => s.type));
        throw new Error('Origin step not found in Audits workflow');
    }

    console.log(`✅ Found origin step with ID: ${originStep.id}`);

    // Hardcoded field IDs for Audits workflow
    // Discovered by fetching existing audit records from LogicGate
    const auditNameFieldId = 'LJyTWQxH';     // Audit Name (TEXT field)
    const auditYearFieldId = 'w4N2xOpR';     // Audit Year (SELECT field)
    const auditScopeFieldId = 'G8lvxvj5';    // Audit Scope (TEXT_AREA field)
    const controlsFieldId = 'gec5Lgwq';      // Do any controls need to be evaluated at the application level? (RADIO field)
    const startDateFieldId = 'N63gUboL';     // Audit Start Date (DATE field)
    const completionDateFieldId = 'wCLQgY2a'; // Expected Completion Date (DATE field)
    const leadAuditorFieldId = 'gRntkAED';   // Lead Auditor (USER field)

    // Calculate dates
    const currentDate = new Date();
    // LogicGate's /api/v1/records/steps endpoint expects SECONDS for DATE fields, not milliseconds
    // But when retrieved via GET, the API returns milliseconds (stored value * 1000 for display)
    const startDateTimestamp = Math.floor(currentDate.getTime() / 1000); // Convert to seconds for DATE fields
    // Set due date to 7 days from now (changed from 30 days)
    const dueDate = new Date(currentDate);
    dueDate.setDate(dueDate.getDate() + 7);
    const dueDateTimestampSeconds = Math.floor(dueDate.getTime() / 1000); // Seconds for DATE field
    const dueDateTimestampMillis = dueDate.getTime(); // Milliseconds for record-level dueDate

    // Create the audit record using /api/v1/records/steps endpoint
    const requestBody = {
        stepId: originStep.id,
        dueDate: dueDateTimestampMillis,  // Record-level due date (MILLISECONDS) - 7 days from now
        assigneeEmailAddress: userEmail,  // Assign to the user creating the audit
        fields: [
            {
                fieldId: auditNameFieldId,
                values: [name]
            },
            {
                fieldId: auditYearFieldId,
                values: [year]
            },
            {
                fieldId: auditScopeFieldId,
                values: [scope]
            },
            {
                fieldId: controlsFieldId,
                values: ["Yes"]  // Default to "Yes" for application-level control evaluation
            },
            {
                fieldId: startDateFieldId,
                values: [startDateTimestamp]  // DATE field expects SECONDS timestamp (API converts to ms internally)
            },
            {
                fieldId: completionDateFieldId,
                values: [dueDateTimestampMillis]  // Expected Completion Date - trying MILLISECONDS
            },
            {
                fieldId: leadAuditorFieldId,
                values: [userEmail]  // Set lead auditor to the user creating the audit
            }
        ]
    };

    console.log(`📤 Creating audit with request body:`, JSON.stringify(requestBody, null, 2));

    // Additional debug - specifically log the date fields
    const startField = requestBody.fields.find(f => f.fieldId === startDateFieldId);
    const completionField = requestBody.fields.find(f => f.fieldId === completionDateFieldId);

    const response = await fetch(`${BASE_URL}/api/v1/records/steps`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`❌ Failed to create audit. Status: ${response.status}, Body: ${errorBody}`);
        throw new Error(`Failed to create audit record: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const recordId = data.id;
    console.log(`✅ Successfully created audit record: ${recordId}`);

    // Move the audit to the next step after creation
    try {
        // Log all available steps to see the workflow structure
        console.log('🔍 Available steps in workflow:', auditsWorkflow.steps.map(s => `${s.name} (${s.type})`).join(', '));

        // Find the next step after ORIGIN (CHAIN or STANDARD type, not END)
        const nextStep = auditsWorkflow.steps.find(step =>
            step.type !== "ORIGIN" &&
            step.type !== "END" &&
            (step.type === "CHAIN" || step.type === "STANDARD")
        );

        if (nextStep) {
            console.log(`🔄 Moving audit to next step: ${nextStep.name} (${nextStep.id}, type: ${nextStep.type})`);

            // Fetch the full record data (required for advance operation)
            const fetchRecordResponse = await fetch(`${BASE_URL}/api/v1/records/${recordId}`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!fetchRecordResponse.ok) {
                console.warn(`⚠️  Failed to fetch record for advancement: ${fetchRecordResponse.status}`);
            } else {
                const recordData = await fetchRecordResponse.json();

                // Use the progress endpoint pattern from applicationRecords
                const advanceUrl = `${BASE_URL}/api/v1/records/${recordId}/progress/applications/${APPLICATIONS_ID}/workflows/${auditsWorkflow.workflow.id}/steps/${nextStep.id}`;

                const moveResponse = await fetch(advanceUrl, {
                    method: 'PUT',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(recordData)
                });

                if (!moveResponse.ok) {
                    const errorBody = await moveResponse.text();
                    console.warn(`⚠️  Failed to move audit to next step: ${moveResponse.status} ${errorBody}`);
                } else {
                    console.log(`✅ Successfully moved audit to step: ${nextStep.name}`);
                }
            }
        } else {
            console.warn('⚠️  No next step (CHAIN or STANDARD) found in workflow');
        }
    } catch (moveError) {
        console.warn(`⚠️  Error moving audit to next step:`, moveError.message);
    }

    // Debug: Fetch the created record to verify fields were set
    try {
        const verifyResponse = await fetch(`${BASE_URL}/api/v1/records/${recordId}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
            },
        });

        if (verifyResponse.ok) {
            const createdRecord = await verifyResponse.json();

            if (createdRecord.fields && Array.isArray(createdRecord.fields)) {
                const startDateField = createdRecord.fields.find(f => f.id === startDateFieldId);
                const completionDateField = createdRecord.fields.find(f => f.id === completionDateFieldId);

                if (completionDateField) {
                    console.log('✅ Expected Completion Date field found with value:', completionDateField.value);
                } else {
                    console.warn('⚠️  Completion Date field not found in created record');
                    console.log('🔍 Available fields:', createdRecord.fields.map(f => `${f.name} (${f.id})`).join(', '));
                }
            } else {
                console.warn('⚠️  createdRecord.fields is not an array or is missing');
            }
        } else {
            console.error('❌ Verification failed:', verifyResponse.status, await verifyResponse.text());
        }
    } catch (verifyError) {
        console.warn('⚠️  Could not verify created record:', verifyError.message);
    }

    return {
        id: recordId,
        name: name,
        year: year,
        scope: scope,
        status: 'created'
    };
}

/**
 * Create a new application audit record linked to an audit and application
 * @param {string} auditId - Parent audit ID
 * @param {string} applicationId - Application ID to link to
 * @returns {Promise<Object>} Created application audit record
 */
export async function createApplicationAuditRecordData(auditId, applicationId, progressCallback = () => {}) {
    if (!auditId) throw new Error('auditId is required');

    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Hardcoded bulk create source ID — observed from LogicGate UI network traffic.
    // Maps: Applications (source) → Application Audits (child) under an Audit (parent).
    const BULK_CREATE_SOURCE_ID = 'jnP9gzb6';
    const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
    const REQUEST_TIMEOUT_MS = 30 * 1000;  // 30 seconds

    // Get Application Audits workflow ID — needed for polling after bulk create
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });
    const appAuditsWorkflowId = applicationWorkflows.find(w => w.name === "Application Audits")?.id;
    if (!appAuditsWorkflowId) throw new Error('Application Audits workflow not found');

    const url = `${BASE_URL}/api/v1/bulk-create-and-link`;
    const body = {
        bulkCreateSourceId: BULK_CREATE_SOURCE_ID,
        parentRecordId: auditId,
        sourceRecordIds: [applicationId]
    };

    console.log(`🚀 POST ${url}`);
    console.log(`📤 Request body:`, JSON.stringify(body, null, 2));
    progressCallback(5, 'Sending Application Audit creation request...');

    let retryCount = 5;
    while (true) {
        if (retryCount > 0) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(body),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.warn(`⚠️ Bulk create request failed: ${response.status}, retrying in ${REQUEST_TIMEOUT_MS / 1000}s... (${retryCount} left)`);
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
            throw new Error('Failed to bulk create and link Application Audit after 5 retries');
        }
    }

    console.log(`✅ Bulk create request accepted — polling for Application Audit to appear...`);
    progressCallback(20, 'Request accepted, waiting for Application Audit to appear...');

    // Poll until the Application Audit is linked to the audit record (expect 1 — one per sourceRecordId)
    let applicationAuditId = null;
    let remaining = 1;
    while (remaining > 0) {
        try {
            const auditRecord = await getLinkedRecordsData(auditId, [appAuditsWorkflowId]);
            const linkedAudits = auditRecord.linkedRecords.workflow[appAuditsWorkflowId];
            remaining = 1 - linkedAudits.length;

            if (remaining > 0) {
                console.log(`📊 Application Audit not yet created, checking again in 12 seconds...`);
                progressCallback(30, 'Waiting for Application Audit...');
                await new Promise(resolve => setTimeout(resolve, 12000));
            } else {
                applicationAuditId = linkedAudits[0].record.id;
                console.log(`✅ Application Audit creation confirmed! ID: ${applicationAuditId}`);
                progressCallback(45, 'Application Audit confirmed!');
            }
        } catch (error) {
            console.error(`❌ Error polling Application Audit status:`, error.message);
            throw error;
        }
    }

    // Phase 2: bulk-create Control Evaluations under the new Application Audit.
    // applicationId (the application record) is passed directly — NOT applicationAuditId.
    // The workflow IDs are resolved from the same applicationWorkflows already fetched above.
    progressCallback(50, 'Application Audit created. Bulk creating Control Evaluations...');

    // Scale bulkCreateControlEvaluationsData's 0–100 progress into the 50–95% range
    const evalProgress = (p, msg) => progressCallback(50 + Math.round(p * 0.45), msg);
    const controlEvalResult = await bulkCreateControlEvaluationsData(applicationAuditId, applicationId, evalProgress);

    return {
        auditId,
        applicationId,
        applicationAuditId,
        controlEvaluations: controlEvalResult,
        status: 'created',
        message: `Application Audit created and ${controlEvalResult.created} Control Evaluations confirmed`
    };
}

/**
 * ENDPOINT FUNCTIONS
 */

/**
 * GET /api/audits
 * Get all audit records
 */
export async function getAuditRecords(req, res) {
    logRequest(req);

    try {
        const result = await getAuditRecordsData();
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting audit records:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * GET /api/audits/:id
 * Get a specific audit record with linked application audits
 */
export async function getAuditRecord(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await getAuditRecordsData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting audit record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * GET /api/audits/application/:applicationId
 * Get application audits for a specific application
 */
export async function getApplicationAuditsForApplication(req, res) {
    logRequest(req);

    const applicationId = req.params.applicationId || null;

    if (!applicationId) {
        return res.status(400).json(createErrorResponse(req, 'Application ID is required', 400));
    }

    try {
        const result = await getApplicationAuditsForApplicationData(applicationId);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting application audits for application:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * POST /api/audits
 * Create a new audit record
 */
export async function createAuditRecord(req, res) {
    logRequest(req);

    const { name, year, scope } = req.body;

    if (!name || !year) {
        return res.status(400).json(createErrorResponse(req, 'Missing required fields: name, year', 400));
    }

    // Get user email from request headers
    const userEmail = req.headers['x-user-email'] || req.headers['user-email'];

    if (!userEmail) {
        console.warn('⚠️  No user email found in request headers');
    }

    try {
        const result = await createAuditRecordData(name, year, scope || '', userEmail);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating audit record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * POST /api/audits/application-audit
 * Queue an async job to create an application audit + bulk-create its control evaluations.
 * Returns 202 immediately with a jobId — client tracks progress via WebSocket/polling.
 */
export async function createApplicationAuditRecord(req, res) {
    logRequest(req);

    const { auditId, applicationId } = req.body;

    if (!auditId || !applicationId) {
        return res.status(400).json(createErrorResponse(req, 'Missing required fields: auditId, applicationId', 400));
    }

    try {
        const jobManager = JobManager.getInstance();
        const userId = (
            req.headers['x-user-email'] ||
            req.headers['user-email'] ||
            req.ip ||
            'unknown'
        ).toLowerCase();

        const jobId = jobManager.createJob('createApplicationAudit', { auditId, applicationId }, null, userId);

        console.log(`✅ Queued Application Audit creation as job ${jobId}`);

        const successResponse = createSuccessResponse(req, {
            jobId,
            status: 'queued',
            message: 'Application Audit creation queued. Connect to WebSocket for updates.',
            websocketUrl: '/ws'
        });

        return res.status(202).json(successResponse);
    } catch (error) {
        console.error(`❌ Error queuing application audit creation:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}
