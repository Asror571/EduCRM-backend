const request = require("supertest");
const app = require("../app");
const logger = require("../utils/logger");

describe("Auth Controller", () => {
  beforeAll(async () => {
    // Connect to test database
    logger.info("Starting auth tests");
  });

  afterAll(async () => {
    logger.info("Finishing auth tests");
  });

  describe("POST /api/v1/auth/register", () => {
    it("should register a new user", async () => {
      const userData = {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        phone: "+998901234567",
        role: "student",
      };

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
      expect(res.body.data).toHaveProperty("refreshToken");
    });

    it("should fail if email already exists", async () => {
      const userData = {
        firstName: "Jane",
        lastName: "Doe",
        email: "john@example.com",
        password: "password123",
        phone: "+998901234568",
        role: "student",
      };

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("should fail with invalid email", async () => {
      const userData = {
        firstName: "Jack",
        lastName: "Doe",
        email: "invalid-email",
        password: "password123",
        phone: "+998901234569",
        role: "student",
      };

      const res = await request(app)
        .post("/api/v1/auth/register")
        .send(userData);

      expect(res.status).toBe(400);
    });
  });

  describe("POST /api/v1/auth/login", () => {
    it("should login successfully", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "password123",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("token");
    });

    it("should fail with wrong password", async () => {
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "wrongpassword",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/v1/auth/me", () => {
    it("should get current user", async () => {
      // First login to get token
      const loginRes = await request(app)
        .post("/api/v1/auth/login")
        .send({
          email: "john@example.com",
          password: "password123",
        });

      const token = loginRes.body.data.token;

      const res = await request(app)
        .get("/api/v1/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty("_id");
    });

    it("should fail without token", async () => {
      const res = await request(app)
        .get("/api/v1/auth/me");

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
