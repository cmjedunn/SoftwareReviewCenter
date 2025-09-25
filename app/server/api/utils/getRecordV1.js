const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;

export async function getRecordV1(recordId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/records/${recordId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  Failed to fetch record ${recordId}: HTTP ${response.status}`);
      return null;
    }

    const jsonData = await response.json();
    //console.log(JSON.stringify(jsonData)); // Use the parsed JSON data

    return jsonData;

  } catch (error) {
    console.warn(`⚠️  Error fetching record ${recordId}:`, error.message);
    return null;
  }
}