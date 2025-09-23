## Bild Commands ##
docker-compose build --no-cache jed_srcenter && docker tag cmjedunn/jed_srcenter:latest cmjedunn/jed_software_review_center:alpha1.0.0 && docker push cmjedunn/jed_software_review_center:alpha1.0.0

# LogicGate Record Management API

This API provides endpoints for managing LogicGate records with comprehensive backup and validation capabilities.

## Security Notice

⚠️ **CRITICAL**: Delete operations are permanent and irreversible. LogicGate provides no native recovery mechanisms. All delete endpoints include mandatory pre-deletion backup validation to enable manual record recreation.

## Authentication

All endpoints require a valid LogicGate API token obtained through the `getLogicGateAccessToken()` function.

## Endpoints

### 1. Get Records

Retrieve records from LogicGate with optional filtering parameters.

**Endpoint:** `POST /api/records/get`  
**Method:** `POST`

#### Request Body

```json
{
  "application-id": "string (optional)",
  "workflow-id": "string (optional)", 
  "step-id": "string (optional)",
  "updated-min": "string (optional)",
  "page": "number (optional)",
  "size": "number (optional)",
  "id": "string (optional)"
}
```

#### Response

```json
[
  {
    "id": "string",
    "name": "string",
    "message": "string (if error occurred)"
  }
]
```

#### Parameters

- **application-id**: Filter records by LogicGate application ID
- **workflow-id**: Filter records by workflow ID
- **step-id**: Filter records by step ID
- **updated-min**: Filter records updated after specified timestamp (milliseconds since Unix epoch)
- **page**: Page number for pagination
- **size**: Number of records per page
- **id**: Specific record ID to retrieve

---

### 2. Delete Linked Records

Delete all linked records from a specific workflow connected to a parent record.

**Endpoint:** `POST /api/records/delete-linked`  
**Method:** `POST`

#### Request Body

```json
{
  "parentId": "string (required)",
  "linkedWorkflowId": "string (required)"
}
```

#### Response

```json
{
  "successCount": "number",
  "results": [
    {
      "id": "string",
      "status": "deleted|failed",
      "message": "string (if failed)"
    }
  ]
}
```

#### Parameters

- **parentId**: ID of the parent record whose linked records should be deleted
- **linkedWorkflowId**: Specific workflow ID to delete linked records from

#### Status Codes

- **200**: Operation completed (check individual record status in results)
- **400**: Missing required parameters
- **500**: Authentication or server error

---

### 3. Delete Record (Comprehensive)

**⚠️ EXTREMELY DANGEROUS OPERATION ⚠️**

Delete a record with optional linked record deletion across specified or all workflows. Includes mandatory backup validation and security controls.

**Endpoint:** `POST /api/records/delete`  
**Method:** `POST`

#### Request Body

```json
{
  "recordId": "string (required)",
  "workflowIds": ["string"] (optional),
  "deleteAllLinked": "boolean (optional, default: false)",
  "apiToken": "string (required if deleteAllLinked is true)"
}
```

#### Response

**Success Response:**
```json
{
  "success": true,
  "summary": {
    "recordId": "string",
    "deletionMode": "ALL_WORKFLOWS|SPECIFIC_WORKFLOWS|PARENT_ONLY",
    "targetWorkflowIds": "ALL|[string]",
    "totalWorkflowsScanned": "number",
    "totalRecordsProcessed": "number",
    "linkedRecordsFound": "number",
    "successfulDeletions": "number",
    "failedDeletions": "number",
    "linkedDeleted": "number",
    "parentDeleted": "boolean",
    "backupValidation": {
      "totalErrors": "number",
      "totalWarnings": "number",
      "hasParentData": "boolean",
      "hasLinkedRecords": "boolean",
      "hasAttachments": "boolean",
      "restorationViability": "VIABLE|BLOCKED"
    },
  "relationshipResults": [
    {
      "success": "boolean",
      "parentId": "string",
      "childId": "string",
      "method": "admin-link-by-identifiers|parent-link-with-layout|null",
      "error": "string|null",
      "context": {
        "originalParentId": "string",
        "originalChildId": "string", 
        "workflowName": "string",
        "workflowId": "string"
      }
    }
  ],
    "backupLog": {
      "fileName": "string",
      "filePath": "string",
      "validationErrors": "number",
      "validationWarnings": "number"
    },
    "workflowBreakdown": [
      {
        "workflowId": "string",
        "workflowName": "string", 
        "recordsFound": "number",
        "recordsDeleted": "number"
      }
    ]
  },
  "results": [
    {
      "id": "string",
      "type": "parent|linked",
      "workflowId": "string (for linked records)",
      "workflowName": "string (for linked records)",
      "status": "deleted|failed",
      "message": "string (if failed)"
    }
  ],
  "backupInfo": {
    "path": "string",
    "validated": true,
    "warnings": ["string"]
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "string",
  "validationErrors": ["string"] (if backup validation failed),
  "validationWarnings": ["string"] (if backup validation failed),
  "backupPath": "string (if backup was created)"
}
```

#### Parameters

- **recordId**: ID of the parent record to delete (always deleted)
- **workflowIds**: Array of specific workflow IDs to delete linked records from
- **deleteAllLinked**: If true, deletes linked records from ALL workflows (requires API token)
- **apiToken**: LogicGate Bearer token (required only when deleteAllLinked is true)

#### Deletion Modes

1. **PARENT_ONLY**: Only deletes the specified parent record
   ```json
   {"recordId": "12345"}
   ```

2. **SPECIFIC_WORKFLOWS**: Deletes parent record + linked records from specified workflows
   ```json
   {"recordId": "12345", "workflowIds": ["456", "789"]}
   ```

3. **ALL_WORKFLOWS**: Deletes parent record + ALL linked records (requires Bearer token)
   ```json
   {"recordId": "12345", "deleteAllLinked": true, "apiToken": "your_bearer_token"}
   ```

#### Status Codes

- **200**: Operation completed successfully
- **400**: Missing required parameters or backup validation failed
- **401**: Unauthorized (invalid or missing API token for deleteAllLinked)
- **500**: Server error or backup creation failed

#### Security Features

- **Mandatory Backup Creation**: Creates timestamped backup logs before any deletion
- **Pre-Deletion Validation**: Verifies backup contains restoration-essential data
- **Token Authorization**: deleteAllLinked operations require valid LogicGate Bearer token
- **Operation Blocking**: Aborts deletion if backup validation fails

#### Backup Validation

The system validates backups contain essential data and blocks deletion if critical validation errors are found:

**Critical Errors (Block Deletion):**
- Parent record data missing from both v1 and v2 APIs
- Parent record missing workflow ID (required for recreation)
- Linked records missing essential restoration data

**Warnings (Allow Deletion):**
- Records contain attachments (file content cannot be restored)
- Calculated fields present (will regenerate with different values)
- Missing optional fields or metadata

#### Backup File Structure

Backup files are created at `logs/record-deletions/DELETE_RECORD_YYYY-MM-DD_HH-mm-ss.json` and contain:

- **Complete record data** in both v1 and v2 API formats
- **Workflow metadata** for recreation context  
- **Linked record relationships** and hierarchy
- **Restoration instructions** and limitations
- **Validation results** with error/warning details

#### Restoration Limitations

**Important**: Complete record restoration is impossible due to LogicGate architecture:

- System-generated fields (IDs, timestamps) cannot be restored
- Record relationships must be manually recreated
- Attachment files are not backed up (metadata only)
- Calculated fields will regenerate with potentially different values
- Restored records receive new IDs, breaking existing references

### 4. Restore Record

Recreate records from backup log files created by delete operations. Attempts to restore parent and linked records with new IDs.

**Endpoint:** `POST /api/records/restore`  
**Method:** `POST`

#### Request Body

```json
{
  "backupFileName": "DELETE_RECORD_YYYY-MM-DD_HH-mm-ss.json (required)",
  "restoreRelationships": "boolean (optional, default: true)"
}
```

#### Response

**Success Response:**
```json
{
  "success": true,
  "summary": {
    "backupFileName": "string",
    "originalDeletionDate": "ISO timestamp",
    "restorationDate": "ISO timestamp", 
    "totalRecordsAttempted": "number",
    "successfulRestorations": "number",
    "failedRestorations": "number",
    "parentRecordRestored": "boolean",
    "linkedRecordsRestored": "number",
    "relationshipRestoration": {
      "enabled": "boolean",
      "totalAttempts": "number",
      "successfulLinks": "number", 
      "failedLinks": "number",
      "methodsUsed": ["string"]
    },
  },
  "restorationResults": [
    {
      "success": "boolean",
      "originalId": "string",
      "newId": "string|null",
      "recordType": "parent|linked",
      "workflowName": "string (for linked records)",
      "transformationNotes": ["string"],
      "error": "string|null"
    }
  ],
  "idMappings": [
    {
      "originalId": "string",
      "newId": "string", 
      "recordType": "parent|linked",
      "workflowName": "string|null"
    }
  ],
  "limitations": [
    "Records received new IDs - original IDs are permanently lost",
    "System fields (timestamps, calculated fields) regenerated with current values",
    "Attachment files not restored - manual re-upload required", 
    "Record relationships not recreated - manual linking required"
  ],
  "manualStepsRequired": [
    "Update external references using ID mappings provided",
    "Recreate record relationships between restored records",
    "Re-upload attachment files if needed",
    "Verify calculated field values and workflow positioning"
  ]
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "string",
  "backupFileName": "string",
  "validationErrors": ["string"] (if backup validation failed)
}
```

#### Parameters

- **backupFileName**: Name of backup file to restore from (must follow DELETE_RECORD_*.json format)

#### Restoration Process

1. **Backup File Validation**: Verifies file exists and contains valid restoration data
2. **Parent Record Creation**: Recreates the main record with transformed field data
3. **Linked Records Creation**: Recreates all linked records found in backup
4. **Restoration Logging**: Creates comprehensive log with RESTORED_DELETED_RECORD_* naming

#### Field Transformation Rules

**Restored Fields:**
- Custom field values (text, numeric, select options)
- Basic field data compatible with POST format

**Skipped Fields:**
- System-generated fields (IDs, timestamps, status)
- Calculated fields (will regenerate with current values)
- Attachment fields (file content not backed up)
- System metadata (assignee, workflow positioning)

#### Status Codes

- **200**: Restoration completed (check individual record results)
- **400**: Invalid backup filename or backup validation failed
- **500**: Authentication failure or critical restoration error

#### Important Limitations

**Complete Restoration Impossible:**
- All restored records receive **new IDs** (original IDs permanently lost)
- **System fields regenerate** with current timestamps and calculated values
- **Attachment files not restored** (metadata only - manual re-upload required)
- **Record relationships not recreated** (manual linking using new IDs required)

**Data Transformation:**
- Field values transformed from GET format to POST-compatible format  
- Some field type mappings may not be perfect
- Complex field types may require manual adjustment

#### Restoration Logs

Creates detailed restoration log at `logs/record-deletions/RESTORED_DELETED_RECORD_*.json` containing:

- **Complete restoration results** with success/failure details
- **ID mapping table** for updating external references
- **Transformation notes** for each record
- **Manual steps required** for complete recovery
- **Field-level restoration details**

#### Manual Recovery Steps

After successful restoration:

1. **Update External References**: Use ID mappings to update any external systems
2. **Recreate Relationships**: Manually link restored records using new IDs
3. **Re-upload Attachments**: Attachment files must be manually re-uploaded
4. **Verify Field Values**: Check calculated fields and complex data types
5. **Adjust Workflow Position**: Records may need workflow repositioning

All endpoints include comprehensive error handling:

- **Authentication failures** return 500 status with error details
- **Parameter validation** returns 400 status for missing required fields
- **LogicGate API errors** are passed through with original status codes
- **Backup validation failures** block operations and return detailed error information

## Rate Limiting

Operations respect LogicGate's API rate limits (approximately 10 requests per second). Large-scale deletions across multiple workflows may take considerable time due to sequential processing requirements.

## Logging

All operations include detailed console logging:
- Request parameter validation
- API call results and status codes
- Backup creation and validation results
- Individual record deletion outcomes
- Comprehensive operation summaries

## Support

For issues related to record restoration from backup files, consult the restoration instructions included in each backup log file. Note that restoration requires manual API calls and relationship recreation due to LogicGate's permanent deletion architecture.