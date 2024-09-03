// tests/fetchFacebookAdspend.test.ts

import { fetchFacebookAdspend } from '../fetchFacebookAdspend';
import { fetch, db, currency } from '../dependencies';

jest.mock('../dependencies', () => ({
  fetch: jest.fn(),
  db: {
    cache: {
      find: jest.fn(),
      updateOne: jest.fn(),
      insert: jest.fn(),
    },
    account: {
      find: jest.fn(),
    },
  },
  currency: jest.fn(),
}));

const mockFetch = fetch as jest.Mock;
const mockDbCacheFind = db.cache.find as jest.Mock;
const mockDbCacheUpdateOne = db.cache.updateOne as jest.Mock;
const mockDbCacheInsert = db.cache.insert as jest.Mock;
const mockDbAccountFind = db.account.find as jest.Mock;
const mockCurrency = currency as jest.Mock;

describe('fetchFacebookAdspend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch marketing data and process when currency matches', async () => {
    mockFetch.mockResolvedValue([
      { campaignId: '1', date: new Date('2024-08-10'), spend: 100, currency: 'USD' },
    ]);
    mockDbAccountFind.mockResolvedValue({ currency: 'USD' });
    mockDbCacheFind.mockResolvedValue([]);

    await fetchFacebookAdspend('2024-08-10', '2024-08-20');

    expect(mockFetch).toHaveBeenCalledWith('2024-08-10', '2024-08-20');
    expect(mockDbAccountFind).toHaveBeenCalled();
    expect(mockDbCacheFind).toHaveBeenCalledWith({ campaignId: '1', date: new Date('2024-08-10') });
    expect(mockDbCacheInsert).toHaveBeenCalledWith({
      campaignId: '1',
      date: new Date('2024-08-10'),
      spend: 100,
      locked: false,
    });
  });

  it('should convert spend value when currency does not match', async () => {
    mockFetch.mockResolvedValue([
      { campaignId: '1', date: new Date('2024-08-10'), spend: 100, currency: 'EUR' },
    ]);
    mockDbAccountFind.mockResolvedValue({ currency: 'USD' });
    mockDbCacheFind.mockResolvedValue([]);
    mockCurrency.mockResolvedValue(110);

    await fetchFacebookAdspend('2024-08-10', '2024-08-20');

    expect(mockCurrency).toHaveBeenCalledWith(100, 'EUR', 'USD');
    expect(mockDbCacheInsert).toHaveBeenCalledWith({
      campaignId: '1',
      date: new Date('2024-08-10'),
      spend: 110,
      locked: false,
    });
  });

  it('should not update data if it is locked', async () => {
    mockFetch.mockResolvedValue([
      { campaignId: '1', date: new Date('2024-08-10'), spend: 100, currency: 'USD' },
    ]);
    mockDbAccountFind.mockResolvedValue({ currency: 'USD' });
    mockDbCacheFind.mockResolvedValue([{ _id: 'test', locked: true }]);

    await fetchFacebookAdspend('2024-08-10', '2024-08-20');

    expect(mockDbCacheUpdateOne).not.toHaveBeenCalled();
  });

  it('should update data if it is not locked', async () => {
    mockFetch.mockResolvedValue([
      { campaignId: '1', date: new Date('2024-08-10'), spend: 100, currency: 'USD' },
    ]);
    mockDbAccountFind.mockResolvedValue({ currency: 'USD' });
    mockDbCacheFind.mockResolvedValue([{ _id: 'test', locked: false }]);

    await fetchFacebookAdspend('2024-08-10', '2024-08-20');

    expect(mockDbCacheUpdateOne).toHaveBeenCalledWith(
      { _id: 'test' },
      { $set: { spend: 100 } }
    );
  });
});
