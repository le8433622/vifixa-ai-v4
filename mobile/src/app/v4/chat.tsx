// 💬 V4 CHAT Mobile — Order flow + upsell + tracking
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { useState, useEffect, useRef } from 'react'

export default function V4ChatMobile() {
  const router = useRouter()
  const [messages, setMessages] = useState<any[]>([
    { id: 'welcome', role: 'assistant', content: 'Xin chào! Tôi là AI Vifixa.\n\n💡 Thử: "Máy lạnh không mát"' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [orders, setOrders] = useState<any[]>([])
  const flatRef = useRef<FlatList>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/login'); return }
      supabase.from('orders').select('id, category, status').eq('customer_id', session.user.id).order('created_at', { ascending: false }).limit(5)
        .then(({ data }) => setOrders(data || []))
    })
  }, [])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const text = input.trim(); setInput(''); setLoading(true)
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: 'user', content: text }])
    const aiId = `ai-${Date.now()}`
    setMessages(prev => [...prev, { id: aiId, role: 'assistant', content: '...' }])

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/v4-orchestrator`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ hanhDong: 'xu_ly_chat', noiDung: text, nguCanh: { session_id: sessionId } }),
      })
      const data = await res.json()
      const r = data.ketQuaCuoi || {}
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: r.reply || 'Xin lỗi, chưa hiểu.', actions: r.actions || [] } : m))
      if (r.session_id) setSessionId(r.session_id)
      if (r.session_complete && r.order_id) setTimeout(() => router.push(`/customer/orders/${r.order_id}` as any), 1500)
    } catch {
      setMessages(prev => prev.map(m => m.id === aiId ? { ...m, content: '⚠️ Lỗi. Thử lại.' } : m))
    }
    setLoading(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#f9fafb' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {orders.length > 0 && (
        <View style={{ flexDirection: 'row', padding: 8, backgroundColor: '#eff6ff', gap: 6 }}>
          {orders.slice(0, 3).map(o => (
            <TouchableOpacity key={o.id} onPress={() => router.push(`/customer/orders/${o.id}` as any)}
              style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'white', borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 11, color: '#374151' }}>📋 {o.category}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList ref={flatRef} data={messages} keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
        onContentSizeChange={() => flatRef.current?.scrollToEnd()}
        renderItem={({ item }) => (
          <View style={{ maxWidth: '80%', padding: 12, borderRadius: 16, marginBottom: 8, alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start', backgroundColor: item.role === 'user' ? '#2563eb' : 'white', borderWidth: item.role === 'user' ? 0 : 1, borderColor: '#e5e7eb', borderBottomRightRadius: item.role === 'user' ? 4 : 16, borderBottomLeftRadius: item.role === 'user' ? 16 : 4 }}>
            <Text style={{ fontSize: 14, color: item.role === 'user' ? 'white' : '#111827' }}>{item.content}</Text>
            {item.actions?.map((a: any, i: number) => (
              <TouchableOpacity key={i} onPress={sendMessage}
                style={{ marginTop: 8, paddingVertical: 8, backgroundColor: a.type === 'confirmation_card' ? '#059669' : '#2563eb', borderRadius: 8, alignItems: 'center' }}>
                <Text style={{ color: 'white', fontSize: 12, fontWeight: '600' }}>
                  {a.type === 'confirmation_card' ? '✅ Xác nhận' : a.type === 'upsell_card' ? '💎 Tìm hiểu' : '⚡ ' + (a.label || a.type)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        ListFooterComponent={loading ? <ActivityIndicator size="small" color="#2563eb" /> : null}
      />

      {messages.length <= 2 && (
        <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 4, gap: 6 }}>
          {['❄️ Máy lạnh', '🚿 Rò nước', '⚡ Mất điện'].map(chip => (
            <TouchableOpacity key={chip} onPress={() => setInput(chip)} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: 'white', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Text style={{ fontSize: 12, color: '#6b7280' }}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', padding: 12, gap: 8, backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#e5e7eb' }}>
        <TextInput value={input} onChangeText={setInput} placeholder="Mô tả sự cố..." style={{ flex: 1, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14 }}
          onSubmitEditing={sendMessage} returnKeyType="send" />
        <TouchableOpacity onPress={sendMessage} disabled={loading || !input.trim()} style={{ backgroundColor: '#2563eb', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center', opacity: (loading || !input.trim()) ? 0.5 : 1 }}>
          <Text style={{ color: 'white', fontWeight: '600' }}>Gửi</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}