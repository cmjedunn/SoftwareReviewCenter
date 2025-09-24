import requests
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

api_key = 'Bearer aGppcU10M0I6NGxvZ1RMQlBUcW9yWTlnYU02M0dJSUVOanROUUoybmI'

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

def make_request(method, url, headers=None, json_data=None):
    try:
        logging.info(f"Making {method} request to {url}")
        response = requests.request(method, url, headers=headers, json=json_data)
        response.raise_for_status()
        logging.info(f"Response: {response.status_code}")
        return response.json() if response.content else {}
    except requests.RequestException as e:
        logging.error(f"Request failed: {e}")
        return None

def get_control_eval_records(endpoint):
    url = f"https://atheneum.logicgate.com/api/v2/records/{endpoint}/linked?workflow-id=Vj2VGjNU&size=1000"
    headers = {'Authorization': api_key, 'Accept': 'application/json'}
    response_body = make_request("GET", url, headers)
    return [record.get("id") for record in response_body.get("content", [])] if response_body else []

def execute_step(step_name, record_id, body):
    url = f"https://atheneum.logicgate.com/api/v1/valueMaps?record={record_id}"
    headers = {'Authorization': api_key, 'Accept': 'application/json'}
    logging.info(f"Executing {step_name} for record {record_id}")
    make_request("POST", url, headers, body)

def step_five(record_id):
    get_url = f"https://atheneum.logicgate.com/api/v1/records/{record_id}"
    headers = {'Authorization': api_key, 'Accept': 'application/json'}
    response_body = make_request("GET", get_url, headers)
    processed_body = process_response(response_body) if response_body else {}
    put_url = f"https://atheneum.logicgate.com/api/v1/records/{record_id}/progress/applications/CJWJnLUS/workflows/Vj2VGjNU/steps/tEfVY9vg"
    make_request("PUT", put_url, headers, processed_body)

def step_eight(record_id):
    get_url = f"https://atheneum.logicgate.com/api/v1/records/{record_id}"
    headers = {'Authorization': api_key, 'Accept': 'application/json'}
    response_body = make_request("GET", get_url, headers)
    processed_body = process_response(response_body) if response_body else {}
    put_url = f"https://atheneum.logicgate.com/api/v1/records/{record_id}/progress/applications/CJWJnLUS/workflows/Vj2VGjNU/steps/x7mABS2o"
    make_request("PUT", put_url, headers, processed_body)

def main(endpoint, user):

    record_ids = get_control_eval_records(endpoint)

    body_step_one = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
                {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 2,
                "useCurrentDate": False,
                "id": "6tswFuGT",
                "created": 1674250063845,
                "updated": 1713548376328,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "No",
                "numericValue": 2,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "pEPkRkEY",
                "idOrTransientId": "6tswFuGT",
                "transientIdOrId": "6tswFuGT",
                "field": None,
                "checked": True
                }
            ],
            "field": {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "canBeCopied": True,
                "currentValues": [
                {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 1,
                    "useCurrentDate": False,
                    "id": "fDIKGFxb",
                    "created": 1674250063845,
                    "updated": 1712253002860,
                    "valueType": "Common",
                    "discriminator": "Common",
                    "textValue": "Yes",
                    "numericValue": 1,
                    "description": None,
                    "guidance": None,
                    "empty": False,
                    "fieldId": "pEPkRkEY",
                    "idOrTransientId": "fDIKGFxb",
                    "transientIdOrId": "fDIKGFxb",
                    "field": None,
                    "checked": False
                },
                {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 2,
                    "useCurrentDate": False,
                    "id": "6tswFuGT",
                    "created": 1674250063845,
                    "updated": 1713548376328,
                    "valueType": "Common",
                    "discriminator": "Common",
                    "textValue": "No",
                    "numericValue": 2,
                    "description": None,
                    "guidance": None,
                    "empty": False,
                    "fieldId": "pEPkRkEY",
                    "idOrTransientId": "6tswFuGT",
                    "transientIdOrId": "6tswFuGT",
                    "field": None,
                    "checked": True
                }
                ],
                "defaultState": "INACTIVE",
                "defaultValues": [],
                "global": False,
                "isCheckable": True,
                "isDiscrete": True,
                "isMulti": False,
                "isSelectable": False,
                "requiresUniqueValue": False,
                "selected": False,
                "valueType": "Common",
                "fieldType": "RADIO",
                "valuesLabel": "Radio Values",
                "icon": "far__fa-dot-circle",
                "id": "pEPkRkEY",
                "created": 1674250063847,
                "updated": 1674653399155,
                "name": "Evaluation Delegation Decision",
                "labels": [],
                "label": "Would you like to delegate this evaluation?",
                "tooltip": None,
                "helpText": None,
                "format": "DECIMAL",
                "currency": None,
                "workflow": None,
                "analysisEstimate": None,
                "analysisType": None,
                "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
                ],
                "convertibleTo": [
                "CHECKBOX",
                "MULTI_SELECT",
                "SELECT"
                ],
                "analysisOutputField": False,
                "discrete": True,
                "crossWorkflowCalculation": False,
                "validTypeForCalculationInput": True
            }
        }
    body_step_two = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
                {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 3,
                "useCurrentDate": False,
                "id": "xPyJ6L49",
                "created": 1667423041165,
                "updated": 1713548390192,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "Complete",
                "numericValue": 1,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "7pr5JHNh",
                "idOrTransientId": "xPyJ6L49",
                "transientIdOrId": "xPyJ6L49",
                "field": None
                }
            ],
            "id": "V9pLZznY",
            "created": 1742503634258,
            "updated": None,
            "user": None,
            "field": {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "canBeCopied": True,
                "currentValues": [],
                "defaultState": "INACTIVE",
                "defaultValues": [],
                "global": False,
                "isCheckable": False,
                "isDiscrete": True,
                "isMulti": False,
                "isSelectable": True,
                "requiresUniqueValue": False,
                "selected": False,
                "valueType": "Common",
                "fieldType": "SELECT",
                "valuesLabel": "Select Values",
                "icon": "far__fa-caret-square-down",
                "id": "7pr5JHNh",
                "created": 1667423041165,
                "updated": 1680029844594,
                "name": "Control Evaluation Status",
                "labels": [],
                "label": "Control Evaluation Status",
                "tooltip": None,
                "helpText": None,
                "format": "DECIMAL",
                "currency": None,
                "workflow": None,
                "analysisEstimate": None,
                "analysisType": None,
                "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
                ],
                "convertibleTo": [
                "CHECKBOX",
                "MULTI_SELECT",
                "RADIO"
                ],
                "analysisOutputField": False,
                "discrete": True,
                "crossWorkflowCalculation": False,
                "validTypeForCalculationInput": True
            },
            "copyable": True,
            "expressionResult": 1
        }
    body_step_three = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
              {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 4,
                "useCurrentDate": False,
                "id": "TmAoIhzk",
                "created": 1673443946953,
                "updated": 1713548400863,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "Tier 3: Defined",
                "numericValue": 3,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "OsJDE9XC",
                "idOrTransientId": "TmAoIhzk",
                "transientIdOrId": "TmAoIhzk",
                "field": None
              }
            ],
            "field": {
              "active": True,
              "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
              "canBeCopied": True,
              "currentValues": [
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 1,
                  "useCurrentDate": False,
                  "id": "vsloiN5n",
                  "created": 1673443946953,
                  "updated": 1713548447027,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 0: Non-Existent",
                  "numericValue": 0,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "vsloiN5n",
                  "transientIdOrId": "vsloiN5n",
                  "field": None
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 2,
                  "useCurrentDate": False,
                  "id": "yeVoNS8v",
                  "created": 1673443946953,
                  "updated": 1712252593118,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 1: Initial",
                  "numericValue": 1,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "yeVoNS8v",
                  "transientIdOrId": "yeVoNS8v",
                  "field": None
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 3,
                  "useCurrentDate": False,
                  "id": "Yq4Dw78Q",
                  "created": 1673443946953,
                  "updated": 1713548406122,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 2: Repeatable",
                  "numericValue": 2,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "Yq4Dw78Q",
                  "transientIdOrId": "Yq4Dw78Q",
                  "field": None
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 4,
                  "useCurrentDate": False,
                  "id": "TmAoIhzk",
                  "created": 1673443946953,
                  "updated": 1713548400863,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 3: Defined",
                  "numericValue": 3,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "TmAoIhzk",
                  "transientIdOrId": "TmAoIhzk",
                  "field": None
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 5,
                  "useCurrentDate": False,
                  "id": "ilFck2b5",
                  "created": 1673443946953,
                  "updated": 1713551054505,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 4: Managed",
                  "numericValue": 4,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "ilFck2b5",
                  "transientIdOrId": "ilFck2b5",
                  "field": None
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 6,
                  "useCurrentDate": False,
                  "id": "w4r8PQza",
                  "created": 1673443946953,
                  "updated": 1712600982450,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Tier 5: Optimized",
                  "numericValue": 5,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "OsJDE9XC",
                  "idOrTransientId": "w4r8PQza",
                  "transientIdOrId": "w4r8PQza",
                  "field": None
                }
              ],
              "defaultState": "INACTIVE",
              "defaultValues": [],
              "global": False,
              "isCheckable": False,
              "isDiscrete": True,
              "isMulti": False,
              "isSelectable": True,
              "requiresUniqueValue": False,
              "selected": True,
              "valueType": "Common",
              "fieldType": "SELECT",
              "valuesLabel": "Select Values",
              "icon": "far__fa-caret-square-down",
              "id": "OsJDE9XC",
              "created": 1673975098019,
              "updated": 1674489974996,
              "name": "Control Implementation Tier",
              "labels": [],
              "label": "Control Implementation Tier",
              "tooltip": None,
              "helpText": None,
              "format": "DECIMAL",
              "currency": None,
              "workflow": None,
              "analysisEstimate": None,
              "analysisType": None,
              "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
              ],
              "convertibleTo": [
                "CHECKBOX",
                "MULTI_SELECT",
                "RADIO"
              ],
              "analysisOutputField": False,
              "discrete": True,
              "crossWorkflowCalculation": False,
              "validTypeForCalculationInput": True
            }
        }
    body_step_four = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
              {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 2,
                "useCurrentDate": False,
                "id": "z1EXIQtn",
                "created": 1673444808633,
                "updated": 1713551057633,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "No",
                "numericValue": 2,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "6K1Kn2Zq",
                "idOrTransientId": "z1EXIQtn",
                "transientIdOrId": "z1EXIQtn",
                "field": None,
                "checked": True
              }
            ],
            "field": {
              "active": True,
              "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
              "canBeCopied": True,
              "currentValues": [
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 1,
                  "useCurrentDate": False,
                  "id": "pvPPjwvC",
                  "created": 1673444808633,
                  "updated": 1713551056122,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "Yes",
                  "numericValue": 1,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "6K1Kn2Zq",
                  "idOrTransientId": "pvPPjwvC",
                  "transientIdOrId": "pvPPjwvC",
                  "field": None,
                  "checked": False
                },
                {
                  "active": True,
                  "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                  "archived": False,
                  "defaultToNow": False,
                  "hasTime": False,
                  "isDefault": False,
                  "priority": 2,
                  "useCurrentDate": False,
                  "id": "z1EXIQtn",
                  "created": 1673444808633,
                  "updated": 1713551057633,
                  "valueType": "Common",
                  "discriminator": "Common",
                  "textValue": "No",
                  "numericValue": 2,
                  "description": None,
                  "guidance": None,
                  "empty": False,
                  "fieldId": "6K1Kn2Zq",
                  "idOrTransientId": "z1EXIQtn",
                  "transientIdOrId": "z1EXIQtn",
                  "field": None,
                  "checked": True
                }
              ],
              "defaultState": "INACTIVE",
              "defaultValues": [],
              "global": False,
              "isCheckable": True,
              "isDiscrete": True,
              "isMulti": False,
              "isSelectable": False,
              "requiresUniqueValue": False,
              "selected": False,
              "valueType": "Common",
              "fieldType": "RADIO",
              "valuesLabel": "Radio Values",
              "icon": "far__fa-dot-circle",
              "id": "6K1Kn2Zq",
              "created": 1673975148212,
              "updated": None,
              "name": "Would you like to initiate a CAP?",
              "labels": [],
              "label": "Would you like to initiate a Corrective Action Plan (CAP)?",
              "tooltip": None,
              "helpText": None,
              "format": "DECIMAL",
              "currency": None,
              "workflow": None,
              "analysisEstimate": None,
              "analysisType": None,
              "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
              ],
              "convertibleTo": [
                "CHECKBOX",
                "MULTI_SELECT",
                "SELECT"
              ],
              "analysisOutputField": False,
              "discrete": True,
              "crossWorkflowCalculation": False,
              "validTypeForCalculationInput": True
            }
        }

    if user == "russell.schrotberger@jedunn.com":
        body_step_six = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
            {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 0,
                "useCurrentDate": False,
                "valueType": "User",
                "id": "sYDqcLZ8",
                "discriminator": "Active",
                "textValue": "Russell Schrotberger (russell.schrotberger@jedunn.com)",
                "numericValue": 1,
                "email": "russell.schrotberger@jedunn.com",
                "company": "JE Dunn",
                "imageUrl": "/api/v1/users/sYDqcLZ8/images?v=upload_file_sYDqcLZ8.jpg",
                "imageS3Key": "profile-picture/upload_file_sYDqcLZ8.jpg",
                "status": "Active",
                "tier": "SECONDARY",
                "pricingUserTier": "POWER",
                "mfaEnabled": False,
                "mfaSetup": False,
                "autoprovisioned": False,
                "scimStatus": None,
                "lastLogin": None,
                "lastDeactivated": None,
                "name": "Russell Schrotberger",
                "locked": False,
                "external": False,
                "disabled": False,
                "serviceAccount": False,
                "superUser": False,
                "empty": False,
                "fieldId": None,
                "idOrTransientId": "sYDqcLZ8",
                "transientIdOrId": "sYDqcLZ8",
                "field": None
            }
            ],
            "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "User",
            "fieldType": "USER",
            "valuesLabel": "Select Users",
            "icon": "fas__fa-user",
            "permissionSets": [],
            "roles": [],
            "externalUserField": False,
            "id": "ACbTPPMB",
            "created": 1674656870072,
            "updated": 1712238569962,
            "name": "Evaluation Reviewer",
            "labels": [],
            "label": "Evaluation Reviewer",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
            ],
            "convertibleTo": [],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
            }
        }
    elif user == "svc.logicgate.powerapps@jedunn.onmicrosoft.com":
        body_step_six = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
            {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 0,
                    "useCurrentDate": False,
                    "valueType": "User",
                    "id": "JXp1EVUj",
                    "discriminator": "Active",
                    "textValue": "Cole Merchant (cole.merchant@jedunn.com)",
                    "numericValue": 1,
                    "email": "cole.merchant@jedunn.com",
                    "company": "JE Dunn",
                    "imageUrl": None,
                    "imageS3Key": None,
                    "status": "Active",
                    "tier": "SECONDARY",
                    "pricingUserTier": "POWER",
                    "mfaEnabled": False,
                    "mfaSetup": False,
                    "autoprovisioned": False,
                    "scimStatus": None,
                    "lastLogin": None,
                    "lastDeactivated": None,
                    "name": "Cole Merchant",
                    "locked": False,
                    "external": False,
                    "disabled": False,
                    "serviceAccount": False,
                    "superUser": False,
                    "empty": False,
                    "fieldId": None,
                    "idOrTransientId": "JXp1EVUj",
                    "transientIdOrId": "JXp1EVUj",
                    "field": None
                }
            ],
            "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "User",
            "fieldType": "USER",
            "valuesLabel": "Select Users",
            "icon": "fas__fa-user",
            "permissionSets": [],
            "roles": [],
            "externalUserField": False,
            "id": "ACbTPPMB",
            "created": 1674656870072,
            "updated": 1712238569962,
            "name": "Evaluation Reviewer",
            "labels": [],
            "label": "Evaluation Reviewer",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
            ],
            "convertibleTo": [],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
            }
        }
    elif user == "ian.winters@jedunn.com":
        body_step_six = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
            {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 0,
                    "useCurrentDate": False,
                    "valueType": "User",
                    "id": "UP8CaWsE",
                    "discriminator": "Active",
                    "textValue": "Ian Winters (ian.winters@jedunn.com)",
                    "numericValue": 1,
                    "email": "ian.winters@jedunn.com",
                    "company": "JE Dunn Construction",
                    "imageUrl": None,
                    "imageS3Key": None,
                    "status": "Active",
                    "tier": "SECONDARY",
                    "pricingUserTier": "POWER",
                    "mfaEnabled": False,
                    "mfaSetup": False,
                    "autoprovisioned": False,
                    "scimStatus": None,
                    "lastLogin": None,
                    "lastDeactivated": None,
                    "name": "Ian Winters",
                    "locked": False,
                    "external": False,
                    "disabled": False,
                    "serviceAccount": False,
                    "superUser": False,
                    "empty": False,
                    "fieldId": None,
                    "idOrTransientId": "UP8CaWsE",
                    "transientIdOrId": "UP8CaWsE",
                    "field": None
                }
            ],
            "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "User",
            "fieldType": "USER",
            "valuesLabel": "Select Users",
            "icon": "fas__fa-user",
            "permissionSets": [],
            "roles": [],
            "externalUserField": False,
            "id": "ACbTPPMB",
            "created": 1674656870072,
            "updated": 1712238569962,
            "name": "Evaluation Reviewer",
            "labels": [],
            "label": "Evaluation Reviewer",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
            ],
            "convertibleTo": [],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
            }
        }
    elif user == "trey.slyter@jedunn.com":
        body_step_six = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
            {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 0,
                    "useCurrentDate": False,
                    "valueType": "User",
                    "id": "gyfBdqgc",
                    "discriminator": "Active",
                    "textValue": "Trey Slyter (trey.slyter@jedunn.com)",
                    "numericValue": 1,
                    "email": "trey.slyter@jedunn.com",
                    "company": "JE Dunn",
                    "imageUrl": None,
                    "imageS3Key": None,
                    "status": "Active",
                    "tier": "SECONDARY",
                    "pricingUserTier": "POWER",
                    "mfaEnabled": False,
                    "mfaSetup": False,
                    "autoprovisioned": False,
                    "scimStatus": None,
                    "lastLogin": None,
                    "lastDeactivated": None,
                    "name": "Trey Slyter",
                    "locked": False,
                    "external": False,
                    "disabled": False,
                    "serviceAccount": False,
                    "superUser": False,
                    "empty": False,
                    "fieldId": None,
                    "idOrTransientId": "gyfBdqgc",
                    "transientIdOrId": "gyfBdqgc",
                    "field": None
                }
            ],
            "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "User",
            "fieldType": "USER",
            "valuesLabel": "Select Users",
            "icon": "fas__fa-user",
            "permissionSets": [],
            "roles": [],
            "externalUserField": False,
            "id": "ACbTPPMB",
            "created": 1674656870072,
            "updated": 1712238569962,
            "name": "Evaluation Reviewer",
            "labels": [],
            "label": "Evaluation Reviewer",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
            ],
            "convertibleTo": [],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
            }
        }
    elif user == "brianna.phillips@jedunn.com":
        body_step_six = {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "currentValues": [
            {
                    "active": True,
                    "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                    "archived": False,
                    "defaultToNow": False,
                    "hasTime": False,
                    "isDefault": False,
                    "priority": 0,
                    "useCurrentDate": False,
                    "valueType": "User",
                    "id": "l1STV8O6",
                    "discriminator": "Active",
                    "textValue": "Brianna Phillips (brianna.phillips@jedunn.com)",
                    "numericValue": 1,
                    "email": "brianna.phillips@jedunn.com",
                    "company": "JE Dunn",
                    "imageUrl": None,
                    "imageS3Key": None,
                    "status": "Active",
                    "tier": "SECONDARY",
                    "pricingUserTier": "POWER",
                    "mfaEnabled": False,
                    "mfaSetup": False,
                    "autoprovisioned": False,
                    "scimStatus": None,
                    "lastLogin": None,
                    "lastDeactivated": None,
                    "name": "Brianna Phillips",
                    "locked": False,
                    "external": False,
                    "disabled": False,
                    "serviceAccount": False,
                    "superUser": False,
                    "empty": False,
                    "fieldId": None,
                    "idOrTransientId": "l1STV8O6",
                    "transientIdOrId": "l1STV8O6",
                    "field": None
                }
            ],
            "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "User",
            "fieldType": "USER",
            "valuesLabel": "Select Users",
            "icon": "fas__fa-user",
            "permissionSets": [],
            "roles": [],
            "externalUserField": False,
            "id": "ACbTPPMB",
            "created": 1674656870072,
            "updated": 1712238569962,
            "name": "Evaluation Reviewer",
            "labels": [],
            "label": "Evaluation Reviewer",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
                "NULL",
                "NOT_NULL",
                "EQUALS",
                "NOT_EQUALS"
            ],
            "convertibleTo": [],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
            }
        }
    else:
        print("User not in system. Try again.")

 
    body_step_seven = {
        "active": True,
        "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
        "currentValues": [
            {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "archived": False,
            "defaultToNow": False,
            "hasTime": False,
            "isDefault": False,
            "priority": 1,
            "useCurrentDate": False,
            "id": "f5oaKUow",
            "created": 1667423041166,
            "updated": 1713817283230,
            "valueType": "Common",
            "discriminator": "Common",
            "textValue": "Approved - Control Evaluation Approved",
            "numericValue": 4,
            "description": None,
            "guidance": None,
            "empty": False,
            "fieldId": "xuGIIibZ",
            "idOrTransientId": "f5oaKUow",
            "transientIdOrId": "f5oaKUow",
            "field": None
            }
        ],
        "field": {
            "active": True,
            "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
            "canBeCopied": True,
            "currentValues": [
            {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 1,
                "useCurrentDate": False,
                "id": "f5oaKUow",
                "created": 1667423041166,
                "updated": 1713817283230,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "Approved - Control Evaluation Approved",
                "numericValue": 4,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "xuGIIibZ",
                "idOrTransientId": "f5oaKUow",
                "transientIdOrId": "f5oaKUow",
                "field": None
            },
            {
                "active": True,
                "dateFormat": "EEEE, MMMM d, yyyy h:mm a",
                "archived": False,
                "defaultToNow": False,
                "hasTime": False,
                "isDefault": False,
                "priority": 2,
                "useCurrentDate": False,
                "id": "yvuoBmuW",
                "created": 1667423041166,
                "updated": 1712245359002,
                "valueType": "Common",
                "discriminator": "Common",
                "textValue": "Not Approved - Control Evaluation Requires Updates",
                "numericValue": 2,
                "description": None,
                "guidance": None,
                "empty": False,
                "fieldId": "xuGIIibZ",
                "idOrTransientId": "yvuoBmuW",
                "transientIdOrId": "yvuoBmuW",
                "field": None
            }
            ],
            "defaultState": "INACTIVE",
            "defaultValues": [],
            "global": False,
            "isCheckable": False,
            "isDiscrete": True,
            "isMulti": False,
            "isSelectable": True,
            "requiresUniqueValue": False,
            "selected": True,
            "valueType": "Common",
            "fieldType": "SELECT",
            "valuesLabel": "Select Values",
            "icon": "far__fa-caret-square-down",
            "id": "xuGIIibZ",
            "created": 1667423041166,
            "updated": 1675357829183,
            "name": "Control Evaluation Review Decision",
            "labels": [],
            "label": "Control Evaluation Review Decision",
            "tooltip": None,
            "helpText": None,
            "format": "DECIMAL",
            "currency": None,
            "workflow": None,
            "analysisEstimate": None,
            "analysisType": None,
            "operators": [
            "NULL",
            "NOT_NULL",
            "EQUALS",
            "NOT_EQUALS"
            ],
            "convertibleTo": [
            "CHECKBOX",
            "MULTI_SELECT",
            "RADIO"
            ],
            "analysisOutputField": False,
            "discrete": True,
            "crossWorkflowCalculation": False,
            "validTypeForCalculationInput": True
        }
    }

    for record_id in record_ids:
        execute_step("Step One", record_id,body_step_one)
        execute_step("Step Two", record_id,body_step_two)
        execute_step("Step Three", record_id,body_step_three)
        execute_step("Step Four", record_id,body_step_four)
        step_five(record_id)
        execute_step("Step Six", record_id,body_step_six)
        execute_step("Step Seven", record_id,body_step_seven)
        step_eight(record_id)

if __name__ == "__main__":
    import sys
    endpoint = sys.argv[1]
    user = sys.argv[2]
    main(endpoint, user)
