import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';
import { getWorkflows } from '../workflows/workflows.controller.js';
import { getRecordV1 } from '../utils/getRecordV1.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;
// layout id: xJFfK2Fu

/**
 * HELPER FUNCTIONS
 */
async function linkApplicationRecordToEnviornment(req, res) {
    logRequest(req);

    const { id, layout, enviornment } = req.body;

    if (!id || !layout || !enviornment) {
        console.log('❌ Missing required parameters: id, layout, or enviornment');
        return res.status(400).json(createErrorResponse(req, 'Missing id, layout, or enviornment', 400));
    }

    let token = await getToken(res);
    if (!token) return;

    try {
        console.log(`🔗 Linking application record: ${id} to enviornment ${enviornment}`);

        const requestBody = {
            id: enviornment
        };

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
            console.log(`⚠️  Failed to link application record: ${id}`);
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

        const successResponse = createSuccessResponse(req, {
            id: id,
            enviornment: enviornment,
            status: 'linked',
            linkResponse: data
        });

        return res.status(200).json(successResponse);

    } catch (error) {
        console.error(`❌ Error linking application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

async function advanceApplicationRecord(req, res) {
    logRequest(req);

    const { id, application, workflow, step } = req.body;

    if (!id || !application || !workflow || !step) {
        console.log('❌ Missing required parameters: id, application, workflow, step');
        return res.status(400).json(createErrorResponse(req, 'Missing id, application, workflow, step', 400));
    }

    let token = await getToken(res);
    if (!token) return;

    try {
        console.log(`☑️ Advancing application record: ${id} to step ${step}`);

        const record = await getRecordV1(id, token);

        const url = `${BASE_URL}/api/v1/records/${id}/progress/applications/${application}/workflows/${workflow}/steps/${step}`;

        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: record
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.log('❌ Advance error response:', errorBody);
            console.log(`⚠️  Failed to advance record: ${id}`);
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

        const successResponse = createSuccessResponse(req, {
            id: id,
            step: step,
            status: 'advanced',
            record: data
        });

        return res.status(200).json(successResponse);

    } catch (error) {
        console.error(`❌ Error advancing application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

/**
 * ENDPOINT FUNCTIONS
 */

export async function createApplicationRecord(req, res) {
    logRequest(req);

    const { name, owner, description, enviornment } = req.body;

    if (!name || !owner || !description || !enviornment) {
        console.log('❌ Missing required parameters: Missing name, owner, description, or enviornment.');
        return res.status(400).json(createErrorResponse(req, 'Missing name, owner, description, or enviornment', 400));
    }

    let token = await getToken(res);
    if (!token) return;

    try {
        const nameFieldId = 'hQSj3kTc';
        const ownerFieldId = 'ctoTaXG3';
        const descriptionFieldId = 'qk1YEvJw';
        const layout = 'xJFfK2Fu';
        const environmentId = req.body.enviornment; // Use actual environment from request

        // Get application workflow using internal call
        const getAppliationsWorkflowReq = { body: { 'application-id': APPLICATIONS_ID } };
        let getAppliationsWorkflowResponse;
        const getAppliationsWorkflowRes = {
            json: (data) => { getAppliationsWorkflowResponse = data; },
            status: (code) => ({
                json: (data) => {
                    throw new Error(`Failed to get workflows: ${data.error}`);
                }
            })
        };
        await getWorkflows(getAppliationsWorkflowReq, getAppliationsWorkflowRes);

        // Get steps from workflow with internal call
        const workflowReq = { body: { id: getAppliationsWorkflowResponse.find(item => item.name === "Applications")?.id } };
        let workflowResponse;
        const workflowRes = {
            json: (data) => { workflowResponse = data; },
            status: (code) => ({
                json: (data) => {
                    throw new Error(`Failed to get workflow details: ${data.error}`);
                }
            })
        };
        await getWorkflows(workflowReq, workflowRes);

        const initialStep = workflowResponse.steps.find(step => step.type === "ORIGIN")?.id;

        // Create the application and assign it to owner
        console.log(`🔄 Creating application record: ${name} for ${owner}`);

        const requestBody = {
            stepId: initialStep,
            assigneeEmailAddress: owner,
            fields: [
                {
                    fieldId: nameFieldId,
                    values: [name] // Fixed: use actual name instead of hardcoded value
                },
                {
                    fieldId: ownerFieldId,
                    values: [owner]
                },
                {
                    fieldId: descriptionFieldId,
                    values: [description]
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
        
        const linkApplicationRecordReq = { 
            body: { 
                id: recordId, 
                layout: layout, 
                enviornment: environmentId // Use actual environment ID
            } 
        };
        
        const linkApplicationRecordRes = {
            json: (data) => { 
                console.log('✅ Link operation completed successfully');
                linkApplicationRecordResponse = data;
                linkingSuccessful = true;
            },
            status: (code) => {
                // Only treat non-success status codes as errors
                if (code >= 400) {
                    return {
                        json: (data) => {
                            console.error('❌ Link function returned error status:', code, data);
                            throw new Error(`Failed to link application record: ${data.error || 'Unknown error'}`);
                        }
                    };
                } else {
                    // For success status codes (200-299), return an object that will call json()
                    return {
                        json: (data) => {
                            console.log('✅ Link operation completed with status:', code);
                            linkApplicationRecordResponse = data;
                            linkingSuccessful = true;
                        }
                    };
                }
            }
        };

        try {
            await linkApplicationRecordToEnviornment(linkApplicationRecordReq, linkApplicationRecordRes);
        } catch (error) {
            console.warn(`⚠️  Failed to link application record: ${recordId} - ${error.message}`);
            // Don't throw here - record was created successfully, linking just failed
        }

        // Advance record to next step (if linking was successful)
        let advanceApplicationRecordResponse;
        let advancingSuccessful = false;
        
        if (linkingSuccessful) {
            // Find the next step after ORIGIN (typically END or next step in workflow)
            const nextStep = workflowResponse.steps.find(step => step.type === "END")?.id;
            
            if (nextStep) {
                const advanceApplicationRecordReq = {
                    body: {
                        id: recordId,
                        application: APPLICATIONS_ID,
                        workflow: workflowResponse.workflow.id,
                        step: nextStep
                    }
                };

                const advanceApplicationRecordRes = {
                    json: (data) => {
                        console.log('✅ Advance operation completed successfully');
                        advanceApplicationRecordResponse = data;
                        advancingSuccessful = true;
                    },
                    status: (code) => {
                        // Only treat non-success status codes as errors
                        if (code >= 400) {
                            return {
                                json: (data) => {
                                    console.error('❌ Advance function returned error status:', code, data);
                                    throw new Error(`Failed to advance application record: ${data.error || 'Unknown error'}`);
                                }
                            };
                        } else {
                            // For success status codes (200-299), return an object that will call json()
                            return {
                                json: (data) => {
                                    console.log('✅ Advance operation completed with status:', code);
                                    advanceApplicationRecordResponse = data;
                                    advancingSuccessful = true;
                                }
                            };
                        }
                    }
                };

                try {
                    await advanceApplicationRecord(advanceApplicationRecordReq, advanceApplicationRecordRes);
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

        const successResponse = createSuccessResponse(req, {
            id: recordId,
            name: name,
            owner: owner,
            enviornment: environmentId,
            status: 'created',
            linked: linkingSuccessful,
            advanced: advancingSuccessful,
            linkResponse: linkApplicationRecordResponse,
            advanceResponse: advanceApplicationRecordResponse
        });

        return res.status(201).json(successResponse);

    } catch (error) {
        console.error(`❌ Error creating application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}