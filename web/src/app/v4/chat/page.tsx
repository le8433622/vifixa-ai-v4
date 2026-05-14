// 💬 V4 CHAT — Full-featured chat with session management
'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function V4Chat() {
  const router = useRouter()
  const [messages, setMessages] = useState<Array<{ id: string; role: string; content: string; actions?: any[] }>>([
    { id: 'welcome', role: 'assistant', content: 'Xin chào! Tôi là trợ lý AI Vifixa. Tôi có thể giúp gì cho bạn? 🚀\n\n💡 Thử nói: "Máy lạnh không mát" hoặc "Tìm thợ gần đây"' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView() }, [messages])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const text = input.trim()
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }])

    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      // Gọi V4 Orchestrator → proxy đến ai-chat production
      const res = await fetch(`${supabaseUrl}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hanhDong: 'xu_ly_chat',
          noiDung: text,
          nguCanh: { session_id: sessionId },
        }),
      })
      const data = await res.json()
      const ketQua = data.ketQuaCuoi || {}

      // Update AI message
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: ketQua.reply || 'Xin lỗi, chưa hiểu.', actions: ketQua.actions || [] } : m))

      // Update session
      if (ketQua.session_id) setSessionId(ketQua.session_id)
      if (ketQua.order_id) setOrderId(ketQua.order_id)

      // Nếu hoàn thành đơn → redirect
      if (ketQua.session_complete) {
        setTimeout(() => {
          if (ketQua.order_id) router.push(`/customer/orders/${ketQua.order_id}`)
        }, 2000)
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Có lỗi xảy ra. Vui lòng thử lại.' } : m))
    }
    setLoading(false)
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-md' : 'bg-white border rounded-bl-md'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.actions?.map((a, i) => (
                <button key={i} onClick={() => a.type === 'confirmation_card' && sendMessage()}
                  className="mt-2 w-full py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600">
                  {a.type === 'confirmation_card' ? '✅ Xác nhận tạo đơn' : a.type === 'quote_card' ? '💰 Xem báo giá' : a.type === 'upsell_card' ? '💎 Tìm hiểu thêm' : '⚡ ' + (a.label || a.type)}
                </button>
              ))}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {['❄️ Máy lạnh hư', '🚿 Rò nước', '⚡ Mất điện', '🔧 Tìm thợ'].map(chip => (
            <button key={chip} onClick={() => setInput(chip)}
              className="px-3 py-1.5 bg-white border rounded-full text-xs text-gray-600 hover:border-blue-300">
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="border-t bg-white p-4">
        <div className="flex gap-2">
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
          <button onClick={sendMessage} disabled={loading || !input.trim()}
            className="px-5 py-3 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {loading ? '...' : 'Gửi'}
          </button>
        </div>
      </div>
    </div>
  )
}