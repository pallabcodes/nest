#!/bin/bash

BASE_URL="http://localhost:8000/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
PASSED=0
FAILED=0
FAILED_TESTS=()

# Test function
test_endpoint() {
  local method=$1
  local endpoint=$2
  local data=$3
  local description=$4
  local expected_code=${5:-200}
  local requires_auth=${6:-false}
  
  echo -n "Testing $description... "
  
  local cookie_flag=""
  if [ "$requires_auth" = "true" ] && [ -n "$COOKIE_JAR" ] && [ -f "$COOKIE_JAR" ]; then
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
  
  if [ "$http_code" -eq "$expected_code" ]; then
    echo -e "${GREEN}✓${NC} (HTTP $http_code)"
    return 0
  else
    echo -e "${RED}✗${NC} (HTTP $http_code, expected $expected_code)"
    echo -e "  ${YELLOW}Response:${NC} $(echo "$body" | head -c 300)"
    echo ""
    return 1
  fi
}

# Extract ID from response
extract_id() {
  local response=$1
  echo "$response" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', '') or data.get('id', ''))" 2>/dev/null
}

echo "=========================================="
echo "Testing Product Endpoints"
echo "=========================================="
echo ""

# Check if server is running
echo -n "Checking if server is running... "
if ! curl -s -f "${BASE_URL}/health" > /dev/null 2>&1; then
  echo -e "${RED}✗${NC}"
  echo -e "${RED}Error: Server is not running at ${BASE_URL}${NC}"
  echo "Please start the server with: npm run start:dev"
  exit 1
fi
echo -e "${GREEN}✓${NC}"
echo ""

# Setup authentication cookies for protected endpoints
echo -e "${YELLOW}Setting up authentication cookies...${NC}"
COOKIE_JAR="/tmp/test_product_endpoints_cookies.txt"
rm -f "$COOKIE_JAR"

LOGIN_RESPONSE=$(curl -s -c "$COOKIE_JAR" -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"demo123"}')

SUCCESS=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" != "True" ] && [ "$SUCCESS" != "true" ]; then
  echo -e "${YELLOW}⚠ Warning: Could not login. Protected endpoints (PUT/DELETE) will fail.${NC}"
  rm -f "$COOKIE_JAR"
  COOKIE_JAR=""
else
  echo -e "${GREEN}✓ Auth cookies setup successful${NC}"
fi
echo ""

# Store created product IDs for cleanup
CREATED_IDS=()

# ============================================
# 1. CREATE PRODUCT (POST /product)
# ============================================
echo -e "${BLUE}=== CREATE PRODUCT ===${NC}"

TIMESTAMP=$(date +%s)
PRODUCT_NAME="Test Product ${TIMESTAMP}"

# Test 1.1: Create product with all fields
test_endpoint "POST" "/products" "{\"name\":\"${PRODUCT_NAME}\",\"price\":99.99,\"description\":\"Test product description\",\"stock\":10,\"isActive\":true}" "POST /product (create with all fields)" 201
if [ $? -eq 0 ]; then
  PASSED=$((PASSED + 1))
  # Extract product ID
  CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/products" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"${PRODUCT_NAME}2\",\"price\":199.99,\"description\":\"Test\",\"stock\":5,\"isActive\":true}")
  PRODUCT_ID=$(extract_id "$CREATE_RESPONSE")
  if [ -n "$PRODUCT_ID" ]; then
    CREATED_IDS+=("$PRODUCT_ID")
  fi
else
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("POST /product (create with all fields)")
fi

# Test 1.2: Create product with minimal required fields
test_endpoint "POST" "/products" "{\"name\":\"Minimal Product ${TIMESTAMP}\",\"price\":49.99}" "POST /product (create with minimal fields)" 201
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /product (minimal fields)"); }

# Test 1.3: Create product with optional fields
test_endpoint "POST" "/products" "{\"name\":\"Optional Fields Product ${TIMESTAMP}\",\"price\":79.99,\"description\":\"Has optional fields\",\"stock\":20,\"isActive\":true,\"sellerId\":1}" "POST /product (create with optional fields)" 201
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /product (optional fields)"); }

# Test 1.4: Create product - validation error (missing name)
test_endpoint "POST" "/products" "{\"price\":99.99}" "POST /product (missing name - should fail)" 400
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /product (validation)"); }

# Test 1.5: Create product - validation error (missing price)
test_endpoint "POST" "/products" "{\"name\":\"Test Product\"}" "POST /product (missing price - should fail)" 400
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /product (validation)"); }

# Test 1.6: Create product - validation error (negative price)
test_endpoint "POST" "/products" "{\"name\":\"Test Product\",\"price\":-10}" "POST /product (negative price - should fail)" 400
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("POST /product (validation)"); }

echo ""

# ============================================
# 2. GET ALL PRODUCTS (GET /product)
# ============================================
echo -e "${BLUE}=== GET ALL PRODUCTS ===${NC}"

# Test 2.1: Get all products (default pagination)
test_endpoint "GET" "/products" "" "GET /product (list all - default)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (default)"); }

# Test 2.2: Get all products with pagination
test_endpoint "GET" "/products?page=1&limit=5" "" "GET /products (with pagination)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (pagination)"); }

# Test 2.3: Get all products with name filter
test_endpoint "GET" "/products?name=Test" "" "GET /products (filter by name)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (name filter)"); }

# Test 2.4: Get all products with price filters
test_endpoint "GET" "/products?minPrice=50&maxPrice=200" "" "GET /products (price range filter)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (price filter)"); }

# Test 2.5: Get all products with isActive filter
test_endpoint "GET" "/products?isActive=true" "" "GET /products (isActive filter)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (isActive filter)"); }

# Test 2.6: Get all products with sellerId filter
test_endpoint "GET" "/products?sellerId=1" "" "GET /products (sellerId filter)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (sellerId filter)"); }

# Test 2.7: Get all products with multiple filters
test_endpoint "GET" "/products?name=Test&minPrice=10&maxPrice=500&isActive=true&page=1&limit=10" "" "GET /products (multiple filters)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product (multiple filters)"); }

echo ""

# ============================================
# 3. SEARCH PRODUCTS (GET /product/search)
# ============================================
echo -e "${BLUE}=== SEARCH PRODUCTS ===${NC}"

# Test 3.1: Search products by name
test_endpoint "GET" "/products/search?name=Test" "" "GET /products/search (by name)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/search (name)"); }

# Test 3.2: Search products by price range
test_endpoint "GET" "/products/search?minPrice=50&maxPrice=200" "" "GET /products/search (price range)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/search (price)"); }

# Test 3.3: Search products with pagination
test_endpoint "GET" "/products/search?name=Test&page=1&limit=5" "" "GET /products/search (with pagination)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/search (pagination)"); }

# Test 3.4: Search products with all filters
test_endpoint "GET" "/products/search?name=Test&minPrice=10&maxPrice=500&page=1&limit=10" "" "GET /products/search (all filters)"
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/search (all filters)"); }

echo ""

# ============================================
# 4. GET PRODUCT BY ID (GET /product/:id)
# ============================================
echo -e "${BLUE}=== GET PRODUCT BY ID ===${NC}"

# First, get a product ID to test with
GET_ALL_RESPONSE=$(curl -s -X GET "${BASE_URL}/products?limit=1")
TEST_PRODUCT_ID=$(echo "$GET_ALL_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); items=data.get('data', {}).get('items', []); print(items[0]['id'] if items and len(items) > 0 and 'id' in items[0] else '')" 2>/dev/null)

if [ -z "$TEST_PRODUCT_ID" ]; then
  # Create a product if none exists
  CREATE_RESPONSE=$(curl -s -X POST "${BASE_URL}/products" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"Test Product for GET ${TIMESTAMP}\",\"price\":99.99}")
  TEST_PRODUCT_ID=$(extract_id "$CREATE_RESPONSE")
  if [ -n "$TEST_PRODUCT_ID" ]; then
    CREATED_IDS+=("$TEST_PRODUCT_ID")
  fi
fi

if [ -n "$TEST_PRODUCT_ID" ]; then
  # Test 4.1: Get product by valid ID
  test_endpoint "GET" "/products/${TEST_PRODUCT_ID}" "" "GET /products/:id (valid ID)"
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/:id (valid)"); }
else
  echo -e "${RED}✗${NC} Could not get/create a product ID for testing"
  FAILED=$((FAILED + 1))
  FAILED_TESTS+=("GET /product/:id (setup)")
fi

# Test 4.2: Get product by invalid ID (non-existent)
test_endpoint "GET" "/products/999999" "" "GET /products/:id (non-existent ID)" 404
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/:id (404)"); }

# Test 4.3: Get product by invalid ID format
test_endpoint "GET" "/products/invalid" "" "GET /products/:id (invalid format)" 400
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("GET /product/:id (invalid format)"); }

echo ""

# ============================================
# 5. UPDATE PRODUCT (PUT /product/:id)
# ============================================
echo -e "${BLUE}=== UPDATE PRODUCT ===${NC}"

if [ -n "$TEST_PRODUCT_ID" ]; then
  # Test 5.1: Update product with all fields
  test_endpoint "PUT" "/products/${TEST_PRODUCT_ID}" "{\"name\":\"Updated Product ${TIMESTAMP}\",\"price\":149.99,\"description\":\"Updated description\",\"stock\":25,\"isActive\":true}" "PUT /products/:id (update all fields)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id (all fields)"); }

  # Test 5.2: Update product with partial fields
  test_endpoint "PUT" "/products/${TEST_PRODUCT_ID}" "{\"name\":\"Partially Updated Product ${TIMESTAMP}\"}" "PUT /products/:id (partial update)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id (partial)"); }

  # Test 5.3: Update product price only
  test_endpoint "PUT" "/products/${TEST_PRODUCT_ID}" "{\"price\":199.99}" "PUT /products/:id (update price only)" 200 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id (price)"); }

  # Test 5.4: Update product - validation error (negative price)
  test_endpoint "PUT" "/products/${TEST_PRODUCT_ID}" "{\"price\":-10}" "PUT /products/:id (negative price - should fail)" 400 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id (validation)"); }
else
  echo -e "${RED}✗${NC} Skipping update tests - no product ID available"
  FAILED=$((FAILED + 4))
  FAILED_TESTS+=("PUT /product/:id (setup)")
fi

# Test 5.5: Update non-existent product
test_endpoint "PUT" "/products/999999" "{\"name\":\"Non-existent\"}" "PUT /products/:id (non-existent)" 404 true
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("PUT /product/:id (404)"); }

echo ""

# ============================================
# 6. DELETE PRODUCT (DELETE /product/:id)
# ============================================
echo -e "${BLUE}=== DELETE PRODUCT ===${NC}"

# Create a product specifically for deletion
DELETE_PRODUCT_RESPONSE=$(curl -s -X POST "${BASE_URL}/products" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Product to Delete ${TIMESTAMP}\",\"price\":99.99}")
DELETE_PRODUCT_ID=$(extract_id "$DELETE_PRODUCT_RESPONSE")

if [ -n "$DELETE_PRODUCT_ID" ]; then
  # Test 6.1: Delete product by valid ID
  test_endpoint "DELETE" "/products/${DELETE_PRODUCT_ID}" "" "DELETE /products/:id (valid ID)" 204 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /product/:id (valid)"); }

  # Test 6.2: Try to delete already deleted product
  test_endpoint "DELETE" "/products/${DELETE_PRODUCT_ID}" "" "DELETE /products/:id (already deleted)" 404 true
  [ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /product/:id (404)"); }
else
  echo -e "${RED}✗${NC} Could not create product for deletion test"
  FAILED=$((FAILED + 2))
  FAILED_TESTS+=("DELETE /product/:id (setup)")
fi

# Test 6.3: Delete non-existent product
test_endpoint "DELETE" "/products/999999" "" "DELETE /products/:id (non-existent)" 404 true
[ $? -eq 0 ] && PASSED=$((PASSED + 1)) || { FAILED=$((FAILED + 1)); FAILED_TESTS+=("DELETE /product/:id (404)"); }

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -gt 0 ]; then
  echo -e "${RED}Failed Tests:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  - $test"
  done
  echo ""
  exit 1
else
  echo -e "${GREEN}All tests passed! ✓${NC}"
  echo ""
  exit 0
fi

