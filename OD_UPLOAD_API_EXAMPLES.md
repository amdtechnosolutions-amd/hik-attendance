# On Duty Upload - API Examples

## Base URL
```
http://localhost:4000/api
```

## Required Headers
```
Authorization: Bearer {your_auth_token}
Content-Type: application/x-www-form-urlencoded (for form data)
```

---

## 1. Download OD Template

### cURL
```bash
curl -X GET \
  http://localhost:4000/api/institutions/630e1234567890123456abcd/on-duty-template \
  -o OD_Template.xlsx
```

### JavaScript/Fetch
```javascript
const response = await fetch(
  '/api/institutions/630e1234567890123456abcd/on-duty-template'
);

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'OD_Template.xlsx';
a.click();
```

### Python
```python
import requests

url = 'http://localhost:4000/api/institutions/630e1234567890123456abcd/on-duty-template'
response = requests.get(url)

with open('OD_Template.xlsx', 'wb') as f:
    f.write(response.content)
```

### Response
- Status: 200 OK
- File: OD_Upload_Template.xlsx
- Size: ~10KB

---

## 2. Upload OD File

### cURL
```bash
curl -X POST \
  http://localhost:4000/api/institutions/630e1234567890123456abcd/upload-on-duty \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN' \
  -F 'file=@OD_Upload_Template.xlsx'
```

### JavaScript/Fetch
```javascript
const fileInput = document.getElementById('fileInput');
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch(
  '/api/institutions/630e1234567890123456abcd/upload-on-duty',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    body: formData
  }
);

const data = await response.json();
console.log(data);
```

### JavaScript/Axios
```javascript
const fileInput = document.getElementById('fileInput');
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await axios.post(
  '/api/institutions/630e1234567890123456abcd/upload-on-duty',
  formData,
  {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'multipart/form-data'
    }
  }
);

console.log(response.data);
```

### Python
```python
import requests

url = 'http://localhost:4000/api/institutions/630e1234567890123456abcd/upload-on-duty'
headers = {
    'Authorization': f'Bearer {auth_token}'
}

with open('OD_Upload_Template.xlsx', 'rb') as f:
    files = {'file': f}
    response = requests.post(url, headers=headers, files=files)

print(response.json())
```

### Node.js (using form-data)
```javascript
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

const form = new FormData();
form.append('file', fs.createReadStream('OD_Upload_Template.xlsx'));

const response = await axios.post(
  'http://localhost:4000/api/institutions/630e1234567890123456abcd/upload-on-duty',
  form,
  {
    headers: {
      ...form.getHeaders(),
      'Authorization': `Bearer ${authToken}`
    }
  }
);

console.log(response.data);
```

### Response (Success)
```json
{
  "success": true,
  "message": "Upload completed. 3 records created, 0 failed",
  "summary": {
    "success": 3,
    "failed": 0,
    "errors": []
  }
}
```

### Response (With Errors)
```json
{
  "success": true,
  "message": "Upload completed. 2 records created, 1 failed",
  "summary": {
    "success": 2,
    "failed": 1,
    "errors": [
      "Row 3: User not found for Employee No: EMP999"
    ]
  }
}
```

---

## 3. Verify Upload - Get All OD Records

### cURL
```bash
curl -X GET \
  'http://localhost:4000/api/institutions/630e1234567890123456abcd/on-duty' \
  -H 'Authorization: Bearer YOUR_AUTH_TOKEN'
```

### JavaScript/Fetch
```javascript
const response = await fetch(
  '/api/institutions/630e1234567890123456abcd/on-duty',
  {
    headers: {
      'Authorization': `Bearer ${authToken}`
    }
  }
);

const data = await response.json();
console.log('All OD Records:', data);
```

### Python
```python
import requests

url = 'http://localhost:4000/api/institutions/630e1234567890123456abcd/on-duty'
headers = {'Authorization': f'Bearer {auth_token}'}

response = requests.get(url, headers=headers)
print(response.json())
```

### Response
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "institutionId": "630e1234567890123456abcd",
    "userId": {
      "_id": "507f1f77bcf86cd799439010",
      "name": "John Doe",
      "employeeNo": "EMP001"
    },
    "employeeNo": "EMP001",
    "startDate": "2025-01-15T00:00:00.000Z",
    "endDate": "2025-01-17T00:00:00.000Z",
    "description": "Conference in Delhi",
    "createdAt": "2025-01-01T10:30:00.000Z",
    "updatedAt": "2025-01-01T10:30:00.000Z"
  },
  ...
]
```

---

## Complete Integration Example

### HTML Form Upload
```html
<!DOCTYPE html>
<html>
<head>
    <title>OD Upload</title>
</head>
<body>
    <h1>Upload On Duty Records</h1>
    
    <button onclick="downloadTemplate()">Download Template</button>
    
    <hr>
    
    <form id="uploadForm">
        <input type="file" id="fileInput" accept=".xlsx" required>
        <button type="submit">Upload</button>
    </form>
    
    <div id="result"></div>

    <script>
        const authToken = localStorage.getItem('authToken');
        const institutionId = localStorage.getItem('institutionId');

        async function downloadTemplate() {
            const response = await fetch(
                `/api/institutions/${institutionId}/on-duty-template`
            );
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'OD_Template.xlsx';
            a.click();
        }

        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('fileInput');
            const formData = new FormData();
            formData.append('file', fileInput.files[0]);
            
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = '<p>Uploading...</p>';
            
            try {
                const response = await fetch(
                    `/api/institutions/${institutionId}/upload-on-duty`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: formData
                    }
                );
                
                const data = await response.json();
                
                if (data.success) {
                    resultDiv.innerHTML = `
                        <h3 style="color: green;">✓ Upload Successful</h3>
                        <p>${data.message}</p>
                        <p>Success: ${data.summary.success}</p>
                        <p>Failed: ${data.summary.failed}</p>
                        ${data.summary.errors.length > 0 ? 
                            `<h4>Errors:</h4>
                             <ul>${data.summary.errors.map(e => `<li>${e}</li>`).join('')}</ul>` 
                            : ''}
                    `;
                } else {
                    resultDiv.innerHTML = `
                        <h3 style="color: red;">✗ Upload Failed</h3>
                        <p>${data.message}</p>
                    `;
                }
            } catch (error) {
                resultDiv.innerHTML = `
                    <h3 style="color: red;">✗ Error</h3>
                    <p>${error.message}</p>
                `;
            }
        });
    </script>
</body>
</html>
```

---

## Postman Collection

### Save as: `OD_Upload.postman_collection.json`

```json
{
  "info": {
    "name": "OD Upload API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Download OD Template",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "{{BASE_URL}}/institutions/{{INSTITUTION_ID}}/on-duty-template",
          "host": ["{{BASE_URL}}"],
          "path": ["institutions", "{{INSTITUTION_ID}}", "on-duty-template"]
        },
        "description": "Download the OD upload template"
      },
      "response": []
    },
    {
      "name": "Upload OD File",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{AUTH_TOKEN}}",
            "type": "text"
          }
        ],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "file",
              "type": "file",
              "src": "OD_Upload_Template.xlsx"
            }
          ]
        },
        "url": {
          "raw": "{{BASE_URL}}/institutions/{{INSTITUTION_ID}}/upload-on-duty",
          "host": ["{{BASE_URL}}"],
          "path": ["institutions", "{{INSTITUTION_ID}}", "upload-on-duty"]
        },
        "description": "Upload OD records from Excel file"
      },
      "response": []
    },
    {
      "name": "Get All OD Records",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{AUTH_TOKEN}}",
            "type": "text"
          }
        ],
        "url": {
          "raw": "{{BASE_URL}}/institutions/{{INSTITUTION_ID}}/on-duty",
          "host": ["{{BASE_URL}}"],
          "path": ["institutions", "{{INSTITUTION_ID}}", "on-duty"]
        },
        "description": "Get all OD records for institution"
      },
      "response": []
    }
  ],
  "variable": [
    {
      "key": "BASE_URL",
      "value": "http://localhost:4000/api"
    },
    {
      "key": "INSTITUTION_ID",
      "value": "630e1234567890123456abcd"
    },
    {
      "key": "AUTH_TOKEN",
      "value": ""
    }
  ]
}
```

**To use in Postman:**
1. Import collection
2. Set `INSTITUTION_ID` in collection variables
3. Set `AUTH_TOKEN` after login
4. Use requests

---

## Excel File Format Example

### Minimal Valid File
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 2025-01-15   | 2025-01-17   | Conference
```

### Bulk Upload
```
EmployeeNo  | StartDate    | EndDate      | Description
EMP001      | 2025-02-01   | 2025-02-03   | Training Workshop
EMP002      | 2025-02-01   | 2025-02-03   | Training Workshop
EMP003      | 2025-02-01   | 2025-02-03   | Training Workshop
EMP004      | 2025-02-05   | 2025-02-07   | Seminar
EMP005      | 2025-02-10   | 2025-02-15   | Conference
```

---

## Rate Limiting & Best Practices

- **File Size:** Max 10MB (default Express limit)
- **Rows per file:** Recommended 100-500
- **Parallel Uploads:** Can process simultaneously
- **Rate:** No specific rate limit, but space uploads reasonably
- **Timeout:** Default 30 seconds

### Recommended Workflow
1. Start with small batches (< 50 records)
2. Verify in database
3. Gradually increase batch size
4. Monitor server response times

---

## Error Codes

| Code | Meaning | Solution |
|------|---------|----------|
| 200 | Success | All records processed |
| 400 | Bad Request | Missing file or invalid headers |
| 401 | Unauthorized | Invalid/expired auth token |
| 500 | Server Error | Check server logs |

---

## Troubleshooting Steps

### File not uploading
```javascript
// Verify file is FormData
const formData = new FormData();
console.log(formData instanceof FormData); // Should be true

// Add file
formData.append('file', file);

// Verify it's there
for (let [key, value] of formData.entries()) {
  console.log(key, value);
}
```

### Auth token issues
```bash
# Verify token is valid
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/institutions/630e1234567890123456abcd

# Should return 200 if token is valid
```

### Check institution ID
```bash
# Get list of institutions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:4000/api/institutions

# Copy correct ID
```

---

## Support & Documentation

- **User Guide:** See `OD_UPLOAD_GUIDE.md`
- **Implementation:** See `OD_UPLOAD_IMPLEMENTATION.md`
- **API Docs:** See main API documentation
- **Issues:** Check error messages in response