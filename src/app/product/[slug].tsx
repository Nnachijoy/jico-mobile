import { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  description: string;
  category: string;
};

type Variant = { id: string; size: string; stock: number };

function naira(n: number) {
  return '₦' + n.toLocaleString();
}

export default function ProductDetail() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from('products')
        .select('id,name,slug,price,image_url,description,category')
        .eq('slug', slug)
        .single();

      if (!p) {
        setLoading(false);
        return;
      }
      setProduct(p);

      const { data: v } = await supabase
        .from('product_variants')
        .select('id,size,stock')
        .eq('product_id', p.id)
        .order('size');

      setVariants((v || []) as Variant[]);
      setLoading(false);
    }
    load();
  }, [slug]);

  async function addToCart() {
    if (!user) {
      Alert.alert(
        'Sign in required',
        'Please sign in to add items to your cart.'
      );
      return;
    }
    if (!selected) {
      Alert.alert('Select a size', 'Please choose a size first.');
      return;
    }
    setBusy(true);
    try {
      const variant = variants.find((v) => v.size === selected);
      if (!variant) throw new Error('Size unavailable.');

      const { data: existing } = await supabase
        .from('cart_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('variant_id', variant.id)
        .maybeSingle();

      const next = (existing?.quantity || 0) + 1;

      const { error } = await supabase
        .from('cart_items')
        .upsert(
          { user_id: user.id, variant_id: variant.id, quantity: next },
          { onConflict: 'user_id,variant_id' }
        );

      if (error) throw error;

      setSheetOpen(true);
    } catch (e) {
      Alert.alert(
        'Error',
        e instanceof Error ? e.message : 'Could not add to cart.'
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color="#465041" />
        </View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text>Product not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 20 }}>
            <Text style={{ textDecorationLine: 'underline' }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Image
          source={{ uri: product.image_url }}
          style={styles.hero}
          resizeMode="cover"
        />

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{product.category.toUpperCase()}</Text>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>{naira(product.price)}</Text>
          <Text style={styles.description}>{product.description}</Text>

          <Text style={styles.sectionLabel}>CHOOSE YOUR SIZE</Text>
          <View style={styles.sizeGrid}>
            {variants.map((v) => {
              const active = selected === v.size;
              const disabled = v.stock <= 0;
              return (
                <Pressable
                  key={v.id}
                  onPress={() => !disabled && setSelected(v.size)}
                  disabled={disabled}
                  style={[
                    styles.sizeBtn,
                    active && styles.sizeBtnActive,
                    disabled && { opacity: 0.3 },
                  ]}
                >
                  <Text
                    style={[styles.sizeText, active && styles.sizeTextActive]}
                  >
                    {v.size}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={addToCart}
          disabled={busy}
          style={[styles.addBtn, busy && { opacity: 0.6 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.addBtnText}>Add to cart</Text>
          )}
        </Pressable>
      </View>

      {/* Added-to-cart bottom sheet */}
      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setSheetOpen(false)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View style={styles.sheetIconWrap}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </View>
              <Text style={styles.sheetTitle}>Added to cart</Text>
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={styles.sheetClose}
                hitSlop={10}
              >
                <Ionicons name="close" size={20} color="#77796f" />
              </Pressable>
            </View>

            <Text style={styles.sheetProduct} numberOfLines={1}>
              {product.name} · Size {selected}
            </Text>

            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => setSheetOpen(false)}
                style={styles.sheetSecondaryBtn}
              >
                <Text style={styles.sheetSecondaryText}>Keep shopping</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setSheetOpen(false);
                  router.push('/(tabs)/cart');
                }}
                style={styles.sheetPrimaryBtn}
              >
                <Text style={styles.sheetPrimaryText}>View cart</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ee' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backBtn: { padding: 20 },
  backText: { fontSize: 13, color: '#181917' },
  hero: { width: '100%', aspectRatio: 1, backgroundColor: '#e8e5de' },
  body: { padding: 24 },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: '#77796f' },
  name: {
    fontSize: 30,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 6,
  },
  price: { fontSize: 15, color: '#181917', marginTop: 8 },
  description: {
    fontSize: 13,
    color: '#60625b',
    lineHeight: 22,
    marginTop: 18,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#77796f',
    marginTop: 30,
    marginBottom: 12,
  },
  sizeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sizeBtn: {
    minWidth: 52,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  sizeBtnActive: { backgroundColor: '#465041', borderColor: '#465041' },
  sizeText: { fontSize: 13, color: '#181917' },
  sizeTextActive: { color: '#fff' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#f5f3ee',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  addBtn: {
    backgroundColor: '#465041',
    paddingVertical: 16,
    alignItems: 'center',
  },
  addBtnText: {
    color: '#fff',
    letterSpacing: 2,
    fontSize: 11,
    textTransform: 'uppercase',
  },

  // Bottom sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#f5f3ee',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sheetIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#465041',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetTitle: {
    fontSize: 17,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    flex: 1,
  },
  sheetClose: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetProduct: {
    fontSize: 13,
    color: '#77796f',
    marginTop: 4,
    marginBottom: 24,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 12,
  },
  sheetSecondaryBtn: {
    flex: 1,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
  },
  sheetSecondaryText: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#181917',
    textTransform: 'uppercase',
  },
  sheetPrimaryBtn: {
    flex: 1,
    paddingVertical: 15,
    backgroundColor: '#465041',
    alignItems: 'center',
  },
  sheetPrimaryText: {
    fontSize: 11,
    letterSpacing: 2,
    color: '#fff',
    textTransform: 'uppercase',
  },
});