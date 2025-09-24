#!/usr/bin/env python3

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

# Global Variables
base_url_v1 = "https://atheneum.logicgate.com/api/v1"
base_url_v2 = "https://atheneum.logicgate.com/api/v2"
auth_value = "Bearer SlhwMUVWVWo6ZUljT3hVSVI4em1UNFMwdjU5d09DY1l3RHc5emJiY2Q"
request_header = {'Authorization': auth_value, 'Accept': 'application/json'}

control_name_field_ID = "hQSj3kTc"
control_owner_field_ID = "SSaUDP8i"
control_app_name_field_ID = "mdXUNSOg"

app_ID = "CJWJnLUS"
control_instance_workflow_id = "AzPeH2Jd"
step_id = "5vuP5FB2"

control_instance_array = []

finished_control_instances = []

failed_control_instances = []

def make_request(method, url, json_data=None):
    try:
        logging.info(f"Making {method} request to {url}")
        request_func = getattr(requests, method.lower())
        response = request_func(url, headers=request_header, json=json_data)
        response.raise_for_status()
        logging.info(f"Response: {response.status_code}")
        return response.json()
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

def convert_timestamp(unix_timestamp):
    return datetime.utcfromtimestamp(unix_timestamp / 1000).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

def process_response(response_body):
    if isinstance(response_body, dict):
        for key, value in response_body.items():
            if isinstance(value, int) and len(str(value)) >= 10:
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

def split_string_into_array():
    global control_instance_array

    control_instance_array = control_instance_record_ids_string.split(",")

def get_parent_record(recordID):
    url = f"{base_url_v1}/records/search?parent={recordID}&sourceWorkflow={control_instance_workflow_id}&workflow={selected_control_workflow}&size=1&mapped=True"
    response_body = make_request("get", url)

    name_prop = None
    for prop in response_body[0]["properties"]:
        if prop["header"] == "Name":
            name_prop = prop
            break
    return name_prop["formattedValue"] if name_prop else ""  

def update_record(recordID, control_name):
    url = f"{base_url_v1}/records/{recordID}"
    body = [{"fieldId": control_name_field_ID, "values": [control_name]}, {"fieldId": control_owner_field_ID, "values": [app_owner_email]}, {"fieldId": control_app_name_field_ID, "values": [app_name]}]
    make_request("patch", url, body)

def submit_record(recordID):
    global finished_control_instances
    global failed_control_instances

    # Get Record
    get_url = f"{base_url_v1}/records/{recordID}"
    get_response = make_request("get", get_url)

    if not get_response:
        failed_control_instances.append(recordID)
        return

    # Convert UNIX
    new_body = process_response(get_response)

    put_url = f"{base_url_v1}/records/{recordID}/progress/applications/{app_ID}/workflows/{control_instance_workflow_id}/steps/{step_id}"
    result = make_request("put", put_url, new_body)

    if result:
        finished_control_instances.append(recordID)
    else:
        failed_control_instances.append(recordID)

def main():
    global finished_control_instances
    global failed_control_instances

    split_string_into_array()

    for record in control_instance_array:
        control_name = get_parent_record(record)
        update_record(record, control_name)
        submit_record(record)

    output = {
        "successfulIDs": finished_control_instances,
        "countSuccessfulIDs": len(finished_control_instances),
        "failedIDs": failed_control_instances,
        "countFailedIDs": len(failed_control_instances)
    }

    print(output)

if __name__ == "__main__":
    import sys
    
    # First declare globals
    global control_instance_record_ids_string, selected_control_workflow, app_owner_email, app_name

    
    # Then assign values
    control_instance_record_ids_string = sys.argv[1]
    selected_control_workflow = sys.argv[2]
    app_owner_email = sys.argv[3]
    app_name = sys.argv[4]
    app_name = app_name.replace("%20", " ")

    main()
