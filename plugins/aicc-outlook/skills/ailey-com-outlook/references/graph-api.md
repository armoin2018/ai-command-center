# Microsoft Graph API Reference

Technical reference for Microsoft Graph API endpoints used by ailey-com-outlook.

## Base URL

```
https://graph.microsoft.com/v1.0
```

## Authentication

All requests require Bearer token in Authorization header:

```http
Authorization: Bearer {access_token}
```

**Token Acquisition:**
```typescript
import { ClientSecretCredential } from '@azure/identity';

const credential = new ClientSecretCredential(
  process.env.AZURE_TENANT_ID!,
  process.env.AZURE_CLIENT_ID!,
  process.env.AZURE_CLIENT_SECRET!
);

const token = await credential.getToken('https://graph.microsoft.com/.default');
```

## Mail Endpoints

### List Messages

**Endpoint:** `GET /users/{id}/messages`

**Query Parameters:**
- `$filter` - Filter results (e.g., `from/emailAddress/address eq 'user@example.com'`)
- `$search` - Search message content
- `$select` - Select specific properties
- `$top` - Number of results (default: 10, max: 999)
- `$orderby` - Sort order (e.g., `receivedDateTime desc`)

**Example:**
```http
GET /users/me/messages?$top=20&$filter=isRead eq false&$orderby=receivedDateTime desc
```

**Response:**
```json
{
  "value": [
    {
      "id": "AAMkAGI...",
      "subject": "Project Update",
      "from": {
        "emailAddress": {
          "name": "John Doe",
          "address": "john@example.com"
        }
      },
      "receivedDateTime": "2026-01-31T10:00:00Z",
      "isRead": false,
      "hasAttachments": true
    }
  ]
}
```

---

### Get Message

**Endpoint:** `GET /users/{id}/messages/{message-id}`

**Query Parameters:**
- `$select` - Select properties
- `$expand` - Expand attachments

**Example:**
```http
GET /users/me/messages/AAMkAGI...?$expand=attachments
```

**Response:**
```json
{
  "id": "AAMkAGI...",
  "subject": "Report",
  "body": {
    "contentType": "html",
    "content": "<html>...</html>"
  },
  "from": { ... },
  "toRecipients": [ ... ],
  "attachments": [
    {
      "id": "AAMkAGI...",
      "name": "report.pdf",
      "contentType": "application/pdf",
      "size": 102400
    }
  ]
}
```

---

### Send Mail

**Endpoint:** `POST /users/{id}/sendMail`

**Request Body:**
```json
{
  "message": {
    "subject": "Project Update",
    "body": {
      "contentType": "html",
      "content": "<h1>Update</h1>"
    },
    "toRecipients": [
      {
        "emailAddress": {
          "address": "user@example.com"
        }
      }
    ],
    "ccRecipients": [...],
    "bccRecipients": [...],
    "attachments": [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        "name": "file.pdf",
        "contentType": "application/pdf",
        "contentBytes": "base64-encoded-content"
      }
    ]
  },
  "saveToSentItems": true
}
```

**Response:** `202 Accepted` (no body)

**Limits:**
- Body: 4 MB
- Attachment: 4 MB per file
- Total: 4 MB

---

### Update Message

**Endpoint:** `PATCH /users/{id}/messages/{message-id}`

**Mark as Read:**
```json
{
  "isRead": true
}
```

**Response:** Updated message object

---

### Delete Message

**Endpoint:** `DELETE /users/{id}/messages/{message-id}`

**Response:** `204 No Content`

---

### Move Message

**Endpoint:** `POST /users/{id}/messages/{message-id}/move`

**Request Body:**
```json
{
  "destinationId": "AAMkAGI..."
}
```

**Response:** Moved message object with new ID

---

### Download Attachment

**Endpoint:** `GET /users/{id}/messages/{message-id}/attachments/{attachment-id}/$value`

**Response:** Binary attachment content

**Content-Type:** Attachment's MIME type

---

## Calendar Endpoints

### List Events

**Endpoint:** `GET /users/{id}/events`

**Query Parameters:**
- `$filter` - Filter by date range
- `$select` - Select properties
- `$top` - Number of results
- `$orderby` - Sort order

**Example:**
```http
GET /users/me/events?$filter=start/dateTime ge '2026-02-01T00:00:00Z' and end/dateTime le '2026-02-28T23:59:59Z'&$orderby=start/dateTime
```

**Response:**
```json
{
  "value": [
    {
      "id": "AAMkAGI...",
      "subject": "Team Meeting",
      "start": {
        "dateTime": "2026-02-01T10:00:00",
        "timeZone": "Pacific Standard Time"
      },
      "end": {
        "dateTime": "2026-02-01T11:00:00",
        "timeZone": "Pacific Standard Time"
      },
      "location": {
        "displayName": "Conference Room A"
      },
      "attendees": [...]
    }
  ]
}
```

---

### Create Event

**Endpoint:** `POST /users/{id}/events`

**Request Body:**
```json
{
  "subject": "Team Meeting",
  "start": {
    "dateTime": "2026-02-01T10:00:00",
    "timeZone": "Pacific Standard Time"
  },
  "end": {
    "dateTime": "2026-02-01T11:00:00",
    "timeZone": "Pacific Standard Time"
  },
  "location": {
    "displayName": "Conference Room A"
  },
  "attendees": [
    {
      "emailAddress": {
        "address": "user@example.com",
        "name": "User Name"
      },
      "type": "required"
    }
  ],
  "isOnlineMeeting": true,
  "onlineMeetingProvider": "teamsForBusiness"
}
```

**Response:** Created event with Teams meeting URL

---

### Update Event

**Endpoint:** `PATCH /users/{id}/events/{event-id}`

**Request Body:**
```json
{
  "subject": "Updated Title",
  "location": {
    "displayName": "New Location"
  }
}
```

**Response:** Updated event object

---

### Delete Event

**Endpoint:** `DELETE /users/{id}/events/{event-id}`

**Response:** `204 No Content`

---

## Contacts Endpoints

### List Contacts

**Endpoint:** `GET /users/{id}/contacts`

**Query Parameters:**
- `$filter` - Filter contacts
- `$search` - Search by name/email
- `$select` - Select properties
- `$top` - Number of results

**Example:**
```http
GET /users/me/contacts?$search="John"&$top=10
```

**Response:**
```json
{
  "value": [
    {
      "id": "AAMkAGI...",
      "displayName": "John Doe",
      "emailAddresses": [
        {
          "address": "john@example.com",
          "name": "John Doe"
        }
      ],
      "businessPhones": ["+1-555-0100"],
      "jobTitle": "Software Engineer",
      "companyName": "Acme Corp"
    }
  ]
}
```

---

### Create Contact

**Endpoint:** `POST /users/{id}/contacts`

**Request Body:**
```json
{
  "givenName": "John",
  "surname": "Doe",
  "displayName": "John Doe",
  "emailAddresses": [
    {
      "address": "john@example.com",
      "name": "John Doe"
    }
  ],
  "businessPhones": ["+1-555-0100"],
  "jobTitle": "Software Engineer",
  "companyName": "Acme Corp"
}
```

**Response:** Created contact object

---

### Delete Contact

**Endpoint:** `DELETE /users/{id}/contacts/{contact-id}`

**Response:** `204 No Content`

---

## Mail Folders Endpoints

### List Folders

**Endpoint:** `GET /users/{id}/mailFolders`

**Query Parameters:**
- `$select` - Select properties
- `includeHiddenFolders` - Include hidden folders

**Example:**
```http
GET /users/me/mailFolders?$select=id,displayName,totalItemCount,unreadItemCount
```

**Response:**
```json
{
  "value": [
    {
      "id": "AAMkAGI...",
      "displayName": "Inbox",
      "totalItemCount": 150,
      "unreadItemCount": 12
    },
    {
      "id": "AAMkAGI...",
      "displayName": "Sent Items",
      "totalItemCount": 450,
      "unreadItemCount": 0
    }
  ]
}
```

---

### Create Folder

**Endpoint:** `POST /users/{id}/mailFolders`

**Request Body:**
```json
{
  "displayName": "Projects"
}
```

**Create Subfolder:**
```http
POST /users/me/mailFolders/{parent-folder-id}/childFolders
```

**Response:** Created folder object

---

### Delete Folder

**Endpoint:** `DELETE /users/{id}/mailFolders/{folder-id}`

**Response:** `204 No Content`

---

## Error Responses

### Common Error Codes

**401 Unauthorized:**
```json
{
  "error": {
    "code": "InvalidAuthenticationToken",
    "message": "Access token is empty."
  }
}
```

**403 Forbidden:**
```json
{
  "error": {
    "code": "ErrorAccessDenied",
    "message": "Access is denied."
  }
}
```

**404 Not Found:**
```json
{
  "error": {
    "code": "ResourceNotFound",
    "message": "The specified object was not found."
  }
}
```

**429 Too Many Requests:**
```json
{
  "error": {
    "code": "TooManyRequests",
    "message": "The request has been throttled."
  }
}
```

**Headers:**
```
Retry-After: 120
```

---

## Rate Limits

### Throttling

**Limits per app per mailbox:**
- 10,000 requests per 10 minutes

**Best Practices:**
1. Implement retry with exponential backoff
2. Check `Retry-After` header on 429 errors
3. Batch requests when possible
4. Use delta queries for change tracking

**Example Retry Logic:**
```typescript
async function retryWithBackoff(fn: () => Promise<any>, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error.statusCode === 429) {
        const retryAfter = parseInt(error.headers['retry-after'] || '60');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Batch Requests

**Endpoint:** `POST /$batch`

**Request Body:**
```json
{
  "requests": [
    {
      "id": "1",
      "method": "GET",
      "url": "/users/me/messages?$top=1"
    },
    {
      "id": "2",
      "method": "GET",
      "url": "/users/me/events?$top=1"
    }
  ]
}
```

**Response:**
```json
{
  "responses": [
    {
      "id": "1",
      "status": 200,
      "body": { ... }
    },
    {
      "id": "2",
      "status": 200,
      "body": { ... }
    }
  ]
}
```

**Limits:**
- Max 20 requests per batch
- Each request counted against rate limit

---

## Delta Queries

Track changes to messages/events/contacts.

**Initial Request:**
```http
GET /users/me/messages/delta
```

**Response includes `@odata.deltaLink`:**
```json
{
  "value": [...],
  "@odata.deltaLink": "https://graph.microsoft.com/v1.0/users/me/messages/delta?$deltatoken=abc123"
}
```

**Subsequent Requests:**
```http
GET /users/me/messages/delta?$deltatoken=abc123
```

**Returns only changed items since last query.**

---

## Query Options

### $filter

**Operators:**
- `eq` - Equals
- `ne` - Not equals
- `gt`, `ge` - Greater than/equal
- `lt`, `le` - Less than/equal
- `and`, `or` - Logical operators

**Examples:**
```
isRead eq false
from/emailAddress/address eq 'user@example.com'
receivedDateTime ge 2026-01-01T00:00:00Z
isRead eq false and hasAttachments eq true
```

### $search

**Full-text search:**
```
$search="project report"
```

### $select

**Select specific properties:**
```
$select=subject,from,receivedDateTime
```

### $orderby

**Sort results:**
```
$orderby=receivedDateTime desc
$orderby=subject asc
```

### $top

**Limit results:**
```
$top=20
```

### $skip

**Pagination:**
```
$skip=20
```

---

## References

- [Microsoft Graph REST API v1.0](https://docs.microsoft.com/graph/api/overview)
- [Mail API Reference](https://docs.microsoft.com/graph/api/resources/mail-api-overview)
- [Calendar API Reference](https://docs.microsoft.com/graph/api/resources/calendar)
- [Contacts API Reference](https://docs.microsoft.com/graph/api/resources/contact)
- [Query Parameters](https://docs.microsoft.com/graph/query-parameters)
- [Throttling and Batching](https://docs.microsoft.com/graph/throttling)

---
version: 1.0.0
updated: 2026-01-31
reviewed: 2026-01-31
score: 4.7
---
