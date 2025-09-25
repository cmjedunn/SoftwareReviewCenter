import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;

/**
 * HELPER FUNCTIONS
 */

async function getSteps(workflowId, token) {
  const query = new URLSearchParams();
  query.append('workflow-id', workflowId);
  query.append('size', 1000);

  try {
    const response = await fetch(`${BASE_URL}/api/v2/steps?${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️  Failed to fetch steps for workflow: ${workflowId}: HTTP ${response.status} ${errorText}`);
      return null;
    }

    const data = await response.json();
    const steps = data.content || [];

    console.log(`✅ Completed - Found ${steps.length} associated steps with workflow: ${workflowId}`);

    return steps;

  } catch (error) {
    console.warn(`⚠️  Failed to fetch steps for workflow: ${workflowId}:`, error.message);
    return null;
  }
}

export async function getWorkflowData(workflowId) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  const requestUrl = `${BASE_URL}/api/v2/workflows/${workflowId}`;
  console.log(`🔍 Fetching single workflow from: ${requestUrl}`);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch workflow: ${response.status} ${errorBody}`);
  }

  const workflow = await response.json();
  console.log(`✅ Successfully retrieved workflow`);

  const steps = await getSteps(workflowId, token);

  return {
    workflow: workflow,
    steps: steps
  };
}

export async function getWorkflowsData(params = {}) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  const query = new URLSearchParams();

  if (params['application-id'])
    query.append('application-id', params['application-id']);
  if (params['include-jira-workflows'])
    query.append('include-jira-workflows', params['include-jira-workflows']);
  if (params.page)
    query.append('page', params.page);
  if (params.size)
    query.append('size', params.size);

  const requestUrl = `${BASE_URL}/api/v2/workflows?${query}`;
  console.log(`🔍 Fetching workflows from: ${requestUrl}`);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch workflows: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  const workflows = data.content || [];
  const results = [];

  for (const workflow of workflows) {
    try {
      results.push(workflow);
    } catch (err) {
      console.error(`Error processing workflow ${workflow.id}:`, err);
      results.push({ id: workflow.id, name: workflow.name, message: err.message });
    }
  }

  console.log(`✅ Successfully retrieved ${results.length} workflows`);
  return results;
}

/**
 * ENDPOINT FUNCTIONS
 */

export async function getWorkflows(req, res) {
  logRequest(req);

  try {
    // Handle single workflow request (with steps)
    if (req.body.id) {
      const result = await getWorkflowData(req.body.id);
      const response = createSuccessResponse(req, result);
      return res.json(response);
    }

    // Handle multiple workflows request
    const results = await getWorkflowsData(req.body);
    return res.json(results);

  } catch (error) {
    console.error(`❌ Error getting workflows:`, error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}