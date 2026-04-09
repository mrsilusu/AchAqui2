import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { HospitalityModule } from './HospitalityModule';
import { backendApi } from '../lib/backendApi';

function fallbackBusiness(businessId) {
  return {
    id: businessId,
    name: 'O meu negocio',
    category: 'Hospitality',
    roomTypes: [],
    modules: { accommodation: true },
  };
}

export function StaffHospitalityView({
  businesses,
  businessId,
  staffRole,
  accessToken,
  liveBookings,
  onLogout,
}) {
  const [remoteBusiness, setRemoteBusiness] = useState(null);
  const [loading, setLoading] = useState(false);

  const businessFromList = useMemo(
    () => (Array.isArray(businesses) ? businesses.find((b) => b?.id === businessId) || null : null),
    [businesses, businessId],
  );

  useEffect(() => {
    let cancelled = false;

    const loadBusiness = async () => {
      if (!businessId || businessFromList) return;
      setLoading(true);
      try {
        const all = await backendApi.getBusinesses();
        if (cancelled || !Array.isArray(all)) return;
        const found = all.find((b) => b?.id === businessId) || null;
        setRemoteBusiness(found);
      } catch {
        if (!cancelled) setRemoteBusiness(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBusiness();

    return () => {
      cancelled = true;
    };
  }, [businessFromList, businessId]);

  if (!businessId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F8' }}>
        <Text style={{ color: '#333', fontSize: 15 }}>Conta de staff sem negocio associado.</Text>
      </View>
    );
  }

  if (loading && !businessFromList && !remoteBusiness) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F8' }}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  const business = businessFromList || remoteBusiness || fallbackBusiness(businessId);

  return (
    <HospitalityModule
      business={business}
      ownerMode={true}
      forceLimitedOwnerMode={true}
      tenantId={businessId}
      staffRoleOverride={staffRole || null}
      initialStaffToken={accessToken}
      liveBookings={liveBookings}
      onLogout={onLogout}
    />
  );
}

export default StaffHospitalityView;
