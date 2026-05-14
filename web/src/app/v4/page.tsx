// 🗺️ V4 MAP — Full-featured map cho Khách + Thợ + Admin
// 3 modes: Workers (thợ gần) | Orders (đơn hàng) | Heatmap (nhu cầu)

'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const BanDo = dynamic(() => import('@/components/map/BanDo'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-gray-500">Đang tải bản đồ...</p></div>
})

interface MapPoint {
  id: string; lat: number; lng: number; type: string
  label?: string; desc?: string; data?: Record<string, unknown>
}

const MODES = [
  { key: 'workers', icon: '👥', label: 'Thợ gần' },
  { key: 'orders', icon: '📋', label: 'Đơn hàng' },
  { key: 'heatmap', icon: '🔥', label: 'Nhu cầu' },
]

export default function V4MapPage() {
  const router = useRouter()
  const [points, setPoints] = useState<MapPoint[]>([])
  const [mode, setMode] = useState('workers')
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [stats, setStats] = useState({ total: 0 })

  useEffect(() => { queueMicrotask(() => loadData()) }, [mode])

  async function loadData() {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${session.access_token}` }
      let data: MapPoint[] = []

      if (mode === 'workers') {
        // Gọi v4-navigator để lấy thợ gần đây
        const res = await fetch(`${supabaseUrl}/functions/v1/v4-navigator`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hanhDong: 'tim_gan_day', viTri: { viDo: 10.77, kinhDo: 106.69 }, banKinh: 50 }),
        })
        const json = await res.json()
        if (json.danhSach?.length > 0) {
          data = [
            { id: 'me', lat: 10.77, lng: 106.69, type: 'home', label: '📍 Vị trí của bạn' },
            ...json.danhSach.map((w: any) => ({
              id: w.id, lat: 10.77 + (Math.random() - 0.5) * 0.05, lng: 106.69 + (Math.random() - 0.5) * 0.05,
              type: 'worker', label: w.ten || w.name,
              desc: `📍 ${w.khoangCachKm}km · ⏱ ${w.thoiGianPhut}ph · ⭐ ${w.diemDanhGia || w.rating}/5`,
              data: w,
            })),
          ]
          setStats({ total: json.danhSach.length })
        }
      } else if (mode === 'orders') {
        // Lấy đơn hàng từ production
        const { data: orders } = await supabase.from('orders').select('id, category, description, status, estimated_price, created_at').in('status', ['pending', 'matched', 'in_progress']).limit(50)
        if (orders?.length > 0) {
          data = orders.map((o: any, i: number) => ({
            id: o.id, lat: 10.77 + (Math.random() - 0.5) * 0.08, lng: 106.69 + (Math.random() - 0.5) * 0.08,
            type: 'order_pending', label: o.category,
            desc: `${o.estimated_price?.toLocaleString() || 0}₫ · ${o.status}`,
            data: o,
          }))
          setStats({ total: orders.length })
        }
      } else if (mode === 'heatmap') {
        // Gọi v4-navigator để lấy heatmap
        const res = await fetch(`${supabaseUrl}/functions/v1/v4-navigator`, {
          method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ hanhDong: 'nhiet_do', viTri: { viDo: 10.77, kinhDo: 106.69 } }),
        })
        const json = await res.json()
        if (json.features?.length > 0) {
          data = json.features.map((f: any, i: number) => ({
            id: `heat-${i}`, lat: f.geometry.coordinates[1], lng: f.geometry.coordinates[0],
            type: 'heat', label: `${f.properties.soDon} đơn`,
            desc: `💰 ${(f.properties.doanhThu / 1000).toFixed(0)}K₫`,
            data: { intensity: f.properties.nhietDo },
          }))
          setStats({ total: json.metadata?.tongDon || 0 })
        }
      }

      setPoints(data)
    } catch { /* ignore */ }
    setLoading(false)
  }

  const handleMarkerClick = useCallback((id: string, type: string, data: any) => {
    if (type === 'worker') setSelected(data || { id, ten: id })
    else if (type === 'order_pending' || type === 'order') router.push(`/customer/orders/${id}`)
  }, [router])

  return (
    <div className="flex-1 flex flex-col">
      {/* Header với mode selector */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2">
        {MODES.map(m => (
          <button key={m.key} onClick={() => setMode(m.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === m.key ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}>
            {m.icon} {m.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-500">{stats.total} kết quả</span>
        <button onClick={() => router.push('/v4/chat')} className="text-xs text-blue-600 hover:underline">💬 Chat AI</button>
      </div>

      {/* Map */}
      <div className="w-full relative" style={{ height: selected ? 'calc(100vh - 300px)' : 'calc(100vh - 120px)' }}>
        {loading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100"><p className="text-gray-500">Đang tải...</p></div>
        ) : points.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 flex-col gap-2">
            <p className="text-3xl">🗺️</p>
            <p className="text-gray-500 text-sm">Chưa có dữ liệu trong khu vực</p>
          </div>
        ) : (
          <BanDo points={points} height="100%" showControls onMarkerClick={handleMarkerClick} />
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="bg-white border-t rounded-t-2xl shadow-lg p-4 -mt-4 z-10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">{selected.ten || selected.name || selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm mb-3">
            {selected.khoangCachKm && <div className="bg-gray-50 p-2 rounded">📍 {selected.khoangCachKm}km</div>}
            {selected.thoiGianPhut && <div className="bg-gray-50 p-2 rounded">⏱ {selected.thoiGianPhut} phút</div>}
            {selected.diemDanhGia && <div className="bg-gray-50 p-2 rounded">⭐ {selected.diemDanhGia}/5</div>}
            {selected.kyNang?.length > 0 && <div className="bg-gray-50 p-2 rounded">🔧 {selected.kyNang.slice(0, 3).join(', ')}</div>}
          </div>
          <button onClick={() => router.push('/v4/chat')}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700">
            💬 Chat để đặt dịch vụ
          </button>
        </div>
      )}

      {/* Empty state khi không có detail */}
      {!selected && points.length === 0 && !loading && (
        <div className="bg-white border-t p-4 text-center text-sm text-gray-500">
          <p>Nhấn vào marker trên bản đồ để xem chi tiết</p>
        </div>
      )}
    </div>
  )
}