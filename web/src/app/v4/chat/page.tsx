// 💬 V4 CHAT — Full-featured: order flow, upsell, tracking
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function V4Chat() {
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string; actions?: any[] }>>([
    { id: 'welcome', role: 'assistant', content: 'Xin chào! Tôi là trợ lý AI Vifixa.\n\n💡 Thử nói: "Máy lạnh không mát" hoặc "Tìm thợ gần đây"' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const endpointRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endpointRef.current?.scrollIntoView() }, [messages])

  // Load existing orders
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return
      supabase.from('orders').select('id, category, description, status, estimated_price, created_at')
        .eq('customer_id', session.user.id).order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => setOrders(data || []))
    })
  }, [])

  async function sendMessage(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const res = await fetch(`${supabaseUrl}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'xu_ly_chat', noiDung: msg, nguCanh: { session_id: sessionId } }),
      })
      const data = await res.json()
      const r = data.ketQuaCuoi || {}

      setMessages(prev => prev.map(m => m.id === aiId ? {
        ...m, content: r.reply || 'Xin lỗi, chưa hiểu.',
        actions: r.actions || [],
      } : m))

      if (r.session_id) setSessionId(r.session_id)

      if (r.session_complete && r.order_id) {
        setTimeout(() => router.push(`/customer/orders/${r.order_id}`), 1500)
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi kết nối. Thử lại.' } : m))
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Order history bar (nếu có) */}
      {orders.length > 0 && (
        <div className="bg-blue-50 border-b px-4 py-2 overflow-x-auto flex gap-2">
          {orders.slice(0, 3).map(o => (
            <button key={o.id} onClick={() => router.push(`/customer/orders/${o.id}`)}
              className="shrink-0 px-3 py-1 bg-white rounded-full text-xs border hover:border-blue-300">
              📋 {o.category} — {o.status}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white border rounded-bl-md'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.actions?.map((a, i) => (
                <button key={i} onClick={() => {
                  if (a.type === 'confirmation_card' || a.type === 'view_order' && a.value) {
                    router.push(`/customer/orders/${a.value}`)
                  } else {
                    sendMessage(a.value || a.label)
                  }
                }}
                  className={`mt-2 w-full py-2 rounded-lg text-xs font-bold text-white transition-all ${
                    a.type === 'confirmation_card' ? 'bg-emerald-500 hover:bg-emerald-600' :
                    a.type === 'upsell_card' ? 'bg-amber-500 hover:bg-amber-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  }`}>
                  {a.type === 'confirmation_card' ? '✅ Xác nhận tạo đơn' :
                   a.type === 'upsell_card' ? '💎 ' + (a.label || 'Tìm hiểu thêm') :
                   a.type === 'view_order' ? '📋 Xem đơn hàng' : '⚡ ' + (a.label || a.type)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={endpointRef} />
      </div>

      {/* Quick chips */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {['❄️ Máy lạnh hư', '🚿 Rò nước', '⚡ Mất điện', '📋 Xem đơn hàng'].map(chip => (
            <button key={chip} onClick={() => chip.includes('đơn hàng') ? router.push('/customer/orders') : setInput(chip)}
              className="px-3 py-1.5 bg-white border rounded-full text-xs text-gray-600 hover:border-blue-300">
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Mô tả sự cố..." className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            Gửi
          </button>
        </div>
      </div>
    </div>
  )
}