import { getToken } from '../../utils/getToken.js';
import { logRequest } from '../../utils/logRequest.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflowsData } from '../../workflows/workflows.controller.js';
import { getRecordV1 } from '../../utils/getRecordV1.js';
import { getRecordsData } from '../records.controller.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;

/**
 * HELPER FUNCTIONS
 */
export async function getApplicationRecordsData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get enviornment workflow
    const applicationWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Applications")?.id);

    // Get enviornment records
    return await getRecordsData({id: id, 'workflow-id': applicationWorkflow.workflow.id, size: 1000 });
}

export async function createApplicationRecordData(name, owner, description, environment) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    const nameFieldId = 'mdewoh43';
    const ownerFieldId = 'ctoTaXG3';
    const descriptionFieldId = 'qk1YEvJw';
    const layout = 'xJFfK2Fu';

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get steps from workflow with internal call
    const applicationWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Applications")?.id);

    // Extract the initial step
    const initialStep = applicationWorkflow.steps.find(step => step.type === "ORIGIN")?.id;

    // Create the application and assign it to owner
    console.log(`🔄 Creating application record: ${name} for ${owner}`);

    const requestBody = {
        stepId: initialStep,
        assigneeEmailAddress: owner,
        fields: [
            {
                fieldId: nameFieldId,
                values: [`${name}`]
            },
            {
                fieldId: ownerFieldId,
                values: [`${owner}`]
            },
            {
                fieldId: descriptionFieldId,
                values: [`${description}`]
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
        throw new Error(`Failed to create application record: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const recordId = data.id;
    console.log(`✅ Successfully created application record: ${recordId}`);

    // Link record to environment
    let linkApplicationRecordResponse;
    let linkingSuccessful = false;

    try {
        linkApplicationRecordResponse = await linkApplicationRecordToEnvironmentData(
            recordId,
            layout,
            environment
        );
        linkingSuccessful = true;
        console.log('✅ Link operation completed successfully');
    } catch (error) {
        console.warn(`⚠️  Failed to link application record: ${recordId} - ${error.message}`);
        // Don't throw here - record was created successfully, linking just failed
    }

    // Advance record to next step
    let advanceApplicationRecordResponse;
    let advancingSuccessful = false;

    if (linkingSuccessful) {
        // Find the next step after ORIGIN (typically END or next step in workflow)
        const nextStep = applicationWorkflow.steps.find(step => step.type === "END")?.id;

        if (nextStep) {
            try {
                advanceApplicationRecordResponse = await advanceApplicationRecordData(
                    recordId,
                    APPLICATIONS_ID,
                    applicationWorkflow.workflow.id,
                    nextStep
                );
                advancingSuccessful = true;
                console.log('✅ Advance operation completed successfully');
            } catch (error) {
                console.warn(`⚠️  Failed to advance application record: ${recordId} - ${error.message}`);
                // Don't throw here - record was created and linked successfully, advancing just failed
            }
        } else {
            console.warn(`⚠️  No END step found in workflow - skipping advance operation`);
        }
    } else {
        console.log(`⚠️  Skipping advance operation - linking was not successful`);
    }

    return {
        id: recordId,
        name: name,
        owner: owner,
        enviornment: environment,
        status: 'created',
        linked: linkingSuccessful,
        advanced: advancingSuccessful,
        linkResponse: linkApplicationRecordResponse,
        advanceResponse: advanceApplicationRecordResponse
    };
}

export async function linkApplicationRecordToEnvironmentData(id, layout, environment) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔗 Linking application record: ${id} to environment ${environment}`);

    const requestBody = { id: environment };
    const url = `${BASE_URL}/api/v1/records/${id}/parent?layout=${layout}`;

    const response = await fetch(url, {
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
        console.log('❌ Link error response:', errorBody);
        throw new Error(`Failed to link application record: ${response.status} ${errorBody}`);
    }

    // Handle potentially empty response
    let data;
    const responseText = await response.text();

    if (responseText.trim() === '') {
        console.log('✅ Link successful - empty response (normal for link operations)');
        data = { success: true };
    } else {
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.log('✅ Link successful - non-JSON response:', responseText);
            data = { success: true, rawResponse: responseText };
        }
    }

    console.log(`✅ Successfully linked application record to environment: ${id}`);
    return {
        id: id,
        environment: environment,
        status: 'linked',
        linkResponse: data
    };
}

export async function advanceApplicationRecordData(id, application, workflow, step) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`☑️ Advancing application record: ${id} to step ${step}`);

    const record = await getRecordV1(id, token);
    const url = `${BASE_URL}/api/v1/records/${id}/progress/applications/${application}/workflows/${workflow}/steps/${step}`;

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(record)
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.log('❌ Advance error response:', errorBody);
        throw new Error(`Failed to advance record: ${response.status} ${errorBody}`);
    }

    // Handle potentially empty response
    let data;
    const responseText = await response.text();

    if (responseText.trim() === '') {
        console.log('✅ Advance successful - empty response (normal for advance operations)');
        data = { success: true };
    } else {
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.log('✅ Advance successful - non-JSON response:', responseText);
            data = { success: true, rawResponse: responseText };
        }
    }

    console.log(`✅ Successfully advanced record to step: ${step}`);
    return {
        id: id,
        step: step,
        status: 'advanced',
        record: data
    };
}

/**
 * ENDPOINT FUNCTIONS
 */

export async function getApplicationRecords(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await getApplicationRecordsData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting application records:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function createApplicationRecord(req, res) {
    logRequest(req);

    const { name, owner, description, enviornment } = req.body;

    if (!name || !owner || !description || !enviornment) {
        console.log('❌ Missing required parameters: Missing name, owner, description, or enviornment.');
        return res.status(400).json(createErrorResponse(req, 'Missing name, owner, description, or enviornment', 400));
    }

    try {
        const result = await createApplicationRecordData(name, owner, description, enviornment);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function linkApplicationRecordToEnviornment(req, res) {
    logRequest(req);

    const { id, layout, enviornment } = req.body;

    if (!id || !layout || !enviornment) {
        console.log('❌ Missing required parameters: id, layout, or enviornment');
        return res.status(400).json(createErrorResponse(req, 'Missing id, layout, or enviornment', 400));
    }

    try {
        const result = await linkApplicationRecordToEnvironmentData(id, layout, enviornment);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error linking application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function advanceApplicationRecord(req, res) {
    logRequest(req);

    const { id, application, workflow, step } = req.body;

    if (!id || !application || !workflow || !step) {
        console.log('❌ Missing required parameters: id, application, workflow, step');
        return res.status(400).json(createErrorResponse(req, 'Missing id, application, workflow, step', 400));
    }

    try {
        const result = await advanceApplicationRecordData(id, application, workflow, step);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error advancing application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}