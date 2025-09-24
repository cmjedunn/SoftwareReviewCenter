/**
 * logRequests to console.
 * @param {*} req 
 */
export function logRequest(req) {
  console.log(`🚀 ${req.method} ${req.url} - Started`);
  console.log(`📋 Request body: ${JSON.stringify(req.body, null, 2)}`);
}