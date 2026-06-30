# Holiday Management API Documentation

This API allows managing institution-wide holidays, emergency holidays, and special days. These holidays can be configured to show up in attendance reports and are used for calculating working days.

## Base URL
`GET/POST/PUT/DELETE /institutions/:institutionId/holidays`

## Authentication
All endpoints require a valid JWT token in the `Authorization` header.
**Header**: `Authorization: Bearer <your_token>`

---

## Endpoints

### 1. Create Holiday
Create a new holiday record for the institution.

*   **URL**: `/institutions/:institutionId/holidays`
*   **Method**: `POST`
*   **Request Body**:
    ```json
    {
      "name": "Summer Vacation",
      "startDate": "2024-05-01",
      "endDate": "2024-05-31",
      "type": "institution-holiday",
      "description": "Annual summer break for all staff and students",
      "showInAttendance": true
    }
    ```
*   **Fields**:
    *   `name` (Required): Name of the holiday.
    *   `startDate` (Required): Start date (YYYY-MM-DD).
    *   `endDate` (Optional): End date (YYYY-MM-DD). Defaults to `startDate` if not provided.
    *   `type` (Optional): One of `institution-holiday`, `emergency-holiday`, `special-day`. Defaults to `institution-holiday`.
    *   `description` (Optional): Detailed description.
    *   `showInAttendance` (Optional): Boolean (default `true`). If true, this day will be marked as a holiday in attendance reports.

---

### 2. Get All Holidays
Retrieve a list of holidays for an institution.

*   **URL**: `/institutions/:institutionId/holidays`
*   **Method**: `GET`
*   **Query Parameters**:
    *   `startDate` (Optional): Filter holidays ending on or after this date.
    *   `endDate` (Optional): Filter holidays starting on or before this date.
    *   `type` (Optional): Filter by holiday type.
    *   `showOnly` (Optional): Set to `true` to return only holidays where `showInAttendance` is true.

---

### 3. Get Holiday by ID
Retrieve details of a specific holiday.

*   **URL**: `/institutions/:institutionId/holidays/:holidayId`
*   **Method**: `GET`

---

### 4. Update Holiday
Update an existing holiday record.

*   **URL**: `/institutions/:institutionId/holidays/:holidayId`
*   **Method**: `PUT`
*   **Request Body**: (Any field can be updated)
    ```json
    {
      "name": "Updated Holiday Name",
      "isActive": false
    }
    ```

---

### 5. Delete Holiday
Soft-delete a holiday by marking it as inactive.

*   **URL**: `/institutions/:institutionId/holidays/:holidayId`
*   **Method**: `DELETE`

---

## Data Schema (Reference)

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Name of the holiday |
| `startDate` | Date | Beginning of the holiday period |
| `endDate` | Date | End of the holiday period |
| `type` | Enum | `institution-holiday`, `emergency-holiday`, `special-day` |
| `description` | String | Optional details |
| `isActive` | Boolean | Status of the holiday (defaults to `true`) |
| `showInAttendance`| Boolean | Whether to flag this as a holiday in reports |
| `createdBy` | ObjectId | User ID of the creator |
