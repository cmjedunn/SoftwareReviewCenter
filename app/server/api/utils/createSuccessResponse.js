/**
 * 
 * @param {*} req 
 * @param {*} data 
 * @returns 
 */
export function createSuccessResponse(req, data) {
  return {
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
      timestamp: new Date().toISOString()
    },
    ...data
  };
}