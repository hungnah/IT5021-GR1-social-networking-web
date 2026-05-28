#!/usr/bin/env bash
set -euo pipefail

API="${API_BASE:-http://localhost:3011}"
TS=$(date +%s)
PASS='TestPass1!'
EMAIL_A="notif_a_${TS}@test.local"
EMAIL_B="notif_b_${TS}@test.local"

json() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1"; }

signup() {
  local last=$1 email=$2
  curl -sf -X POST "$API/auth/signup" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"User\",\"lastName\":\"$last\",\"email\":\"$email\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\"}"
}

login() {
  curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}"
}

echo "API: $API"
echo "=== 1. Đăng ký 2 user ==="
RES_A=$(signup A "$EMAIL_A") || RES_A=$(login "$EMAIL_A")
RES_B=$(signup B "$EMAIL_B") || RES_B=$(login "$EMAIL_B")
TOKEN_A=$(echo "$RES_A" | json '.accessToken')
TOKEN_B=$(echo "$RES_B" | json '.accessToken')
ID_A=$(curl -sf "$API/users/me" -H "Authorization: Bearer $TOKEN_A" | json '.id')
ID_B=$(curl -sf "$API/users/me" -H "Authorization: Bearer $TOKEN_B" | json '.id')
echo "User A: $ID_A | User B: $ID_B"

echo "=== 2. User A tạo bài viết ==="
POST_ID=$(curl -sf -X POST "$API/posts" -H "Authorization: Bearer $TOKEN_A" \
  -F "content=Bai test thong bao $TS" -F "privacyStatus=PUBLIC" | json '.id')
echo "Post: $POST_ID"

echo "=== 3–5. B follow, like, comment ==="
curl -sf -X POST "$API/users/$ID_A/follow" -H "Authorization: Bearer $TOKEN_B" > /dev/null
curl -sf -X POST "$API/posts/$POST_ID/reactions" -H "Authorization: Bearer $TOKEN_B" > /dev/null
curl -sf -X POST "$API/posts/$POST_ID/comments" -H "Authorization: Bearer $TOKEN_B" \
  -H 'Content-Type: application/json' -d '{"content":"Comment test"}' > /dev/null
sleep 0.5

echo "=== 6. unread-count (kỳ vọng >= 3) ==="
UNREAD=$(curl -sf "$API/notifications/unread-count" -H "Authorization: Bearer $TOKEN_A" | json '.count')
echo "unread: $UNREAD"
[ "$UNREAD" -ge 3 ] || { echo "FAIL: expected >= 3 unread"; exit 1; }

echo "=== 7. Danh sách thông báo ==="
curl -sf "$API/notifications?limit=30" -H "Authorization: Bearer $TOKEN_A" | node -e "
const list = JSON.parse(require('fs').readFileSync(0,'utf8'));
const types = list.map(n => n.type);
console.log('count:', list.length, '| types:', types.join(', '));
const need = ['FOLLOW','LIKE','COMMENT'];
for (const t of need) {
  if (!types.includes(t)) { console.error('FAIL: missing', t); process.exit(1); }
}
"

FIRST_ID=$(curl -sf "$API/notifications?limit=1" -H "Authorization: Bearer $TOKEN_A" | json '[0].id')

echo "=== 8. mark one read ==="
curl -sf -X PATCH "$API/notifications/$FIRST_ID/read" -H "Authorization: Bearer $TOKEN_A" > /dev/null
AFTER_ONE=$(curl -sf "$API/notifications/unread-count" -H "Authorization: Bearer $TOKEN_A" | json '.count')
echo "unread after one: $AFTER_ONE"
[ "$AFTER_ONE" -eq $((UNREAD - 1)) ] || { echo "FAIL: unread should be $((UNREAD-1))"; exit 1; }

echo "=== 9. mark all read ==="
curl -sf -X PATCH "$API/notifications/read-all" -H "Authorization: Bearer $TOKEN_A" > /dev/null
FINAL=$(curl -sf "$API/notifications/unread-count" -H "Authorization: Bearer $TOKEN_A" | json '.count')
echo "unread after all: $FINAL"
[ "$FINAL" -eq 0 ] || { echo "FAIL: expected 0 unread"; exit 1; }

echo "=== 10. Không thông báo khi tự like ==="
curl -sf -X POST "$API/posts/$POST_ID/reactions" -H "Authorization: Bearer $TOKEN_A" > /dev/null
SELF=$(curl -sf "$API/notifications/unread-count" -H "Authorization: Bearer $TOKEN_A" | json '.count')
[ "$SELF" -eq 0 ] || { echo "FAIL: self-like should not add notification"; exit 1; }

echo "=== 11. User B không đọc được TB của A ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$API/notifications/$FIRST_ID/read" -H "Authorization: Bearer $TOKEN_B")
echo "HTTP $CODE (kỳ vọng 404)"
[ "$CODE" = "404" ] || { echo "FAIL: expected 404"; exit 1; }

echo ""
echo "✅ Tất cả kiểm thử API thông báo đã PASS"
