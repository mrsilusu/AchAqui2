import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Icon, COLORS } from '../../../core/AchAqui_Core';
import { CLAIM_STATUS } from '../constants';
import { s } from '../AdminStyles';

export function AdminClaimCard({ claim, onApprove, onReject, onEditNote, onOpenBusiness, isReviewing }) {
  const st = CLAIM_STATUS[claim.status] || CLAIM_STATUS.PENDING;
  const claimDate = claim.createdAt ? new Date(claim.createdAt) : null;
  const ageDays = claimDate
    ? Math.max(0, Math.floor((Date.now() - claimDate.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return (
    <View style={s.adminClaimCard}>
      <View style={s.adminClaimTop}>
        <View style={{ flex: 1 }}>
          <Text style={s.adminClaimBizName}>{claim.business?.name || 'Negocio'}</Text>
          <Text style={s.adminClaimSub}>{claim.business?.category}</Text>
          {claim.createdAt ? (
            <Text style={s.claimTimestamp}>
              {new Date(claim.createdAt).toLocaleString('pt-PT', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
              {typeof ageDays === 'number' ? ` · ha ${ageDays}d` : ''}
            </Text>
          ) : null}
        </View>
        <View style={[s.statusBadge, { backgroundColor: st.bg }]}>
          <Text style={[s.statusBadgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={s.claimMetaActions}>
        <TouchableOpacity onPress={onOpenBusiness}>
          <Text style={s.claimLink}>Abrir negocio</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onEditNote}>
          <Text style={s.claimLink}>Editar nota</Text>
        </TouchableOpacity>
      </View>

      <View style={s.adminClaimUser}>
        <Icon name="user" size={14} color={COLORS.grayText} strokeWidth={2} />
        <Text style={s.adminClaimUserText}>
          {claim.user?.name || claim.user?.email || 'Utilizador'}
          {claim.user?.email && claim.user?.name ? ` (${claim.user.email})` : ''}
        </Text>
      </View>

      {claim.evidence ? <Text style={s.adminClaimEvidence}>"{claim.evidence}"</Text> : null}

      {claim.adminNote ? (
        <View style={s.adminNoteBox}>
          <Text style={s.adminNoteLabel}>Nota: {claim.adminNote}</Text>
        </View>
      ) : null}

      {claim.reviewedAt ? (
        <Text style={s.claimResolvedAt}>
          Resolvido em{' '}
          {new Date(claim.reviewedAt).toLocaleString('pt-PT', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ) : null}

      {claim.status === 'PENDING' ? (
        <View style={s.adminClaimActions}>
          <TouchableOpacity style={[s.adminActionBtn, s.rejectBtn]} onPress={onReject} disabled={isReviewing} activeOpacity={0.7}>
            {isReviewing ? <ActivityIndicator size="small" color={COLORS.red} /> : <Text style={s.rejectBtnText}>Rejeitar</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={[s.adminActionBtn, s.approveBtn]} onPress={onApprove} disabled={isReviewing} activeOpacity={0.7}>
            {isReviewing ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={s.approveBtnText}>Aprovar</Text>}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
