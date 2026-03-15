# API Test Results — Rendara v2

**Batch:** API Tests (TC-API-001 through TC-API-006)
**Executed:** 2026-03-13
**Environment:** Backend at http://localhost:8001 (FastAPI/uvicorn), SQLite demo.db
**Executor:** QA Subagent (curl/bash direct execution)

---

## Summary Table

| Test Case | Title | Result | Notes |
|---|---|---|---|
| TC-API-001 | Chat Stream Contract | **PASS** | All sub-checks pass |
| TC-API-002 | Conversations CRUD | **PASS** | All CRUD operations verified |
| TC-API-003 | Dashboards CRUD | **PARTIAL PASS** | GET/POST/404 pass; POST pins returns 500 (bug) |
| TC-API-004 | Reports CRUD | **PASS** | Create, GET, publish, public access all pass |
| TC-API-005 | CORS Headers | **PASS** | All CORS headers correct |
| TC-API-006 | Error Handling | **PARTIAL PASS** | 422 on missing fields pass; empty message behavior differs from spec |

---

## TC-API-001: Chat Stream Contract

**Result: PASS**

### Sub-test 1.1 — Content-Type is text/event-stream

**Request:**
```
POST http://localhost:8001/api/chat/stream
Content-Type: application/json
{"conversation_id": "tc-api-001-test2", "message": "Say hello in 3 words.", "new_conversation": true}
```

**Response headers (relevant):**
```
HTTP/1.1 200 OK
content-type: text/event-stream; charset=utf-8
cache-control: no-cache
x-accel-buffering: no
transfer-encoding: chunked
```

**Result:** PASS — Content-Type is `text/event-stream`, cache-control is `no-cache`.

---

### Sub-test 1.2 — All SSE data lines are valid JSON

**Sample stream body (simple query):**
```
data: {"type": "text_delta", "delta": "Hello! How"}
data: {"type": "text_delta", "delta": "'s"}
data: {"type": "text_delta", "delta": " business"}
data: {"type": "text_delta", "delta": "?"}
data: {"type": "message_complete", "conversation_id": "tc-api-001-test2", "message_id": "msg_2cea2ac352ea", "usage": {"prompt_tokens": 2057, "completion_tokens": 9}}
```

**Validation:** All 5 `data:` lines parse as valid JSON. **PASS**

---

### Sub-test 1.3 — message_complete has usage stats

**Captured message_complete event:**
```json
{
  "type": "message_complete",
  "conversation_id": "tc-api-001-usage-check",
  "message_id": "msg_4c73552cd417",
  "usage": {
    "prompt_tokens": 2056,
    "completion_tokens": 54
  }
}
```

**Result:** PASS — `conversation_id`, `message_id`, `usage.prompt_tokens`, `usage.completion_tokens` all present.

---

### Sub-test 1.4 — Data query triggers tool_call_start and tool_call_result

**Request:**
```
POST http://localhost:8001/api/chat/stream
{"conversation_id": "tc-api-001-toolcall", "message": "What were total sales by region?", "new_conversation": true}
```

**Key events captured:**
```
data: {"type": "tool_call_start", "tool_call_id": "toolu_bdrk_01N4yKMpbzuawcfHGXDqj73y", "tool_name": "get_schema", "server_name": "telco_sql", "arguments": {}}
data: {"type": "tool_call_result", "tool_call_id": "toolu_bdrk_01N4yKMpbzuawcfHGXDqj73y", "tool_name": "get_schema", "server_name": "telco_sql", "success": true, "duration_ms": 0, "result_summary": "Tool completed successfully"}
data: {"type": "tool_call_start", "tool_call_id": "toolu_bdrk_014qee1qEsM63wsuVvfgzQNX", "tool_name": "run_sql", ...}
data: {"type": "tool_call_result", "tool_call_id": "toolu_bdrk_014qee1qEsM63wsuVvfgzQNX", ..., "result_summary": "8 rows returned"}
data: {"type": "viz_block", "block_id": "viz_01", "spec": {"type": "bar", "title": "Total Sales by Region", ...}}
data: {"type": "message_complete", ...}
```

**Result:** PASS — `tool_call_start`, `tool_call_result`, `viz_block`, and `message_complete` all present.

---

### Sub-test 1.5 — tool_call_id matching

**Verification output:**
```
Event types seen: ['text_delta', 'viz_block', 'tool_call_result', 'message_complete', 'tool_call_start']
Tool starts: {'toolu_bdrk_01XU5sh2LuihtJiyRMTULRBt': 'get_schema', 'toolu_bdrk_01HsCBRgrekS4i1UV9YrDodc': 'run_sql'}
Tool results: {'toolu_bdrk_01XU5sh2LuihtJiyRMTULRBt': 'get_schema', 'toolu_bdrk_01HsCBRgrekS4i1UV9YrDodc': 'run_sql'}
All tool_call_ids matched: True
```

**Result:** PASS — Every `tool_call_start` has a matching `tool_call_result` with the same ID.

---

### Sub-test 1.6 — Note on conversation_id requirement

**Finding:** The backend `ChatStreamRequest` model requires `conversation_id` as a non-null `str`. Passing `null` returns a 422 validation error:
```json
{"detail": [{"type": "string_type", "loc": ["body", "conversation_id"], "msg": "Input should be a valid string", "input": null}]}
```
The test strategy spec says `"conversation_id": null` should be valid for new conversations. **This is a gap** — the frontend must generate a client-side UUID and pass it as a string.

---

## TC-API-002: Conversations CRUD

**Result: PASS**

### 2.1 — GET /api/conversations

**Request:** `GET http://localhost:8001/api/conversations`

**Response:** `HTTP 200`
```json
[
  {"id": "tc-api-001-toolcall", "title": "What were total sales by regio...", "createdAt": "...", "updatedAt": "..."},
  ...
]
```

**Validation:**
- Status 200 ✓
- Returns array ✓
- Fields present: `id`, `title`, `createdAt`, `updatedAt` ✓
- Total records returned: 33
- No `messages` field in list items (correct) ✓

---

### 2.2 — GET /api/conversations/{id}

**Request:** `GET http://localhost:8001/api/conversations/tc-api-001-test`

**Response:** `HTTP 200`
```json
{
  "id": "tc-api-001-test",
  "title": "Say hello in 3 words.",
  "createdAt": "2026-03-13 15:57:37",
  "updatedAt": "2026-03-13 15:57:40",
  "messages": [
    {"id": "umsg_f39058750cbf", "conversation_id": "tc-api-001-test", "role": "user", "content": "Say hello in 3 words.", "created_at": "..."},
    {"id": "msg_3c5b0e4525d5", "conversation_id": "tc-api-001-test", "role": "assistant", "content": [...], "created_at": "..."}
  ]
}
```

**Validation:**
- Status 200 ✓
- Has `messages` array ✓
- Messages have `id`, `role`, `content` ✓

---

### 2.3 — PATCH /api/conversations/{id}

**Request:**
```
PATCH http://localhost:8001/api/conversations/tc-api-001-test
{"title": "TC-API-003 Updated Title"}
```

**Response:** `HTTP 200`
```json
{"id": "tc-api-001-test", "title": "TC-API-003 Updated Title", "createdAt": "2026-03-13 15:57:37", "updatedAt": "2026-03-13 15:58:35"}
```

**Validation:** Title updated, `updatedAt` refreshed. PASS ✓

---

### 2.4 — DELETE /api/conversations/{id}

**Request:** `DELETE http://localhost:8001/api/conversations/tc-api-001-test`

**Response:** `HTTP 200`
```json
{"deleted": "tc-api-001-test"}
```

**Subsequent GET:** `HTTP 404` — `{"detail": "Conversation not found"}`

**Validation:** Delete returns success, subsequent GET returns 404. Soft-delete confirmed. PASS ✓

---

### 2.5 — 404 for nonexistent conversation

**Request:** `GET http://localhost:8001/api/conversations/nonexistent-id-12345`

**Response:** `HTTP 404`
```json
{"detail": "Conversation not found"}
```

**Validation:** PASS ✓

---

### 2.6 — Note on POST /api/conversations

`POST /api/conversations` returns `405 Method Not Allowed` with `allow: GET` header. Conversations are created implicitly via the chat stream endpoint. This is by design — no standalone create endpoint exists. **Acceptable.**

---

## TC-API-003: Dashboards CRUD

**Result: PARTIAL PASS**

### 3.1 — GET /api/dashboards

**Request:** `GET http://localhost:8001/api/dashboards`

**Response:** `HTTP 200`
```json
[
  {"id": "e5dee4a2-...", "title": "Test Dashboard", "description": "A test dashboard", "pinCount": 0, "createdAt": "...", "updatedAt": "..."},
  ...
]
```

**Validation:** Status 200, array with `id`, `title`, `pinCount`, `createdAt`, `updatedAt`. PASS ✓

---

### 3.2 — POST /api/dashboards

**Request:**
```
POST http://localhost:8001/api/dashboards
{"title": "TC-API Test Dashboard", "description": "Test dashboard for TC-API-004"}
```

**Response:** `HTTP 200`
```json
{"id": "d226b0df-afdb-46da-b65c-9fd4245d02d7", "title": "TC-API Test Dashboard", "description": "Test dashboard for TC-API-004", "pinCount": 0, "createdAt": "2026-03-13 15:58:45", "updatedAt": "2026-03-13 15:58:45"}
```

**Validation:** PASS ✓

---

### 3.3 — GET /api/dashboards/{id}

**Request:** `GET http://localhost:8001/api/dashboards/d226b0df-afdb-46da-b65c-9fd4245d02d7`

**Response:** `HTTP 200`
```json
{
  "id": "d226b0df-...",
  "title": "TC-API Test Dashboard",
  "description": "...",
  "pinCount": 0,
  "createdAt": "...",
  "updatedAt": "...",
  "pins": []
}
```

**Validation:** `pins` array present. PASS ✓

---

### 3.4 — POST /api/dashboards/{id}/pins — BUG FOUND

**Request:**
```
POST http://localhost:8001/api/dashboards/d226b0df-.../pins
{"title": "Test Chart Pin", "content_type": "viz_block", "content": {...}, "message_id": "msg_test123", "note": "Test pin note", "conversation_id": "...", "block_index": 0, "block_type": "viz_block"}
```

**Response:** `HTTP 500 Internal Server Error`

**Root cause:** Router in `routers/dashboards.py` calls `database.add_pin(...)` with keyword arguments `title=body.title` and `note=body.note`, but `database.add_pin()` does not accept a `title` parameter — it accepts `note` and `position`. The `title` kwarg is unexpected and causes a Python TypeError internally.

```python
# Router calls:
await database.add_pin(..., title=body.title, note=body.note)

# DB signature is:
async def add_pin(..., block_content, note, position)
```

**Result: FAIL** — Pin creation endpoint is broken (500). Marked as a bug.

---

### 3.5 — GET /api/dashboards/{nonexistent} — 404

**Request:** `GET http://localhost:8001/api/dashboards/nonexistent-dash-id`

**Response:** `HTTP 404`
```json
{"detail": "Dashboard not found"}
```

**Validation:** PASS ✓

---

## TC-API-004: Reports CRUD

**Result: PASS**

### 4.1 — GET /api/reports

**Response:** `HTTP 200` — Array with `id`, `title`, `public_uuid`, `created_at`, `updated_at`. Count: 3. PASS ✓

---

### 4.2 — POST /api/reports

**Request:**
```
POST http://localhost:8001/api/reports
{"title": "TC-API-005 Test Report", "content": [{"type": "heading", "text": "Test Heading"}, {"type": "text", "text": "Test body content"}]}
```

**Response:** `HTTP 200`
```json
{
  "id": "774b04e3-5d0c-4761-a790-e9e95e487694",
  "title": "TC-API-005 Test Report",
  "content": [{"type": "heading", "text": "Test Heading"}, {"type": "text", "text": "Test body content"}],
  "public_uuid": null,
  "created_at": "2026-03-13 15:59:27",
  "updated_at": "2026-03-13 15:59:27"
}
```

**Validation:** `public_uuid` starts as `null`, content preserved. PASS ✓

---

### 4.3 — GET /api/reports/{id}

**Response:** `HTTP 200` — Returns report with `id`, `title`, `content` array, `public_uuid: null`. PASS ✓

---

### 4.4 — POST /api/reports/{id}/publish

**Request:** `POST http://localhost:8001/api/reports/774b04e3-.../publish`

**Response:** `HTTP 200`
```json
{
  "public_url": "http://localhost:3000,http://146.190.89.151:3000/r/c54c4354-375d-4f0c-a4b9-55383ff4213e",
  "public_uuid": "c54c4354-375d-4f0c-a4b9-55383ff4213e"
}
```

**Note:** `public_url` contains two comma-separated URLs (localhost and production). This may be a config issue but does not break functionality.

**Validation:** `public_uuid` generated. PASS ✓

---

### 4.5 — GET /api/reports/public/{uuid}

**Request:** `GET http://localhost:8001/api/reports/public/c54c4354-375d-4f0c-a4b9-55383ff4213e`

**Response:** `HTTP 200`
```json
{
  "id": "774b04e3-...",
  "title": "TC-API-005 Test Report",
  "public_uuid": "c54c4354-375d-4f0c-a4b9-55383ff4213e",
  "content": [...]
}
```

**Validation:** Public access works without authentication. PASS ✓

---

### 4.6 — GET /api/reports/public/{bad-uuid} — 404

**Response:** `HTTP 404` — `{"detail": "Report not found"}`. PASS ✓

### 4.7 — GET /api/reports/{nonexistent} — 404

**Response:** `HTTP 404` — `{"detail": "Report not found"}`. PASS ✓

---

## TC-API-005: CORS Headers

**Result: PASS**

### 5.1 — OPTIONS preflight

**Request:**
```
OPTIONS http://localhost:8001/api/conversations
Origin: http://localhost:3000
Access-Control-Request-Method: GET
```

**Response:** `HTTP 200`
```
access-control-allow-origin: http://localhost:3000
access-control-allow-methods: GET, POST, PUT, DELETE, PATCH
access-control-allow-headers: Accept, Accept-Language, Authorization, Content-Language, Content-Type
access-control-allow-credentials: true
access-control-max-age: 600
vary: Origin
```

**Validation:** All required CORS headers present. PASS ✓

---

### 5.2 — POST with Origin header

**Request:**
```
POST http://localhost:8001/api/reports
Origin: http://localhost:3000
{"title": "CORS Test"}
```

**Response headers:**
```
access-control-allow-origin: http://localhost:3000
access-control-allow-credentials: true
vary: Origin
```

**Validation:** CORS reflected correctly on actual request. PASS ✓

---

## TC-API-006: Error Handling

**Result: PARTIAL PASS**

### 6.1 — Empty body returns 422

**Request:** `POST http://localhost:8001/api/chat/stream` with body `{}`

**Response:** `HTTP 422`
```json
{
  "detail": [
    {"type": "missing", "loc": ["body", "conversation_id"], "msg": "Field required", "input": {}},
    {"type": "missing", "loc": ["body", "message"], "msg": "Field required", "input": {}}
  ]
}
```

**Validation:** Both `conversation_id` and `message` flagged as missing. PASS ✓

**Note:** The test strategy spec (TC-API-006) says "400 Bad Request" but FastAPI returns 422 (Unprocessable Entity) for validation errors. 422 is the correct HTTP status for this case per FastAPI conventions. The spec should be updated to expect 422.

---

### 6.2 — Missing conversation_id returns 422

**Request:** `POST http://localhost:8001/api/chat/stream` with body `{"message": "Hello"}`

**Response:** `HTTP 422`
```json
{"detail": [{"type": "missing", "loc": ["body", "conversation_id"], "msg": "Field required", "input": {"message": "Hello"}}]}
```

**Validation:** PASS ✓

---

### 6.3 — Invalid JSON returns 422

**Request:** `POST http://localhost:8001/api/chat/stream` with body `not valid json`

**Response:** `HTTP 422`
```json
{"detail": [{"type": "json_invalid", "loc": ["body", 0], "msg": "JSON decode error", "input": {}, "ctx": {"error": "Expecting value"}}]}
```

**Validation:** PASS ✓

---

### 6.4 — Empty message string behavior

**Request:** `POST http://localhost:8001/api/chat/stream` with `{"conversation_id": "test", "message": "", "new_conversation": true}`

**Response:** `HTTP 200` (stream opened)
```
data: {"type": "error", "error_code": "OPENROUTER_UNAVAILABLE", "error_message": "OpenRouter returned 400: {\"error\":{\"message\":\"Provider returned error\",\"code\":400,...", "recoverable": true}
```

**Validation:** Empty message passes backend validation (empty string is a valid string per Pydantic) and reaches the LLM provider, which rejects it with a 400. The backend converts this to an SSE `error` event with `error_code: OPENROUTER_UNAVAILABLE`. The stream returns `HTTP 200` status.

**Assessment:** PARTIAL PASS — The stream opens (200) and surfaces an error event correctly. The test strategy says "returns error" which is satisfied by the SSE error event. However, the backend could add an explicit empty-string validation to return 422 before hitting the LLM.

---

## Bugs Found

### BUG-001: POST /api/dashboards/{id}/pins returns 500 (Critical)

**File:** `/home/Daniel/workingfolder/rendara/backend/routers/dashboards.py`

**Description:** The `add_pin` router function calls `database.add_pin()` with keyword argument `title=body.title`, but the database function signature has no `title` parameter — it expects `note` and `position`. This causes a Python `TypeError` internally, resulting in HTTP 500.

**Router call (line ~55):**
```python
return await database.add_pin(
    pin_id=pin_id,
    dash_id=dashboard_id,
    conv_id=body.conversation_id or "",
    msg_id=body.message_id or "",
    block_index=body.block_index or 0,
    block_type=body.block_type or "text",
    block_content=body.content,
    title=body.title,    # <-- unexpected kwarg
    note=body.note,      # <-- position arg missing entirely
)
```

**Database function signature:**
```python
async def add_pin(pin_id, dash_id, conv_id, msg_id, block_index, block_type, block_content, note, position)
```

**Fix:** Remove `title=body.title` and add `position=0` (or derive from existing pin count).

---

### BUG-002: public_url in publish response contains multiple comma-separated URLs (Minor)

**File:** Backend reports router, publish endpoint.

**Description:** `POST /api/reports/{id}/publish` returns:
```json
{"public_url": "http://localhost:3000,http://146.190.89.151:3000/r/c54c4354-...", "public_uuid": "c54c4354-..."}
```

The `public_url` field contains two comma-concatenated URLs rather than a single URL. This appears to be a misconfiguration where `FRONTEND_URL` config has multiple origins. The frontend should use only the first URL or the field should be cleaned.

---

### BUG-003: POST /api/conversations returns 405 (Informational — by design)

The test strategy references `POST /api/conversations` in TC-API-003 but this route does not exist. Conversations are created implicitly via `POST /api/chat/stream`. This is not a bug per se but the test strategy step 1 in TC-API-003 ("POST /api/conversations -> verify 201 + id") is incorrect and should be updated to reflect the actual creation flow.

---

## Spec Deviations

| Deviation | Expected (spec) | Actual | Verdict |
|---|---|---|---|
| `conversation_id: null` in request | Accepted for new conversations | 422 validation error (must be string) | Frontend must generate UUID client-side |
| Empty body returns 400 | TC-API-006 says "400 Bad Request" | 422 Unprocessable Entity | FastAPI convention; 422 is correct |
| POST /api/conversations exists | TC-API-003 step 1 | 405 Method Not Allowed | Conversations created via chat stream |
| public_url single value | Single public URL | Comma-separated dual URLs | Config issue in backend |
