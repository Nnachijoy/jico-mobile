import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

type Order = {
  id: string;
  status: string;
  total: number;
  created_at: string;
};

function naira(n: number) {
  return '₦' + n.toLocaleString();
}

export default function Account() {
  const router = useRouter();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('orders')
      .select('id,status,total,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders((data || []) as Order[]);
        setLoading(false);
      });
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/sign-in');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={styles.eyebrow}>YOUR JICO ACCOUNT</Text>
        <Text style={styles.heading}>Good to have you back.</Text>
        <Text style={styles.email}>{user?.email}</Text>

        <Text style={styles.sectionTitle}>Your orders</Text>
        {loading ? (
          <ActivityIndicator color="#465041" style={{ marginTop: 20 }} />
        ) : orders.length === 0 ? (
          <Text style={styles.empty}>
            No orders yet. Shop from the website or the Shop tab.
          </Text>
        ) : (
          orders.map((o) => (
            <View key={o.id} style={styles.orderRow}>
              <View>
                <Text style={styles.orderId}>
                  Order {o.id.slice(0, 8).toUpperCase()}
                </Text>
                <Text style={styles.orderMeta}>
                  {new Date(o.created_at).toLocaleDateString()} ·{' '}
                  {o.status.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.orderTotal}>{naira(o.total)}</Text>
            </View>
          ))
        )}

        <Pressable onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ee' },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: '#77796f' },
  heading: {
    fontSize: 30,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 6,
  },
  email: { fontSize: 12, color: '#77796f', marginTop: 6 },
  sectionTitle: {
    fontSize: 20,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 36,
    marginBottom: 12,
  },
  empty: { fontSize: 13, color: '#77796f' },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  orderId: { fontSize: 13, color: '#181917' },
  orderMeta: { fontSize: 11, color: '#77796f', marginTop: 3 },
  orderTotal: { fontSize: 13, color: '#181917' },
  signOutBtn: {
    marginTop: 40,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  signOutText: { fontSize: 12, color: '#181917' },
});