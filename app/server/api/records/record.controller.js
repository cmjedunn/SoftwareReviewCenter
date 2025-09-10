import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://atheneum.logicgate.com';
const TOKEN = `Bearer SlhwMUVWVWo6ZUljT3hVSVI4em1UNFMwdjU5d09DY1l3RHc5emJiY2Q`//`Bearer ${process.env.LOGICGATE_API_TOKEN}`;

export async function deleteLinkedRecords(req, res) {
  console.log('🟢 deleteLinkedRecords hit');
  console.log('🟡 req.body:', req.body);
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
        },      }
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
    console.error('❌ Error deleting records:', error);
    return res.status(500).json({ error: error.message });
  }
}
