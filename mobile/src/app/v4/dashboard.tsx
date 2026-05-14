// 📊 V4 DASHBOARD Mobile — Health + cost + accuracy + orders
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'

export default function V4DashboardMobile() {
  const router = useRouter()
  const [health, setHealth] = useState<any>(null)
  const [accuracy, setAccuracy] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDuLieu(session.access_token, session.user.id)
    })
  }, [])

  async function taiDuLieu(token: string, userId: string) {
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${token}` }

      const healthRes = await fetch(`${url}/functions/v1/ai-healthcheck`, { headers })
      if (healthRes.ok) setHealth(await healthRes.json())

      const { data: acc } = await supabase.from('ai_agent_accuracy').select('*').limit(10)
      setAccuracy(acc || [])

      const { data: ord } = await supabase.from('orders').select('id, category, status, estimated_price, final_price')
        .or(`customer_id.eq.${userId},worker_id.eq.${userId}`).order('created_at', { ascending: false }).limit(5)
      setOrders(ord || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const m = health?.metrics || {}
  const avgAcc = accuracy.length > 0 ? (accuracy.reduce((s: number, r: any) => s + r.accuracy_pct, 0) / accuracy.length).toFixed(1) : '—'
  const totalEarnings = orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color="#2563eb" /></View>

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      {/* Status */}
      <View style={[styles.banner, { backgroundColor: health?.status === 'healthy' ? '#16a34a' : health?.status === 'degraded' ? '#ca8a04' : '#dc2626' }]}>
        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
          {health?.status === 'healthy' ? '🟢 Hệ thống tốt' : health?.status === 'degraded' ? '🟡 Có vấn đề' : '🔴 Sự cố'}
        </Text>
      </View>

      {/* Metrics */}
      <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
        <View style={styles.card}><Text style={styles.cardVal}>{m.calls_today || 0}</Text><Text style={styles.cardLabel}>Lượt AI</Text></View>
        <View style={styles.card}><Text style={[styles.cardVal, { color: '#dc2626' }]}>${(m.cost_today || 0).toFixed(4)}</Text><Text style={styles.cardLabel}>Chi phí</Text></View>
        <View style={styles.card}><Text style={styles.cardVal}>{m.avg_latency || 0}ms</Text><Text style={styles.cardLabel}>Độ trễ</Text></View>
      </View>

      {/* Accuracy */}
      {accuracy.length > 0 && (
        <View style={{ margin: 12, marginTop: 0, backgroundColor: 'white', borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>🎯 Accuracy TB: {avgAcc}%</Text>
          {accuracy.slice(0, 5).map((a: any) => (
            <View key={a.agent_type} style={{ marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                <Text style={{ fontSize: 11, textTransform: 'capitalize' }}>{a.agent_type}</Text>
                <Text style={{ fontSize: 11, fontWeight: 'bold', color: a.accuracy_pct >= 80 ? '#16a34a' : a.accuracy_pct >= 60 ? '#ca8a04' : '#dc2626' }}>{a.accuracy_pct}%</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: a.accuracy_pct >= 80 ? '#16a34a' : a.accuracy_pct >= 60 ? '#ca8a04' : '#dc2626', borderRadius: 3, width: `${a.accuracy_pct}%` }} />
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Orders */}
      {orders.length > 0 && (
        <View style={{ margin: 12, marginTop: 0, backgroundColor: 'white', borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>📋 Đơn gần đây · 💰 {totalEarnings.toLocaleString()}đ</Text>
          {orders.map((o: any) => (
            <TouchableOpacity key={o.id} onPress={() => router.push(`/customer/orders/${o.id}` as any)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' }}>
              <Text style={{ fontSize: 13, textTransform: 'capitalize' }}>{o.category}</Text>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{(o.final_price || o.estimated_price || 0).toLocaleString()}đ · {o.status}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick actions */}
      <View style={{ flexDirection: 'row', padding: 12, paddingTop: 0, gap: 8 }}>
        <TouchableOpacity onPress={() => router.push('/v4')} style={[styles.actionBtn, { backgroundColor: '#2563eb' }]}>
          <Text style={{ color: 'white', fontWeight: '600' }}>🗺️ Bản đồ</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/v4/chat')} style={[styles.actionBtn, { backgroundColor: '#059669' }]}>
          <Text style={{ color: 'white', fontWeight: '600' }}>💬 Chat AI</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  banner: { padding: 16, paddingTop: 8 },
  card: { flex: 1, backgroundColor: 'white', borderRadius: 10, padding: 12, alignItems: 'center' },
  cardVal: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  cardLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  actionBtn: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
})