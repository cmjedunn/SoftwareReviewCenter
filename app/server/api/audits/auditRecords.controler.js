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
 * Fetch all layouts from LogicGate API
 * @returns {Promise<Array>} Array of layout objects
 */
async function getLayouts() {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    const requestUrl = `${BASE_URL}/api/v1/layouts`;
    console.log(`🔍 Fetching layouts from: ${requestUrl}`);

    const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
        },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to fetch layouts: ${response.status} ${errorBody}`);
    }

    const layouts = await response.json();
    console.log(`✅ Successfully retrieved ${layouts.length} layouts`);

    return layouts;
}

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
 * @param {string} auditId - Parent audit ID (optional)
 * @param {string} applicationId - Application ID to link to
 * @param {string} userEmail - Email of the user creating the record
 * @returns {Promise<Object>} Created application audit record
 */
export async function createApplicationAuditRecordData(auditId, applicationId, userEmail) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    if (auditId) {
        console.log(`🔍 Creating application audit for audit: ${auditId} and application: ${applicationId}`);
    } else {
        console.log(`🔍 Creating application audit for application: ${applicationId} (no parent audit)`);
    }

    console.log(`🔑 Using APPLICATIONS_ID: ${APPLICATIONS_ID}`);

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

    console.log(`🔧 Application Audits workflow structure:`, JSON.stringify({
        hasWorkflow: !!applicationAuditsWorkflow.workflow,
        hasSteps: !!applicationAuditsWorkflow.steps,
        stepsIsArray: Array.isArray(applicationAuditsWorkflow.steps),
        stepsLength: applicationAuditsWorkflow.steps?.length,
        hasLayouts: !!applicationAuditsWorkflow.layouts,
        layoutsIsArray: Array.isArray(applicationAuditsWorkflow.layouts),
        layoutsLength: applicationAuditsWorkflow.layouts?.length,
        workflowKeys: Object.keys(applicationAuditsWorkflow)
    }));

    if (!applicationAuditsWorkflow.steps || !Array.isArray(applicationAuditsWorkflow.steps)) {
        throw new Error('Application Audits workflow steps not found or invalid');
    }

    // Find the CHAIN step (Application Audits workflow doesn't have ORIGIN, it's a child workflow)
    const chainStep = applicationAuditsWorkflow.steps.find(step => step.type === "CHAIN");
    if (!chainStep) {
        console.error('❌ Available step types:', applicationAuditsWorkflow.steps.map(s => s.type));
        throw new Error('Chain step not found in Application Audits workflow');
    }

    console.log(`🔧 Application Audits chain step: ${chainStep.name} (${chainStep.id})`);

    console.log(`🔧 Application Audits chain step structure:`, JSON.stringify({
        hasId: !!chainStep.id,
        hasFields: !!chainStep.fields,
        fieldsIsArray: Array.isArray(chainStep.fields),
        fieldsLength: chainStep.fields?.length,
        stepKeys: Object.keys(chainStep)
    }));

    // Fetch all layouts using the v1 layouts endpoint
    const allLayouts = await getLayouts();

    // Get the "Audits" workflow
    const auditsWorkflowSummary = applicationWorkflows.find(w => w.name === "Audits");
    console.log('🔍 Audits workflow ID:', auditsWorkflowSummary?.id);

    // Get the "Applications" workflow
    const applicationsWorkflowSummary = applicationWorkflows.find(w => w.name === "Applications");
    console.log('🔍 Applications workflow ID:', applicationsWorkflowSummary?.id);

    if (!applicationsWorkflowSummary) {
        throw new Error('Applications workflow not found');
    }

    // Fetch the Applications workflow to see its step configuration
    const applicationsWorkflow = await getWorkflowData(applicationsWorkflowSummary.id);
    console.log('🔍 Applications workflow steps:', applicationsWorkflow.steps?.map(s => ({
        id: s.id,
        name: s.name,
        type: s.type
    })));

    // Get the Application Audits workflow ID
    const applicationAuditsLayoutId = applicationAuditsWorkflow.workflow?.id;
    console.log('🔍 Application Audits workflow ID:', applicationAuditsLayoutId);

    // Search ALL layouts for ones that might connect to Application Audits
    // Layouts may have properties that indicate child workflow connections
    console.log('🔍 Searching all layouts for Application Audits connections...');
    console.log('🔍 Sample layout structure:', JSON.stringify(allLayouts[0], null, 2));

    // Look for layouts that might reference the Application Audits workflow
    const appAuditLayouts = allLayouts.filter(layout => {
        const layoutStr = JSON.stringify(layout).toLowerCase();
        return layoutStr.includes('application audit') || layoutStr.includes(applicationAuditsLayoutId);
    });

    console.log('🔍 Layouts mentioning Application Audits:', appAuditLayouts.map(l => ({
        id: l.id,
        title: l.title,
        workflowId: l.workflow?.id,
        workflowName: l.workflow?.name,
        layoutType: l.layoutType,
        keys: Object.keys(l)
    })));

    // Filter layouts to find those related to our workflows
    const relevantLayouts = allLayouts.filter(layout =>
        layout.workflow?.id === applicationsWorkflowSummary.id ||
        layout.workflow?.id === auditsWorkflowSummary?.id
    );

    console.log('🔍 Relevant layouts:', relevantLayouts.map(l => ({
        id: l.id,
        title: l.title,
        workflowId: l.workflow?.id,
        workflowName: l.workflow?.name,
        layoutType: l.layoutType
    })));

    // Find the layout that belongs to Applications workflow and points to Application Audits
    // First try by title
    let applicationLayout = relevantLayouts.find(layout =>
        layout.workflow?.id === applicationsWorkflowSummary.id &&
        (layout.title?.toLowerCase().includes('application audit') ||
         layout.title?.toLowerCase().includes('app audit'))
    );

    // If not found by title, try the first layout that mentions Application Audits
    if (!applicationLayout && appAuditLayouts.length > 0) {
        applicationLayout = appAuditLayouts.find(l => l.workflow?.id === applicationsWorkflowSummary.id);
    }

    if (!applicationLayout) {
        console.warn('⚠️  Specific Application Audits layout not found, trying default approach');
        console.warn('⚠️  Available layouts on Applications workflow:',
            relevantLayouts.filter(l => l.workflow?.id === applicationsWorkflowSummary.id)
                .map(l => ({ id: l.id, title: l.title, layoutType: l.layoutType, defaultLayout: l.defaultLayout }))
        );

        // Try using the default layout for Applications workflow
        applicationLayout = relevantLayouts.find(l =>
            l.workflow?.id === applicationsWorkflowSummary.id && l.defaultLayout === true
        );

        if (!applicationLayout) {
            // If no default, just use the first Display layout
            applicationLayout = relevantLayouts.find(l =>
                l.workflow?.id === applicationsWorkflowSummary.id && l.layoutType === 'Display'
            );
        }

        if (!applicationLayout) {
            throw new Error('No suitable layout found on Applications workflow');
        }

        console.log(`⚠️  Using fallback layout: ${applicationLayout.title} (${applicationLayout.id})`);
    } else {
        console.log(`✅ Found layout: ${applicationLayout.title} (${applicationLayout.id})`);
    }

    // Fetch the Applications workflow steps with fields to find linked workflow sections
    console.log(`🔍 Fetching step fields for Applications workflow to find linked workflow section...`);

    let correctLayout = null;

    for (const step of applicationsWorkflow.steps) {
        const fieldsResponse = await fetch(`${BASE_URL}/api/v2/fields?step-id=${step.id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        if (fieldsResponse.ok) {
            const fieldsData = await fieldsResponse.json();
            const fields = fieldsData.content || [];

            console.log(`🔍 Step "${step.name}" has ${fields.length} total fields`);
            console.log(`🔍 Field types in step:`, [...new Set(fields.map(f => f.type))].join(', '));

            // Look for LINKED_WORKFLOW type fields
            const linkedWorkflowFields = fields.filter(f => f.type === 'LINKED_WORKFLOW');

            if (linkedWorkflowFields.length > 0) {
                console.log(`🔍 Step "${step.name}" has ${linkedWorkflowFields.length} linked workflow field(s):`);

                for (const field of linkedWorkflowFields) {
                    console.log(`  - "${field.name}": Layout ${field.layout?.id || 'N/A'}, Target: ${field.targetWorkflow?.name || 'N/A'} (ID: ${field.targetWorkflow?.id || 'N/A'})`);

                    if (field.targetWorkflow?.id === applicationAuditsLayoutId && field.layout) {
                        correctLayout = field.layout;
                        console.log(`✅ Found Application Audits layout from field "${field.name}": ${correctLayout.id} (${correctLayout.title})`);
                        break;
                    }
                }
            } else {
                console.log(`⚠️  No LINKED_WORKFLOW fields found in step "${step.name}"`);
            }
        } else {
            console.error(`❌ Failed to fetch fields for step ${step.id}: ${fieldsResponse.status}`);
        }

        if (correctLayout) break;
    }

    // Application Audits is a child workflow without an ORIGIN step
    // We need to check if the Audits workflow has a workflow link section for creating Application Audits
    console.log('🔍 Checking if Audits workflow has workflow link for Application Audits...');

    if (!auditsWorkflowSummary) {
        throw new Error('Audits workflow not found');
    }

    const auditsWorkflow = await getWorkflowData(auditsWorkflowSummary.id);

    // Find the CHAIN step in Audits workflow (the "Audit In-Progress" step)
    const auditsChainStep = auditsWorkflow.steps.find(step => step.type === "CHAIN");

    if (!auditsChainStep) {
        throw new Error('CHAIN step not found in Audits workflow');
    }

    console.log(`🔍 Checking form sections on Audits step: ${auditsChainStep.name} (${auditsChainStep.id})`);

    // Try to get form sections from the Audits CHAIN step to find workflow link for Application Audits
    let workflowLink = null;
    let bulkCreateSource = null;

    try {
        const formRes = await fetch(`${BASE_URL}/api/v1/form/sections?step=${auditsChainStep.id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (formRes.ok) {
            const formSections = await formRes.json();
            console.log(`📋 Found ${formSections.length} form sections on Audits step`);
            console.log(`📋 Form sections:`, formSections.map(s => ({ name: s.name, id: s.id, type: s.type })));

            // Look for a section related to Application Audits
            workflowLink = formSections.find(item =>
                item.name?.toLowerCase().includes('application audit') ||
                item.type === 'WORKFLOW_LINK'
            );

            if (workflowLink) {
                console.log(`✅ Found workflow link: ${workflowLink.name} (${workflowLink.id})`);

                // Get bulk create sources for this workflow link
                const sourcesRes = await fetch(`${BASE_URL}/api/v1/bulk-create-workflow-source/section/workflow-link/${workflowLink.id}`, {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (sourcesRes.ok) {
                    const sources = await sourcesRes.json();
                    console.log(`📋 Found ${sources.length} bulk create sources`);
                    if (sources.length > 0) {
                        console.log(`📋 Source details:`, sources.map(s => ({
                            id: s.id,
                            sourceWorkflowId: s.sourceWorkflow?.id,
                            sourceWorkflowName: s.sourceWorkflow?.name,
                            targetWorkflowId: s.targetWorkflow?.id,
                            targetWorkflowName: s.targetWorkflow?.name
                        })));
                    }

                    // Look for a source that targets the Application Audits workflow or uses Applications as source
                    if (sources.length > 0) {
                        // Try to find a source where the sourceWorkflow is Applications
                        bulkCreateSource = sources.find(s => s.sourceWorkflow?.id === applicationsWorkflowSummary?.id);

                        if (!bulkCreateSource) {
                            // Just use the first source if we can't find a specific match
                            bulkCreateSource = sources[0];
                        }

                        console.log(`✅ Using bulk create source: ${bulkCreateSource.id} (source: ${bulkCreateSource.sourceWorkflow?.name}, target: ${bulkCreateSource.targetWorkflow?.name})`);
                    }
                }
            }
        }
    } catch (formError) {
        console.warn(`⚠️  Could not fetch form sections: ${formError.message}`);
    }

    // If we found a workflow link, try to get its layout configuration
    if (workflowLink && auditId) {
        console.log(`🔍 Found workflow link, checking its configuration...`);
        console.log(`📋 Workflow link details:`, JSON.stringify(workflowLink, null, 2));

        // The workflow link should have a workflowId property that tells us which child workflow it links to
        const workflowLinkTargetWorkflowId = workflowLink.workflowId || workflowLink.workflow?.id;
        console.log(`🔍 Workflow link target workflow ID: ${workflowLinkTargetWorkflowId}`);

        // The /child endpoint needs a layout from the PARENT workflow (Audits) that defines
        // the relationship to the child workflow (Application Audits)
        // This layout should be on the Audits workflow and point to Application Audits

        // Find layouts on the Audits workflow
        const auditsLayouts = allLayouts.filter(l => l.workflow?.id === auditsWorkflowSummary.id);
        console.log(`📋 Found ${auditsLayouts.length} layouts on Audits workflow:`, auditsLayouts.map(l => ({
            id: l.id,
            title: l.title,
            layoutType: l.layoutType
        })));

        // The workflow link might have a layoutId in its configuration
        // Let's check all properties of the workflow link to find layout information
        console.log(`🔍 All workflow link properties:`, Object.keys(workflowLink));

        // Look for any property that might contain layout info
        let workflowLinkLayout = null;

        // Check various possible layout properties
        if (workflowLink.layoutId) {
            workflowLinkLayout = workflowLink.layoutId;
            console.log(`✅ Found layoutId on workflow link: ${workflowLinkLayout}`);
        } else if (workflowLink.layout?.id) {
            workflowLinkLayout = workflowLink.layout.id;
            console.log(`✅ Found layout.id on workflow link: ${workflowLinkLayout}`);
        } else if (workflowLink.defaultLayoutId) {
            workflowLinkLayout = workflowLink.defaultLayoutId;
            console.log(`✅ Found defaultLayoutId on workflow link: ${workflowLinkLayout}`);
        }

        if (!workflowLinkLayout) {
            console.warn('⚠️  Workflow link does not have layout information in expected properties');

            // As a fallback, use the default Display layout on Audits workflow
            const auditsDefaultLayout = auditsLayouts.find(l => l.defaultLayout === true && l.layoutType === 'Display');

            if (auditsDefaultLayout) {
                workflowLinkLayout = auditsDefaultLayout.id;
                console.log(`✅ Using default Audits Display layout: ${auditsDefaultLayout.title} (${workflowLinkLayout})`);
            } else {
                // Just use the first Display layout
                const auditsDisplayLayout = auditsLayouts.find(l => l.layoutType === 'Display');
                if (auditsDisplayLayout) {
                    workflowLinkLayout = auditsDisplayLayout.id;
                    console.log(`✅ Using first Audits Display layout: ${auditsDisplayLayout.title} (${workflowLinkLayout})`);
                } else {
                    throw new Error('Could not find a suitable layout on Audits workflow for creating child records');
                }
            }
        }

        // Before creating, let's check what fields exist on the Application Audits CHAIN step
        console.log(`🔍 Fetching fields for Application Audits CHAIN step to see if there are required fields...`);

        const appAuditFieldsResponse = await fetch(`${BASE_URL}/api/v2/fields?step-id=${chainStep.id}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json'
            }
        });

        let requiredFields = [];
        let allFields = [];
        if (appAuditFieldsResponse.ok) {
            const fieldsData = await appAuditFieldsResponse.json();
            allFields = fieldsData.content || [];
            console.log(`📋 Application Audits step has ${allFields.length} fields`);
            console.log(`📋 Field details:`, allFields.map(f => ({
                name: f.name,
                id: f.id,
                type: f.type,
                required: f.required
            })));

            // Check for required fields
            requiredFields = allFields.filter(f => f.required);
            if (requiredFields.length > 0) {
                console.log(`⚠️  Found ${requiredFields.length} required fields:`, requiredFields.map(f => ({
                    name: f.name,
                    id: f.id,
                    type: f.type,
                    required: f.required
                })));
            } else {
                console.log(`✅ No required fields found on Application Audits step`);
            }
        }

        // Use the bulk-create-and-link endpoint exactly like the UI does
        if (!bulkCreateSource) {
            console.warn('⚠️  No bulk create source found via API - using hardcoded value from UI');

            // Hardcoded bulk create source ID observed from the LogicGate UI
            // This is the ID used when clicking "Create Application Audits" button in the UI
            const HARDCODED_BULK_CREATE_SOURCE_ID = 'jnP9gzb6';

            bulkCreateSource = {
                id: HARDCODED_BULK_CREATE_SOURCE_ID
            };

            console.log(`✅ Using hardcoded bulk create source ID: ${bulkCreateSource.id}`);
        }

        console.log(`🔗 Creating Application Audit via bulk-create-and-link`);
        console.log(`📤 Using bulkCreateSourceId: ${bulkCreateSource.id}, parentRecordId: ${auditId}, sourceRecordIds: [${applicationId}]`);

        const bulkCreateUrl = `${BASE_URL}/api/v1/bulk-create-and-link`;
        const bulkCreateRequestBody = {
            bulkCreateSourceId: bulkCreateSource.id,
            parentRecordId: auditId,
            sourceRecordIds: [applicationId]
        };

        console.log('📤 Bulk create request:', JSON.stringify(bulkCreateRequestBody, null, 2));

        const bulkCreateResponse = await fetch(bulkCreateUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bulkCreateRequestBody)
        });

        if (!bulkCreateResponse.ok) {
            const errorBody = await bulkCreateResponse.text();
            console.error(`❌ Failed to bulk create and link: ${bulkCreateResponse.status} ${errorBody}`);
            throw new Error(`Failed to bulk create and link: ${bulkCreateResponse.status} ${errorBody}`);
        }

        console.log(`✅ Successfully initiated bulk create and link for Application Audit`);

        // The bulk create operation is asynchronous, so we return success immediately
        // The actual record creation happens in the background
        return {
            auditId: auditId,
            applicationId: applicationId,
            status: 'created',
            message: 'Application audit creation initiated successfully'
        };
    }

    // If we get here, we couldn't create via workflow link
    if (!auditId) {
        throw new Error('Cannot create application audit without an audit parent - no workflow link layout available');
    }

    throw new Error('Could not determine correct method to create Application Audit record');
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
 * Create a new application audit record
 */
export async function createApplicationAuditRecord(req, res) {
    logRequest(req);

    const { auditId, applicationId } = req.body;

    if (!applicationId) {
        return res.status(400).json(createErrorResponse(req, 'Missing required field: applicationId', 400));
    }

    // Get user email from request headers
    const userEmail = req.headers['x-user-email'] || req.headers['x-ms-client-principal-name'] || req.headers['user-email'];

    if (!userEmail) {
        console.warn('⚠️  No user email found in request headers');
    }

    try {
        const result = await createApplicationAuditRecordData(auditId, applicationId, userEmail);
        const successResponse = createSuccessResponse(req, result);
        return res.status(201).json(successResponse);
    } catch (error) {
        console.error(`❌ Error creating application audit record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}
