import "dotenv/config";
process.env.NODE_ENV = process.env.NODE_ENV || "test";
process.env.LOCAL_AUTH_BYPASS = process.env.LOCAL_AUTH_BYPASS || "1";
process.env.AUTH_RATE_LIMIT_MAX = process.env.AUTH_RATE_LIMIT_MAX || "500";
process.env.COACH_AUTO_VERIFY = process.env.COACH_AUTO_VERIFY || "1";
