import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View, RefreshControl } from 'react-native';
import { COLORS } from '../../../core/AchAqui_Core';
import { apiRequest } from '../../../lib/backendApi';
import { CLAIM_STATUS } from '../constants';
import { s } from '../AdminStyles';
import { AdminClaimCard } from '../components/AdminClaimCard';
import { EmptyState, Loader } from '../components/CommonComponents';

export function ClaimsTab({ accessToken, forcedFilter, onConsumeForcedFilter, onOpenBusiness }) {
  const [claims, setClaims] = useState([]);
  const [filter, setFilter] = useState('PENDING');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await apiRequest(`/admin/claims?status=${filter}`, { accessToken });
      const rows = Array.isArray(data) ? data : [];
      const sortedRows = [...rows].sort((a, b) => {
        const ta = new Date(a?.createdAt || 0).getTime();
        const tb = new Date(b?.createdAt || 0).getTime();
        if (filter === 'PENDING') return ta - tb;
        return tb - ta;
      });
      setClaims(sortedRows);
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel carregar claims.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [accessToken, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!forcedFilter) return;
    setFilter(forcedFilter);
    onConsumeForcedFilter?.();
  }, [forcedFilter, onConsumeForcedFilter]);

  async function confirmReview() {
    if (!noteModal) return;
    setReviewing(noteModal.claimId);
    try {
      if (noteModal.noteOnly) {
        await apiRequest(`/admin/claims/${noteModal.claimId}/note`, {
          method: 'PATCH',
          body: { adminNote: adminNote.trim() || null },
          accessToken,
        });
      } else {
        await apiRequest(`/admin/claims/${noteModal.claimId}/review`, {
          method: 'PATCH',
          body: { decision: noteModal.decision, adminNote: adminNote.trim() || undefined },
          accessToken,
        });
      }
      setNoteModal(null);
      await load();
    } catch (err) {
      Alert.alert('Erro', err?.message || 'Nao foi possivel rever o claim.');
    } finally {
      setReviewing(null);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={s.filterRow}>
        {['PENDING', 'APPROVED', 'REJECTED'].map((st) => (
          <TouchableOpacity key={st} style={[s.filterChip, filter === st ? s.filterChipActive : null]} onPress={() => setFilter(st)}>
            <Text style={[s.filterChipText, filter === st ? s.filterChipTextActive : null]}>{CLAIM_STATUS[st].label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <Loader />
      ) : (
        <ScrollView style={{ flex: 1 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={COLORS.red} />}>
          {!claims.length ? (
            <EmptyState emoji={filter === 'PENDING' ? '⏳' : '📋'} title={filter === 'PENDING' ? 'Sem claims pendentes' : 'Sem registos'} text={filter === 'PENDING' ? 'Todos os pedidos foram revistos.' : `Nao ha claims com estado ${CLAIM_STATUS[filter].label}.`} />
          ) : (
            <View style={s.section}>
              {claims.map((claim) => (
                <AdminClaimCard
                  key={claim.id}
                  claim={claim}
                  onApprove={() => {
                    setNoteModal({ claimId: claim.id, decision: 'APPROVED' });
                    setAdminNote('');
                  }}
                  onReject={() => {
                    setNoteModal({ claimId: claim.id, decision: 'REJECTED' });
                    setAdminNote('');
                  }}
                  onEditNote={() => {
                    setNoteModal({ claimId: claim.id, decision: claim.status === 'PENDING' ? 'APPROVED' : claim.status, noteOnly: true });
                    setAdminNote(claim.adminNote || '');
                  }}
                  onOpenBusiness={() => onOpenBusiness?.(claim.business?.id)}
                  isReviewing={reviewing === claim.id}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {noteModal ? (
        <View style={s.noteModalOverlay}>
          <View style={s.noteModal}>
            <Text style={s.noteModalTitle}>{noteModal.noteOnly ? 'Editar nota do admin' : noteModal.decision === 'APPROVED' ? 'Aprovar claim' : 'Rejeitar claim'}</Text>
            <Text style={s.noteModalSub}>Nota para o dono (opcional)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Ex: Documentacao verificada / NIF invalido"
              placeholderTextColor={COLORS.grayText}
              value={adminNote}
              onChangeText={setAdminNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity style={s.noteModalCancelBtn} onPress={() => setNoteModal(null)}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.darkText }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.noteModalConfirmBtn, { backgroundColor: noteModal.decision === 'APPROVED' ? COLORS.green : COLORS.red }]} onPress={confirmReview}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.white }}>{noteModal.noteOnly ? 'Guardar nota' : noteModal.decision === 'APPROVED' ? 'Aprovar' : 'Rejeitar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}
