# Practical-9

**Aim:** To design test cases and to apply them using various testing tools.

## 9.1 Introduction

Test cases define the exact inputs, expected outputs, and pass or fail criteria used to verify the SmartPantry system. The test cases below are derived from the implemented modules in this project: authentication, profile management, admin controls, inventory management, OCR and AI features, recipe recommendation, and shopping-list operations.

The primary tools used for execution are:

- `Postman` for API-level testing
- `FastAPI /docs` Swagger UI for quick endpoint verification
- `Chrome DevTools` for frontend flow verification and request inspection
- `MongoDB Compass` or Mongo shell for database verification where required

## 9.2 Test Cases — User Authentication and Profile Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC01 | Valid User Registration | `POST /auth/signup` with valid `full_name`, `email`, `mobile`, `dob`, `password`, `otp=123456` | User is created and JWT token is returned | Postman | Pending |
| TC02 | Registration with Invalid OTP | `POST /auth/signup` with `otp=000000` | HTTP `400 Bad Request` with `Invalid OTP` message | Postman | Pending |
| TC03 | Registration with Duplicate Email | Register with an email that already exists | HTTP `409 Conflict` with `Email already registered` | Postman | Pending |
| TC04 | Valid User Login | `POST /auth/login` with correct email and password | JWT token returned in response body | Postman | Pending |
| TC05 | Login with Wrong Password | `POST /auth/login` with correct email and incorrect password | HTTP `401 Unauthorized` with `Invalid password` | Postman | Pending |
| TC06 | Fetch Logged-In User Profile | `GET /me` with valid bearer token | Logged-in user profile including `role` is returned | Postman / Swagger UI | Pending |
| TC07 | Update Profile Successfully | `PUT /me` with new `full_name`, `mobile`, or `about` values | Updated profile returned successfully | Postman / Swagger UI | Pending |

## 9.3 Test Cases — Admin Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC08 | Admin Summary by Admin User | `GET /admin/summary` with admin bearer token | Dashboard summary with total users, admins, inventory items, and shopping items | Postman | Pending |
| TC09 | Admin Summary by Normal User | `GET /admin/summary` with non-admin bearer token | HTTP `403 Forbidden` with `Admin access required` | Postman | Pending |
| TC10 | List All Users as Admin | `GET /admin/users` with admin bearer token | User list returned with roles and counts | Postman | Pending |
| TC11 | Promote User to Admin | `PUT /admin/users/{user_id}/role` with body `{ "role": "admin" }` | Target user role updated to `admin` | Postman | Pending |
| TC12 | Prevent Invalid Role Update | `PUT /admin/users/{user_id}/role` with body `{ "role": "manager" }` | HTTP `400 Bad Request` with validation message | Postman | Pending |
| TC13 | Admin Page Visible in UI | Login with admin account and open frontend navbar | `Admin` button appears and opens Admin dashboard | Chrome DevTools / Browser | Pending |

## 9.4 Test Cases — Inventory Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC14 | Add Inventory Item | `POST /inventory` with valid item name, category, quantity, unit, price | Item is created and returned with generated `id` | Postman | Pending |
| TC15 | List Inventory Items | `GET /inventory` with valid token | Logged-in user's inventory items are returned | Postman / Swagger UI | Pending |
| TC16 | Update Inventory Item | `PUT /inventory/{item_id}` with modified quantity or expiry date | Updated item is returned | Postman | Pending |
| TC17 | Delete Inventory Item | `DELETE /inventory/{item_id}` for valid item | JSON response `{ "ok": true }` | Postman | Pending |
| TC18 | Access Inventory Without Token | `GET /inventory` without `Authorization` header | HTTP `401 Unauthorized` | Postman | Pending |

## 9.5 Test Cases — OCR, Barcode, and Quick Add Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC19 | Quick Add with Valid Grocery Text | `POST /ai/quick-add` with text like `2 liters milk, 6 eggs` | Parsed items inserted into inventory and returned | Postman | Pending |
| TC20 | Quick Add with Empty Text | `POST /ai/quick-add` with empty text | HTTP `400 Bad Request` with `Missing text` | Postman | Pending |
| TC21 | Barcode Lookup with Valid Barcode | `POST /ai/barcode-lookup` using a known barcode | Product name, category, and estimated expiry date returned | Postman | Pending |
| TC22 | Barcode Lookup with Missing Barcode | `POST /ai/barcode-lookup` with empty barcode | HTTP `400 Bad Request` with `Missing barcode` | Postman | Pending |
| TC23 | OCR Receipt Upload | `POST /ai/ocr-receipt` with valid image file | Raw text and extracted items returned | Postman / Browser | Pending |
| TC24 | OCR Commit Extracted Items | `POST /ai/ocr-commit` with normalized OCR item list | Items inserted into inventory and success response returned | Postman | Pending |
| TC25 | OCR Commit with Empty List | `POST /ai/ocr-commit` with `[]` | HTTP `400 Bad Request` with `No items to save` | Postman | Pending |

## 9.6 Test Cases — Recipe Recommendation Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC26 | Local Recipe Recommendation | `GET /ai/recipes` with valid token | Pantry-based recipe suggestions and at-risk items returned | Postman | Pending |
| TC27 | Gemini Recipe Recommendation | `GET /ai/recipes-gemini` with valid token and inventory data | Recipe list returned from Gemini or fallback local recommendations | Postman | Pending |
| TC28 | Recipe Endpoint Without Token | `GET /ai/recipes-gemini` without bearer token | HTTP `401 Unauthorized` | Postman | Pending |
| TC29 | Recipe Suggestions Visible in UI | Open Recipes page after login | Recipes and missing ingredients render correctly in UI | Chrome DevTools / Browser | Pending |

## 9.7 Test Cases — Shopping List Module

| TC # | Test Case Name | Test Input | Expected Output | Tool | Result |
|---|---|---|---|---|---|
| TC30 | Add Shopping List Item | `POST /shopping-list` with valid name, quantity, unit, notes | Shopping list item created with action `created` | Postman | Pending |
| TC31 | Merge Duplicate Shopping Item | Add same item name again for same user | Existing item quantity is updated and action `merged` returned | Postman | Pending |
| TC32 | List Shopping Items | `GET /shopping-list` with valid token | User's shopping items are returned in descending order | Postman / Swagger UI | Pending |
| TC33 | Update Shopping Item | `PUT /shopping-list/{item_id}` with modified `bought=true` or new notes | Updated shopping item returned | Postman | Pending |
| TC34 | Delete Shopping Item | `DELETE /shopping-list/{item_id}` for valid item | JSON response `{ "ok": true }` | Postman | Pending |
| TC35 | Delete Non-Existing Shopping Item | `DELETE /shopping-list/{item_id}` using invalid or removed item id | HTTP `404 Not Found` | Postman | Pending |

## 9.8 Application of Testing Tools

### A. Postman

Use Postman to execute all backend API test cases.

1. Start the backend server.
2. Set the base URL as `http://localhost:8000`.
3. Create requests for authentication, inventory, OCR, recipes, admin, and shopping-list endpoints.
4. Store the JWT token from login or signup and pass it in the `Authorization` header as `Bearer <token>`.
5. Mark the result as `Pass` if the API status code and response body match the expected output; otherwise mark it as `Fail`.

### B. FastAPI Swagger UI

Use Swagger UI for quick endpoint verification.

1. Start the backend server.
2. Open `http://localhost:8000/docs`.
3. Authorize using a bearer token.
4. Execute `GET`, `POST`, `PUT`, and `DELETE` requests interactively.

### C. Chrome DevTools

Use Chrome DevTools for frontend validation.

1. Start both frontend and backend servers.
2. Open the SmartPantry UI in the browser.
3. Verify login, dashboard, recipes, shopping-list, profile, and admin navigation flows.
4. Use the `Network` tab to confirm request URLs, payloads, and responses.

### D. MongoDB Compass

Use MongoDB Compass to validate stored records when necessary.

1. Connect to the database configured in `backend/.env`.
2. Inspect the `users`, `inventory`, and `shopping_list` collections.
3. Confirm whether inserted or updated records match the expected data after each API call.

## 9.9 Conclusion

The above test cases provide structured verification for the major SmartPantry modules. By applying Postman, Swagger UI, Chrome DevTools, and MongoDB Compass, both backend APIs and frontend workflows can be tested systematically. This ensures that authentication, admin access, inventory operations, AI-assisted features, recipe recommendations, and shopping-list behavior work according to the expected requirements.
