# FioriX — Stage S3: BTP Connectivity Service Provisioning & Integration Guide

**Project:** FioriX — SAP Modernization Platform  
**Target Landscape:** SAP S/4HANA 2023 On-Premise (System S21, Client 200)  
**Execution Runtime:** Node.js 20 Native HTTP Backend (`@sap-cloud-sdk/connectivity` v3.26.4)  
**Deployment Org/Space:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` / `dev`  
**Current State:** **OFFERING AVAILABLE IN MARKETPLACE — INSTANCE NOT YET PROVISIONED**

---

## 1. Cloud Foundry Marketplace & Service Discovery Findings

A live inspection of the target Cloud Foundry environment using `cf marketplace` and `cf services` revealed the following exact technical parameters:

### 1.1 Available Connectivity Offering in CF Marketplace

```text
Service Offering: connectivity
Service Broker:   sm-connectivity-582e1036-a618-4925-b969-c817bb6b8005
Description:      Establishes a secure and reliable connectivity between cloud applications and on-premise systems.
Plans Available:
  - lite:               Standard proxy binding providing onpremise_proxy_host and onpremise_proxy_port.
  - connectivity_proxy: Advanced proxy container sidecar configuration.
```

### 1.2 Existing Instances in `dev` Space
- Current instance count for `connectivity`: **0**
- Reuse possibility: **None**. No other application in the `dev` space currently owns a `connectivity` instance that could be shared.

### 1.3 SAP Cloud SDK Compatibility Verification
- Installed package: `@sap-cloud-sdk/connectivity` version `3.26.4`.
- Installed package: `@sap-cloud-sdk/http-client` version `3.26.4`.
- **Compatibility**: SAP Cloud SDK v3 fully supports the `lite` plan of `connectivity`. When bound to Cloud Foundry, the SDK automatically parses the `connectivity` credentials block inside `VCAP_SERVICES` and routes any destination configured with `ProxyType=OnPremise` through the mTLS proxy host and port.

---

## 2. Binding Contract & `VCAP_SERVICES` Structure

When the `connectivity` service instance (plan `lite`) is bound to the FioriX backend application in Cloud Foundry, BTP injects the following JSON payload into the application process environment (`VCAP_SERVICES`):

```json
{
  "connectivity": [
    {
      "name": "fiorix-connectivity",
      "instance_name": "fiorix-connectivity",
      "label": "connectivity",
      "plan": "lite",
      "tags": ["connectivity"],
      "credentials": {
        "clientid": "sb-clone-...",
        "clientsecret": "...",
        "url": "https://subaccount.authentication.eu30.hana.ondemand.com",
        "token_service_url": "https://subaccount.authentication.eu30.hana.ondemand.com",
        "onpremise_proxy_host": "connectivityproxy.internal.cf.eu30.hana.ondemand.com",
        "onpremise_proxy_port": "20003",
        "onpremise_socks5_proxy_port": "20004"
      }
    }
  ]
}
```

### Runtime Integration Flow
1. FioriX invokes `getDestination({ destinationName: 'S21' })` from `@sap-cloud-sdk/connectivity`.
2. The SDK reads destination `S21` metadata from the bound `destination` service (`ProxyType: OnPremise`, `URL: http://kbl_fiori:8000`).
3. Because `ProxyType` is `OnPremise`, the SDK queries the bound `connectivity` service credentials to acquire a short-lived token via mTLS.
4. The outgoing HTTP request to `http://kbl_fiori:8000` is directed through `onpremise_proxy_host:onpremise_proxy_port` with header `SAP-Connectivity-Authentication: Bearer <token>`.
5. The BTP Connectivity Proxy forwards the request through the active Cloud Connector reverse tunnel to the on-premise SAP S/4HANA ICM.

---

## 3. Provisioning Commands (Awaiting BTP Administrator Execution)

> [!CAUTION]
> **STRICT COMPLIANCE**: These commands must be executed by the authorized SAP BTP Subaccount Administrator. The automated pair programming agent does not execute destructive or provisioning commands without explicit authorization.

### Step 1: Create the Connectivity Service Instance
```bash
# Execute in terminal authenticated to target org and space 'dev'
cf create-service connectivity lite fiorix-connectivity
```

### Step 2: Verify Successful Provisioning
```bash
# Verify instance status reports 'create succeeded'
cf service fiorix-connectivity
```

### Step 3: Bind to FioriX in `manifest.yml`
```yaml
applications:
  - name: fiorix-platform
    # ... runtime parameters ...
    services:
      - fiorix-destination
      - fiorix-connectivity
      - fiorix-xsuaa
```

---

## 4. Pre-Flight Diagnostic Checks Post-Provisioning

Once the service is created and bound:
1. Check `/api/v1/health`:
   - `btpDestinationStatus.connectivityBindingPresent` must report `true`.
2. Check `/api/v1/connectivity/health`:
   - `capabilities.CLOUD_CONNECTOR_REACHABILITY.status` will advance from `CLOUD_CONNECTOR_UNAVAILABLE` to `VERIFIED` as soon as the Cloud Connector tunnel is active.
