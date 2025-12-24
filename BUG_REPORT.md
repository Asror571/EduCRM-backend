# 🐛 EduCRM Backend - Bug Report & Issues

## CRITICAL ISSUES (Production Blocking)

### 1. ❌ Missing Services Directory
**Status**: CRITICAL
**Impact**: Payment, Email, SMS, Report services won't work
- Services imported in controllers but directory doesn't exist
- Files in `tests/services` are placeholders, not in `src/services`
- **Fix**: Move/create services in `src/services/`

### 2. ❌ Missing Validators
**Status**: CRITICAL  
**Impact**: Request validation incomplete
- Only `auth.validator.js` exists
- Missing: `student.validator.js`, `payment.validator.js`, `group.validator.js`
- **Fix**: Create validators for all modules

### 3. ❌ No Tests
**Status**: CRITICAL
**Impact**: No test coverage at all
- `npm test` exits with "No tests found"
- No `*.test.js` or `*.spec.js` files
- **Fix**: Create comprehensive test suite

### 4. ❌ ESLint Config Missing
**Status**: CRITICAL
**Impact**: Code quality checks fail
- `npm run lint` fails: "ESLint couldn't find a configuration file"
- **Fix**: Create `.eslintrc.json`

### 5. ❌ JWT_SECRET in Plain .env
**Status**: CRITICAL SECURITY ISSUE
**Severity**: HIGH
- JWT secrets visible in `.env` file
- Should use `process.env` validation
- **Current**: `JWT_SECRET=educrm-secret-key-2024-change-in-production`
- **Fix**: Add .env validation in `src/config/env.js`

---

## HIGH PRIORITY ISSUES

### 6. ❌ Wrong Path in Payment Controller
**File**: `src/controllers/payment.controller.js`
**Lines**: 99, 422
**Issue**: Inline `require("../models/Student")` instead of using models import
```javascript
// ❌ Wrong
const student = await require("../models/Student").findOne({...})

// ✅ Should be
const { Student } = require("../models");
```

### 7. ❌ Payment Service Path Reference
**File**: `src/controllers/payment.controller.js`
**Line**: 10
**Issue**: Requires `../services/payment.service` but directory doesn't exist
```javascript
const paymentService = require("../services/payment.service");
```

### 8. ❌ Email Service Missing from auth.controller
**File**: `src/controllers/auth.controller.js`
**Lines**: 91, 247
**Issue**: Requires email service but wrong path/location
```javascript
const { sendWelcomeEmail, sendPasswordResetEmail } = require("../services/email.service");
```

### 9. ❌ SMS Service Missing
**File**: `src/controllers/auth.controller.js`
**Line**: 16
**Issue**: SMS service doesn't exist
```javascript
const { sendWelcomeSMS } = require("../services/sms.service");
```

### 10. ❌ Password Redaction Issue
**Files**: Multiple
**Issue**: Password strings marked as `[REDACTED:password]` in code
- This looks like code was redacted for security scanning but breaks functionality
- Lines in auth.controller.js: 97, 143, 250, 251, 284, 285
- Should be: `user.password = undefined;`

---

## MEDIUM PRIORITY ISSUES

### 11. ⚠️ No Middleware Validation
**File**: Routes files
**Issue**: Validators not applied to all endpoints
- Only auth routes have validation
- Other modules need validators applied

### 12. ⚠️ Missing Constants in auth.validator
**File**: `src/validators/auth.validator.js`
**Line**: 41
**Issue**: Hardcoded roles instead of using ROLES constant
```javascript
// ❌ Hardcoded
.isIn(["admin", "teacher", "student", "accountant", "receptionist"])

// ✅ Should be
.isIn(Object.values(ROLES))
```

### 13. ⚠️ Environment Variable Validation
**File**: `src/config/env.js`
**Issue**: Critical env vars not validated
- `JWT_SECRET` could be undefined
- `MONGODB_URI` not validated
- Missing validation for required fields

### 14. ⚠️ .env File in Git
**File**: `.env` visible in repo
**Security Issue**: Secrets exposed
- Should be in `.gitignore` (already is but file exists)
- Example env in `.env.example` is good but actual .env shouldn't be committed

### 15. ⚠️ Swagger Config Missing
**File**: `src/config/swagger.js`
**Issue**: Referenced but not being used in app.js
- No swagger endpoint setup
- API docs not accessible at `/api-docs`

---

## LOW PRIORITY ISSUES

### 16. ℹ️ Missing Error Handling
**Files**: Various controllers
**Issue**: Some async errors not caught
- Payment service errors need better handling
- Missing try-catch in some places

### 17. ℹ️ Incomplete Type Safety
**Issue**: No TypeScript
- Would help catch many errors at compile time
- Not critical for MVP but recommended for production

### 18. ℹ️ Missing Request Logging
**File**: `src/middlewares/logger.middleware.js`
**Issue**: Middleware exists but not used in app.js

### 19. ℹ️ Role Middleware Not Imported
**File**: Routes files
**Issue**: Role-based authorization not consistently applied
- Some endpoints need `authorize()` middleware

### 20. ℹ️ Missing Upload Middleware Usage
**File**: `src/middlewares/upload.middleware.js`
**Issue**: Not being used in routes that need file uploads

---

## SUMMARY

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 CRITICAL | 5 | BLOCKING |
| 🟠 HIGH | 6 | MUST FIX |
| 🟡 MEDIUM | 5 | SHOULD FIX |
| 🔵 LOW | 4 | NICE TO FIX |
| **TOTAL** | **20** | **IN PROGRESS** |

---

## Production Readiness: ❌ NOT READY

**Blocking Issues**: 5/5 must be fixed before deployment
**Estimated Fix Time**: 4-6 hours
**Risk Level**: HIGH
