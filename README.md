# EduCRM Backend API

Education CRM system backend built with Node.js, Express.js, and MongoDB.

## Features

- 🔐 JWT Authentication & Authorization
- 👥 User Management (Admin, Teacher, Student roles)
- 📚 Course & Group Management
- 💰 Payment Processing
- 📞 CRM & Lead Management
- 📊 Reports & Analytics
- 📧 Email & SMS Notifications
- 📁 File Upload
- 🔍 Advanced Search & Filters

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT
- **Validation:** Express Validator
- **Documentation:** Swagger
- **Package Manager:** pnpm

## Prerequisites

- Node.js >= 18.x
- MongoDB >= 6.x
- pnpm >= 8.x
- Redis (optional, for caching)

## Installation

\`\`\`bash
# Clone repository
git clone <repository-url>
cd educrm-backend

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your configurations

# Start development server
pnpm dev
\`\`\`

## Scripts

\`\`\`bash
pnpm dev          # Start development server
pnpm start        # Start production server
pnpm test         # Run tests
pnpm test:watch   # Run tests in watch mode
pnpm lint         # Lint code
pnpm lint:fix     # Fix linting issues
pnpm format       # Format code with prettier
\`\`\`

## API Documentation

After starting the server, visit:
- Swagger UI: http://localhost:5000/api-docs

## Project Structure

\`\`\`
educrm-backend/
├── src/
│   ├── config/          # Configuration files
│   ├── models/          # Mongoose models
│   ├── controllers/     # Route controllers
│   ├── routes/          # API routes
│   ├── middlewares/     # Custom middlewares
│   ├── services/        # Business logic services
│   ├── utils/           # Helper functions
│   └── validators/      # Request validators
├── uploads/             # Uploaded files
├── logs/                # Application logs
├── tests/               # Test files
└── server.js            # Entry point
\`\`\`

## Environment Variables

See `.env.example` for all available environment variables.

## License

MIT
# EduCRM-backend
