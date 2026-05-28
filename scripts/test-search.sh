#!/usr/bin/env bash
set -euo pipefail

API="${API_BASE:-http://localhost:3011}"
TS=$(date +%s)
PASS='TestPass1!'
UNIQUE="SearchTest${TS}"
EMAIL_A="search_a_${TS}@test.local"
EMAIL_B="search_b_${TS}@test.local"

json() { node -pe "JSON.parse(require('fs').readFileSync(0,'utf8'))$1"; }

signup() {
  curl -sf -X POST "$API/auth/signup" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"Alice\",\"lastName\":\"$UNIQUE\",\"email\":\"$1\",\"password\":\"$PASS\",\"confirmPassword\":\"$PASS\"}"
}

login() {
  curl -sf -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$PASS\"}"
}

echo "API: $API"
echo "=== 1. Tạo 2 user ==="
RES_A=$(signup "$EMAIL_A") || RES_A=$(login "$EMAIL_A")
RES_B=$(signup "$EMAIL_B") || RES_B=$(login "$EMAIL_B")
TOKEN_A=$(echo "$RES_A" | json '.accessToken')
TOKEN_B=$(echo "$RES_B" | json '.accessToken')
ID_A=$(echo "$RES_A" | json '.user.id')
ID_B=$(echo "$RES_B" | json '.user.id')
echo "A=$ID_A B=$ID_B"

echo "=== 2. A đăng bài công khai có từ khóa $UNIQUE ==="
curl -sf -X POST "$API/posts" -H "Authorization: Bearer $TOKEN_A" \
  -F "content=Hello $UNIQUE world public post" -F "privacyStatus=PUBLIC" > /dev/null

echo "=== 3. q rỗng → users/posts rỗng ==="
EMPTY=$(curl -sf "$API/search?q=" -H "Authorization: Bearer $TOKEN_B")
echo "$EMPTY" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
if (d.users.length !== 0 || d.posts.length !== 0) { console.error('FAIL empty'); process.exit(1); }
console.log('OK empty query');
"

echo "=== 4. q 1 ký tự → HTTP 400 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/search?q=a" -H "Authorization: Bearer $TOKEN_B")
[ "$CODE" = "400" ] || { echo "FAIL: expected 400, got $CODE"; exit 1; }
echo "OK 1-char → 400"

echo "=== 5. Không token → 401 ==="
CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API/search?q=$UNIQUE")
[ "$CODE" = "401" ] || { echo "FAIL: expected 401, got $CODE"; exit 1; }
echo "OK no auth → 401"

echo "=== 6. Tìm user theo tên (B tìm Alice $UNIQUE) ==="
USERS=$(curl -sf "$API/search?q=${UNIQUE}&limit=15" -H "Authorization: Bearer $TOKEN_B")
echo "$USERS" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
const ids = d.users.map(u => u.id);
const hasAlice = d.users.some(u => (u.displayName||'').includes('$UNIQUE'));
const excludesSelf = !ids.includes('$ID_B');
if (!hasAlice) { console.error('FAIL: user not found', d.users); process.exit(1); }
if (!excludesSelf) { console.error('FAIL: should exclude current user'); process.exit(1); }
console.log('OK users:', d.users.length, 'found Alice');
"

echo "=== 7. Tìm bài theo nội dung ==="
echo "$USERS" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
const hit = d.posts.some(p => (p.content||'').includes('$UNIQUE'));
if (!hit) { console.error('FAIL: post not found', d.posts); process.exit(1); }
console.log('OK posts:', d.posts.length);
"

echo "=== 8. Tìm theo email ==="
EMAIL_PART="search_a_${TS}"
BY_EMAIL=$(curl -sf "$API/search?q=${EMAIL_PART}&limit=5" -H "Authorization: Bearer $TOKEN_B")
echo "$BY_EMAIL" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
if (!d.users.some(u => u.email === '$EMAIL_A')) {
  console.error('FAIL: email search', d.users); process.exit(1);
}
console.log('OK email search');
"

echo "=== 9. Không có kết quả ==="
NONE=$(curl -sf "$API/search?q=zzzznomatch99999&limit=5" -H "Authorization: Bearer $TOKEN_B")
echo "$NONE" | node -e "
const d = JSON.parse(require('fs').readFileSync(0,'utf8'));
if (d.users.length !== 0 || d.posts.length !== 0) { console.error('FAIL'); process.exit(1); }
console.log('OK no results');
"

echo ""
echo "✅ Tất cả kiểm thử API tìm kiếm đã PASS"
