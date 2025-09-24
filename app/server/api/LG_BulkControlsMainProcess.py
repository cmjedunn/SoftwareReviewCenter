import requests
import json
import logging
import time
import sys
from datetime import datetime

# Configure logging for Azure Automation
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Log to stdout for Azure Automation runbook logs
logger = logging.getLogger()
if not any(isinstance(h, logging.StreamHandler) for h in logger.handlers):
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

logging.info("Starting LogicGate Atheneum API script in Azure Automation")

# Check argument count
if len(sys.argv) < 26:
    error_msg = f"Error: Not enough arguments provided. Expected 25 arguments, received {len(sys.argv) - 1}."
    logging.error(error_msg)
    print(json.dumps({
        "status": "Failed", 
        "error": error_msg,
        "expected": 25,
        "received": len(sys.argv) - 1
    }))
    sys.exit(1)

# Global Variables
base_url_v1 = "https://atheneum.logicgate.com/api/v1"
base_url_v2 = "https://atheneum.logicgate.com/api/v2"

jsonOutput = {
    "appExists": "",
    "userExists": "",
    "createAppRecord": "",
    "linkToEnvironment": "",
    "submitAppRecord": "",
    "controlWorkflows": [],
    "bulkLinksCreated": 0,
    "controlInstancesCreated": 0,
    "controlsSubmitted": 0,
    "errors": [],
    "startTime": "",
    "endTime": "",
    "executionTimeSeconds": 0
}

totalNumberControls = 0
finished_control_instances = []
request_header = None
appRecordID = None

def make_request(method, url, headers=None, json_data=None):
    global jsonOutput
    
    try:
        logging.info(f"Making {method} request to {url}")
        start_time = time.time()
        response = requests.request(method, url, headers=headers, json=json_data)
        duration = time.time() - start_time
        
        # Log detailed request information
        request_info = {
            "method": method,
            "url": url,
            "duration": f"{duration:.2f}s",
            "status_code": response.status_code
        }
        
        if not hasattr(make_request, 'request_history'):
            make_request.request_history = []
        
        make_request.request_history.append(request_info)
        
        # Update jsonOutput with request stats if not already present
        if "apiStats" not in jsonOutput:
            jsonOutput["apiStats"] = {
                "totalRequests": 0,
                "successfulRequests": 0,
                "failedRequests": 0,
                "totalDuration": 0,
                "averageDuration": 0
            }
        
        jsonOutput["apiStats"]["totalRequests"] += 1
        jsonOutput["apiStats"]["totalDuration"] += duration
        jsonOutput["apiStats"]["averageDuration"] = jsonOutput["apiStats"]["totalDuration"] / jsonOutput["apiStats"]["totalRequests"]
        
        # Print request summary for Azure Automation logs
        print(f"API Request: {method} {url} - Status: {response.status_code} - Time: {duration:.2f}s")
        
        response.raise_for_status()
        logging.info(f"Response: {response.status_code} (took {duration:.2f}s)")
        
        jsonOutput["apiStats"]["successfulRequests"] += 1
        
        return response.json() if response.content else {}
    except requests.RequestException as e:
        duration = time.time() - start_time
        logging.error(f"Request failed: {e} (took {duration:.2f}s)")
        print(f"API REQUEST FAILED: {method} {url} - Error: {str(e)} - Time: {duration:.2f}s")
        
        if "apiStats" in jsonOutput:
            jsonOutput["apiStats"]["failedRequests"] += 1
        
        # Add the error to jsonOutput errors
        if "errors" in jsonOutput:
            error_details = {
                "method": method,
                "url": url,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
            jsonOutput["errors"].append(error_details)
            
        return None

def initializeControlsWorkflowArray():
    controls_workflow_id_array = []
    
    if "," not in selectedControlWorkflowID:
        controls_workflow_id_array.append(selectedControlWorkflowID)
    else:
        split_ids = selectedControlWorkflowID.split(',')
        controls_workflow_id_array = split_ids  # Fixed variable name

    return controls_workflow_id_array

def getCurrentRecords():
    global jsonOutput

    url = f"{base_url_v2}/records?application-id={appID}&size=5000&workflow-id={appWorkflowID}"
    response_body = make_request("GET", url, request_header)

    app_exists = any(item.get('name') == appName for item in response_body['content'])

    if app_exists:
        jsonOutput["appExists"] = "Fail"
        print(jsonOutput)
        sys.exit()
    else:
        jsonOutput["appExists"] = "Pass"

def setAppFields():
    description = f"<p>{appDescription}<p>"
    temp = [{"fieldId":appFieldID,"values":[appName]},{"fieldId":appOwnerID,"values":[appOwnerEmail]},{"fieldId":appSummaryID,"values":[description]}]

    global app_fields
    app_fields = temp  # Fixed variable assignment

def getUserByEmail():
    global jsonOutput

    url = f"{base_url_v1}/internal/users?search-type=EMAIL&query={appOwnerEmail}"
    response_body = make_request("GET", url, request_header)

    user_exists = any(item.get('email') == appOwnerEmail for item in response_body['content'])

    if user_exists:  # Fixed indentation
        jsonOutput["userExists"] = "Pass"
    else:
        jsonOutput["userExists"] = "Fail"
        print(jsonOutput)
        sys.exit()

def createAppRecord():
    global appRecordID  # Declare global
    global jsonOutput

    logging.info(f"Creating app record for '{appName}'")
    url = f"{base_url_v1}/records/steps"
    body = {"stepId": stepID, "assigneeEmailAddress": assigneeEmailAddress, "fields": app_fields}
    
    try:
        response_body = make_request("POST", url, request_header, body)
        if response_body and "content" in response_body and "id" in response_body["content"]:
            appRecordID = response_body["content"]["id"]  # Fixed assignment
            jsonOutput["createAppRecord"] = "Pass"
            jsonOutput["appRecordID"] = appRecordID
            logging.info(f"Successfully created app record with ID: {appRecordID}")
        else:
            jsonOutput["createAppRecord"] = "Fail"
            jsonOutput["errors"].append("Failed to create app record - invalid response")
            logging.error("Failed to create app record - invalid response")
    except Exception as e:
        jsonOutput["createAppRecord"] = "Fail"
        jsonOutput["errors"].append(f"Error creating app record: {str(e)}")
        logging.error(f"Error creating app record: {str(e)}")
        raise

def linkAppRecordToEnvironment():
    global jsonOutput
    
    logging.info(f"Linking app record {appRecordID} to environment {environmentWorkflowID}")
    url = f"{base_url_v1}/records/{appRecordID}/parent?layout={layoutID}"  # Fixed extra bracket
    body = {"id": environmentWorkflowID}
    
    try:
        response = make_request("POST", url, request_header, body)
        if response is not None:
            jsonOutput["linkToEnvironment"] = "Pass"
            logging.info(f"Successfully linked app record to environment")
        else:
            jsonOutput["linkToEnvironment"] = "Fail"
            jsonOutput["errors"].append("Failed to link app record to environment")
            logging.error("Failed to link app record to environment")
    except Exception as e:
        jsonOutput["linkToEnvironment"] = "Fail"
        jsonOutput["errors"].append(f"Error linking to environment: {str(e)}")
        logging.error(f"Error linking to environment: {str(e)}")
        raise
    
def submitAppRecord():
    global jsonOutput
    
    logging.info(f"Submitting app record {appRecordID}")
    
    try:
        # First get the record
        url = f"{base_url_v1}/records/{appRecordID}"
        response_body1 = make_request("GET", url, request_header)
        
        if not response_body1 or "content" not in response_body1:
            jsonOutput["submitAppRecord"] = "Fail"
            jsonOutput["errors"].append("Failed to get app record for submission")
            logging.error("Failed to get app record for submission")
            return
        
        # Then submit it
        url = f"{base_url_v1}/records/{appRecordID}/progress/applications/{appID}/workflows/{appWorkflowID}/steps/{appRepositoryID}"
        body = response_body1["content"]
        response_body2 = make_request("PUT", url, request_header, body)
        
        if response_body2 is not None:
            jsonOutput["submitAppRecord"] = "Pass"
            logging.info(f"Successfully submitted app record")
        else:
            jsonOutput["submitAppRecord"] = "Fail" 
            jsonOutput["errors"].append("Failed to submit app record")
            logging.error("Failed to submit app record")
    except Exception as e:
        jsonOutput["submitAppRecord"] = "Fail"
        jsonOutput["errors"].append(f"Error submitting app record: {str(e)}")
        logging.error(f"Error submitting app record: {str(e)}")
        raise

def getRepositoryStepID(recordID):
    url = f"{base_url_v2}/steps?workflow-id={recordID}"
    response_body = make_request("GET", url, request_header)

    for item in response_body["content"]:
        if "Repository" in item["name"]:
            return item["id"]
    return None  # Added return None as fallback

def getBulkCreateLinks(recordID):
    url = f"{base_url_v1}/bulk-create-workflow-source/section/workflow-link/{workflowLinkID}"
    response_body = make_request("GET", url, request_header)

    for item in response_body["content"]:
        if recordID == item["sourceWorkflow"]["id"]:
            return item["id"]
    return None  # Added return None as fallback

def getControlRecords(recordID):
    url = f"{base_url_v2}/records?application-id={controlsAppID}&workflow-id={recordID}&step-id="
    response_body = make_request("GET", url, request_header)
    
    controlsRecordsArray = []

    for item in response_body["content"]:
        controlsRecordsArray.append(item["id"])

    return controlsRecordsArray

def createBulkLinks(bulkCreateLinkID, source_records, workflow_id):
    global jsonOutput
    
    bulkLinksBoolean = False
    max_attempts = 30
    attempt_count = 0

    logging.info(f"Creating bulk links with {len(source_records)} source records for workflow {workflow_id}")
    
    url = f"{base_url_v1}/bulk-create-and-link"
    body = {"bulkCreateSourceId": bulkCreateLinkID, "parentRecordId": appRecordID, "sourceRecordIds": source_records}

    while not bulkLinksBoolean and attempt_count < max_attempts:
        try:
            logging.info(f"Bulk link attempt {attempt_count+1}/{max_attempts}")
            response = requests.post(url, json=body, headers=request_header)

            if response.status_code == 200:
                bulkLinksBoolean = True
                jsonOutput["bulkLinksCreated"] += 1
                logging.info(f"Successfully created bulk links for workflow {workflow_id}")
                
                # Add detailed workflow info to jsonOutput
                workflow_info = {
                    "workflow_id": workflow_id,
                    "sourceRecordCount": len(source_records),
                    "bulkCreateLinkID": bulkCreateLinkID,
                    "status": "Success"
                }
                jsonOutput["controlWorkflows"].append(workflow_info)
            else:
                attempt_count += 1
                error_msg = f"Bulk link attempt {attempt_count} failed with status code {response.status_code}"
                logging.warning(error_msg)
                
                if attempt_count >= max_attempts:
                    workflow_info = {
                        "workflow_id": workflow_id,
                        "sourceRecordCount": len(source_records),
                        "bulkCreateLinkID": bulkCreateLinkID,
                        "status": "Failed",
                        "error": f"Max attempts reached: {response.status_code}"
                    }
                    jsonOutput["controlWorkflows"].append(workflow_info)
                    jsonOutput["errors"].append(f"Bulk link creation failed for workflow {workflow_id} after {max_attempts} attempts")
                
                time.sleep(10 * 60)  # 10 minutes sleep
        except Exception as e:
            attempt_count += 1
            error_msg = f"Bulk link exception: {str(e)}"
            logging.error(error_msg)
            
            if attempt_count >= max_attempts:
                workflow_info = {
                    "workflow_id": workflow_id,
                    "sourceRecordCount": len(source_records),
                    "bulkCreateLinkID": bulkCreateLinkID,
                    "status": "Failed",
                    "error": str(e)
                }
                jsonOutput["controlWorkflows"].append(workflow_info)
                jsonOutput["errors"].append(f"Bulk link creation failed for workflow {workflow_id}: {str(e)}")
            
            time.sleep(10 * 60)  # 10 minutes sleep

def checkLinkStatus(controlWorkflow):
    global jsonOutput
    
    max_attempts = 30
    attempt_count = 0
    url = f"{base_url_v1}/bulk-create-and-link/status?parentRecordId={appRecordID}&workflowLinkId={controlWorkflow}"
    recordsRemainingBoolean = False  # Fixed variable name and initial value
    
    logging.info(f"Checking link status for workflow {controlWorkflow}")

    # Add status tracking in jsonOutput
    status_info = {
        "workflow": controlWorkflow,
        "attempts": [],
        "finalStatus": "",
        "startTime": datetime.now().isoformat()
    }
    
    if "linkStatusChecks" not in jsonOutput:
        jsonOutput["linkStatusChecks"] = []
    
    jsonOutput["linkStatusChecks"].append(status_info)

    while recordsRemainingBoolean == False and attempt_count < max_attempts:  # Fixed condition
        attempt_start = datetime.now()
        logging.info(f"Link status check attempt {attempt_count+1}/{max_attempts}")
        
        try:
            response_body = make_request("GET", url, request_header)
            
            if not response_body or "content" not in response_body:
                attempt_info = {
                    "attempt": attempt_count + 1,
                    "timestamp": datetime.now().isoformat(),
                    "status": "Error",
                    "error": "Invalid response from API"
                }
                status_info["attempts"].append(attempt_info)
                
                logging.error(f"Invalid response checking link status for workflow {controlWorkflow}")
                attempt_count += 1
                time.sleep(5 * 60)  # 5 minutes sleep
                continue
                
            records_remaining = response_body["content"]["sourceRecordsRemaining"]
            records_processed = response_body["content"].get("sourceRecordsProcessed", 0)
            
            attempt_info = {
                "attempt": attempt_count + 1,
                "timestamp": datetime.now().isoformat(),
                "recordsRemaining": records_remaining,
                "recordsProcessed": records_processed
            }
            status_info["attempts"].append(attempt_info)
            
            logging.info(f"Records remaining: {records_remaining}, Records processed: {records_processed}")

            if records_remaining == 0:
                recordsRemainingBoolean = True
                status_info["finalStatus"] = "Complete"
                status_info["endTime"] = datetime.now().isoformat()
                status_info["duration"] = f"{(datetime.now() - attempt_start).total_seconds()} seconds"
                logging.info(f"Link status check complete - all records processed for workflow {controlWorkflow}")
            else:
                attempt_count += 1
                time_to_sleep = 5 * 60  # 5 minutes sleep
                logging.info(f"Records still remaining, sleeping for {time_to_sleep} seconds before next check")
                status_info["lastStatus"] = f"{records_remaining} records remaining after attempt {attempt_count}"
                time.sleep(time_to_sleep)
        except Exception as e:
            attempt_info = {
                "attempt": attempt_count + 1,
                "timestamp": datetime.now().isoformat(),
                "status": "Error",
                "error": str(e)
            }
            status_info["attempts"].append(attempt_info)
            
            logging.error(f"Error checking link status for workflow {controlWorkflow}: {str(e)}")
            attempt_count += 1
            time.sleep(5 * 60)  # 5 minutes sleep
    
    if attempt_count >= max_attempts:
        status_info["finalStatus"] = "Timeout"
        status_info["endTime"] = datetime.now().isoformat()
        jsonOutput["errors"].append(f"Link status check timed out for workflow {controlWorkflow} after {max_attempts} attempts")
        logging.error(f"Link status check timed out for workflow {controlWorkflow} after {max_attempts} attempts")

def getControlInstances():
    url = f"{base_url_v2}/records/{appRecordID}/linked?workflow-id={controlInstanceWorkflowID}&size=1000"
    response_body = make_request("GET", url, request_header)
    return response_body

def getLinkedParentRecord(recordID, controlWorkflow):
    url = f"{base_url_v1}/search?parent={recordID}&sourceWorkflow={controlWorkflow}&size=1&mapped=True"
    response_body = make_request("GET", url, request_header)

    name_prop = None
    for prop in response_body[0]["properties"]:
        if prop["header"] == "Name":
            name_prop = prop
            break

    return name_prop["formattedValue"] if name_prop else ""  # Added fallback

def updateRecord(recordID, controlName):
    url = f"{base_url_v1}/records/{recordID}"
    body = [{"fieldId": controlNameFieldID, "values": [controlName]}, {"fieldId": controlOwnerFieldID, "values": [appOwnerEmail]}, {"fieldId": controlAppNameFieldID, "values": [appName]}]
    make_request("PATCH", url, headers=request_header, json=body)  # Fixed parameter order

def submitControlInstanceRecord(recordID):
    global finished_control_instances
    global jsonOutput
    
    logging.info(f"Submitting control instance record {recordID}")
    
    try:
        # Get Record
        get_url = f"{base_url_v1}/records/{recordID}"
        get_response = make_request("GET", get_url, request_header)
        
        if not get_response:
            logging.error(f"Failed to get control record {recordID} for submission")
            jsonOutput["errors"].append(f"Failed to get control record {recordID}")
            return False

        # Convert UNIX
        new_body = process_response(get_response)

        put_url = f"{base_url_v1}/records/{recordID}/progress/applications/{appID}/workflows/{controlInstanceWorkflowID}/{stepID}"
        result = make_request("PUT", put_url, headers=request_header, json=new_body)  # Fixed parameter order
        
        if result:
            finished_control_instances.append(recordID)
            jsonOutput["controlsSubmitted"] += 1
            logging.info(f"Successfully submitted control instance record {recordID}")
            return True
        else:
            logging.error(f"Failed to submit control instance record {recordID}")
            jsonOutput["errors"].append(f"Failed to submit control record {recordID}")
            return False
    except Exception as e:
        logging.error(f"Error submitting control instance record {recordID}: {str(e)}")
        jsonOutput["errors"].append(f"Error submitting control record {recordID}: {str(e)}")
        return False

def convert_timestamp(unix_timestamp):
    return datetime.utcfromtimestamp(unix_timestamp / 1000).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

def process_response(response_body):
    if isinstance(response_body, dict):
        for key, value in response_body.items():
            if isinstance(value, int) and len(str(value)) >= 10:  # Assuming Unix timestamp is at least 10 digits
                response_body[key] = convert_timestamp(value)
            elif isinstance(value, (dict, list)):
                process_response(value)
    elif isinstance(response_body, list):
        for index, item in enumerate(response_body):
            if isinstance(item, int) and len(str(item)) >= 10:
                response_body[index] = convert_timestamp(item)
            elif isinstance(item, (dict, list)):
                process_response(item)
    return response_body

def main():
    global request_header
    global app_fields  # Added missing global variable
    global jsonOutput
    global appID, bearerToken, appName, requesterEmail, appDescription
    global appOwnerEmail, appFieldID, appSummaryID, appOwnerID, stepID
    global assigneeEmailAddress, layoutID, environmentWorkflowID
    global appRepositoryID, appWorkflowID, selectedControlWorkflowID
    global workflowLinkID, controlsAppID
    global controlInstanceWorkflowID, createControlInstanceID
    global controlAppNameFieldID, controlOwnerFieldID, controlNameFieldID
    global countWorkflows, appRecordID, totalNumberControls
    
    # Record start time
    start_time = datetime.now()
    jsonOutput["startTime"] = start_time.isoformat()
    
    logging.info("Starting LogicGate Atheneum API script")
    # Print initial status to Azure Automation logs
    print(f"SCRIPT START: {start_time.isoformat()}")
    print(f"SCRIPT PARAMETERS: appName={appName}, appOwnerEmail={appOwnerEmail}, controlWorkflows={selectedControlWorkflowID}")
    
    auth_value = f"Bearer {bearerToken}"
    request_header = {'Authorization': auth_value, 'Accept': 'application/json'}

    controlsWorkflowIDsArray = initializeControlsWorkflowArray()

    getCurrentRecords()

    setAppFields()

    getUserByEmail()

    createAppRecord()

    linkAppRecordToEnvironment()

    submitAppRecord()

    for controlWorkflow in controlsWorkflowIDsArray:
        logging.info(f"Processing control workflow: {controlWorkflow}")
        jsonOutput["currentWorkflow"] = controlWorkflow
        
        controlInstanceRecordIDs = []  # Initialize empty list

        # Get repository step ID
        try:
            controlsRepositoryID = getRepositoryStepID(controlWorkflow)
            if not controlsRepositoryID:
                error_msg = f"Could not find Repository step for workflow {controlWorkflow}"
                logging.error(error_msg)
                jsonOutput["errors"].append(error_msg)
                continue
            
            logging.info(f"Found repository step ID: {controlsRepositoryID}")
        except Exception as e:
            error_msg = f"Error getting repository step ID for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Get bulk create link ID
        try:
            bulkCreateLinkID = getBulkCreateLinks(controlWorkflow)
            if not bulkCreateLinkID:
                error_msg = f"Could not find bulk create link for workflow {controlWorkflow}"
                logging.error(error_msg)
                jsonOutput["errors"].append(error_msg)
                continue
            
            logging.info(f"Found bulk create link ID: {bulkCreateLinkID}")
        except Exception as e:
            error_msg = f"Error getting bulk create link for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Get control records
        try:
            sourceRecordIDs = getControlRecords(controlsRepositoryID)
            sourceRecordIDsLength = len(sourceRecordIDs)
            
            logging.info(f"Found {sourceRecordIDsLength} source records for workflow {controlWorkflow}")
            if sourceRecordIDsLength == 0:
                logging.warning(f"No source records found for workflow {controlWorkflow}")
                workflow_info = {
                    "workflow_id": controlWorkflow,
                    "status": "Skipped",
                    "reason": "No source records found"
                }
                jsonOutput["controlWorkflows"].append(workflow_info)
                continue
        except Exception as e:
            error_msg = f"Error getting control records for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Create bulk links
        try:
            createBulkLinks(bulkCreateLinkID, sourceRecordIDs, controlWorkflow)
        except Exception as e:
            error_msg = f"Error creating bulk links for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Check link status
        try:
            logging.info(f"Checking link status for workflow {controlWorkflow}")
            checkLinkStatus(controlWorkflow)
        except Exception as e:
            error_msg = f"Error checking link status for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Get control instances
        try:
            logging.info(f"Getting control instances")
            controlInstancesTempArray = getControlInstances()
            
            if not controlInstancesTempArray or "content" not in controlInstancesTempArray:
                error_msg = f"Failed to get control instances for workflow {controlWorkflow}"
                logging.error(error_msg)
                jsonOutput["errors"].append(error_msg)
                continue
                
            numberControlsTemp = controlInstancesTempArray["content"]["page"]["totalElements"]
            logging.info(f"Found {numberControlsTemp} total control instances")
            
            # Extract control instance record IDs
            for item in controlInstancesTempArray["content"]["content"]:  # Fixed iteration and added missing keys
                if "Control Instances" == item["workflow"]["name"]:  # Fixed path to workflow name
                    controlInstanceRecordIDs.append(item["id"])
            
            logging.info(f"Found {len(controlInstanceRecordIDs)} control instance records")
            jsonOutput["controlInstancesCreated"] += len(controlInstanceRecordIDs)
                    
            # Update workflow information in jsonOutput
            workflow_info = next((w for w in jsonOutput["controlWorkflows"] if w["workflow_id"] == controlWorkflow), None)
            if workflow_info:
                workflow_info["controlInstancesCreated"] = len(controlInstanceRecordIDs)
            
        except Exception as e:
            error_msg = f"Error getting control instances for workflow {controlWorkflow}: {str(e)}"
            logging.error(error_msg)
            jsonOutput["errors"].append(error_msg)
            continue

        # Update total number of controls
        global totalNumberControls
        totalNumberControls += len(controlInstanceRecordIDs)
        logging.info(f"Total number of controls so far: {totalNumberControls}")

        # Process each control instance
        success_count = 0
        fail_count = 0
        
        for record in controlInstanceRecordIDs:  # Added missing colon
            try:
                logging.info(f"Processing control instance {record}")
                controlName = getLinkedParentRecord(record, controlWorkflow)
                logging.info(f"Found control name: {controlName}")
                
                updateRecord(record, controlName)
                logging.info(f"Updated record with control name")
                
                result = submitControlInstanceRecord(record)
                if result:
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                fail_count += 1
                error_msg = f"Error processing control instance {record}: {str(e)}"
                logging.error(error_msg)
                jsonOutput["errors"].append(error_msg)
        
        # Update workflow info with success/fail counts
        workflow_info = next((w for w in jsonOutput["controlWorkflows"] if w["workflow_id"] == controlWorkflow), None)
        if workflow_info:
            workflow_info["controlInstancesSuccessful"] = success_count
            workflow_info["controlInstancesFailed"] = fail_count
        
        logging.info(f"Completed workflow {controlWorkflow}: {success_count} successes, {fail_count} failures")




if __name__ == "__main__":
    import sys
    
    # First declare globals
    global appID, bearerToken, appName, requesterEmail, appDescription
    global appOwnerEmail, appFieldID, appSummaryID, appOwnerID, stepID
    global assigneeEmailAddress, layoutID, environmentWorkflowID
    global appRepositoryID, appWorkflowID, selectedControlWorkflowID
    global workflowLinkID, controlsAppID
    global controlInstanceWorkflowID, createControlInstanceID
    global controlAppNameFieldID, controlOwnerFieldID, controlNameFieldID
    global countWorkflows, app_fields 
    
    # Then assign values
    appID = sys.argv[1]
    bearerToken = sys.argv[2]
    appName = sys.argv[3]
    requesterEmail = sys.argv[4]
    appDescription = sys.argv[5]
    appOwnerEmail = sys.argv[6]
    appFieldID = sys.argv[7]
    appSummaryID = sys.argv[8]
    appOwnerID = sys.argv[9]
    stepID = sys.argv[10]
    assigneeEmailAddress = sys.argv[11]
    layoutID = sys.argv[12]
    environmentWorkflowID = sys.argv[13]
    appRepositoryID = sys.argv[14]
    appWorkflowID = sys.argv[15]
    selectedControlWorkflowID = sys.argv[16]
    workflowLinkID = sys.argv[17]
    controlsRepositoryIDWRONG = sys.argv[18]
    controlsAppID = sys.argv[19]
    controlInstanceWorkflowID = sys.argv[20]
    createControlInstanceID = sys.argv[21]
    controlAppNameFieldID = sys.argv[22]
    controlOwnerFieldID = sys.argv[23]
    controlNameFieldID = sys.argv[24]
    countWorkflows = sys.argv[25]

    main()