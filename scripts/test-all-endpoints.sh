#!/bin/bash

BASE_URL="http://localhost:8000/api"
TOKEN_FILE="/tmp/test_token.txt"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get token using cookies
echo "Getting authentication token..."
COOKIE_JAR="/tmp/test_all_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}')

# Check if login was successful
SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}Failed to login: $LOGIN_RESPONSE${NC}"
  exit 1
fi

echo -e "${GREEN}Login successful, cookies stored${NC}"
echo ""

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local requires_auth=$4
  local description=$5
  
  echo -n "Testing $description... "
  
  local cookie_flag=""
  if [ "$requires_auth" = "true" ] && [ -f "$COOKIE_JAR" ]; then
    cookie_flag="-b $COOKIE_JAR"
  fi
  
  if [ "$method" = "GET" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X GET "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json")
  elif [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X POST "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "PUT" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X PUT "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json" \
      -d "$data")
  elif [ "$method" = "DELETE" ]; then
    response=$(curl -s -w "\n%{http_code}" $cookie_flag -X DELETE "${BASE_URL}${endpoint}" \
      -H "Content-Type: application/json")
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}✗${NC} (HTTP $http_code)"
    echo "  Response: $body" | head -c 200
    echo ""
    return 1
  fi
}

# Track results
PASSED=0
FAILED=0
FAILED_TESTS=()

echo "=========================================="
echo "Testing Department Endpoints"
echo "=========================================="
echo ""

# Department tests
DEPARTMENT_ID=""

test_endpoint "POST" "/departments" '{"name":"Test Department '$(date +%s)'","description":"Test Description"}' "false" "POST /department (create)"
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  DEPARTMENT_ID=$(curl -s -X GET "${BASE_URL}/departments" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /department")
fi

test_endpoint "GET" "/departments" "" "false" "GET /department (list all)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department"); }

if [ -n "$DEPARTMENT_ID" ]; then
  test_endpoint "GET" "/departments/${DEPARTMENT_ID}" "" "false" "GET /department/:id"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/:id"); }
  
  test_endpoint "PUT" "/departments/${DEPARTMENT_ID}" '{"name":"Updated Department"}' "true" "PUT /department/:id (update)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /department/:id"); }
  
  test_endpoint "GET" "/departments/${DEPARTMENT_ID}/teachers" "" "false" "GET /department/:id/teachers"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/:id/teachers"); }
  
  test_endpoint "GET" "/departments/${DEPARTMENT_ID}/statistics" "" "false" "GET /department/:id/statistics"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/:id/statistics"); }
fi

test_endpoint "GET" "/departments/most-teachers?limit=5" "" "false" "GET /department/most-teachers"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/most-teachers"); }

test_endpoint "GET" "/departments/performance" "" "false" "GET /department/performance"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/performance"); }

test_endpoint "GET" "/departments/most-students?limit=5" "" "false" "GET /department/most-students"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /department/most-students"); }

echo ""
echo "=========================================="
echo "Testing Product Endpoints"
echo "=========================================="
echo ""

# Product tests
PRODUCT_ID=""

test_endpoint "POST" "/products" '{"name":"Test Product '$(date +%s)'","price":99.99,"description":"Test Product Description"}' "false" "POST /product (create)"
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  PRODUCT_ID=$(curl -s -X GET "${BASE_URL}/products" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /product")
fi

test_endpoint "GET" "/products" "" "false" "GET /product (list all)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product"); }

test_endpoint "GET" "/products/search?name=Test" "" "false" "GET /product/search"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/search"); }

if [ -n "$PRODUCT_ID" ]; then
  test_endpoint "GET" "/products/${PRODUCT_ID}" "" "false" "GET /product/:id"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/:id"); }
  
  test_endpoint "PUT" "/products/${PRODUCT_ID}" '{"name":"Updated Product","price":149.99}' "false" "PUT /product/:id (update)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id"); }
  
  test_endpoint "DELETE" "/products/${PRODUCT_ID}" "" "false" "DELETE /product/:id"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /product/:id"); }
fi

echo ""
echo "=========================================="
echo "Testing Student Endpoints"
echo "=========================================="
echo ""

# Student tests
STUDENT_ID=""

test_endpoint "POST" "/students" '{"name":"Test Student '$(date +%s)'","email":"teststudent'$(date +%s)'@example.com"}' "false" "POST /student (create)"
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  STUDENT_ID=$(curl -s -X GET "${BASE_URL}/students" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /student")
fi

test_endpoint "GET" "/students" "" "false" "GET /student (list all)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student"); }

if [ -n "$STUDENT_ID" ]; then
  test_endpoint "GET" "/students/${STUDENT_ID}" "" "false" "GET /student/:id"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/:id"); }
  
  test_endpoint "PUT" "/students/${STUDENT_ID}" '{"name":"Updated Student"}' "true" "PUT /student/:id (update)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /student/:id"); }
  
  test_endpoint "GET" "/students/${STUDENT_ID}/courses" "" "false" "GET /student/:id/courses"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/:id/courses"); }
  
  test_endpoint "GET" "/students/${STUDENT_ID}/enrollments" "" "false" "GET /student/:id/enrollments"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/:id/enrollments"); }
  
  test_endpoint "GET" "/students/${STUDENT_ID}/gpa" "" "false" "GET /student/:id/gpa"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/:id/gpa"); }
  
  test_endpoint "GET" "/students/${STUDENT_ID}/available-courses" "" "false" "GET /student/:id/available-courses"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/:id/available-courses"); }
fi

test_endpoint "GET" "/students/top-performing?limit=5" "" "false" "GET /student/top-performing"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/top-performing"); }

test_endpoint "GET" "/students/enrolled/this-month" "" "false" "GET /student/enrolled/this-month"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /student/enrolled/this-month"); }

echo ""
echo "=========================================="
echo "Testing Teacher Endpoints"
echo "=========================================="
echo ""

# Teacher tests
TEACHER_ID=""

test_endpoint "POST" "/teachers" '{"name":"Test Teacher '$(date +%s)'","email":"testteacher'$(date +%s)'@example.com"}' "false" "POST /teacher (create)"
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  TEACHER_ID=$(curl -s -X GET "${BASE_URL}/teachers" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /teacher")
fi

test_endpoint "GET" "/teachers" "" "false" "GET /teacher (list all)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher"); }

if [ -n "$TEACHER_ID" ]; then
  test_endpoint "GET" "/teachers/${TEACHER_ID}" "" "false" "GET /teacher/:id"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/:id"); }
  
  test_endpoint "PUT" "/teachers/${TEACHER_ID}" '{"name":"Updated Teacher"}' "true" "PUT /teacher/:id (update)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/:id"); }
  
  test_endpoint "GET" "/teachers/${TEACHER_ID}/departments" "" "false" "GET /teacher/:id/departments"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/:id/departments"); }
  
  test_endpoint "GET" "/teachers/${TEACHER_ID}/courses" "" "false" "GET /teacher/:id/courses"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/:id/courses"); }
fi

test_endpoint "GET" "/teachers/most-courses?limit=5" "" "false" "GET /teacher/most-courses"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/most-courses"); }

test_endpoint "GET" "/teachers/performance" "" "false" "GET /teacher/performance"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/performance"); }

test_endpoint "GET" "/teachers/low-enrollment-courses?threshold=5" "" "false" "GET /teacher/low-enrollment-courses"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /teacher/low-enrollment-courses"); }

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  exit 1
else
  echo -e "${GREEN}All tests passed!${NC}"
  exit 0
fi
