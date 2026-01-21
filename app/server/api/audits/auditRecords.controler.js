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
 * Create a new audit record
 * @param {string} name - Audit name
 * @param {string} year - Audit year
 * @param {string} scope - Audit scope
 * @returns {Promise<Object>} Created audit record
 */
export async function createAuditRecordData(name, year, scope) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔍 Creating audit record: ${name}`);

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the Audits workflow
    const auditsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Audits")?.id
    );

    if (!auditsWorkflow) {
        throw new Error('Audits workflow not found');
    }

    // Find the ORIGIN step
    const originStep = auditsWorkflow.steps.find(step => step.type === "ORIGIN");
    if (!originStep) {
        throw new Error('Origin step not found in Audits workflow');
    }

    // Find field IDs for the audit
    const auditNameField = originStep.fields.find(field => field.label === "Audit Name" || field.name === "Audit Name");
    const auditYearField = originStep.fields.find(field => field.label === "Audit Year" || field.name === "Audit Year");
    const auditScopeField = originStep.fields.find(field => field.label === "Audit Scope" || field.name === "Audit Scope");

    // Create the audit record
    const requestBody = {
        application: APPLICATIONS_ID,
        workflow: auditsWorkflow.workflow.id,
        step: originStep.id,
        fields: [
            {
                fieldId: auditNameField.id,
                values: [name]
            },
            {
                fieldId: auditYearField.id,
                values: [year]
            },
            {
                fieldId: auditScopeField.id,
                values: [scope]
            }
        ]
    };

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
        throw new Error(`Failed to create audit record: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const recordId = data.id;
    console.log(`✅ Successfully created audit record: ${recordId}`);

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
export async function createApplicationAuditRecordData(auditId, applicationId) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔍 Creating application audit for audit: ${auditId} and application: ${applicationId}`);

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Find the Application Audits workflow
    const applicationAuditsWorkflow = await getWorkflowData(
        applicationWorkflows.find(item => item.name === "Application Audits")?.id
    );

    if (!applicationAuditsWorkflow) {
        throw new Error('Application Audits workflow not found');
    }

    // Find the ORIGIN step
    const originStep = applicationAuditsWorkflow.steps.find(step => step.type === "ORIGIN");
    if (!originStep) {
        throw new Error('Origin step not found in Application Audits workflow');
    }

    // Create the application audit record
    const requestBody = {
        application: APPLICATIONS_ID,
        workflow: applicationAuditsWorkflow.workflow.id,
        step: originStep.id,
        fields: []
    };

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
        throw new Error(`Failed to create application audit record: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const recordId = data.id;
    console.log(`✅ Successfully created application audit record: ${recordId}`);

    // Get the layout ID for linking to audit
    const auditLayout = applicationAuditsWorkflow.layouts?.find(layout =>
        layout.name?.toLowerCase().includes('audit') ||
        layout.targetWorkflow?.id === auditId
    );

    if (!auditLayout) {
        console.warn('⚠️  Audit layout not found, attempting to link with first available layout');
    }

    // Link application audit to parent audit
    try {
        const linkUrl = `${BASE_URL}/api/v1/records/${recordId}/parent?layout=${auditLayout?.id || applicationAuditsWorkflow.layouts[0]?.id}`;
        const linkResponse = await fetch(linkUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: auditId })
        });

        if (!linkResponse.ok) {
            console.warn(`⚠️  Failed to link application audit to audit: ${linkResponse.status}`);
        } else {
            console.log(`✅ Successfully linked application audit to audit`);
        }
    } catch (error) {
        console.warn(`⚠️  Error linking application audit to audit: ${error.message}`);
    }

    // Get the layout ID for linking to application
    const applicationLayout = applicationAuditsWorkflow.layouts?.find(layout =>
        layout.name?.toLowerCase().includes('application') ||
        layout.targetWorkflow?.id === applicationId
    );

    // Link application audit to application
    try {
        const linkUrl = `${BASE_URL}/api/v1/records/${recordId}/parent?layout=${applicationLayout?.id || applicationAuditsWorkflow.layouts[1]?.id}`;
        const linkResponse = await fetch(linkUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: applicationId })
        });

        if (!linkResponse.ok) {
            console.warn(`⚠️  Failed to link application audit to application: ${linkResponse.status}`);
        } else {
            console.log(`✅ Successfully linked application audit to application`);
        }
    } catch (error) {
        console.warn(`⚠️  Error linking application audit to application: ${error.message}`);
    }

    return {
        id: recordId,
        auditId: auditId,
        applicationId: applicationId,
        status: 'created'
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

    try {
        const result = await createAuditRecordData(name, year, scope || '');
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating audit record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * POST /api/audits/application-audit
 * Create a new application audit record
 */
export async function createApplicationAuditRecord(req, res) {
    logRequest(req);

    const { auditId, applicationId } = req.body;

    if (!auditId || !applicationId) {
        return res.status(400).json(createErrorResponse(req, 'Missing required fields: auditId, applicationId', 400));
    }

    try {
        const result = await createApplicationAuditRecordData(auditId, applicationId);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating application audit record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}
