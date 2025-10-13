import { getToken } from '../../utils/getToken.js';
import { logRequest } from '../../utils/logRequest.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflows, getWorkflowsData } from '../../workflows/workflows.controller.js';
import { getRecordV1 } from '../../utils/getRecordV1.js';
import { deleteRecordData, getLinkedRecordsData, getRecordsData } from '../records.controller.js';
import { getEnvironmentControlFrameworksData } from '../environmentRecords/environmentRecords.controller.js';
import { updateControlRecordData, submitControlRecordData } from '../controlRecords/controlRecords.controller.js';
import { controllerLimiter } from '../../../utils/limiter.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;
const SCF_ID = process.env.SCF_ID;

/**
 * HELPER FUNCTIONS
 */
export async function getApplicationRecordsData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get environment workflow
    const applicationWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Applications")?.id);

    // Get application records
    if (!id)
        return await getRecordsData({ 'workflow-id': applicationWorkflow.workflow.id, size: 5000 });
    else
        return await getRecordsData({ id: id, 'workflow-id': applicationWorkflow.workflow.id, size: 1000 });
}

export async function deleteApplicationRecordData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get Control Instances workflow
    const controlInstancesWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Control Instances")?.id);

    // Delete application records
    return await deleteRecordData(id, [controlInstancesWorkflow.workflow.id]);

}

export async function _createApplicationRecordInternal(name, owner, description, environment) {
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

    let createControlInstancesResponse;
    let createControlInstancesSuccessful = false;

    if (linkingSuccessful && advancingSuccessful) {
        const endStep = applicationWorkflow.steps.find(step => step.type === "END")?.id;
        if (endStep) {
            try {
                createControlInstancesResponse = await createControlInstancesData(
                    recordId,
                    SCF_ID,
                    endStep,
                    environment
                )
                createControlInstancesSuccessful = true;
                console.log('✅ Control instances created successfully');
            } catch (error) {
                console.warn(`⚠️  Failed to create control instances for application: ${recordId} - ${error.message}`);
                // Don't throw here either since we still want to be successful if control instances are not linked.
            }
        } else {
            console.log(`⚠️  Skipping link operation - linking or advancing was not successful`);
        }
    }

    let updateControlInstancesResponse;
    let updateControlInstancesSuccessful = false;

    if (createControlInstancesSuccessful) {
        try {
            updateControlInstancesResponse = await updateControlInstancesData(recordId);
            updateControlInstancesSuccessful = true;
            console.log('✅ Control instances updated successfully');
        } catch (error) {
            console.warn(`⚠️  Failed to update one or more control instances for application: ${recordId} - ${error.message}`);
            // Don't throw here either since we still want to be successful if some control instances are not updated.
        }
    }

    let submitControlInstancesResponse;
    let submitControlInstancesSuccessful = false;

    if (updateControlInstancesSuccessful) {
        if (createControlInstancesSuccessful) {
            try {
                submitControlInstancesResponse = await submitControlInstancesData(updateControlInstancesResponse);
                submitControlInstancesSuccessful = true;
                console.log('✅ Control instances submitted successfully');
            } catch (error) {
                console.warn(`⚠️  Failed to submit one or more control instances for application: ${recordId} - ${error.message}`);
                // Don't throw here either since we still want to be successful if some control instances are not submitted.
            }
        }
    }

    const linkedRecords = await getLinkedRecordsData(recordId, null, APPLICATIONS_ID);

    return {
        id: recordId,
        name: name,
        owner: owner,
        environment: environment,
        status: 'created',
        linked: linkingSuccessful,
        advanced: advancingSuccessful,
        controlsCreated: createControlInstancesSuccessful && updateControlInstancesSuccessful && submitControlInstancesSuccessful,
        linkedRecords
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

    console.log(`☑️  Advancing application record: ${id} to step ${step}`);

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

export async function createControlInstancesData(id, application, step, environment) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`🔄 Creating security control instances for record: ${id}`);

    // Get "Bulk Create and Link section from application form"
    try {
        // Get the workflow link
        const formRes = await fetch(`${BASE_URL}/api/v1/form/sections?step=${step}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

        if (!formRes.ok) {
            const errorText = await formRes.text();
            console.warn(`⚠️  Failed to fetch form response for step: ${step}: HTTP ${formRes.status} ${errorText}`);
            return null;
        }

        const formSections = await formRes.json();

        const workflowLink = formSections.find(item => item.name === "Application Control Instances:");

        if (!workflowLink || !workflowLink.id)
            throw new Error(`${!workflowLink ? 'No workflow link found' : 'Workflow link found but is missing id'}`);

        console.log(`🔗 Workflow link obtained successfully: ${workflowLink.id}`);

        console.log(`🔍 Searching for sources for workflow link: ${workflowLink.id}`);
        // Get the bulk create workflow sources
        const bulkCreateWorkflowSourcesRes = await fetch(`${BASE_URL}/api/v1/bulk-create-workflow-source/section/workflow-link/${workflowLink.id}`,
            {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
            });

        if (!bulkCreateWorkflowSourcesRes.ok) {
            const errorText = await formRes.text();
            console.warn(`⚠️  Failed to fetch bulk create workflow sources for workflow link: ${workflowLink.id}: HTTP ${bulkCreateWorkflowSourcesRes.status} ${errorText}`);
            return null;
        }

        const sources = await bulkCreateWorkflowSourcesRes.json();

        if (!sources)
            throw new Error(`No sources found for ${workflowLink.id}`);

        console.log(`📳 Sources found for workflow link: ${workflowLink.id}`);

        console.log(`🔍 Getting environment control frameworks for environment: ${environment}`);
        // Get eviornment control framework workflows
        const controlFrameworkWorkflows = await getEnvironmentControlFrameworksData(environment);

        console.log(`🚬 Filtering sources: ${controlFrameworkWorkflows.length}`);

        // For each control framework workflow
        for (const controlFrameworkWorkflow of controlFrameworkWorkflows) {
            let correctSource;
            // Filter correct sources
            for (const source of sources) {
                //console.log("soruce:" + source.sourceWorkflow.id + " |-| cf: " + controlFrameworkWorkflow.workflow.id);
                if (source.sourceWorkflow.id == controlFrameworkWorkflow.workflow.id) {
                    console.log(`🧲 Found Match: Source: ${source.sourceWorkflow.id} Control Framework: ${controlFrameworkWorkflow.workflow.id}`);
                    correctSource = source;
                }
            }
            if (!correctSource) {
                console.warn(`⚠️  No source found. `);
                return null;
            }

            console.log(`🔍 Getting environment workflows for environment: ${environment}`);

            // Get the "Repository" or END step
            const endStep = controlFrameworkWorkflow.steps.find(step => step.name.toLowerCase().includes("repository") && step.type.toUpperCase() === "END");
            // Get controls from controls repository
            const controlRecords = await getRecordsData({ 'application-id': application, 'workflow-id': controlFrameworkWorkflow.workflow.id, 'step-id': endStep.id, size: 1000 });

            const sourceRecordIds = controlRecords.content.map(item => item.id);

            if (!sourceRecordIds || !(sourceRecordIds.length > 0)) {
                console.warn(`⚠️  No source records found. `);
                return null;
            }
            //console.log(sourceRecordIds);

            // SCARY PART: TIME TO BULK CREATE AND LINK BABY (WITH RETRY LOGIC)
            const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 minutes
            const REQUEST_TIMEOUT_MS = 30 * 1000; // 30 seconds

            let bulkCreateAndLinkControlsRes;

            let retryCount = 5;

            while (true) {
                if (retryCount > 0) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

                        bulkCreateAndLinkControlsRes = await fetch(`${BASE_URL}/api/v1/bulk-create-and-link`, {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                bulkCreateSourceId: correctSource.id,
                                parentRecordId: id,
                                sourceRecordIds: sourceRecordIds
                            }),
                            signal: controller.signal
                        });

                        clearTimeout(timeoutId);

                        // If we got a response (bad), retry
                        if (!bulkCreateAndLinkControlsRes.ok) {
                            console.warn(`⚠️ Bulk create request failed: ${bulkCreateAndLinkControlsRes.status}`);
                            console.log(`⏱️ Request timed out, retrying in ${REQUEST_TIMEOUT_MS / 1000} seconds...`);
                            await new Promise(resolve => setTimeout(resolve, REQUEST_TIMEOUT_MS));
                            console.log("↩️ Retrying..." + retryCount);
                            retryCount--;
                        } else {
                            break;
                        }


                    } catch (error) {
                        // Only retry on timeout errors
                        if (error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.message.includes('timeout')) {
                            console.log(`⏱️ Request timed out, retrying in 5 minutes...`);
                            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                            continue; // Retry
                        } else {
                            // For other errors, re-throw
                            throw error;
                        }
                    }
                } else {
                    throw new Error("❌ Failed to create and link control instance records.");
                }
            }

            // Safety break - wait 1 minute before continuing
            // console.log(`🔲 Starting safety break (60 seconds)`);
            // for (let i = 1; i <= 6; i++) {
            //     await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
            //     console.log(`🚬 ${i * 10}s/60s`);
            // }
            // console.log(`✅ Safety break complete, continuing...`);

            // Poll for completion status
            let sourceRecordsRemaining = 1; // Start with non-zero to enter the loop

            const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });
            const controlInstancesWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Control Instances")?.id);

            while (sourceRecordsRemaining > 0) {
                try {
                    // get the linked records
                    const applicationRecord = await getLinkedRecordsData(id, [controlInstancesWorkflow.workflow.id])
                    const linkedControls = applicationRecord.linkedRecords.workflow[controlInstancesWorkflow.workflow.id];

                    sourceRecordsRemaining = sourceRecordIds.length - linkedControls.length;

                    if (sourceRecordsRemaining > 0) {
                        console.log(`📊 Records remaining: ${sourceRecordsRemaining}, checking again in 10 seconds...`);
                        await new Promise(resolve => setTimeout(resolve, 10000)); // 10 seconds
                    } else {
                        console.log(`✅ Bulk create operation completed! All records processed.`);
                    }

                } catch (error) {
                    console.error(`❌ Error checking bulk create status:`, error.message);
                    throw error;
                }
            }
        }

        return;

    } catch (error) {
        throw error;
    }
}

export async function updateControlInstancesData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    console.log(`⏫ Updating security control instances for record: ${id}`);

    // Get all linked control instances
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get control instances workflow
    const controlInstancesWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Control Instances")?.id);

    // Get environments workflow
    const environmentsWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Environments")?.id);

    // get the linked records
    const applicationRecord = await getLinkedRecordsData(id, [controlInstancesWorkflow.workflow.id, environmentsWorkflow.workflow.id])
    const linkedControls = applicationRecord.linkedRecords.workflow[controlInstancesWorkflow.workflow.id];
    const environment = applicationRecord.linkedRecords.workflow[environmentsWorkflow.workflow.id][0].record;

    // Get control framework workflows of application. TYPE = []
    const controlFrameworkWorkflows = await getEnvironmentControlFrameworksData(environment.id);
    let controlFrameworkWorkflowsIds = []; // contains the ids of the selected control frameworks

    for (const workflow of controlFrameworkWorkflows)
        controlFrameworkWorkflowsIds.push(workflow.workflow.id);

    let updatedControlRecords = [];

    // Filter only ones not on END step

    try {
        for (const r of linkedControls) {
            if (!(r.record.currentStep.type === "END"))
                // For each control instance, update
                updatedControlRecords.push(await updateControlRecordData(r.record.id, controlFrameworkWorkflowsIds, id));
        }
    } catch (error) {
        console.warn(`⚠️ Failed to update control instance: ${error.message}`);
    }

    return updatedControlRecords;

}

export async function submitControlInstancesData(updateControlRecords) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    let submittedControlRecords = [];

    try {
        for (const r of updateControlRecords) {
            submittedControlRecords.push(await submitControlRecordData(r.id));
        }
    } catch (error) {
        console.warn(`⚠️ Failed to submit control instance: ${error.message}`);
    }

    return submittedControlRecords;
}

/**
 * RATE LIMITING
 */

export const createApplicationRecordData = controllerLimiter.wrap(_createApplicationRecordInternal);

/**
 * ENDPOINT FUNCTIONS
 */

export async function getApplicationRecord(req, res) {
    logRequest(req);

    try {
        const result = await getApplicationRecordsData();
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting application records:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function deleteApplicationRecord(req, res) {
    logRequest(req);

    try {
        const { id } = req.params;
        const result = await deleteApplicationRecordData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error deleting application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

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

    const { name, owner, description, environment } = req.body;

    if (!name || !owner || !description || !environment) {
        console.log(`❌ Missing required parameters: ${name ? "" : "name "} ${owner ? "" : "owner "} ${description ? "" : "description "} ${environment ? "" : "environment "}`);
        return res.status(400).json(createErrorResponse(req, 'Missing name, owner, description, or environment', 400));
    }

    try {
        const result = await createApplicationRecordData(name, owner, description, environment);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating application record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function linkApplicationRecordToEnvironment(req, res) {
    logRequest(req);

    const { id, layout, environment } = req.body;

    if (!id || !layout || !environment) {
        console.log('❌ Missing required parameters: id, layout, or environment');
        return res.status(400).json(createErrorResponse(req, 'Missing id, layout, or environment', 400));
    }

    try {
        const result = await linkApplicationRecordToEnvironmentData(id, layout, environment);
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

export async function createControlInstances(req, res) {
    logRequest(req);

    const { id, application, step, environment } = req.body;

    try {
        const result = await createControlInstancesData(id, application, step, environment);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating control instance records:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function updateControlInstances(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await updateControlInstancesData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error updating application records:`, error.message);
        console.error(error.stack);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function submitControlInstances(req, res) {
    logRequest(req);

    const updatedControlRecords = req.params.updatedControlRecords || null;

    try {
        const result = await submitControlInstancesData(updatedControlRecords);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error submitting application records:`, error.message);
        console.error(error.stack);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}