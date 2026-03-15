/**
 * BATCH: API Tests — TC-API-001 through TC-API-006
 *
 * Validates API contract for the Rendara v2 backend at http://localhost:8001.
 * Tests are pure API (no browser navigation). They use fetch() via
 * Playwright's request fixture for contract-level validation.
 *
 * Test cases:
 *   TC-API-001: Chat Stream Contract (SSE)
 *   TC-API-002: Conversations CRUD
 *   TC-API-003: Dashboards CRUD
 *   TC-API-004: Reports CRUD
 *   TC-API-005: CORS Headers
 *   TC-API-006: Error Handling
 */

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8001';
const API = `${BASE}/api`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all SSE events from a stream response as parsed JSON objects. */
async function collectSSEEvents(
  body: string
): Promise<Array<Record<string, unknown>>> {
  const events: Array<Record<string, unknown>> = [];
  const lines = body.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const payload = JSON.parse(line.slice(6).trim());
        events.push(payload);
      } catch {
        // skip non-JSON lines
      }
    }
  }
  return events;
}

// ---------------------------------------------------------------------------
// TC-API-001: Chat Stream Contract
// ---------------------------------------------------------------------------

test.describe('TC-API-001: Chat Stream Contract', () => {
  test('POST /api/chat/stream returns text/event-stream content type', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-ct',
        message: 'Say one word: hello',
        new_conversation: true,
      },
      headers: { 'Content-Type': 'application/json' },
    });

    expect(response.status()).toBe(200);
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('text/event-stream');
  });

  test('SSE response includes cache-control: no-cache header', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-cc',
        message: 'Say one word: hi',
        new_conversation: true,
      },
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-cache');
  });

  test('All SSE data lines are valid JSON', async ({ request }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-json',
        message: 'Say one word: yes',
        new_conversation: true,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.text();
    const lines = body.split('\n').filter((l) => l.startsWith('data: '));

    expect(lines.length).toBeGreaterThan(0);
    for (const line of lines) {
      expect(() => JSON.parse(line.slice(6))).not.toThrow();
    }
  });

  test('SSE stream contains text_delta events', async ({ request }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-delta',
        message: 'Say one word: hi',
        new_conversation: true,
      },
    });

    const body = await response.text();
    const events = await collectSSEEvents(body);
    const types = events.map((e) => e.type);
    expect(types).toContain('text_delta');
  });

  test('SSE stream ends with message_complete event containing usage stats', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-complete',
        message: 'Say one word: done',
        new_conversation: true,
      },
    });

    const body = await response.text();
    const events = await collectSSEEvents(body);
    const completeEvent = events.find((e) => e.type === 'message_complete') as
      | Record<string, unknown>
      | undefined;

    expect(completeEvent).toBeDefined();
    expect(completeEvent!.conversation_id).toBe('tc-api-001-complete');
    expect(completeEvent!.message_id).toBeDefined();

    const usage = completeEvent!.usage as Record<string, unknown>;
    expect(usage).toBeDefined();
    expect(typeof usage.prompt_tokens).toBe('number');
    expect(typeof usage.completion_tokens).toBe('number');
  });

  test('SSE stream for data query includes tool_call_start and tool_call_result events', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-toolcall',
        message: 'How many customers by region?',
        new_conversation: true,
      },
    });

    const body = await response.text();
    const events = await collectSSEEvents(body);
    const types = new Set(events.map((e) => e.type));

    expect(types.has('tool_call_start')).toBe(true);
    expect(types.has('tool_call_result')).toBe(true);
    expect(types.has('message_complete')).toBe(true);
  });

  test('tool_call_start and tool_call_result share matching tool_call_id', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-idmatch',
        message: 'Show total revenue by region',
        new_conversation: true,
      },
    });

    const body = await response.text();
    const events = await collectSSEEvents(body);

    const starts = events
      .filter((e) => e.type === 'tool_call_start')
      .map((e) => e.tool_call_id as string);
    const results = events
      .filter((e) => e.type === 'tool_call_result')
      .map((e) => e.tool_call_id as string);

    expect(starts.length).toBeGreaterThan(0);
    for (const id of starts) {
      expect(results).toContain(id);
    }
  });

  test('SSE stream for data query includes viz_block event', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-001-viz',
        message: 'Show total sales by region as a bar chart',
        new_conversation: true,
      },
    });

    const body = await response.text();
    const events = await collectSSEEvents(body);
    const types = new Set(events.map((e) => e.type));

    expect(types.has('viz_block')).toBe(true);

    const vizEvent = events.find((e) => e.type === 'viz_block') as
      | Record<string, unknown>
      | undefined;
    expect(vizEvent).toBeDefined();
    expect(vizEvent!.block_id).toBeDefined();
    expect(vizEvent!.spec).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-API-002: Conversations CRUD
// ---------------------------------------------------------------------------

test.describe('TC-API-002: Conversations CRUD', () => {
  const TEST_CONV_ID = `tc-api-002-${Date.now()}`;

  test.beforeAll(async ({ request }) => {
    // Seed a conversation by streaming
    await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: TEST_CONV_ID,
        message: 'Say exactly one word: hello',
        new_conversation: true,
      },
    });
  });

  test('GET /api/conversations returns array with correct shape', async ({
    request,
  }) => {
    const response = await request.get(`${API}/conversations`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const first = data[0];
    expect(first).toHaveProperty('id');
    expect(first).toHaveProperty('title');
    expect(first).toHaveProperty('createdAt');
    expect(first).toHaveProperty('updatedAt');
    // Should NOT include messages in list view
    expect(first).not.toHaveProperty('messages');
  });

  test('GET /api/conversations/{id} returns conversation with messages array', async ({
    request,
  }) => {
    const response = await request.get(`${API}/conversations/${TEST_CONV_ID}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(TEST_CONV_ID);
    expect(data).toHaveProperty('title');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
    expect(Array.isArray(data.messages)).toBe(true);
    expect(data.messages.length).toBeGreaterThan(0);

    const firstMsg = data.messages[0];
    expect(firstMsg).toHaveProperty('id');
    expect(firstMsg).toHaveProperty('role');
    expect(firstMsg).toHaveProperty('content');
  });

  test('PATCH /api/conversations/{id} updates title and returns updated record', async ({
    request,
  }) => {
    const newTitle = 'TC-API-002 Updated Title';
    const response = await request.patch(
      `${API}/conversations/${TEST_CONV_ID}`,
      {
        data: { title: newTitle },
      }
    );
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(TEST_CONV_ID);
    expect(data.title).toBe(newTitle);
    expect(data).toHaveProperty('updatedAt');
  });

  test('GET /api/conversations/{nonexistent} returns 404', async ({
    request,
  }) => {
    const response = await request.get(
      `${API}/conversations/does-not-exist-xyz-99999`
    );
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.detail).toBeDefined();
  });

  test('DELETE /api/conversations/{id} returns success and conversation becomes inaccessible', async ({
    request,
  }) => {
    const deleteId = `tc-api-002-del-${Date.now()}`;
    // Seed conversation
    await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: deleteId,
        message: 'Say one word: bye',
        new_conversation: true,
      },
    });

    // Delete
    const delResponse = await request.delete(
      `${API}/conversations/${deleteId}`
    );
    expect(delResponse.status()).toBe(200);

    const delData = await delResponse.json();
    expect(delData.deleted).toBe(deleteId);

    // Soft-delete: should return 404 on subsequent GET
    const getResponse = await request.get(`${API}/conversations/${deleteId}`);
    expect(getResponse.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// TC-API-003: Dashboards CRUD
// ---------------------------------------------------------------------------

test.describe('TC-API-003: Dashboards CRUD', () => {
  let dashboardId: string;

  test('GET /api/dashboards returns array', async ({ request }) => {
    const response = await request.get(`${API}/dashboards`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('POST /api/dashboards creates new dashboard with correct shape', async ({
    request,
  }) => {
    const response = await request.post(`${API}/dashboards`, {
      data: {
        title: 'TC-API-003 Test Dashboard',
        description: 'Created by automated API test',
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('TC-API-003 Test Dashboard');
    expect(data).toHaveProperty('createdAt');
    expect(data).toHaveProperty('updatedAt');
    expect(typeof data.pinCount).toBe('number');

    dashboardId = data.id;
  });

  test('GET /api/dashboards/{id} returns dashboard with pins array', async ({
    request,
  }) => {
    // Create a dashboard first to ensure we have a valid ID
    const createRes = await request.post(`${API}/dashboards`, {
      data: { title: 'TC-API-003 Detail Test', description: '' },
    });
    const created = await createRes.json();
    const id = created.id;

    const response = await request.get(`${API}/dashboards/${id}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(id);
    expect(data).toHaveProperty('title');
    expect(Array.isArray(data.pins)).toBe(true);
  });

  test('GET /api/dashboards/{nonexistent} returns 404', async ({
    request,
  }) => {
    const response = await request.get(
      `${API}/dashboards/nonexistent-dash-id-xyz`
    );
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.detail).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-API-004: Reports CRUD
// ---------------------------------------------------------------------------

test.describe('TC-API-004: Reports CRUD', () => {
  let reportId: string;
  let publicUuid: string;

  test('GET /api/reports returns array with correct shape', async ({
    request,
  }) => {
    const response = await request.get(`${API}/reports`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);

    if (data.length > 0) {
      const first = data[0];
      expect(first).toHaveProperty('id');
      expect(first).toHaveProperty('title');
      expect(first).toHaveProperty('public_uuid');
      expect(first).toHaveProperty('created_at');
      expect(first).toHaveProperty('updated_at');
    }
  });

  test('POST /api/reports creates new report with content', async ({
    request,
  }) => {
    const response = await request.post(`${API}/reports`, {
      data: {
        title: 'TC-API-004 Test Report',
        content: [
          { type: 'heading', text: 'Executive Summary' },
          { type: 'text', text: 'This is a test report body.' },
        ],
      },
    });
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('id');
    expect(data.title).toBe('TC-API-004 Test Report');
    expect(data.public_uuid).toBeNull();
    expect(Array.isArray(data.content)).toBe(true);
    expect(data.content.length).toBe(2);
    expect(data).toHaveProperty('created_at');

    reportId = data.id;
  });

  test('GET /api/reports/{id} returns report with content', async ({
    request,
  }) => {
    // Create report first
    const createRes = await request.post(`${API}/reports`, {
      data: {
        title: 'TC-API-004 GET Test',
        content: [{ type: 'text', text: 'body' }],
      },
    });
    const created = await createRes.json();
    const id = created.id;

    const response = await request.get(`${API}/reports/${id}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(id);
    expect(data).toHaveProperty('title');
    expect(Array.isArray(data.content)).toBe(true);
  });

  test('POST /api/reports/{id}/publish sets public_uuid and returns public_url', async ({
    request,
  }) => {
    // Create report
    const createRes = await request.post(`${API}/reports`, {
      data: {
        title: 'TC-API-004 Publish Test',
        content: [{ type: 'heading', text: 'Publish me' }],
      },
    });
    const created = await createRes.json();
    const id = created.id;

    const response = await request.post(`${API}/reports/${id}/publish`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('public_uuid');
    expect(data).toHaveProperty('public_url');
    expect(typeof data.public_uuid).toBe('string');
    expect(data.public_uuid).not.toBe('');

    publicUuid = data.public_uuid;
  });

  test('GET /api/reports/public/{uuid} returns published report content', async ({
    request,
  }) => {
    // Create and publish
    const createRes = await request.post(`${API}/reports`, {
      data: {
        title: 'TC-API-004 Public Access Test',
        content: [{ type: 'text', text: 'public body' }],
      },
    });
    const created = await createRes.json();
    const id = created.id;

    const publishRes = await request.post(`${API}/reports/${id}/publish`);
    const published = await publishRes.json();
    const uuid = published.public_uuid;

    const response = await request.get(`${API}/reports/public/${uuid}`);
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(id);
    expect(data.public_uuid).toBe(uuid);
    expect(Array.isArray(data.content)).toBe(true);
  });

  test('GET /api/reports/public/{bad-uuid} returns 404', async ({
    request,
  }) => {
    const response = await request.get(
      `${API}/reports/public/nonexistent-uuid-00000000`
    );
    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.detail).toBeDefined();
  });

  test('GET /api/reports/{nonexistent} returns 404', async ({ request }) => {
    const response = await request.get(
      `${API}/reports/nonexistent-report-xyz-00000`
    );
    expect(response.status()).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// TC-API-005: CORS Headers
// ---------------------------------------------------------------------------

test.describe('TC-API-005: CORS Headers', () => {
  test('OPTIONS preflight on /api/conversations includes Access-Control-Allow-Origin', async ({
    request,
  }) => {
    const response = await request.fetch(`${API}/conversations`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe(
      'http://localhost:3000'
    );
  });

  test('OPTIONS preflight includes Access-Control-Allow-Methods with PATCH and DELETE', async ({
    request,
  }) => {
    const response = await request.fetch(`${API}/conversations`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'PATCH',
      },
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    const allowedMethods = headers['access-control-allow-methods'] || '';
    expect(allowedMethods).toContain('PATCH');
    expect(allowedMethods).toContain('DELETE');
  });

  test('OPTIONS preflight includes access-control-allow-credentials', async ({
    request,
  }) => {
    const response = await request.fetch(`${API}/conversations`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const headers = response.headers();
    expect(headers['access-control-allow-credentials']).toBe('true');
  });

  test('POST with Origin header gets correct CORS response', async ({
    request,
  }) => {
    const response = await request.post(`${API}/reports`, {
      data: { title: 'CORS Test', content: [] },
      headers: { Origin: 'http://localhost:3000' },
    });

    expect(response.status()).toBe(200);
    const headers = response.headers();
    expect(headers['access-control-allow-origin']).toBe(
      'http://localhost:3000'
    );
  });

  test('OPTIONS includes Access-Control-Max-Age header', async ({
    request,
  }) => {
    const response = await request.fetch(`${API}/conversations`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'GET',
      },
    });

    const headers = response.headers();
    expect(headers['access-control-max-age']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// TC-API-006: Error Handling
// ---------------------------------------------------------------------------

test.describe('TC-API-006: Error Handling', () => {
  test('POST /api/chat/stream with empty body returns 422', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {},
    });
    expect(response.status()).toBe(422);

    const data = await response.json();
    expect(Array.isArray(data.detail)).toBe(true);
    // Should flag conversation_id and message as missing
    const fields = data.detail.map(
      (e: { loc: string[] }) => e.loc[e.loc.length - 1]
    );
    expect(fields).toContain('conversation_id');
    expect(fields).toContain('message');
  });

  test('POST /api/chat/stream with missing conversation_id returns 422', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: { message: 'Hello without conversation id' },
    });
    expect(response.status()).toBe(422);

    const data = await response.json();
    const fields = data.detail.map(
      (e: { loc: string[] }) => e.loc[e.loc.length - 1]
    );
    expect(fields).toContain('conversation_id');
  });

  test('POST /api/chat/stream with invalid JSON body returns 422', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: 'not valid json at all }{',
      headers: { 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(422);
  });

  test('POST /api/chat/stream with empty message string returns SSE error event', async ({
    request,
  }) => {
    const response = await request.post(`${API}/chat/stream`, {
      data: {
        conversation_id: 'tc-api-006-empty-msg',
        message: '',
        new_conversation: true,
      },
    });
    // Empty message reaches stream but provider rejects it — comes back as SSE error
    // Status is 200 (stream opened) but contains error event
    expect(response.status()).toBe(200);
    const body = await response.text();
    const events = await collectSSEEvents(body);
    const hasError = events.some(
      (e) => e.type === 'error' || e.type === 'message_complete'
    );
    expect(hasError).toBe(true);
  });

  test('GET /api/conversations/{nonexistent} returns 404 with detail message', async ({
    request,
  }) => {
    const response = await request.get(
      `${API}/conversations/completely-nonexistent-id-abc`
    );
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(typeof data.detail).toBe('string');
  });

  test('GET /api/dashboards/{nonexistent} returns 404', async ({
    request,
  }) => {
    const response = await request.get(
      `${API}/dashboards/nonexistent-dash-abc`
    );
    expect(response.status()).toBe(404);
  });

  test('GET /api/reports/{nonexistent} returns 404', async ({ request }) => {
    const response = await request.get(
      `${API}/reports/nonexistent-report-abc`
    );
    expect(response.status()).toBe(404);
  });
});
