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
 * Bulk create control evaluation records for an application audit
 * Creates evaluations for all control instances linked to an application
 * @param {string} applicationAuditId - Application Audit record ID
 * @param {string} applicationId - Application record ID
 * @returns {Promise<Object>} Result of bulk creation operation
 */
export async function bulkCreateControlEvaluationsData(applicationAuditId, applicationId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔍 Bulk creating control evaluations for application audit: ${applicationAuditId}`);

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the Control Evaluations workflow
    const controlEvaluationsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Control Evaluations")?.id
    );

    if (!controlEvaluationsWorkflow) {
        throw new Error('Control Evaluations workflow not found');
    }

    // Find the Control Instances workflow
    const controlInstancesWorkflowSummary = applicationWorkflows.find(item =>
        item.name === "Control Instances" || item.name === "Security Control Instances"
    );

    if (!controlInstancesWorkflowSummary) {
        throw new Error('Control Instances workflow not found');
    }

    const controlInstancesWorkflow = await getWorkflowData(controlInstancesWorkflowSummary.id);

    // Get all control instances linked to the application
    const linkedRecords = await getLinkedRecordsData(
        applicationId,
        [controlInstancesWorkflow.workflow.id],
        APPLICATIONS_ID
    );

    const controlInstances = linkedRecords?.linkedRecords?.workflow?.[controlInstancesWorkflow.workflow.id] || [];

    if (controlInstances.length === 0) {
        console.warn('⚠️  No control instances found for application');
        return {
            created: 0,
            failed: 0,
            message: 'No control instances found for application'
        };
    }

    console.log(`📋 Found ${controlInstances.length} control instances to create evaluations for`);

    // Get the Control Evaluation workflow's ORIGIN step
    const originStep = controlEvaluationsWorkflow.steps.find(step => step.type === "ORIGIN");
    if (!originStep) {
        throw new Error('Origin step not found in Control Evaluations workflow');
    }

    // Get the workflow link section for bulk create
    const formRes = await fetch(`${BASE_URL}/api/v1/form/sections?step=${originStep.id}`, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!formRes.ok) {
        throw new Error(`Failed to fetch form sections: ${formRes.status}`);
    }

    const formSections = await formRes.json();
    const workflowLink = formSections.find(item =>
        item.name?.includes('Control Instance') ||
        item.type === 'WORKFLOW_LINK'
    );

    if (!workflowLink || !workflowLink.id) {
        throw new Error('Workflow link not found for Control Instances');
    }

    // Get the bulk create workflow sources
    const bulkCreateSourcesRes = await fetch(
        `${BASE_URL}/api/v1/bulk-create-workflow-source/section/workflow-link/${workflowLink.id}`,
        {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!bulkCreateSourcesRes.ok) {
        throw new Error(`Failed to fetch bulk create sources: ${bulkCreateSourcesRes.status}`);
    }

    const sources = await bulkCreateSourcesRes.json();
    const sourceForControlInstances = sources.find(s =>
        s.sourceWorkflow.id === controlInstancesWorkflow.workflow.id
    );

    if (!sourceForControlInstances) {
        throw new Error('Bulk create source not found for Control Instances workflow');
    }

    // Extract control instance IDs
    const sourceRecordIds = controlInstances.map(ci => ci.record.id);

    console.log(`🚀 Starting bulk create and link for ${sourceRecordIds.length} control evaluations`);

    // Perform bulk create and link
    const bulkCreateResponse = await fetch(`${BASE_URL}/api/v1/bulk-create-and-link`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            bulkCreateWorkflowSourceId: sourceForControlInstances.id,
            originRecordId: applicationAuditId,
            sourceRecordIds: sourceRecordIds,
            workflowLinkId: workflowLink.id
        })
    });

    if (!bulkCreateResponse.ok) {
        const errorBody = await bulkCreateResponse.text();
        throw new Error(`Bulk create failed: ${bulkCreateResponse.status} ${errorBody}`);
    }

    console.log(`✅ Successfully bulk created ${sourceRecordIds.length} control evaluations`);

    return {
        created: sourceRecordIds.length,
        failed: 0,
        applicationAuditId: applicationAuditId,
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
