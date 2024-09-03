// src/fetchFacebookAdspend.ts

import { fetch, db, currency } from './dependencies';

interface MarketingData {
  spend: number;
  currency: string;
  campaignId: string;
  date: string;
}

interface CacheData {
  _id: string;
  campaignId: string;
  date: string;
  spend: number;
  locked: boolean;
}

export const fetchFacebookAdspend = async (from: string, to: string): Promise<void> => {
  try {
    const marketingData: MarketingData[] = await fetch(from, to);
    const accountSetting = await db.account.find();
    const accountCurrency = accountSetting.currency;

    for (const data of marketingData) {
      let spendInAccountCurrency = data.spend;

      if (data.currency !== accountCurrency) {
        spendInAccountCurrency = await currency(data.spend, data.currency, accountCurrency);
      }

      const existingData: CacheData[] = await db.cache.find({ campaignId: data.campaignId, date: data.date });

      if (existingData.length > 0) {
        if (existingData[0].locked) {
          continue;
        } else {
          await db.cache.updateOne(
            { _id: existingData[0]._id },
            { $set: { spend: spendInAccountCurrency } }
          );
        }
      } else {
        await db.cache.insert({
          campaignId: data.campaignId,
          date: data.date,
          spend: spendInAccountCurrency,
          locked: false,
        });
      }
    }
  } catch (error) {
    console.error('Error fetching Facebook ad spend:', error);
  }
};