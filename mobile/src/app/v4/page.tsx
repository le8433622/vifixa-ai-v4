// 🗺️ V4 MAP Mobile — 3 modes: Workers, Orders, Heatmap
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect } from 'react'
import BanDoMobile from '@/components/BanDo'

const MODES = [
  { key: 'workers', icon: '👥', label: 'Thợ' },
  { key: 'orders', icon: '📋', label: 'Đơn' },
  { key: 'heatmap', icon: '🔥', label: 'Nhu cầu' },
]

export default function V4MapMobile() {
  const router = useRouter()
  const [points, setPoints] = useState<any[]>([])
  const [mode, setMode] = useState('workers')
  const [stats, setStats] = useState({ total: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      taiDuLieu(session.access_token)
    })
  }, [mode])

  async function taiDuLieu(token: string) {
    setLoading(true)
    try {
      const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

      if (mode === 'workers') {
        const res = await fetch(`${url}/functions/v1/v4-navigator`, {
          method: 'POST', headers,
          body: JSON.stringify({ hanhDong: 'tim_gan_day', viTri: { viDo: 10.77, kinhDo: 106.69 }, banKinh: 50 }),
        })
        const data = await res.json()
        if (data.danhSach) {
          setPoints([
            { id: 'me', lat: 10.77, lng: 106.69, loai: 'nha', nhan: '📍 Vị trí' },
            ...data.danhSach.map((w: any) => ({
              id: w.id, lat: 10.77 + (Math.random() - 0.5) * 0.05, lng: 106.69 + (Math.random() - 0.5) * 0.05,
              loai: 'tho' as const, nhan: w.ten || w.name,
              moTa: `📍 ${w.khoangCachKm}km · ⭐ ${w.diemDanhGia || w.rating}/5`,
            })),
          ])
          setStats({ total: data.danhSach.length })
        }
      } else if (mode === 'orders') {
        const { data: orders } = await supabase.from('orders').select('id, category, status, estimated_price').in('status', ['pending', 'matched', 'in_progress']).limit(30)
        if (orders) {
          setPoints(orders.map((o: any) => ({
            id: o.id, lat: 10.77 + (Math.random() - 0.5) * 0.08, lng: 106.69 + (Math.random() - 0.5) * 0.08,
            loai: 'don' as const, nhan: o.category, moTa: `${o.estimated_price?.toLocaleString() || 0}₫ · ${o.status}`,
          })))
          setStats({ total: orders.length })
        }
      } else if (mode === 'heatmap') {
        const res = await fetch(`${url}/functions/v1/v4-navigator`, {
          method: 'POST', headers,
          body: JSON.stringify({ hanhDong: 'nhiet_do', viTri: { viDo: 10.77, kinhDo: 106.69 } }),
        })
        const data = await res.json()
        if (data.features) {
          setPoints(data.features.map((f: any, i: number) => ({
            id: `h-${i}`, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
            loai: 'tho' as const, nhan: `${f.properties.soDon} đơn`,
            moTa: `💰 ${(f.properties.doanhThu / 1000).toFixed(0)}K₫`,
          })))
          setStats({ total: data.metadata?.tongDon || 0 })
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  return (
    <View style={styles.container}>
      {/* Mode selector */}
      <View style={styles.modeRow}>
        {MODES.map(m => (
          <TouchableOpacity key={m.key} onPress={() => setMode(m.key)}
            style={[styles.modeBtn, mode === m.key && styles.modeActive]}>
            <Text style={[styles.modeText, mode === m.key && styles.modeTextActive]}>{m.icon} {m.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity onPress={() => router.push('/v4/chat')}><Text style={styles.chatBtn}>💬 Chat</Text></TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
        <BanDoMobile diem={points} chieuCao={500} onMarkerClick={(id, loai) => {
          if (loai === 'tho') setSelected(points.find(p => p.id === id))
          if (loai === 'don') router.push(`/customer/orders/${id}` as any)
        }} />
      </View>

      {selected && (
        <View style={styles.detail}>
          <View style={styles.detailHeader}>
            <Text style={styles.detailName}>{selected.nhan}</Text>
            <TouchableOpacity onPress={() => setSelected(null)}><Text style={{ color: '#9ca3af' }}>✕</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.chatAction} onPress={() => router.push('/v4/chat')}>
            <Text style={{ color: 'white', fontWeight: '600' }}>💬 Chat để đặt</Text>
          </TouchableOpacity>
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#2563eb" style={{ position: 'absolute', top: '50%', left: '45%' }} />}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  modeRow: { flexDirection: 'row', padding: 8, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', alignItems: 'center', gap: 4 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  modeActive: { backgroundColor: '#2563eb' },
  modeText: { fontSize: 12, color: '#6b7280' },
  modeTextActive: { color: 'white', fontWeight: '600' },
  chatBtn: { fontSize: 12, color: '#2563eb', marginLeft: 'auto', fontWeight: '500' },
  detail: { backgroundColor: 'white', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16, marginTop: -20 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  detailName: { fontSize: 16, fontWeight: 'bold' },
  chatAction: { backgroundColor: '#2563eb', borderRadius: 12, padding: 14, alignItems: 'center' },
})