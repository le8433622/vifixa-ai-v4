// 📊 V4 DASHBOARD — AI insights, AI cost, accuracy, health
'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function V4Dashboard() {
  const router = useRouter()
  const [health, setHealth] = useState<any>(null)
  const [accuracy, setAccuracy] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { queueMicrotask(() => loadData()) }, [])

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const headers = { Authorization: `Bearer ${session.access_token}` }

      // Role
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      setRole((profile as any)?.role || 'customer')

      // Health + Accuracy
      const healthRes = await fetch(`${supabaseUrl}/functions/v1/ai-healthcheck`, { headers })
      if (healthRes.ok) setHealth(await healthRes.json())
      const { data: accData } = await supabase.from('ai_agent_accuracy').select('*').limit(20)
      setAccuracy(accData || [])

      // Orders (customer + worker)
      const { data: orderData } = await supabase
        .from('orders').select('id, category, description, status, estimated_price, final_price, created_at')
        .or(`customer_id.eq.${session.user.id},worker_id.eq.${session.user.id}`)
        .order('created_at', { ascending: false }).limit(10)
      setOrders(orderData || [])
    } catch { /* ignore */ }
    setLoading(false)
  }

  const checks = health?.checks || {}
  const metrics = health?.metrics || {}
  const avgAcc = accuracy.length > 0 ? (accuracy.reduce((s: number, r: any) => s + r.accuracy_pct, 0) / accuracy.length).toFixed(1) : '—'
  const totalEarnings = orders.filter((o: any) => o.status === 'completed').reduce((s: number, o: any) => s + (o.final_price || o.estimated_price || 0), 0)

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="bg-gray-200 rounded-xl h-24" />)}
        </div>
      ) : (
        <>
          {/* Status Banner */}
          <div className={`rounded-xl p-4 text-white font-bold ${
            health?.status === 'healthy' ? 'bg-green-500' : health?.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
          }`}>
            <p className="text-lg">
              {health?.status === 'healthy' ? '🟢 Hệ thống hoạt động tốt' :
               health?.status === 'degraded' ? '🟡 Hệ thống có vấn đề' : '🔴 Hệ thống gặp sự cố'}
            </p>
            <p className="text-sm opacity-80">v{health?.version} · {new Date(health?.timestamp).toLocaleString('vi-VN')}</p>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-xs text-gray-500">Lượt AI hôm nay</p>
              <p className="text-2xl font-bold text-blue-600">{metrics.calls_today || 0}</p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-xs text-gray-500">Chi phí hôm nay</p>
              <p className={`text-2xl font-bold ${(metrics.cost_today || 0) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                ${(metrics.cost_today || 0).toFixed(4)}
              </p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-xs text-gray-500">Độ trễ TB</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.avg_latency || 0}ms</p>
            </div>
            <div className="bg-white rounded-xl p-4 border">
              <p className="text-xs text-gray-500">Cache hit</p>
              <p className="text-2xl font-bold text-emerald-600">{metrics.cache_hit_rate || 0}%</p>
            </div>
          </div>

          {/* System Checks */}
          <div className="bg-white rounded-xl border p-4">
            <h3 className="font-bold text-sm mb-3">🔍 Kiểm tra hệ thống</h3>
            <div className="space-y-2">
              {[
                { label: '🗄️ Database', check: checks.database },
                { label: '🧠 AI Core', check: checks.ai_core },
                { label: '🔌 NVIDIA API', check: checks.nvidia_api },
                { label: '⚠️ Lỗi hôm nay', check: checks.recent_errors },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {item.check?.latency_ms ? `${item.check.latency_ms}ms` : ''}
                      {item.check?.count !== undefined ? `${item.check.count} lỗi` : ''}
                      {item.check?.model ? `Model: ${item.check.model}` : ''}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      item.check?.status === 'healthy' ? 'bg-green-100 text-green-700' :
                      item.check?.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>{item.check?.status || 'unknown'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Accuracy */}
          {accuracy.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-sm mb-3">🎯 Độ chính xác AI (TB: {avgAcc}%)</h3>
              <div className="space-y-2">
                {accuracy.map((a: any) => (
                  <div key={a.agent_type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="capitalize">{a.agent_type}</span>
                      <span className={`font-bold ${a.accuracy_pct >= 80 ? 'text-green-600' : a.accuracy_pct >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {a.accuracy_pct}%
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full">
                      <div className={`h-full rounded-full transition-all ${
                        a.accuracy_pct >= 80 ? 'bg-green-500' : a.accuracy_pct >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`} style={{ width: `${a.accuracy_pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Orders */}
          {orders.length > 0 && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold text-sm mb-3">
                {role === 'worker' ? `📋 Đơn gần đây · 💰 ${totalEarnings.toLocaleString()}đ` : '📋 Đơn hàng gần đây'}
              </h3>
              <div className="space-y-2">
                {orders.slice(0, 5).map((o: any) => (
                  <button key={o.id} onClick={() => router.push(`/customer/orders/${o.id}`)}
                    className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg text-left hover:bg-gray-100 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium capitalize truncate">{o.category}</p>
                      <p className="text-xs text-gray-500 truncate">{o.description?.slice(0, 60)}</p>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <p className="text-sm font-bold">{(o.final_price || o.estimated_price || 0).toLocaleString()}đ</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        o.status === 'completed' ? 'bg-green-100 text-green-700' :
                        o.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                        o.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{o.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => router.push('/v4')} className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-xl p-4 text-left hover:opacity-90">
              <span className="text-2xl">🗺️</span>
              <p className="font-bold text-sm mt-2">Bản đồ</p>
            </button>
            <button onClick={() => router.push('/v4/chat')} className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-4 text-left hover:opacity-90">
              <span className="text-2xl">💬</span>
              <p className="font-bold text-sm mt-2">Chat AI</p>
            </button>
          </div>
        </>
      )}
    </div>
  )
}