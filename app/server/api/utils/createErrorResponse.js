/**
 * 
 * @param {*} req 
 * @param {*} error 
 * @param {*} status 
 * @returns 
 */
export function createErrorResponse(req, error, status = 500) {
  return {
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
      timestamp: new Date().toISOString()
    },
    error: error
  };
}