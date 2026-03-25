import React, { useCallback, useState } from 'react';
import { Alert, Text, TouchableOpacity, View, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { Icon, COLORS } from '../../core/AchAqui_Core';
import { apiRequest } from '../../lib/backendApi';
import { s } from './AdminStyles';
import { TABS } from './constants';
import { DashboardTab } from './tabs/DashboardTab';
import { ClaimsTab } from './tabs/ClaimsTab';
import { BusinessesTab } from './tabs/BusinessesTab';
import { UsersTab } from './tabs/UsersTab';
import { ModerationTab } from './tabs/ModerationTab';
import { AnalyticsTab } from './tabs/AnalyticsTab';
import { AuditLogTab } from './tabs/AuditLogTab';
import { SettingsTab } from './tabs/SettingsTab';

export function AdminModule({ accessToken, onExit, onLogout = () => {}, onImpersonationSession = () => {}, insets }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [claimsFilterOverride, setClaimsFilterOverride] = useState(null);
  const [bizFilterOverride, setBizFilterOverride] = useState(null);
  const [bizSearchOverride, setBizSearchOverride] = useState(null);

  const openClaims = useCallback((status = 'PENDING') => {
    setClaimsFilterOverride(status);
    setActiveTab('claims');
  }, []);

  const openBusinesses = useCallback((opts = {}) => {
    setBizFilterOverride(opts.filter ?? null);
    setBizSearchOverride(opts.search ?? null);
    setActiveTab('businesses');
  }, []);

  const openUsers = useCallback(() => {
    setActiveTab('users');
  }, []);

  return (
    <View style={[s.container, { paddingBottom: insets?.bottom || 0 }]}>
      <View style={[s.header, { paddingTop: (insets?.top || 0) + 8 }]}>
        <TouchableOpacity style={s.exitBtn} onPress={onExit} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrowLeft" size={20} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
        <View style={s.headerBrand}>
          <Text style={s.headerTitle}>AcheiAqui</Text>
          <Text style={s.headerSub}>Painel Admin</Text>
        </View>
        <TouchableOpacity
          style={s.exitBtn}
          onPress={() =>
            Alert.alert('Terminar sessao', 'Tens a certeza que queres sair?', [
              { text: 'Cancelar', style: 'cancel' },
              { text: 'Sair', style: 'destructive', onPress: onLogout },
            ])
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="power" size={20} color={COLORS.white} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={s.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[s.tabItem, activeTab === tab.id ? s.tabItemActive : null]}
            onPress={() => setActiveTab(tab.id)}
            activeOpacity={0.7}
          >
            <Icon name={tab.icon} size={18} color={activeTab === tab.id ? COLORS.red : COLORS.grayText} strokeWidth={2} />
            <Text style={[s.tabLabel, activeTab === tab.id ? s.tabLabelActive : null]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1 }}>
        {activeTab === 'dashboard' ? (
          <DashboardTab
            accessToken={accessToken}
            onOpenClaims={openClaims}
            onOpenBusinesses={openBusinesses}
            onOpenUsers={openUsers}
            onOpenModeration={() => setActiveTab('content')}
          />
        ) : null}

        {activeTab === 'claims' ? (
          <ClaimsTab
            accessToken={accessToken}
            forcedFilter={claimsFilterOverride}
            onConsumeForcedFilter={() => setClaimsFilterOverride(null)}
            onOpenBusiness={(businessId) => openBusinesses({ search: businessId })}
          />
        ) : null}

        {activeTab === 'businesses' ? (
          <BusinessesTab
            accessToken={accessToken}
            onImpersonationSession={onImpersonationSession}
            forcedFilter={bizFilterOverride}
            forcedSearch={bizSearchOverride}
            onConsumeForcedFilter={() => setBizFilterOverride(null)}
            onConsumeForcedSearch={() => setBizSearchOverride(null)}
            onOpenClaims={openClaims}
          />
        ) : null}

        {activeTab === 'users' ? <UsersTab accessToken={accessToken} onOpenBusinesses={openBusinesses} /> : null}
        {activeTab === 'content' ? <ModerationTab accessToken={accessToken} /> : null}
        {activeTab === 'analytics' ? <AnalyticsTab accessToken={accessToken} /> : null}
        {activeTab === 'audit' ? <AuditLogTab accessToken={accessToken} /> : null}
        {activeTab === 'settings' ? <SettingsTab accessToken={accessToken} /> : null}
      </View>
    </View>
  );
}
