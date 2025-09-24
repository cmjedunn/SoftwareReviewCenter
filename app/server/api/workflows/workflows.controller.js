import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;

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

export async function getWorkflows(req, res) {
  logRequest(req);

  let token = await getToken(res);
  if (!token) return;

  const query = new URLSearchParams();

  if (req.body['application-id'])
    query.append('application-id', req.body['application-id']);
  if (req.body['include-jira-workflows'])
    query.append('include-jira-workflows', req.body['include-jira-workflows']);
  if (req.body.page)
    query.append('page', req.body.page);
  if (req.body.size)
    query.append('size', req.body.size);

  const requestUrl = `${BASE_URL}/api/v2/workflows/${req.body.id ? `${req.body.id}` : `?${query}`}`;
  console.log(`🔍 Fetching records from: ${requestUrl}`);

  try {
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

    if (req.body.id) {
      console.log(`✅ Successfully retrieved workflow`);
      const steps = await getSteps(req.body.id, token);

      const response = createSuccessResponse(req, {
        workflow: data,
        steps: steps
      });    

      return res.json(response);
    }

    const workflows = data.content || [];
    const results = [];

    for (const workflow of workflows) {
      try {
        results.push({ id: workflow.id, name: workflow.name });
      } catch (err) {
        console.error(`Error processing workflow ${workflow.id}:`, err);
        results.push({ id: workflow.id, name: workflow.name, message: err.message });
      }
    }

    console.log(`✅ Successfully retrieved ${results.length} workflows`);
    return res.json(results);

  } catch (error) {
    console.error(`❌ Error getting workflows:`, error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}