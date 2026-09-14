jest.mock('../../src/config/prisma');

const request = require('supertest');
const prisma = require('../../src/config/prisma');
const createApp = require('../../src/app');
const { signAccessToken } = require('../../src/utils/tokens');

const app = createApp();

const superadmin = { id: 'super-1', role: 'SUPERADMIN', email: 'super@example.com', status: 'ACTIVE' };
const subadminA = { id: 'sub-a', role: 'SUBADMIN', email: 'a@example.com', status: 'ACTIVE' };
const subadminB = { id: 'sub-b', role: 'SUBADMIN', email: 'b@example.com', status: 'ACTIVE' };

function authHeaderFor(admin) {
  return `Bearer ${signAccessToken(admin)}`;
}

// requireAuth looks the admin up fresh on every request — mock that lookup
// per-test based on which admin's token is being used.
function mockCurrentAdmin(admin) {
  prisma.admin.findUnique.mockImplementation(({ where }) => {
    if (where.id === admin.id) return Promise.resolve(admin);
    return Promise.resolve(null);
  });
}

describe('GET /api/services — ownership scoping', () => {
  test('Subadmin A only sees services where ownerId = their own id', async () => {
    mockCurrentAdmin(subadminA);
    prisma.service.findMany.mockResolvedValue([{ id: 'svc-1', ownerId: subadminA.id, title: "A's service" }]);
    prisma.service.count.mockResolvedValue(1);

    const res = await request(app)
      .get('/api/services')
      .set('Authorization', authHeaderFor(subadminA));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);

    // Verify the Prisma query itself was scoped to this admin's ownerId —
    // this is the actual security guarantee, not just the response shape.
    const whereArg = prisma.service.findMany.mock.calls[0][0].where;
    expect(whereArg.ownerId).toBe(subadminA.id);
  });

  test('Subadmin B cannot retrieve Subadmin A\'s service by guessing its ID', async () => {
    mockCurrentAdmin(subadminB);
    // Simulate the DB correctly returning nothing because the where clause
    // includes ownerId: subadminB.id, which excludes A's service.
    prisma.service.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/services/svc-1') // belongs to subadminA
      .set('Authorization', authHeaderFor(subadminB));

    expect(res.status).toBe(404);
    const whereArg = prisma.service.findFirst.mock.calls[0][0].where;
    expect(whereArg.ownerId).toBe(subadminB.id);
  });

  test('Superadmin query is NOT scoped by ownerId — sees all services', async () => {
    mockCurrentAdmin(superadmin);
    prisma.service.findMany.mockResolvedValue([
      { id: 'svc-1', ownerId: subadminA.id },
      { id: 'svc-2', ownerId: subadminB.id },
    ]);
    prisma.service.count.mockResolvedValue(2);

    const res = await request(app)
      .get('/api/services')
      .set('Authorization', authHeaderFor(superadmin));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const whereArg = prisma.service.findMany.mock.calls[0][0].where;
    expect(whereArg.ownerId).toBeUndefined();
  });

  test('requests without a token are rejected with 401', async () => {
    const res = await request(app).get('/api/services');
    expect(res.status).toBe(401);
  });

  test('a suspended admin is rejected even with a valid token', async () => {
    const suspended = { ...subadminA, status: 'SUSPENDED' };
    mockCurrentAdmin(suspended);

    const res = await request(app)
      .get('/api/services')
      .set('Authorization', authHeaderFor(subadminA));

    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/admins/:id — Superadmin-only route', () => {
  test('a Subadmin is forbidden from deleting admin accounts', async () => {
    mockCurrentAdmin(subadminA);

    const res = await request(app)
      .delete('/api/admins/some-id')
      .set('Authorization', authHeaderFor(subadminA));

    expect(res.status).toBe(403);
    expect(prisma.admin.delete).not.toHaveBeenCalled();
  });

  test('a Superadmin can delete an admin account', async () => {
    mockCurrentAdmin(superadmin);
    prisma.admin.delete.mockResolvedValue({ id: 'sub-a' });
    prisma.activityLog.create.mockResolvedValue({});

    const res = await request(app)
      .delete('/api/admins/sub-a')
      .set('Authorization', authHeaderFor(superadmin));

    expect(res.status).toBe(200);
    expect(prisma.admin.delete).toHaveBeenCalledWith({ where: { id: 'sub-a' } });
  });
});
