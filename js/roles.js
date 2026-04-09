(function (globalScope) {
  const ROLE_VALUES = Object.freeze({
    coach: 'coach',
    manager: 'manager',
    player: 'player',
  });

  const ROLE_OPTIONS = Object.freeze([
    Object.freeze({ value: ROLE_VALUES.coach, label: '指導者' }),
    Object.freeze({ value: ROLE_VALUES.manager, label: 'マネージャー' }),
    Object.freeze({ value: ROLE_VALUES.player, label: '選手' }),
  ]);

  const ROLE_LABELS = Object.freeze(
    ROLE_OPTIONS.reduce((labels, option) => ({ ...labels, [option.value]: option.label }), {}),
  );

  const ROLE_PAGES = Object.freeze({
    [ROLE_VALUES.coach]: 'coach.html',
    [ROLE_VALUES.manager]: 'manager.html',
    [ROLE_VALUES.player]: 'player.html',
  });

  const roles = Object.freeze({
    ROLE_VALUES,
    ROLE_OPTIONS,
    ROLE_LABELS,
    ROLE_PAGES,
    ALLOWED_ROLES: Object.freeze(ROLE_OPTIONS.map((option) => option.value)),
    getRoleLabel(role) {
      return ROLE_LABELS[role] || role;
    },
    getRolePage(role) {
      return ROLE_PAGES[role] || 'index.html';
    },
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = roles;
  }
  globalScope.AppRoles = roles;
})(typeof globalThis !== 'undefined' ? globalThis : window);
