import { getLogicGateAccessToken } from '../../auth/tokenManager.js';

const ENV = process.env.LOGICGATE_ENV;
const TOKEN = getLogicGateAccessToken();import dotenv from 'dotenv';
const BASE_URL = `https://${ENV}.logicgate.com`;

export async function getRectords(req, res) {
  const query = new URLSearchParams();
  console.log(req.body['workflow-id']);

  if (req.body['application-id'])
    query.append('application-id', req.body['application-id']);

  if (req.body['workflow-id'])
    query.append('workflow-id', req.body['workflow-id']);

  if (req.body['step-id'])
    query.append('step-id', req.body['step-id']);

  if (req.body['updated-min'])
    query.append('updated-min', req.body['updated-min']);

  if (req.body.page)
    query.append('page', req.body.page);

  if (req.body.size)
    query.append('size', req.body.size);

  try {
    const response = await fetch(
      `${BASE_URL}/api/v2/records?${query}`,
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
      throw new Error(`Failed to fetch records: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const records = data.content || [];

    const results = [];

    for (const record of records) {
      try {
        results.push({ id: record.id, name: record.name });
      } catch (err) {
        results.push({ id: record.id, name: record.name, message: err.message });
      }
    }

    return res.json(results);

  } catch (error) {

    console.error('Error getting records:', error);

    return res.status(500).json({ error: error.message });
  }
}

export async function deleteLinkedRecords(req, res) {
  const { parentId, linkedWorkflowId } = req.body;

  if (!parentId || !linkedWorkflowId) {
    console.log('🔴 Missing params');
    return res.status(400).json({ error: 'Missing parentId or linkedWorkflowId' });
  }

  try {
    const query = new URLSearchParams({
      'workflow-id': linkedWorkflowId,
      depth: '1',
      size: '300',
    });

    const response = await fetch(
      `${BASE_URL}/api/v2/records/${parentId}/linked?${query}`,
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
      throw new Error(`Failed to fetch linked records: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const records = data.content || [];

    const results = [];

    for (const record of records) {
      try {
        const delResp = await fetch(`${BASE_URL}/api/v1/records/${record.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: TOKEN,
            Accept: 'application/json',
          },
        });

        if (delResp.status === 204) {
          results.push({ id: record.id, status: 'deleted' });
        } else {
          const msg = await delResp.text();
          results.push({ id: record.id, status: 'failed', message: msg });
        }
      } catch (err) {
        results.push({ id: record.id, status: 'failed', message: err.message });
      }
    }

    return res.json({ successCount: results.filter(r => r.status === 'deleted').length, results });
  } catch (error) {
    console.error('Error deleting records:', error);
    return res.status(500).json({ error: error.message });
  }
}
