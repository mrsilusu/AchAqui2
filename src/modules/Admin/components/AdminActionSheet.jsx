import React from 'react';
import { Modal, View, Text, TouchableOpacity } from 'react-native';
import { s } from '../AdminStyles';

export function AdminActionSheet({ visible, title, actions = [], onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.noteModalOverlay}>
        <View style={s.noteModal}>
          <Text style={s.noteModalTitle}>{title}</Text>
          {actions.map((action) => (
            <TouchableOpacity key={action.id} style={[s.noteModalCancelBtn, { marginTop: 8 }]} onPress={action.onPress}>
              <Text style={{ fontWeight: '700', color: action.destructive ? '#D32323' : '#111827' }}>{action.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[s.noteModalConfirmBtn, { marginTop: 10 }]} onPress={onClose}>
            <Text style={{ fontWeight: '700', color: '#FFFFFF' }}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
