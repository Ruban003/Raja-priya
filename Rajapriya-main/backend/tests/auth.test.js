const { canUseCenterId, getAuthorizedCenterId, isRVLevelUser } = require('../middleware/auth');

describe('Auth Middleware & RBAC Logic', () => {
  
  describe('isRVLevelUser', () => {
    it('should return true for rv_owner', () => {
      expect(isRVLevelUser({ role: 'rv_owner' })).toBe(true);
    });

    it('should return true for rv_admin', () => {
      expect(isRVLevelUser({ role: 'rv_admin' })).toBe(true);
    });

    it('should return false for center_owner and manager', () => {
      expect(isRVLevelUser({ role: 'center_owner' })).toBe(false);
      expect(isRVLevelUser({ role: 'manager' })).toBe(false);
      expect(isRVLevelUser(null)).toBe(false);
    });
  });

  describe('canUseCenterId', () => {
    const centerA = '64abc1234567890123456789';
    const centerB = '64def1234567890123456789';

    it('should allow RV level users to access any center', () => {
      const user = { role: 'rv_owner' };
      expect(canUseCenterId(user, centerA)).toBe(true);
      expect(canUseCenterId(user, centerB)).toBe(true);
    });

    it('should allow center users to access their own center', () => {
      const user = { role: 'manager', centerId: centerA };
      expect(canUseCenterId(user, centerA)).toBe(true);
    });

    it('should deny center users from accessing other centers', () => {
      const user = { role: 'manager', centerId: centerA };
      expect(canUseCenterId(user, centerB)).toBe(false);
    });

    it('should deny if centerId is not provided', () => {
      const user = { role: 'rv_owner' };
      expect(canUseCenterId(user, null)).toBe(false);
    });
  });

  describe('getAuthorizedCenterId', () => {
    const mockCenterId = '64abc1234567890123456789';

    it('should return requested center for RV users if requested', () => {
      const req = {
        user: { role: 'rv_owner' },
        params: {},
        body: { centerId: mockCenterId },
        query: {}
      };
      expect(getAuthorizedCenterId(req)).toBe(mockCenterId);
    });

    it('should return the users own center if they are a manager', () => {
      const req = {
        user: { role: 'manager', centerId: mockCenterId },
        params: {},
        body: {},
        query: {}
      };
      expect(getAuthorizedCenterId(req)).toBe(mockCenterId);
    });

    it('should throw error if manager requests a different center', () => {
      const req = {
        user: { role: 'manager', centerId: mockCenterId },
        params: {},
        body: { centerId: 'different_center_id' },
        query: {}
      };
      expect(() => getAuthorizedCenterId(req)).toThrow('Access denied for this center');
    });

    it('should throw error if RV user does not provide centerId but it is required', () => {
      const req = {
        user: { role: 'rv_owner' },
        params: {},
        body: {},
        query: {}
      };
      expect(() => getAuthorizedCenterId(req, { required: true })).toThrow('centerId is required');
    });
  });
});
