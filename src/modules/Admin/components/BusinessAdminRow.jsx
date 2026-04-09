import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { s } from '../AdminStyles';
import { ActionIconBtn } from './CommonComponents';

export function BusinessAdminRow({ biz, actingType, claimHistoryLoading, onToggleActive, onTogglePremium, onUnclaim, onImpersonate, onEdit, onClaimHistory, onDelete }) {
  const isActive = biz.isActive !== false;
  const isPremium = !!biz.metadata?.isPremium;

  return (
    <View style={[s.bizRow, !isActive ? { opacity: 0.55 } : null]}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Text style={s.bizRowName}>{biz.name}</Text>
          {biz.isClaimed ? <View style={s.claimedDot} /> : null}
          {isPremium ? <Text style={{ fontSize: 11 }}>Premium</Text> : null}
          {!isActive ? <Text style={{ fontSize: 10, color: COLORS.red, fontWeight: '700' }}>OCULTO</Text> : null}
        </View>
        <Text style={s.bizRowSub}>{biz.category}{biz.owner ? ` · ${biz.owner.name || biz.owner.email}` : ' · Sem dono'}</Text>
        <Text style={s.bizRowMeta}>{biz.source === 'GOOGLE' ? 'Google' : 'Manual'}{biz.isClaimed ? ' · Reclamado' : ' · Por reclamar'}</Text>
      </View>
      <View style={s.rowActions}>
        <ActionIconBtn icon={isActive ? 'eye' : 'eyeOff'} color={isActive ? COLORS.green : COLORS.grayText} loading={actingType === 'active'} onPress={onToggleActive} />
        <ActionIconBtn icon="star" color={isPremium ? '#F59E0B' : COLORS.grayText} loading={actingType === 'premium'} onPress={onTogglePremium} />
        {biz.isClaimed ? <ActionIconBtn icon="link" color="#0EA5E9" loading={actingType === 'unclaim'} onPress={onUnclaim} /> : null}
        {biz.isClaimed && biz.owner?.id ? <ActionIconBtn icon="logIn" color="#7C3AED" loading={actingType === 'impersonate'} onPress={onImpersonate} /> : null}
        <ActionIconBtn icon="refreshCw" color="#0EA5E9" loading={actingType === 'edit'} onPress={onEdit} />
        <ActionIconBtn icon="checkCircle" color="#8B5CF6" loading={claimHistoryLoading} onPress={onClaimHistory} />
        <ActionIconBtn icon="trash" color={COLORS.red} loading={actingType === 'delete'} onPress={onDelete} />
      </View>
    </View>
  );
}
