#!/usr/bin/env bash
# Quick API smoke tests for No Distractions (run while the dev stack is up).
# Usage: bash scripts/api-test.sh

set -uo pipefail
API=http://localhost:4000/api
PASS=0
FAIL=0
SUFFIX=$RANDOM$RANDOM   # unique per run so the script is re-runnable
EMAIL="student$SUFFIX@example.com"
EMAIL_B="other$SUFFIX@example.com"

check() { # check <name> <expected_status> <actual_status> <body>
  if [ "$2" = "$3" ]; then
    PASS=$((PASS + 1))
    echo "PASS  $1 -> $3"
  else
    FAIL=$((FAIL + 1))
    echo "FAIL  $1 -> got $3, expected $2"
    echo "      body: $4"
  fi
}

req() { # req <method> <path> [json_body] [token] -> sets STATUS and BODY
  local method=$1 path=$2 body=${3:-} token=${4:-}
  if [ -n "$body" ] && [ -n "$token" ]; then
    BODY=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" -H 'Content-Type: application/json' -H "Authorization: Bearer $token" -d "$body")
  elif [ -n "$body" ]; then
    BODY=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" -H 'Content-Type: application/json' -d "$body")
  elif [ -n "$token" ]; then
    BODY=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path" -H "Authorization: Bearer $token")
  else
    BODY=$(curl -s -w "\n%{http_code}" -X "$method" "$API$path")
  fi
  STATUS=$(echo "$BODY" | tail -1)
  BODY=$(echo "$BODY" | sed '$d')
}

echo "== auth =="
req POST /auth/signup '{"name":"A","email":"not-an-email","password":"short"}'
check "signup validation rejects bad input" 400 "$STATUS" "$BODY"

req POST /auth/signup "{\"name\":\"Test Student\",\"email\":\"$EMAIL\",\"password\":\"password123\"}"
check "signup succeeds" 201 "$STATUS" "$BODY"
TOKEN=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token||''))")

req POST /auth/signup "{\"name\":\"Test Student\",\"email\":\"$EMAIL\",\"password\":\"password123\"}"
check "duplicate email rejected" 409 "$STATUS" "$BODY"

req POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"wrongpassword\"}"
check "login with wrong password rejected" 401 "$STATUS" "$BODY"

req POST /auth/login "{\"email\":\"$EMAIL\",\"password\":\"password123\"}"
check "login succeeds" 200 "$STATUS" "$BODY"
TOKEN=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token||''))")

req GET /auth/me '' "$TOKEN"
check "auth/me with token" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q passwordHash && echo "FAIL  passwordHash leaked in /me" && FAIL=$((FAIL+1)) || { echo "PASS  no passwordHash in /me"; PASS=$((PASS+1)); }

req GET /auth/me
check "auth/me without token rejected" 401 "$STATUS" "$BODY"

echo
echo "== library =="
req POST /library '{"videoId":"https://vimeo.com/12345"}' "$TOKEN"
check "library rejects non-YouTube input" 400 "$STATUS" "$BODY"

req POST /library '{"videoId":"aaaaaaaaaaa"}' "$TOKEN"
check "library rejects nonexistent video" 404 "$STATUS" "$BODY"

req POST /library '{"videoId":"aircAruvnKk"}' "$TOKEN"
check "library saves a real video" 201 "$STATUS" "$BODY"
ITEM=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).item.id||''))")
echo "$BODY" | grep -q '"title":"But what is a neural network' && { echo "PASS  metadata fetched from oEmbed"; PASS=$((PASS+1)); } || { echo "FAIL  metadata missing"; FAIL=$((FAIL+1)); }

req POST /library '{"videoId":"https://www.youtube.com/watch?v=aircAruvnKk"}' "$TOKEN"
check "saving the same video twice is idempotent" 200 "$STATUS" "$BODY"

req POST /library '{"videoId":"jNQXAC9IVRw"}' "$TOKEN"
check "library saves a second video" 201 "$STATUS" "$BODY"
ITEM2=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).item.id||''))")

req PATCH "/library/$ITEM/progress" '{"positionSec":120,"durationSec":1140}' "$TOKEN"
check "progress update works" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q '"progressPercent":11' && { echo "PASS  progressPercent computed"; PASS=$((PASS+1)); } || { echo "FAIL  progressPercent wrong: $BODY"; FAIL=$((FAIL+1)); }

req PATCH "/library/$ITEM/progress" '{"positionSec":1130}' "$TOKEN"
check "progress auto-completes at >=95%" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q '"completed":true' && { echo "PASS  auto-complete works"; PASS=$((PASS+1)); } || { echo "FAIL  not completed"; FAIL=$((FAIL+1)); }

req GET /library '' "$TOKEN"
check "library list works" 200 "$STATUS" "$BODY"

req GET /library
check "library without auth rejected" 401 "$STATUS" "$BODY"

echo
echo "== playlists =="
req POST /playlists '{"title":""}' "$TOKEN"
check "playlist requires a title" 400 "$STATUS" "$BODY"

req POST /playlists '{"title":"Neural Networks","description":"Deep learning basics"}' "$TOKEN"
check "playlist created" 201 "$STATUS" "$BODY"
PLAYLIST=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).playlist.id||''))")

req POST "/playlists/$PLAYLIST/items" "{\"libraryItemId\":\"$ITEM\"}" "$TOKEN"
check "add video to playlist" 201 "$STATUS" "$BODY"

req POST "/playlists/$PLAYLIST/items" "{\"libraryItemId\":\"$ITEM\"}" "$TOKEN"
check "duplicate playlist entry is idempotent" 200 "$STATUS" "$BODY"

req GET "/playlists/$PLAYLIST" '' "$TOKEN"
check "playlist detail populated" 200 "$STATUS" "$BODY"
ENTRY=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const p=JSON.parse(d).playlist;console.log(p.items[0]?.id||'')})")
echo "$BODY" | grep -q '"completedCount":1' && { echo "PASS  playlist progress counts completed videos"; PASS=$((PASS+1)); } || { echo "FAIL  completedCount wrong"; FAIL=$((FAIL+1)); }

req GET /playlists '' "$TOKEN"
check "playlist list works" 200 "$STATUS" "$BODY"

req DELETE "/playlists/$PLAYLIST/items/$ENTRY" '' "$TOKEN"
check "remove video from playlist" 200 "$STATUS" "$BODY"

req POST "/playlists/$PLAYLIST/items" "{\"libraryItemId\":\"$ITEM\"}" "$TOKEN" > /dev/null
req POST "/playlists/$PLAYLIST/items" "{\"libraryItemId\":\"$ITEM2\"}" "$TOKEN" > /dev/null

echo
echo "== notes =="
req GET "/notes?videoId=aircAruvnKk" '' "$TOKEN"
check "empty notes list works" 200 "$STATUS" "$BODY"

req POST /notes '{"videoId":"aircAruvnKk","text":"Great intro to perceptrons","timestampSec":145}' "$TOKEN"
check "note created" 201 "$STATUS" "$BODY"
NOTE=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).note.id||''))")

req POST /notes '{"videoId":"aircAruvnKk","text":""}' "$TOKEN"
check "empty note rejected" 400 "$STATUS" "$BODY"

req PATCH "/notes/$NOTE" '{"text":"Updated: great intro"}' "$TOKEN"
check "note edit works" 200 "$STATUS" "$BODY"

req GET "/notes?videoId=aircAruvnKk" '' "$TOKEN"
check "notes list has the note" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q '"text":"Updated: great intro"' && { echo "PASS  edited note returned"; PASS=$((PASS+1)); } || { echo "FAIL  edited note missing"; FAIL=$((FAIL+1)); }

echo
echo "== ownership isolation (user B) =="
req POST /auth/signup "{\"name\":\"Other User\",\"email\":\"$EMAIL_B\",\"password\":\"password123\"}"
check "user B signup" 201 "$STATUS" "$BODY"
TOKEN_B=$(echo "$BODY" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).token||''))")

req GET /library '' "$TOKEN_B"
check "user B sees an empty library" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q '"items":\[\]' && { echo "PASS  no data leak in library list"; PASS=$((PASS+1)); } || { echo "FAIL  user A items leaked"; FAIL=$((FAIL+1)); }

req DELETE "/library/$ITEM" '' "$TOKEN_B"
check "user B cannot delete user A's library item" 404 "$STATUS" "$BODY"

req GET "/playlists/$PLAYLIST" '' "$TOKEN_B"
check "user B cannot read user A's playlist" 404 "$STATUS" "$BODY"

req PATCH "/notes/$NOTE" '{"text":"hijacked"}' "$TOKEN_B"
check "user B cannot edit user A's note" 404 "$STATUS" "$BODY"

req GET "/notes?videoId=aircAruvnKk" '' "$TOKEN_B"
check "user B sees no notes for the video" 200 "$STATUS" "$BODY"
echo "$BODY" | grep -q '"notes":\[\]' && { echo "PASS  no note leak"; PASS=$((PASS+1)); } || { echo "FAIL  notes leaked"; FAIL=$((FAIL+1)); }

echo
echo "== cleanup =="
req DELETE "/library/$ITEM" '' "$TOKEN"
check "remove video from library" 200 "$STATUS" "$BODY"
req GET "/playlists/$PLAYLIST" '' "$TOKEN"
check "playlist survives with remaining video" 200 "$STATUS" "$BODY"
req DELETE "/playlists/$PLAYLIST" '' "$TOKEN"
check "delete playlist" 200 "$STATUS" "$BODY"

echo
echo "Passed: $PASS  Failed: $FAIL"
[ "$FAIL" = "0" ]
