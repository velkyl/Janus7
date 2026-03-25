/**
 * @file P6_TC_04__permissions.test.js
 * @phase 6
 * @priority P1
 * 
 * Test Permission-System (GM/Trusted/Player)
 */

export default {
  id: 'P6_TC_04__permissions',
  phase: 6,
  priority: 'P1',
  description: 'Permission-System funktioniert korrekt (GM/Trusted/Player)',
  
  async run(ctx) {
    // Import Permission System
    const { JanusPermissions } = await import('../../../../ui/permissions.js');
    
    // Mock Users
    const gmUser = { role: CONST.USER_ROLES.GAMEMASTER };
    const trustedUser = { role: CONST.USER_ROLES.TRUSTED };
    const playerUser = { role: CONST.USER_ROLES.PLAYER };
    
    // Test 1: GM can do everything
    ctx.log('Testing GM permissions...');
    ctx.assert(
      JanusPermissions.can('advanceSlot', gmUser),
      'GM should be able to advanceSlot'
    );
    ctx.assert(
      JanusPermissions.can('exportState', gmUser),
      'GM should be able to exportState'
    );
    ctx.assert(
      JanusPermissions.canTab('time', gmUser),
      'GM should access time tab'
    );
    ctx.assert(
      JanusPermissions.canTab('debug', gmUser),
      'GM should access debug tab'
    );
    
    // Test 2: Trusted can export, not mutate
    ctx.log('Testing Trusted permissions...');
    ctx.assert(
      JanusPermissions.can('exportState', trustedUser),
      'Trusted should be able to export state'
    );
    ctx.assert(
      JanusPermissions.can('copyDiagnostics', trustedUser),
      'Trusted should be able to copy diagnostics'
    );
    ctx.assert(
      !JanusPermissions.can('advanceSlot', trustedUser),
      'Trusted should NOT be able to advance slot'
    );
    ctx.assert(
      !JanusPermissions.can('applyMood', trustedUser),
      'Trusted should NOT be able to apply mood'
    );
    ctx.assert(
      JanusPermissions.canTab('debug', trustedUser),
      'Trusted should access debug tab'
    );
    ctx.assert(
      !JanusPermissions.canTab('time', trustedUser),
      'Trusted should NOT access time tab'
    );
    ctx.assert(
      !JanusPermissions.canTab('atmo', trustedUser),
      'Trusted should NOT access atmo tab'
    );
    
    // Test 3: Player minimal rights
    ctx.log('Testing Player permissions...');
    ctx.assert(
      JanusPermissions.can('copyDiagnostics', playerUser),
      'Player should be able to copy diagnostics'
    );
    ctx.assert(
      !JanusPermissions.can('exportState', playerUser),
      'Player should NOT be able to export state'
    );
    ctx.assert(
      !JanusPermissions.can('advanceSlot', playerUser),
      'Player should NOT be able to advance slot'
    );
    ctx.assert(
      JanusPermissions.canTab('status', playerUser),
      'Player should access status tab'
    );
    ctx.assert(
      !JanusPermissions.canTab('time', playerUser),
      'Player should NOT access time tab'
    );
    ctx.assert(
      !JanusPermissions.canTab('debug', playerUser),
      'Player should NOT access debug tab'
    );
    
    ctx.log('✓ All permission tests passed');
  }
};
