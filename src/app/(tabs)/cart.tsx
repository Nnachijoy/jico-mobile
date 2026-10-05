import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

type CartLine = {
  id: string;
  quantity: number;
  variant: {
    id: string;
    size: string;
    product: {
      id: string;
      name: string;
      price: number;
      image_url: string;
    };
  } | null;
};

function naira(n: number) {
  return '₦' + n.toLocaleString();
}

export default function Cart() {
  const { user } = useAuth();
  const [items, setItems] = useState<CartLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select('id, quantity, variant_id')
      .eq('user_id', user.id);

    if (error || !cartItems) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (cartItems.length === 0) {
      setItems([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const variantIds = cartItems.map((c) => c.variant_id);
    const { data: variants } = await supabase
      .from('product_variants')
      .select('id,size,product_id')
      .in('id', variantIds);

    const productIds = (variants || []).map((v) => v.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('id,name,price,image_url')
      .in('id', productIds);

    const combined: CartLine[] = cartItems.map((c) => {
      const variant = variants?.find((v) => v.id === c.variant_id);
      const product = products?.find((p) => p.id === variant?.product_id);
      return {
        id: c.id,
        quantity: c.quantity,
        variant:
          variant && product
            ? {
                id: variant.id,
                size: variant.size,
                product: {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image_url: product.image_url,
                },
              }
            : null,
      };
    });

    setItems(combined.filter((i) => i.variant));
    setLoading(false);
    setRefreshing(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('cart-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  async function updateQty(id: string, quantity: number) {
    if (quantity < 1) {
      await supabase.from('cart_items').delete().eq('id', id);
    } else {
      await supabase.from('cart_items').update({ quantity }).eq('id', id);
    }
    load();
  }

  const total = items.reduce(
    (s, i) => s + i.quantity * (i.variant?.product.price || 0),
    0
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#465041" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR CART</Text>
        <Text style={styles.heading}>Your cart.</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Your cart is empty.</Text>
          <Text style={styles.emptySub}>
            Add items on the website or from the Shop tab — they sync here in
            real time.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ paddingBottom: 140 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor="#465041"
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Image
                source={{ uri: item.variant!.product.image_url }}
                style={styles.thumb}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.variant!.product.name}</Text>
                <Text style={styles.size}>Size {item.variant!.size}</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    onPress={() => updateQty(item.id, item.quantity - 1)}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{item.quantity}</Text>
                  <Pressable
                    onPress={() => updateQty(item.id, item.quantity + 1)}
                    style={styles.qtyBtn}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </Pressable>
                </View>
              </View>
              <Text style={styles.price}>
                {naira(item.quantity * item.variant!.product.price)}
              </Text>
            </View>
          )}
        />
      )}

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{naira(total)}</Text>
          </View>
          <Pressable
            onPress={() =>
              Alert.alert(
                'Checkout',
                'Please complete checkout on the website at jicofooties.netlify.app',
                [{ text: 'OK' }]
              )
            }
            style={styles.checkoutBtn}
          >
            <Text style={styles.checkoutText}>Continue on website</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ee' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: '#77796f' },
  heading: {
    fontSize: 32,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 4,
  },
  empty: { fontSize: 15, color: '#181917', textAlign: 'center' },
  emptySub: {
    fontSize: 12,
    color: '#77796f',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    alignItems: 'flex-start',
  },
  thumb: { width: 72, height: 88, backgroundColor: '#e8e5de' },
  name: { fontSize: 14, color: '#181917' },
  size: { fontSize: 11, color: '#77796f', marginTop: 3 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 16, color: '#181917' },
  qty: { fontSize: 13, color: '#181917' },
  price: { fontSize: 13, color: '#181917' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f5f3ee',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    padding: 20,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  totalLabel: { fontSize: 14, color: '#181917' },
  totalValue: { fontSize: 15, color: '#181917', fontWeight: '600' },
  checkoutBtn: {
    backgroundColor: '#465041',
    paddingVertical: 15,
    alignItems: 'center',
  },
  checkoutText: {
    color: '#fff',
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },
});