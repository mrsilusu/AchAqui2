import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { s } from '../AdminStyles';
import { ROLE_BADGE, ROLE_CYCLE } from '../constants';
import { ActionIconBtn } from './CommonComponents';

export function UserAdminRow({ user, actingType, userBusinessesLoading, onChangeRole, onOpenBusinesses, onToggleSuspend, onDelete }) {
  const rb = ROLE_BADGE[user.role] || ROLE_BADGE.CLIENT;

  return (
    <View style={s.bizRow}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={s.bizRowName}>{user.name || 'Sem nome'}</Text>
          <View style={[s.roleBadge, { backgroundColor: rb.bg }]}>
            <Text style={[s.roleBadgeText, { color: rb.color }]}>{rb.label}</Text>
          </View>
        </View>
        <Text style={s.bizRowSub}>{user.email}</Text>
        <Text style={s.bizRowMeta}>
          {user._count?.businesses ?? 0} negocios · {user._count?.claimRequests ?? 0} claims
          {user.createdAt ? ` · ${new Date(user.createdAt).toLocaleDateString('pt-PT')}` : ''}
        </Text>
        <Text style={s.bizRowMeta}>{user.isSuspended ? 'Suspenso' : 'Ativo'}</Text>
      </View>

      <View style={s.rowActions}>
        <ActionIconBtn icon="refreshCw" color="#0EA5E9" loading={actingType === 'role'} onPress={onChangeRole} />
        <ActionIconBtn icon="briefcase" color="#8B5CF6" loading={userBusinessesLoading} onPress={onOpenBusinesses} />
        <ActionIconBtn icon="power" color={user.isSuspended ? COLORS.green : '#F59E0B'} loading={actingType === 'suspend'} onPress={onToggleSuspend} />
        <ActionIconBtn icon="trash" color={COLORS.red} loading={actingType === 'delete'} onPress={onDelete} />
      </View>
    </View>
  );
}

export function getNextRole(role) {
  return ROLE_CYCLE[role] || 'CLIENT';
}
