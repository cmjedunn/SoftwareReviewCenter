# Azure Portal Setup (GUI Method)

## Step 1: Navigate to Your Container App
1. Go to [Azure Portal](https://portal.azure.com)
2. Search for "Container Apps"
3. Find your `jed-srcenter` app
4. Click on it to open

## Step 2: Configure Secrets
1. In left menu, click **"Secrets"**
2. Click **"+ Add"** button
3. Add these secrets:

| Secret Name | Secret Value |
|-------------|--------------|
| `logicgate-client-key` | `YXRoZW5ldW06aGppcU10M0I6RVhURVJOQUw=` |
| `logicgate-client-secret` | `oeIIKNzEQBH4BUadzWlbKUUj9Ioa9qk1` |

4. Click **"Save"** after adding each secret

## Step 3: Configure Environment Variables  
1. In left menu, click **"Environment variables"**
2. Add/update these variables:

### Reference Secrets:
| Variable Name | Value Type | Value |
|---------------|------------|-------|
| `LOGICGATE_CLIENT_KEY` | **Reference a secret** | `logicgate-client-key` |
| `LOGICGATE_CLIENT_SECRET` | **Reference a secret** | `logicgate-client-secret` |

### Plain Values:
| Variable Name | Value Type | Value |
|---------------|------------|-------|
| `LOGICGATE_ENV` | **Manual entry** | `atheneum` |
| `APPLICATIONS_ID` | **Manual entry** | `CJWJnLUS` |
| `SCF_ID` | **Manual entry** | `8ln56X6y` |
| `LOGFILES_ENABLED` | **Manual entry** | `true` |
| `NODE_ENV` | **Manual entry** | `production` |
| `PORT` | **Manual entry** | `3000` |

3. Click **"Save"** at the top

## Step 4: Verify Setup
1. Go to **"Log stream"** in left menu  
2. Look for successful startup messages:
   ```
   ✅ All required LogicGate environment variables are present
   🔄 Fetching new LogicGate token...
   ✅ Successfully fetched new token
   ```

## ✅ Expected Result
Your container should restart automatically and start successfully without the "Missing required LogicGate env vars" error.