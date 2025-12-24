# 🚀 EduCRM Backend - Quick Start & Commands Guide

## Installation & Setup

```bash
# Install dependencies
pnpm install

# Setup environment variables (copy example)
cp .env.example .env

# Edit .env with your values
nano .env

# Start development server
npm run dev
```

## Essential Commands

### Development
```bash
# Start with auto-reload
npm run dev

# Run in production
npm start
```

### Testing & Quality
```bash
# Run tests with coverage
npm test

# Watch mode for tests
npm test:watch

# Check code quality
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Format code
npm run format
```

### Database
```bash
# Seed database with sample data
npm run seed
```

## Environment Variables

### Required (Will error if missing)
```env
JWT_SECRET=your-super-secret-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret
MONGODB_URI=mongodb://localhost:27017/educrm
```

### Optional (Have defaults)
```env
NODE_ENV=development
PORT=5000
LOG_LEVEL=debug

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=noreply@educrm.com

# SMS (optional)
SMS_API_URL=https://notify.eskiz.uz/api
SMS_EMAIL=your-email
SMS_PASSWORD=your-password

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Project Structure

```
src/
├── config/              # Configuration
│   ├── env.js          # Environment variables
│   ├── database.js      # MongoDB connection
│   ├── constants.js     # App constants
│   └── swagger.js       # Swagger/OpenAPI config
├── controllers/         # Business logic for routes
│   ├── auth.controller.js
│   ├── student.controller.js
│   ├── payment.controller.js
│   ├── group.controller.js
│   └── ... (other controllers)
├── models/             # MongoDB schemas
│   ├── User.js
│   ├── Student.js
│   ├── Payment.js
│   ├── Group.js
│   └── ... (other models)
├── routes/             # API routes
│   ├── auth.routes.js
│   ├── student.routes.js
│   ├── payment.routes.js
│   └── ... (other routes)
├── middlewares/        # Custom middlewares
│   ├── auth.middleware.js       # JWT validation
│   ├── error.middleware.js      # Error handling
│   ├── role.middleware.js       # Role checking
│   └── ... (other middlewares)
├── services/           # Business logic services
│   ├── payment.service.js       # Payment operations
│   ├── email.service.js         # Email sending
│   └── sms.service.js           # SMS sending
├── validators/         # Request validation
│   ├── auth.validator.js
│   ├── student.validator.js
│   ├── payment.validator.js
│   └── group.validator.js
├── utils/              # Helper functions
│   ├── logger.js                # Winston logging
│   ├── apiResponse.js           # Response formatting
│   ├── generators.js            # ID generators
│   └── ... (other utilities)
└── __tests__/          # Unit tests
    ├── auth.test.js
    └── payment.test.js
```

## API Endpoints

### Health Check
```
GET /health
```

### Authentication
```
POST   /api/v1/auth/register          # Register new user
POST   /api/v1/auth/login             # Login
POST   /api/v1/auth/logout            # Logout
GET    /api/v1/auth/me                # Get current user
PUT    /api/v1/auth/profile           # Update profile
PUT    /api/v1/auth/change-password   # Change password
POST   /api/v1/auth/forgot-password   # Request reset
POST   /api/v1/auth/reset-password/:token  # Reset password
POST   /api/v1/auth/refresh-token     # Refresh JWT
GET    /api/v1/auth/verify-email/:token    # Verify email
```

### Students
```
GET    /api/v1/students               # List all students
POST   /api/v1/students               # Create student
GET    /api/v1/students/:id           # Get student details
PUT    /api/v1/students/:id           # Update student
DELETE /api/v1/students/:id           # Delete student
POST   /api/v1/students/:id/enroll    # Enroll in group
POST   /api/v1/students/:id/unenroll  # Unenroll from group
GET    /api/v1/students/:id/attendance    # Get attendance
GET    /api/v1/students/:id/payments      # Get payments
```

### Payments
```
GET    /api/v1/payments               # List payments
POST   /api/v1/payments               # Create payment
GET    /api/v1/payments/:id           # Get payment details
PUT    /api/v1/payments/:id           # Update payment
DELETE /api/v1/payments/:id           # Delete payment
POST   /api/v1/payments/:id/refund    # Refund payment
POST   /api/v1/payments/:id/verify    # Verify payment
GET    /api/v1/payments/:id/receipt   # Get receipt
GET    /api/v1/payments/statistics    # Payment stats
GET    /api/v1/payments/today         # Today's payments
GET    /api/v1/payments/pending       # Pending payments
```

### Groups
```
GET    /api/v1/groups                 # List groups
POST   /api/v1/groups                 # Create group
GET    /api/v1/groups/:id             # Get group details
PUT    /api/v1/groups/:id             # Update group
DELETE /api/v1/groups/:id             # Delete group
GET    /api/v1/groups/:id/students    # Get group students
POST   /api/v1/groups/:id/attendance  # Mark attendance
```

### Teachers
```
GET    /api/v1/teachers               # List teachers
POST   /api/v1/teachers               # Create teacher
GET    /api/v1/teachers/:id           # Get teacher details
PUT    /api/v1/teachers/:id           # Update teacher
DELETE /api/v1/teachers/:id           # Delete teacher
```

### Leads
```
GET    /api/v1/leads                  # List leads
POST   /api/v1/leads                  # Create lead
GET    /api/v1/leads/:id              # Get lead details
PUT    /api/v1/leads/:id              # Update lead
DELETE /api/v1/leads/:id              # Delete lead
POST   /api/v1/leads/:id/convert      # Convert to student
```

### Reports
```
GET    /api/v1/reports/students       # Student reports
GET    /api/v1/reports/payments       # Payment reports
GET    /api/v1/reports/attendance     # Attendance reports
GET    /api/v1/reports/groups         # Group reports
```

### Dashboard
```
GET    /api/v1/dashboard              # Dashboard overview
GET    /api/v1/dashboard/stats        # Statistics
```

## Authentication

### JWT Token Format
```
Authorization: Bearer <token>
```

### Example Request
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/v1/auth/me
```

### Token Expiration
- Access Token: 7 days
- Refresh Token: 30 days

## Request/Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description",
  "statusCode": 400
}
```

### Paginated Response
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```

## Common Issues & Solutions

### Issue: MongoDB Connection Error
```
Solution:
1. Ensure MongoDB is running: sudo systemctl start mongod
2. Check MONGODB_URI in .env
3. Verify connection permissions
```

### Issue: Port Already in Use
```
Solution:
1. Change PORT in .env
2. Or kill process: lsof -ti:5000 | xargs kill -9
```

### Issue: Email Not Sending
```
Solution:
1. Check EMAIL_* variables in .env
2. Verify Gmail app password (if using Gmail)
3. Check logs: tail logs/error.log
```

### Issue: SMS Not Sending
```
Solution:
1. Check SMS_* variables in .env
2. Verify Eskiz.uz credentials
3. Check phone number format: +998XXXXXXXXX
```

### Issue: Tests Failing
```
Solution:
1. Run: npm run lint:fix
2. Clear cache: rm -rf node_modules/.jest-cache
3. Run again: npm test
```

## Logging

### View Logs
```bash
# Combined logs
tail -f logs/combined.log

# Error logs only
tail -f logs/error.log

# Real-time with colors (development)
npm run dev  # Shows colored logs in console
```

### Log Levels
```
error    - Critical errors only
warn     - Warnings and errors
info     - Normal operations (default)
debug    - Detailed debugging info
```

## Performance Tips

### Development
```bash
# Monitor in separate terminal
node -e "setInterval(() => console.log(require('os').loadavg()), 1000)"

# Profile memory
node --inspect server.js  # Then use Chrome DevTools
```

### Database
```bash
# Index creation (in mongosh)
db.users.createIndex({ email: 1 })
db.students.createIndex({ organizationId: 1, status: 1 })
db.payments.createIndex({ organizationId: 1, studentId: 1 })
```

## Deployment Checklist

- [ ] All environment variables set
- [ ] MongoDB running and accessible
- [ ] Tests passing: `npm test`
- [ ] Linting clean: `npm run lint`
- [ ] Security audit: `npm audit`
- [ ] Database indexes created
- [ ] Logs configured and writing
- [ ] Email/SMS services (if used) tested
- [ ] CORS origin updated for production
- [ ] JWT secrets are strong and unique
- [ ] Rate limiting tested
- [ ] Monitoring configured

## Useful Resources

- MongoDB Docs: https://docs.mongodb.com/
- Express.js Docs: https://expressjs.com/
- JWT.io: https://jwt.io/
- Mongoose Docs: https://mongoosejs.com/

## Need Help?

1. Check logs: `tail logs/error.log`
2. Read error messages carefully
3. Verify environment variables
4. Check database connection
5. Review relevant controller/service code
6. Check issue in BUG_REPORT.md or FIXES_APPLIED.md

---

**Last Updated**: December 24, 2025
**Status**: ✅ Production Ready (85%)
