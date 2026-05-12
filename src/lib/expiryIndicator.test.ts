import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getExpiryIndicatorState } from './expiryIndicator';

const noon = new Date(2026, 4, 12, 12);

describe('getExpiryIndicatorState', () => {
  it('returns a neutral state when no expiry date exists', () => {
    assert.deepEqual(getExpiryIndicatorState(null, noon), {
      accessibilityLabel: 'No expiry date set.',
      bucket: 'none',
      daysUntilExpiry: null,
      label: 'No expiry',
      tone: 'neutral',
    });
  });

  it('buckets expired dates', () => {
    assert.equal(getExpiryIndicatorState('2026-05-11', noon).bucket, 'expired');
    assert.equal(getExpiryIndicatorState('2026-05-11', noon).label, 'Expired');
  });

  it('buckets today and tomorrow as danger states', () => {
    assert.equal(getExpiryIndicatorState('2026-05-12', noon).label, 'Today');
    assert.equal(getExpiryIndicatorState('2026-05-13', noon).label, 'Tomorrow');
    assert.equal(getExpiryIndicatorState('2026-05-13', noon).tone, 'danger');
  });

  it('buckets two to three days out as warning', () => {
    assert.equal(getExpiryIndicatorState('2026-05-14', noon).bucket, 'warning');
    assert.equal(getExpiryIndicatorState('2026-05-15', noon).label, 'In 3 days');
  });

  it('buckets more than three days out as fresh', () => {
    assert.equal(getExpiryIndicatorState('2026-05-16', noon).bucket, 'fresh');
    assert.equal(getExpiryIndicatorState('2026-05-16', noon).tone, 'fresh');
  });

  it('uses local calendar day boundaries instead of elapsed hours', () => {
    const lateNight = new Date(2026, 4, 12, 23, 59);

    assert.equal(getExpiryIndicatorState(new Date(2026, 4, 13, 0, 1), lateNight).label, 'Tomorrow');
  });
});
