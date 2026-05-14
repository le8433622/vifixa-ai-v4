# 🏗️ V4 Migration Plan — Từng bước chuyển đổi

## Nguyên tắc
1. **Song song**: Production cũ + V4 mới chạy cùng lúc
2. **Từng module**: Mỗi phase thay thế 1 module, verify rồi mới phase tiếp
3. **Zero downtime**: Không tắt production cũ khi chưa có V4 thay thế

---

## Phase 1: 🧠 AI Core (5 super-agents) ✅ DONE

| Tác vụ | File | Trạng thái |
|--------|------|------------|
| v4-core — shared types | `supabase/functions/v4-core/index.ts` | ✅ Deployed |
| v4-orchestrator — điều phối | `supabase/functions/v4-orchestrator/index.ts` | ✅ Deployed |
| v4-navigator — bản đồ | `supabase/functions/v4-navigator/index.ts` | ✅ Deployed |
| v4-monetizer — tiền | `supabase/functions/v4-monetizer/index.ts` | ✅ Deployed |
| v4-humanizer — tương tác | `supabase/functions/v4-humanizer/index.ts` | ✅ Deployed |

---

## Phase 2: 💬 Chat Module (thay thế ai-chat cũ)

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 2.1 | Phân tích ai-chat cũ (15 files) | `supabase/functions/ai-chat/*` | — | 30 phút |
| 2.2 | Xây dựng V4 Chat với session management | — | `supabase/functions/v4-orchestrator` (mở rộng) | 2h |
| 2.3 | Thêm state machine vào V4 Chat | — | `v4-orchestrator` | 1h |
| 2.4 | Tích hợp slot extraction (Vietnam NLP) | `ai-chat/slot-extractor.ts` | `v4-core` | 1h |
| 2.5 | Tích hợp action cards + upsell | `ai-chat/action-builder.ts` | `v4-orchestrator` | 1h |
| 2.6 | Test V4 Chat vs ai-chat cũ | — | — | 30 phút |

**Kết quả**: V4 Chat = tính năng tương đương ai-chat cũ.

---

## Phase 3: 🗺️ Map Module (thay thế admin-dashboard + customer map)

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 3.1 | Phân tích admin-dashboard + customer map | `web/src/app/admin/page.tsx` + `web/src/app/customer/map/` | — | 30 phút |
| 3.2 | V4 MAP: thêm worker markers + order markers | `web/src/app/v4/page.tsx` | Mở rộng | 1h |
| 3.3 | V4 MAP: thêm bộ lọc (thợ/đơn/nhu cầu) | — | `v4/page.tsx` | 1h |
| 3.4 | V4 MAP: tích hợp v4-navigator (tim_gan_day) | — | `v4-navigator` | 1h |
| 3.5 | V4 MAP: test với production data | — | — | 30 phút |

**Kết quả**: V4 MAP = thay thế admin dashboard + customer map.

---

## Phase 4: 📊 Dashboard Module (thay thế admin AI pages)

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 4.1 | Phân tích 13 admin AI pages | `web/src/app/admin/ai/*` | — | 30 phút |
| 4.2 | V4 Dashboard: thêm AI cost + accuracy | `admin/ai/cost` + `admin/ai/accuracy` | `v4/dashboard/page.tsx` | 1h |
| 4.3 | V4 Dashboard: thêm AI monitor | `admin/ai/monitor` | `v4/dashboard` | 1h |
| 4.4 | V4 Dashboard: thêm heatmap | `admin/ai/heatmap` | `v4/dashboard` | 1h |
| 4.5 | V4 Dashboard: thêm health check | `admin/ai/health` | `v4/dashboard` | 30 phút |

**Kết quả**: V4 Dashboard = tổng hợp 13 admin AI pages.

---

## Phase 5: 👤 Customer Module (thay thế 12 customer pages)

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 5.1 | V4 Chat: thêm order flow (tạo đơn, theo dõi) | `customer/chat/` + `customer/orders/` | `v4/chat` | 2h |
| 5.2 | V4 MAP: thêm "thợ gần bạn" | `customer/map/` | `v4/page.tsx` | 1h |
| 5.3 | V4 Dashboard: thêm order status + review | `customer/orders/` + `customer/review/` | `v4/dashboard` | 1h |
| 5.4 | Xóa customer page cũ khi V4 hoàn chỉnh | — | — | 30 phút |

---

## Phase 6: 🛠️ Worker Module (thay thế 10 worker pages)

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 6.1 | V4 MAP: thêm "đơn gần thợ" | `worker/jobs/` | `v4/page.tsx` | 1h |
| 6.2 | V4 Chat: thêm AI Coach | `worker/coach/` | `v4/chat` | 1h |
| 6.3 | V4 Dashboard: thêm earnings chart | `worker/earnings/` | `v4/dashboard` | 1h |
| 6.4 | V4 Dashboard: thêm route optimization | `worker/map/optimize/` | `v4/dashboard` | 1h |

---

## Phase 7: 📱 Mobile Migration

| # | Tác vụ | File cũ | File V4 | Thời gian |
|---|--------|---------|---------|-----------|
| 7.1 | Đồng bộ V4 Chat mobile | `(customer)/chat.tsx` | `v4/chat.tsx` | 2h |
| 7.2 | Đồng bộ V4 MAP mobile | `(customer)/map.tsx` | `v4/page.tsx` | 2h |
| 7.3 | Đồng bộ V4 Dashboard mobile | `(admin)/ai/*` | `v4/dashboard.tsx` | 2h |

---

## Phase 8: 🧪 Testing + Cleanup

| # | Tác vụ | Thời gian |
|---|--------|-----------|
| 8.1 | Test toàn bộ V4 flow (login → chat → order → track) | 2h |
| 8.2 | So sánh V4 vs production cũ (tính năng) | 1h |
| 8.3 | Xóa production cũ khi V4 đã thay thế toàn bộ | 30 phút |
| 8.4 | Deploy production V4 chính thức | 1h |

---

## Timeline

```
Phase 1: ✅ Hoàn thành (5 super-agents)
Phase 2: 📅 4h — Chat Module
Phase 3: 📅 4h — Map Module
Phase 4: 📅 4h — Dashboard Module
Phase 5: 📅 5h — Customer Module
Phase 6: 📅 4h — Worker Module
Phase 7: 📅 6h — Mobile
Phase 8: 📅 4h — Testing + Cleanup

Tổng: ~31h dev time
```
