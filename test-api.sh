#!/usr/bin/env bash
# Run with the server already started:  node server.js   (then in another terminal)  bash test-api.sh
B=${BASE:-http://localhost:3000}
J='Content-Type: application/json'
code() { curl -s -o /dev/null -w '%{http_code}' "$@"; }
tok()  { curl -s -X POST "$B/login" -H "$J" -d "{\"email\":\"$1\",\"password\":\"$2\"}" | sed -E 's/.*"token":"([^"]+)".*/\1/'; }
check() { [ "$2" = "$3" ] && echo "PASS  $1 -> $2" || echo "FAIL  $1 -> got $2, expected $3"; }

CUST=$(tok asha@campus.edu customer123)
RESTO=$(tok mealhub@campus.edu resto123)

check "1  GET /items, no token"            "$(code $B/items)" 401
check "2  login with wrong password"       "$(code -X POST $B/login -H "$J" -d '{"email":"asha@campus.edu","password":"nope"}')" 401
check "3  GET /items, customer token"      "$(code $B/items -H "Authorization: Bearer $CUST")" 200
check "4  POST /items, restaurant token"   "$(code -X POST $B/items -H "Authorization: Bearer $RESTO" -H "$J" -d '{"name":"Masala Dosa","price":60}')" 201
check "5  POST /items, customer token"     "$(code -X POST $B/items -H "Authorization: Bearer $CUST" -H "$J" -d '{"name":"Hack Burger","price":99}')" 403
check "6  POST /items, no name (422)"      "$(code -X POST $B/items -H "Authorization: Bearer $RESTO" -H "$J" -d '{"price":10}')" 422
check "7  DELETE /items/1, customer"       "$(code -X DELETE $B/items/1 -H "Authorization: Bearer $CUST")" 403
check "8  DELETE /items/1, restaurant"     "$(code -X DELETE $B/items/1 -H "Authorization: Bearer $RESTO")" 204
check "9  GET /items/999 (404)"            "$(code $B/items/999 -H "Authorization: Bearer $RESTO")" 404
check "10 tampered token"                  "$(code $B/items -H "Authorization: Bearer ${RESTO}x")" 401
