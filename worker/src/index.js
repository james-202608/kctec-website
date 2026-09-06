const POLICY_VERSION = '2026-09-06';
const COOKIE_NAME = 'kctec_session';
const MAX_MESSAGE_LENGTH = 20000;
const TASKS = new Set(['translate', 'meaning', 'reply', 'email', 'negotiate', 'minutes']);

const SYSTEM_PROMPTS = {
  translate: '你是韩中经贸交流中心的商务翻译。识别中文或韩文，忠实翻译为另一种语言。保留公司名、金额、日期和专业术语，不虚构事实。',
  meaning: '你是韩中商务语境顾问。先给直译，再解释可能的商务含义、不确定性和需要向对方确认的问题。不要把推测写成事实。',
  reply: '你是韩中商务沟通顾问。根据来信起草礼貌、明确并保留合理谈判空间的回复，同时提供中文和韩文版本。',
  email: '你是韩中商务邮件助手。整理为正式邮件，包含主题、称呼、正文、行动事项和落款占位，同时提供中文和韩文版本。',
  negotiate: '你是韩中商务谈判准备助手。提炼目标、已知事实、待确认事项、风险和建议提问。不要代替法律或财务专业意见。',
  minutes: '你是韩中会议纪要助手。整理议题、双方观点、已决定事项、未决事项、负责人和下一步，并标出原文中不明确的信息。'
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);

    if (request.method === 'OPTIONS') return new Response(null, {status: 204, headers: cors});

    try {
      if (url.pathname === '/health' && request.method === 'GET') {
        return json({ok: true, model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash'}, 200, cors);
      }
      if (url.pathname === '/v1/invites/redeem' && request.method === 'POST') {
        requireAllowedOrigin(request, env);
        return redeemInvite(request, env, cors);
      }
      if (url.pathname === '/v1/chat' && request.method === 'POST') {
        requireAllowedOrigin(request, env);
        return chat(request, env, cors);
      }
      if (url.pathname === '/v1/sessions' && request.method === 'GET') {
        return listSessions(request, env, cors);
      }
      if (/^\/v1\/sessions\/[^/]+\/messages$/.test(url.pathname) && request.method === 'GET') {
        return listMessages(request, env, cors, url.pathname.split('/')[3]);
      }
      if (/^\/v1\/sessions\/[^/]+$/.test(url.pathname) && request.method === 'DELETE') {
        requireAllowedOrigin(request, env);
        return deleteSession(request, env, cors, url.pathname.split('/')[3]);
      }
      if (url.pathname === '/v1/admin/clients' && request.method === 'POST') {
        requireAdmin(request, env);
        return createClientInvite(request, env, cors);
      }
      if (url.pathname === '/v1/admin/report' && request.method === 'GET') {
        requireAdmin(request, env);
        return adminReport(request, env, cors);
      }
      return json({error: 'Not found'}, 404, cors);
    } catch (error) {
      const status = error.status || 500;
      return json({error: status >= 500 ? '服务暂时不可用' : error.message}, status, cors);
    }
  }
};

async function redeemInvite(request, env, cors) {
  const body = await readJson(request);
  const inviteToken = String(body.inviteToken || '').trim();
  if (inviteToken.length < 32) throw httpError(400, '邀请链接无效');
  const timestamp = now();
  const inviteHash = await sha256(inviteToken);
  const sessionToken = randomToken();
  const expiresAt = new Date(Date.now() + 30 * 86400000).toISOString();
  const result = await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO auth_sessions (id, client_id, token_hash, expires_at)
       SELECT ?1, client_invites.client_id, ?2, ?3
       FROM client_invites
       JOIN clients ON clients.id = client_invites.client_id
       WHERE client_invites.token_hash = ?4
         AND client_invites.used_at IS NULL
         AND client_invites.expires_at > ?5
         AND clients.status = 'active'`
    ).bind(crypto.randomUUID(), await sha256(sessionToken), expiresAt, inviteHash, timestamp),
    env.DB.prepare(
      `UPDATE client_invites SET used_at = ?1
       WHERE token_hash = ?2 AND used_at IS NULL`
    ).bind(timestamp, inviteHash)
  ]);
  if ((result[0]?.meta?.changes || 0) !== 1) throw httpError(401, '邀请链接无效或已过期');

  const headers = new Headers(cors);
  headers.set('Content-Type', 'application/json; charset=utf-8');
  headers.append('Set-Cookie', authCookie(sessionToken, env));
  return new Response(JSON.stringify({ok: true, sessionToken}), {status: 200, headers});
}

async function createClientInvite(request, env, cors) {
  const body = await readJson(request);
  const clientMark = String(body.clientMark || '').trim();
  if (clientMark.length < 2 || clientMark.length > 120) throw httpError(400, '客户标记应为2至120个字符');
  const clientId = crypto.randomUUID();
  const inviteToken = randomToken();
  const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO clients (id, client_mark) VALUES (?1, ?2)`).bind(clientId, clientMark),
    env.DB.prepare(
      `INSERT INTO client_invites (id, client_id, token_hash, expires_at)
       VALUES (?1, ?2, ?3, ?4)`
    ).bind(crypto.randomUUID(), clientId, await sha256(inviteToken), expiresAt),
    env.DB.prepare(
      `INSERT INTO audit_logs (id, actor, action, client_id, details)
       VALUES (?1, 'internal', 'client_invite_created', ?2, ?3)`
    ).bind(crypto.randomUUID(), clientId, JSON.stringify({clientMark, expiresAt}))
  ]);
  return json({clientId, clientMark, inviteToken, expiresAt}, 201, cors);
}

async function chat(request, env, cors) {
  if (!env.DEEPSEEK_API_KEY) throw httpError(503, 'AI服务尚未配置');
  const client = await requireClient(request, env);
  const body = await readJson(request);
  const task = String(body.task || '');
  const message = String(body.message || '').trim();
  const saveHistory = body.saveHistory === true;
  const allowStaffFollowup = saveHistory && body.allowStaffFollowup === true;
  let sessionId = body.sessionId ? String(body.sessionId) : null;

  if (!TASKS.has(task)) throw httpError(400, '不支持的任务类型');
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    throw httpError(400, `内容长度应为1至${MAX_MESSAGE_LENGTH}个字符`);
  }

  if (sessionId) {
    const owned = await env.DB.prepare(
      `SELECT id FROM chat_sessions WHERE id = ?1 AND client_id = ?2`
    ).bind(sessionId, client.id).first();
    if (!owned) throw httpError(404, '没有找到该会话');
  } else if (saveHistory) {
    sessionId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO chat_sessions (id, client_id, title) VALUES (?1, ?2, ?3)`
    ).bind(sessionId, client.id, message.slice(0, 40)).run();
  }

  if (saveHistory) {
    const timestamp = now();
    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO messages (id, session_id, client_id, role, content, created_at)
         VALUES (?1, ?2, ?3, 'user', ?4, ?5)`
      ).bind(crypto.randomUUID(), sessionId, client.id, message, timestamp),
      env.DB.prepare(
        `INSERT INTO consents
         (id, client_id, session_id, save_history, allow_staff_followup, policy_version, created_at)
         VALUES (?1, ?2, ?3, 1, ?4, ?5, ?6)`
      ).bind(crypto.randomUUID(), client.id, sessionId, allowStaffFollowup ? 1 : 0, POLICY_VERSION, timestamp),
      env.DB.prepare(
        `UPDATE chat_sessions SET updated_at = ?1 WHERE id = ?2 AND client_id = ?3`
      ).bind(timestamp, sessionId, client.id)
    ]);
  }

  const history = sessionId ? await loadOwnedHistory(env.DB, client.id, sessionId) : [];
  if (!saveHistory) history.push({role: 'user', content: message});
  const upstream = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      stream: true,
      messages: [{role: 'system', content: SYSTEM_PROMPTS[task]}, ...history]
    })
  });
  if (!upstream.ok || !upstream.body) throw httpError(502, 'AI服务暂时没有响应');
  return streamToClient(upstream, {db: env.DB, clientId: client.id, sessionId, saveHistory, cors});
}

async function loadOwnedHistory(db, clientId, sessionId) {
  const result = await db.prepare(
    `SELECT role, content FROM messages
     WHERE client_id = ?1 AND session_id = ?2
     ORDER BY created_at DESC LIMIT 80`
  ).bind(clientId, sessionId).all();
  const rows = (result.results || []).reverse();
  const selected = [];
  let characters = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const size = String(rows[index].content || '').length;
    if (selected.length && characters + size > 120000) break;
    selected.unshift(rows[index]);
    characters += size;
  }
  return selected;
}

function streamToClient(upstream, options) {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let answer = '';
  let buffer = '';
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sse('meta', {sessionId: options.sessionId, saved: options.saveHistory})));
      (async () => {
        const reader = upstream.body.getReader();
        try {
          while (true) {
            const {done, value} = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (!data || data === '[DONE]') continue;
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              if (delta) {
                answer += delta;
                controller.enqueue(encoder.encode(sse('delta', {text: delta})));
              }
            }
          }
          if (options.saveHistory && options.sessionId && answer) {
            await options.db.batch([
              options.db.prepare(
                `INSERT INTO messages (id, session_id, client_id, role, content)
                 VALUES (?1, ?2, ?3, 'assistant', ?4)`
              ).bind(crypto.randomUUID(), options.sessionId, options.clientId, answer),
              options.db.prepare(
                `UPDATE chat_sessions SET updated_at = ?1 WHERE id = ?2 AND client_id = ?3`
              ).bind(now(), options.sessionId, options.clientId)
            ]);
          }
          controller.enqueue(encoder.encode(sse('done', {saved: options.saveHistory})));
          controller.close();
        } catch {
          controller.enqueue(encoder.encode(sse('error', {error: '回复中断，请稍后重试'})));
          controller.close();
        } finally {
          reader.releaseLock();
        }
      })();
    }
  });
  const headers = new Headers(options.cors);
  headers.set('Content-Type', 'text/event-stream; charset=utf-8');
  headers.set('Cache-Control', 'no-cache, no-transform');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(stream, {status: 200, headers});
}

async function listSessions(request, env, cors) {
  const client = await requireClient(request, env);
  const result = await env.DB.prepare(
    `SELECT id, title, created_at, updated_at FROM chat_sessions
     WHERE client_id = ?1 ORDER BY updated_at DESC LIMIT 100`
  ).bind(client.id).all();
  return json({sessions: result.results || []}, 200, cors);
}

async function listMessages(request, env, cors, sessionId) {
  const client = await requireClient(request, env);
  const result = await env.DB.prepare(
    `SELECT id, role, content, created_at FROM messages
     WHERE client_id = ?1 AND session_id = ?2 ORDER BY created_at ASC`
  ).bind(client.id, sessionId).all();
  return json({sessionId, messages: result.results || []}, 200, cors);
}

async function deleteSession(request, env, cors, sessionId) {
  const client = await requireClient(request, env);
  const owned = await env.DB.prepare(
    `SELECT id FROM chat_sessions WHERE id = ?1 AND client_id = ?2`
  ).bind(sessionId, client.id).first();
  if (!owned) throw httpError(404, '没有找到该会话');
  await env.DB.batch([
    env.DB.prepare(
      `DELETE FROM consents WHERE session_id = ?1 AND client_id = ?2`
    ).bind(sessionId, client.id),
    env.DB.prepare(
      `DELETE FROM messages WHERE session_id = ?1 AND client_id = ?2`
    ).bind(sessionId, client.id),
    env.DB.prepare(
      `DELETE FROM chat_sessions WHERE id = ?1 AND client_id = ?2`
    ).bind(sessionId, client.id)
  ]);
  return json({deleted: true, sessionId}, 200, cors);
}

async function adminReport(request, env, cors) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 200, 1), 500);
  const before = url.searchParams.get('before') || '9999-12-31T23:59:59.999Z';
  const result = await env.DB.prepare(
    `SELECT clients.client_mark, messages.client_id, messages.session_id,
            messages.role, messages.content, messages.created_at
     FROM messages JOIN clients ON clients.id = messages.client_id
     WHERE messages.created_at < ?1
     ORDER BY messages.created_at DESC LIMIT ?2`
  ).bind(before, limit).all();
  await env.DB.prepare(
    `INSERT INTO audit_logs (id, actor, action, details)
     VALUES (?1, 'internal', 'report_read', ?2)`
  ).bind(crypto.randomUUID(), JSON.stringify({limit, before})).run();
  return json({messages: result.results || []}, 200, cors);
}

async function requireClient(request, env) {
  const authorization = request.headers.get('Authorization') || '';
  const bearerToken = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  const token = bearerToken || readCookie(request.headers.get('Cookie') || '', COOKIE_NAME);
  if (!token) throw httpError(401, '请先登录');
  const client = await env.DB.prepare(
    `SELECT clients.id, clients.client_mark
     FROM auth_sessions JOIN clients ON clients.id = auth_sessions.client_id
     WHERE auth_sessions.token_hash = ?1
       AND auth_sessions.revoked_at IS NULL
       AND auth_sessions.expires_at > ?2
       AND clients.status = 'active'`
  ).bind(await sha256(token), now()).first();
  if (!client) throw httpError(401, '登录已失效，请重新登录');
  return client;
}

function requireAdmin(request, env) {
  if (!env.ADMIN_TOKEN) throw httpError(503, '内部后台尚未配置');
  if (!constantTimeEqual(request.headers.get('Authorization') || '', `Bearer ${env.ADMIN_TOKEN}`)) {
    throw httpError(401, '未授权');
  }
}

function requireAllowedOrigin(request, env) {
  if (request.headers.get('Origin') !== env.ALLOWED_ORIGIN) throw httpError(403, '来源不被允许');
}

function corsHeaders(request, env) {
  const headers = new Headers({
    'Vary': 'Origin',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
  });
  if (request.headers.get('Origin') === env.ALLOWED_ORIGIN) {
    headers.set('Access-Control-Allow-Origin', env.ALLOWED_ORIGIN);
  }
  return headers;
}

function authCookie(token, env) {
  const domain = env.COOKIE_DOMAIN ? `; Domain=${env.COOKIE_DOMAIN}` : '';
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=2592000${domain}`;
}

function readCookie(header, name) {
  for (const part of header.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

async function readJson(request) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) {
    throw httpError(415, '请使用JSON格式');
  }
  try {
    return await request.json();
  } catch {
    throw httpError(400, '请求内容无效');
  }
}

function json(value, status, headers) {
  const next = new Headers(headers);
  next.set('Content-Type', 'application/json; charset=utf-8');
  next.set('X-Content-Type-Options', 'nosniff');
  return new Response(JSON.stringify(value), {status, headers: next});
}

function sse(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function now() {
  return new Date().toISOString();
}

function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
