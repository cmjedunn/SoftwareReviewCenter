import { getLogicGateAccessToken } from '../../auth/tokenManager.js';

const ENV = process.env.LOGICGATE_ENV;
const TOKEN = getLogicGateAccessToken();import dotenv from 'dotenv';
const BASE_URL = `https://${ENV}.logicgate.com`;


export async function getWorkflows(req, res) {
  const query = new URLSearchParams();

  if (req.body['application-id'])
    query.append('application-id', req.body['application-id']);

  if (req.body['include-jira-workflows'])
    query.append('include-jira-workflows', req.body['include-jira-workflows']);

  if (req.body.page)
    query.append('page', req.body.page);

  if (req.body.size)
    query.append('size', req.body.size);

  try {
    const response = await fetch(
      `${BASE_URL}/api/v2/workflows?${query}`,
      {
        method: 'GET',
        headers: {
          Authorization: TOKEN,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Failed to fetch workflows: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const workflows = data.content || [];

    const results = [];

    for (const workflow of workflows) {
      try {
        results.push({ id: workflow.id, name: workflow.name });
      } catch (err) {
        results.push({ id: workflow.id, name: workflow.name, message: err.message });
      }
    }

    return res.json(results);

  } catch (error) {

    console.error('Error getting workflows:', error);

    return res.status(500).json({ error: error.message });
  }
}
