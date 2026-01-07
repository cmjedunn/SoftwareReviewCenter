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

    // Find the Application Audits workflow
    const applicationAuditsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Application Audits")?.id
    );

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
