// Jest manual mock for src/config/prisma.js.
// Every model method is a jest.fn() the test can configure with
// mockResolvedValue / mockImplementation per test case.

const modelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  upsert: jest.fn(),
});

const prismaMock = {
  admin: modelMock(),
  refreshToken: modelMock(),
  service: modelMock(),
  customer: modelMock(),
  order: modelMock(),
  orderDocument: modelMock(),
  orderStatusHistory: modelMock(),
  pushSubscription: modelMock(),
  portalSettings: modelMock(),
  activityLog: modelMock(),
};

module.exports = prismaMock;
