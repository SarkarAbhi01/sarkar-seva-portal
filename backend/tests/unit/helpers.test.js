const { buildOrderNumber, paginationParams, paginatedResponse, asyncHandler } = require('../../src/utils/helpers');

describe('buildOrderNumber', () => {
  test('pads the sequence to 6 digits and includes the current year', () => {
    const year = new Date().getFullYear();
    expect(buildOrderNumber(1)).toBe(`SP-${year}-000001`);
    expect(buildOrderNumber(123456)).toBe(`SP-${year}-123456`);
  });
});

describe('paginationParams', () => {
  test('defaults to page 1, limit 10 when query is empty', () => {
    expect(paginationParams({})).toEqual({ page: 1, limit: 10, skip: 0 });
  });

  test('computes skip correctly for a given page/limit', () => {
    expect(paginationParams({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20, skip: 40 });
  });

  test('clamps limit to a maximum of 100', () => {
    expect(paginationParams({ limit: '500' }).limit).toBe(100);
  });

  test('clamps page to a minimum of 1 even for invalid input', () => {
    expect(paginationParams({ page: '-5' }).page).toBe(1);
    expect(paginationParams({ page: 'abc' }).page).toBe(1);
  });
});

describe('paginatedResponse', () => {
  test('computes totalPages correctly', () => {
    const result = paginatedResponse([1, 2], 25, 1, 10);
    expect(result.pagination).toEqual({ total: 25, page: 1, limit: 10, totalPages: 3 });
  });

  test('totalPages is at least 1 even when total is 0', () => {
    const result = paginatedResponse([], 0, 1, 10);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe('asyncHandler', () => {
  test('forwards a rejected promise to next() instead of throwing', async () => {
    const err = new Error('boom');
    const handler = asyncHandler(async () => { throw err; });
    const next = jest.fn();

    await handler({}, {}, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  test('does not call next() when the handler resolves successfully', async () => {
    const handler = asyncHandler(async (req, res) => res.send('ok'));
    const res = { send: jest.fn() };
    const next = jest.fn();

    await handler({}, res, next);

    expect(res.send).toHaveBeenCalledWith('ok');
    expect(next).not.toHaveBeenCalled();
  });
});
