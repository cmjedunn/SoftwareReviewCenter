import { getToken } from '../../utils/getToken.js';
import { logRequest } from '../../utils/logRequest.js';
import { createErrorResponse } from '../../utils/createErrorResponse.js';
import { createSuccessResponse } from '../../utils/createSuccessResponse.js';
import { getWorkflowData, getWorkflowsData } from '../../workflows/workflows.controller.js';
import { getRecordsData } from '../records.controller.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const APPLICATIONS_ID = process.env.APPLICATIONS_ID;
const SCF_ID = process.env.SCF_ID;


/**
 * HELPER FUNCTIONS
 */

export async function getEnvironmentRecordsData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get application workflows
    const applicationWorkflows = await getWorkflowsData({ 'application-id': APPLICATIONS_ID });

    // Get environment workflow
    const environmentWorkflow = await getWorkflowData(applicationWorkflows.find(item => item.name === "Environments")?.id);

    // Get environment records
    return await getRecordsData({ id: id, 'workflow-id': environmentWorkflow.workflow.id, size: 1000 });
}

/**
 * Function to get the control framework workflow id's of a specific enviornment.
 * 
 * This works in a really wierd but super smart way and depends on the 2d layout that you see in Logicgate's build applications section.
 * It will compare the string with no spaces to find the best matching control workflow who's name includes the text value,
 * the lowest xpos, ypos, and also contains the word "Controls".
 * 
 * THIS MEANS PLEASE DONT F WITH THE LAYOUTS INSIDE OF LOGICGATE OR YOU WILL BREAK THINGS
 * 
 * AND YOU DONT WANT TO HAVE TO DELETE A WHOLE BUNCH OF RECORDS BY HAND NOW DO YOU >:(
 * 
 * @param {*} id 
 * @returns 
 */
export async function getEnvironmentControlFrameworksData(id) {
    let token = await getToken();
    if (!token) throw new Error('Failed to get authentication token');

    // Get the enviornment
    const environment = await getEnvironmentRecordsData(id);

    // Get the names of the control workflows
    const applicableControlFrameworks = environment.fields.find(item => item.name === "Applicable Control Frameworks")?.values

    // Get control framework workflows from SCF application
    const scfWorkflows = await getWorkflowsData({ 'application-id': SCF_ID });

    let controlFrameworkWorkflows = [];

    for (const cf of applicableControlFrameworks) {
        //console.log(JSON.stringify(cf));

        const matchingWorkflows = scfWorkflows.filter(item =>
            item.name?.includes(cf.textValue.replaceAll(" ", "")) &&
            item.name?.includes("Controls")
        );

        console.log('🐛 DEBUG - matchingWorkflows found:', matchingWorkflows.length);
        console.log('🐛 DEBUG - matchingWorkflows:', matchingWorkflows);

        if (matchingWorkflows.length > 0) {
            // Sort by xpos first (ascending), then ypos (ascending)
            const bestMatch = matchingWorkflows.sort((a, b) => {
                if (a.xpos !== b.xpos) return (a.xpos || 0) - (b.xpos || 0);
                return (a.ypos || 0) - (b.ypos || 0);
            })[0];

            console.log('🐛 DEBUG - bestMatch:', bestMatch);
            controlFrameworkWorkflows.push(await getWorkflowData(bestMatch.id));
        } else {
            controlFrameworkWorkflows.push(null);
        }
    }

    console.log('🐛 Found Control Framework Workflows: ', controlFrameworkWorkflows);

    return controlFrameworkWorkflows;
}

/**
 * ENDPOINT FUNCTIONS
 */

export async function getEnvironmentRecords(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await getEnvironmentRecordsData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting environment record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}

export async function getEnvironmentControlFrameworks(req, res) {
    logRequest(req);

    const id = req.params.id || null;

    try {
        const result = await getEnvironmentControlFrameworksData(id);
        const successResponse = createSuccessResponse(req, result);
        return res.status(200).json(successResponse);
    } catch (error) {
        console.error(`❌ Error getting environment record:`, error.message);
        return res.status(500).json(createErrorResponse(req, error.message));
    }
}