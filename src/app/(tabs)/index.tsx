import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

type Product = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string;
  category: string;
};

function naira(n: number) {
  return '₦' + n.toLocaleString();
}

export default function Shop() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    const { data, error } = await supabase
      .from('products')
      .select('id,name,slug,price,image_url,category')
      .eq('active', true);
    if (!error && data) setProducts(data);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>THE COLLECTION</Text>
        <Text style={styles.heading}>JICO FOOTIES</Text>
        <Text style={styles.sub}>Considered pieces for the everyday.</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#465041" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 20 }}
          contentContainerStyle={{ gap: 20, paddingBottom: 40 }}
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
            <Pressable
              onPress={() => router.push(`/product/${item.slug}`)}
              style={styles.card}
            >
              <View style={styles.imageWrap}>
                <Image
                  source={{ uri: item.image_url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.category}>{item.category}</Text>
              <Text style={styles.price}>{naira(item.price)}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f3ee' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  eyebrow: { fontSize: 10, letterSpacing: 3, color: '#77796f' },
  heading: {
    fontSize: 32,
    color: '#181917',
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif' }),
    marginTop: 4,
  },
  sub: { fontSize: 13, color: '#77796f', marginTop: 4 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { flex: 1 },
  imageWrap: {
    aspectRatio: 0.79,
    backgroundColor: '#e8e5de',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  name: { fontSize: 13, color: '#181917', marginTop: 8 },
  category: { fontSize: 10, color: '#77796f', marginTop: 2 },
  price: { fontSize: 13, color: '#181917', marginTop: 4 },
});