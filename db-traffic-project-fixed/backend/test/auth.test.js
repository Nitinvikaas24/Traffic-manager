const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret-only-used-in-this-suite';

const { authenticate, requireRole } = require('../middleware/auth');

function mockReq(headers = {}) {
  return { headers };
}

function mockRes() {
  const res = { statusCode: null, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload) => {
    res.body = payload;
    return res;
  };
  return res;
}

function validToken(payload = { id: '1', username: 'officer1', role: 'officer', badgeId: 'OFC-1' }) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
}

test('authenticate: rejects requests with no Authorization header', () => {
  const req = mockReq();
  const res = mockRes();
  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate: rejects a malformed Authorization header (no Bearer scheme)', () => {
  const req = mockReq({ authorization: validToken() }); // missing "Bearer " prefix
  const res = mockRes();
  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate: rejects an invalid/garbage token', () => {
  const req = mockReq({ authorization: 'Bearer not-a-real-token' });
  const res = mockRes();
  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate: rejects an expired token', () => {
  const expired = jwt.sign({ id: '1', username: 'officer1', role: 'officer' }, process.env.JWT_SECRET, {
    expiresIn: -10, // already expired
  });
  const req = mockReq({ authorization: `Bearer ${expired}` });
  const res = mockRes();
  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});

test('authenticate: accepts a valid token and attaches req.user from its payload', () => {
  const req = mockReq({ authorization: `Bearer ${validToken()}` });
  const res = mockRes();
  let nextCalled = false;
  authenticate(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
  assert.equal(res.statusCode, null); // untouched — authenticate never responds on success
  assert.deepEqual(req.user, { id: '1', username: 'officer1', role: 'officer', badgeId: 'OFC-1' });
});

test('requireRole: rejects a role not in the allowed list', () => {
  const req = { user: { role: 'officer' } };
  const res = mockRes();
  let nextCalled = false;
  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});

test('requireRole: allows a role in the allowed list', () => {
  const req = { user: { role: 'admin' } };
  const res = mockRes();
  let nextCalled = false;
  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test('requireRole: accepts multiple allowed roles', () => {
  const req = { user: { role: 'officer' } };
  const res = mockRes();
  let nextCalled = false;
  requireRole('admin', 'officer')(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, true);
});

test('requireRole: rejects when req.user is missing entirely', () => {
  const req = {};
  const res = mockRes();
  let nextCalled = false;
  requireRole('admin')(req, res, () => {
    nextCalled = true;
  });
  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 403);
});
