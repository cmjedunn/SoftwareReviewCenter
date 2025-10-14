import { getToken } from '../utils/getToken.js';
import { logRequest } from '../utils/logRequest.js';
import { getWorkflowData, getWorkflowsData } from '../workflows/workflows.controller.js';
import { createErrorResponse } from '../utils/createErrorResponse.js';
import { createSuccessResponse } from '../utils/createSuccessResponse.js';
import { getRecordV1 } from '../utils/getRecordV1.js';

import fs from 'fs';
import path from 'path';

const ENV = process.env.LOGICGATE_ENV;
const BASE_URL = `https://${ENV}.logicgate.com`;
const LOGFILES_ENABLED = process.env.LOGFILES_ENABLED;

/**
 * HELPER FUNCTIONS
 */

async function getFullRecord(recordId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/v2/records/${recordId}`, {
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

    return await response.json();
  } catch (error) {
    console.warn(`⚠️  Error fetching record ${recordId}:`, error.message);
    return null;
  }
}

async function deleteRecordById(recordId, token) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 200 || response.status === 204) {
      return { success: true, status: 'deleted' };
    } else {
      const errorMessage = await response.text();
      return { success: false, status: 'failed', error: errorMessage };
    }
  } catch (error) {
    return { success: false, status: 'failed', error: error.message };
  }
}

async function logRecordToFile(method, recordId, recordData, suffix = '') {
  if (LOGFILES_ENABLED === true) {
    try {
      const logsDir = './logs';
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-MM-SS
      const suffixStr = suffix ? `_${suffix}` : '';

      const filename = `${method}_${recordId}_${dateStr}_${timeStr}${suffixStr}.json`;
      const filepath = path.join(logsDir, filename);

      const logData = {
        timestamp: now.toISOString(),
        method: method,
        recordId: recordId,
        data: recordData
      };

      fs.writeFileSync(filepath, JSON.stringify(logData, null, 2));
      console.log(`📝 Logged record data to: ${filename}`);
    } catch (error) {
      console.error(`❌ Failed to log record ${recordId} to file:`, error.message);
    }
  }
}

async function getRecordsByWorkflow(id, workflowId, token) {
  const query = new URLSearchParams({
    'workflow-id': workflowId,
    depth: '1',
    size: '1000',
  });

  const response = await fetch(
    `${BASE_URL}/api/v2/records/${id}/linked?${query}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch linked records: ${response.status}`);
  }

  const data = await response.json();
  return data.content || [];
}

/**
 * BUSINESS LOGIC FUNCTIONS
 */

export async function getRecordsData(params = {}) {

  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  const query = new URLSearchParams();
  if (params['application-id'])
    query.append('application-id', params['application-id']);
  if (params['workflow-id'])
    query.append('workflow-id', params['workflow-id']);
  if (params['step-id'])
    query.append('step-id', params['step-id']);
  if (params['updated-min'])
    query.append('updated-min', params['updated-min']);
  if (params.page)
    query.append('page', params.page);
  if (params.size)
    query.append('size', params.size);

  const requestUrl = `${BASE_URL}/api/v2/records/${params.id ? `${params.id}` : `?${query}`}`;
  console.log(`🔍 Fetching records from: ${requestUrl}`);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch records: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  console.log(`✅ Successfully retrieved ${Array.isArray(data.content) ? data.content.length : 1} record(s)`);
  return data;
}

export async function getParentRecordData(id, parentWorkflow) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  const record = await getRecordsData({ id: id });

  const requestUrl = `${BASE_URL}api/records/search?parent=${id}&sourceWorkflow=${record.workflow.id}&workflow=${parentWorkflow}&size=1&mapped=True`;
  console.log(`🔍 Fetching parent record of: ${id}`);

  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to fetch parent record: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  console.log(`✅ Successfully retrieved parent record: ${data.id}`);
  return data;
}

export async function updateRecordData(id, fields) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  try {
    const requestUrl = `${BASE_URL}/api/v1/records/${id}`;
    console.log(`⬆️ Updating record: ${id}`);

    const obj = {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',  // ← You're missing this!
      },
      body: JSON.stringify(fields)
    };

    const response = await fetch(requestUrl, obj);

    if (!response.ok) {
      console.warn(`⚠️  Failed to update record ${id}: HTTP ${response.status}`);
      console.log(await response.json());
      return null;
    }
    console.log(`✅ Updated record: ${id}`);
    return await response.json();
  } catch (error) {
    console.warn(`⚠️  Error updating record ${id}:`, error.message);
    return null;
  }
}

export async function submitRecordData(id, step) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  // Get record information
  const record = await getRecordsData({ id: id });
  const workflow = await getWorkflowData(record.workflow.id);
  const nextStepId = (step === step.toUpperCase() && step !== step.toLowerCase()) ? step : workflow.steps.find(step => step.type === step)?.id;
  const recordData = await getRecordV1(id, token);

  // Submit record
  console.log(`☑️  Submitting record: ${id}`);

  const url = `${BASE_URL}/api/v1/records/${id}/progress/applications/${record.application.id}/workflows/${workflow.workflow.id}/steps/${nextStepId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(recordData)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.log('❌ Submit error response:', errorBody);
    throw new Error(`Failed to submit record: ${response.status} ${errorBody}`);
  }

  // Handle potentially empty response
  let data;
  const responseText = await response.text();

  if (responseText.trim() === '') {
    console.log('✅ Submit successful - empty response (normal for submit operations)');
    data = { success: true };
  } else {
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.log('✅ Submit successful - non-JSON response:', responseText);
      data = { success: true, rawResponse: responseText };
    }
  }

  console.log(`✅ Successfully submitted record to step: ${nextStepId}`);
  return {
    id: id,
    step: nextStepId,
    status: 'submitted',
    record: data
  };
}

export async function getLinkedRecordsData(id, linkedWorkflowId, applicationId = null) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  console.log(`🔍 Fetching parent record: ${id}`);

  // Get full parent record details
  const parentRecord = await getFullRecord(id, token);
  if (!parentRecord) {
    throw new Error('Parent record not found');
  }

  console.log(`✅ Retrieved parent record: ${id}`);

  // Build the workflows object directly
  const workflowsObject = {};

  if (!linkedWorkflowId) {
    console.log(`🔍 Fetching linked records for all workflows`);

    // Get all workflows using clean function
    let params;
    if (applicationId != null)
      params = { 'application-id': applicationId, size: 1000 };
    else
      params = { size: 1000 };

    const workflows = await getWorkflowsData(params);

    for (const workflow of workflows) {
      const records = await getRecordsByWorkflow(id, workflow.id, token);
      workflowsObject[workflow.id] = records.map(record => ({
        record: record
      }));
    }

    console.log(`✅ Retrieved linked records for ${workflows.length} workflows`);
  } else {
    if (Array.isArray(linkedWorkflowId)) {
      console.log(`🔍 Fetching linked records for workflows: ${linkedWorkflowId}`);
      let records = [];
      for(const workflow of linkedWorkflowId){
        records = await getRecordsByWorkflow(id, workflow, token);
        workflowsObject[workflow] = records.map(record => ({
        record: record
      }));
      }
      console.log(`✅ Retrieved ${records.length} linked records for workflows ${linkedWorkflowId}`);

    } else {
      console.log(`🔍 Fetching linked records for workflow: ${linkedWorkflowId}`);
      const records = await getRecordsByWorkflow(id, linkedWorkflowId, token);
      workflowsObject[linkedWorkflowId] = records.map(record => ({
        record: record
      }));
      console.log(`✅ Retrieved ${records.length} linked records for workflow ${linkedWorkflowId}`);

    }

  }

  const totalLinkedRecords = Object.values(workflowsObject).reduce((sum, records) => sum + records.length, 0);
  console.log(`✅ Completed - Found ${totalLinkedRecords} linked records across ${Object.keys(workflowsObject).length} workflow(s)`);

  return {
    record: parentRecord,
    linkedRecords: {
      workflow: workflowsObject
    }
  };
}

export async function deleteLinkedRecordsData(id, linkedWorkflowId) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  console.log(`🔍 Fetching linked records for deletion - Record: ${id}, Workflow: ${linkedWorkflowId}`);

  const records = await getRecordsByWorkflow(id, linkedWorkflowId, token);
  console.log(`📊 Found ${records.length} linked records to delete`);

  const results = [];

  for (const record of records) {
    console.log(`🗑️  Deleting linked record: ${record.id}`);

    // Log record before deletion
    await logRecordToFile('DELETE', record.id, record, 'LINKED');

    const deleteResult = await deleteRecordById(record.id, token);

    if (deleteResult.success) {
      console.log(`✅ Successfully deleted linked record: ${record.id}`);
      results.push({ id: record.id, status: 'deleted' });
    } else {
      console.log(`❌ Failed to delete linked record ${record.id}: ${deleteResult.error}`);
      results.push({ id: record.id, status: 'failed', message: deleteResult.error });
    }

    // Add delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 120));
  }

  const successCount = results.filter(r => r.status === 'deleted').length;
  console.log(`✅ Deletion complete - Successfully deleted ${successCount}/${records.length} linked records`);

  return {
    successCount,
    results
  };
}

export async function deleteRecordData(id, workflowIds = []) {
  let token = await getToken();
  if (!token) throw new Error('Failed to get authentication token');

  let records = !Array.isArray(id) ? [id] : id;
  console.log(`📊 Processing ${records.length} record(s) for deletion`);

  const processRecord = async (recordId) => {
    console.log(`🔄 Processing record: ${recordId}`);

    const recordResult = {
      status: '',
      record: null,
      linkedRecords: { workflow: {} }
    };

    try {
      // Get full parent record details
      const parentRecord = await getFullRecord(recordId, token);
      if (!parentRecord) {
        console.log(`❌ Record ${recordId} not found`);
        recordResult.status = 'failed';
        recordResult.record = { id: recordId, error: 'Record not found' };
        return recordResult;
      }

      recordResult.record = parentRecord;

      // Initialize workflow objects for all requested workflows
      workflowIds.forEach(workflowId => {
        recordResult.linkedRecords.workflow[workflowId] = [];
      });

      let allChildrenDeleted = true;

      // Process linked records if workflows specified
      if (workflowIds.length > 0) {
        console.log(`🔍 Processing ${workflowIds.length} workflow(s) for record ${recordId}: ${workflowIds.join(', ')}`);

        // Get linked records using clean internal call
        const linkedRecordsResponse = await getLinkedRecordsData(recordId, workflowIds);

        // Extract available workflows from response
        const availableWorkflows = Object.keys(linkedRecordsResponse.linkedRecords.workflow);
        console.log(`📋 Available workflows for record ${recordId}: ${availableWorkflows.join(', ')}`);

        // Validate all requested workflow IDs exist
        const invalidWorkflows = workflowIds.filter(workflowId =>
          !availableWorkflows.includes(workflowId)
        );

        if (invalidWorkflows.length > 0) {
          console.log(`❌ Invalid workflow IDs for record ${recordId}: ${invalidWorkflows.join(', ')}`);
          recordResult.status = 'failed';
          recordResult.error = `Invalid workflow IDs: ${invalidWorkflows.join(', ')}. Available workflows: ${availableWorkflows.join(', ')}`;
          return recordResult;
        }

        console.log(`✅ All workflow IDs validated for record ${recordId}`);

        // Extract workflow data from response
        const workflowData = linkedRecordsResponse.linkedRecords.workflow;

        // Process each workflow sequentially
        for (const workflowId of workflowIds) {
          const linkedRecords = workflowData[workflowId] || [];
          console.log(`🔄 Processing workflow ${workflowId}: ${linkedRecords.length} linked record(s)`);

          if (linkedRecords.length === 0) {
            continue;
          }

          const workflowResults = [];

          // Process linked records sequentially to avoid rate limiting
          for (const linkedRecordItem of linkedRecords) {
            const linkedRecord = linkedRecordItem.record;
            console.log(`🗑️  Deleting linked record: ${linkedRecord.id} from workflow ${workflowId}`);

            // Log record before deletion
            await logRecordToFile('DELETE', linkedRecord.id, linkedRecord, `LINKED_${workflowId}`);

            const deleteResult = {
              status: '',
              record: linkedRecord
            };

            // Add delay between API calls to respect rate limits
            await new Promise(resolve => setTimeout(resolve, 120));

            const result = await deleteRecordById(linkedRecord.id, token);

            if (result.success) {
              deleteResult.status = 'deleted';
              console.log(`✅ Successfully deleted linked record: ${linkedRecord.id}`);
            } else {
              deleteResult.status = 'failed';
              deleteResult.error = result.error;
              allChildrenDeleted = false;
              console.log(`❌ Failed to delete linked record ${linkedRecord.id}: ${result.error}`);
            }

            workflowResults.push(deleteResult);
          }

          recordResult.linkedRecords.workflow[workflowId] = workflowResults;

          const successfulDeletes = workflowResults.filter(r => r.status === 'deleted').length;
          console.log(`📊 Workflow ${workflowId} complete: ${successfulDeletes}/${linkedRecords.length} linked records deleted`);
        }
      }

      // Only delete parent record if all children were successfully deleted
      if (workflowIds.length > 0 && !allChildrenDeleted) {
        recordResult.status = 'failed';
        recordResult.error = 'Parent record not deleted because one or more child records failed to delete';
        console.log(`❌ Skipping parent record deletion for ${recordId} - child deletion failures`);
        return recordResult;
      }

      // Delete the parent record
      console.log(`🗑️  Deleting parent record: ${recordId}`);

      // Log record before deletion
      await logRecordToFile('DELETE', recordId, parentRecord, 'PARENT');

      // Add delay before parent deletion
      await new Promise(resolve => setTimeout(resolve, 200));

      const result = await deleteRecordById(recordId, token);

      if (result.success) {
        recordResult.status = 'deleted';
        console.log(`✅ Successfully deleted parent record: ${recordId}`);
      } else {
        recordResult.status = 'failed';
        recordResult.error = result.error;
        console.log(`❌ Failed to delete parent record ${recordId}: ${result.error}`);
      }

      return recordResult;

    } catch (error) {
      console.error(`❌ Error processing record ${recordId}:`, error.message);
      recordResult.status = 'failed';
      recordResult.error = error.message;
      recordResult.record = recordResult.record || { id: recordId, error: 'Processing failed' };
      return recordResult;
    }
  };

  const processedRecords = [];

  // Process each record sequentially to avoid overwhelming the API
  for (let recordIndex = 0; recordIndex < records.length; recordIndex++) {
    const recordId = records[recordIndex];
    console.log(`🔄 Processing record ${recordIndex + 1}/${records.length}: ${recordId}`);

    try {
      const recordResult = await processRecord(recordId);
      processedRecords.push(recordResult);
    } catch (error) {
      console.error(`❌ Failed to process record ${recordId}:`, error.message);
      processedRecords.push({
        status: 'failed',
        record: { id: recordId, error: 'Processing failed' },
        linkedRecords: { workflow: {} },
        error: error.message || 'Unknown error processing record'
      });
    }

    // Add delay between records to further respect rate limits
    if (recordIndex < records.length - 1) {
      console.log(`⏳ Waiting 1 second before next record...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Calculate success and failure counts
  let successCount = 0;
  let failureCount = 0;

  processedRecords.forEach(record => {
    if (record.status === 'deleted') {
      successCount++;
    } else if (record.status === 'failed') {
      failureCount++;
    }

    // Count linked record statuses
    Object.values(record.linkedRecords.workflow).forEach(workflowRecords => {
      workflowRecords.forEach(linkedRecord => {
        if (linkedRecord.status === 'deleted') {
          successCount++;
        } else if (linkedRecord.status === 'failed') {
          failureCount++;
        }
      });
    });
  });

  console.log(`✅ Delete operation complete - Successes: ${successCount}, Failures: ${failureCount}`);

  return {
    records: processedRecords,
    successes: successCount,
    failures: failureCount
  };
}

/**
 * ENDPOINT FUNCTIONS
 */

export async function getRecords(req, res) {
  logRequest(req);

  try {
    const data = await getRecordsData(req.body);
    return res.json(data);
  } catch (error) {
    console.error('❌ Error getting records:', error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function getParentRecord(req, res) {
  logRequest(req);

  try {
    const data = await getParentRecordData(req.body);
    return res.json(data);
  } catch (error) {
    console.error('❌ Error getting records:', error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function updateRecord(req, res) {
  logRequest(req);

  try {
    const data = await updateRecordData(req.body);
    return res.json(data);
  } catch (error) {
    console.error('❌ Error getting records:', error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function submitRecord(req, res) {
  logRequest(req);

  try {
    const data = await submitRecordData(req.body);
    return res.json(data);
  } catch (error) {
    console.error('❌ Error submitting record:', error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function getLinkedRecords(req, res) {
  logRequest(req);

  const { id, linkedWorkflowId } = req.body;

  try {
    const result = await getLinkedRecordsData(id, linkedWorkflowId);
    const response = createSuccessResponse(req, result);
    return res.json(response);
  } catch (error) {
    if (error.message === 'Parent record not found') {
      console.log(`❌ Parent record ${id} not found`);
      return res.status(404).json(createErrorResponse(req, 'Parent record not found', 404));
    }
    console.error(`❌ Error getting linked records for ${id}:`, error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function restoreRecord(req, res) {
  logRequest(req);

  console.log(`⚠️  Restore functionality not yet implemented`);
  return res.status(501).json(createErrorResponse(req, 'Not implemented yet', 501));
}

export async function deleteLinkedRecords(req, res) {
  logRequest(req);

  const { id, linkedWorkflowId } = req.body;

  if (!id || !linkedWorkflowId) {
    console.log('❌ Missing required parameters: id or linkedWorkflowId');
    return res.status(400).json(createErrorResponse(req, 'Missing id or linkedWorkflowId', 400));
  }

  try {
    const result = await deleteLinkedRecordsData(id, linkedWorkflowId);
    return res.json(result);
  } catch (error) {
    console.error(`❌ Error deleting linked records for ${id}:`, error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}

export async function deleteRecord(req, res) {
  logRequest(req);

  const { id, workflowIds = [] } = req.body;

  if (!id) {
    console.log('❌ Missing required parameter: id');
    return res.status(400).json(createErrorResponse(req, 'Missing id', 400));
  }

  try {
    const result = await deleteRecordData(id, workflowIds);
    const response = createSuccessResponse(req, result);
    return res.json(response);
  } catch (error) {
    console.error('❌ Error during delete operation:', error.message);
    return res.status(500).json(createErrorResponse(req, error.message));
  }
}