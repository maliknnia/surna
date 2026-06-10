import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error(
    "[loadtest-token] JWT_SECRET is not set. Set it to the same value the staging server uses, then re-run.",
  );
  process.exit(1);
}

const sub = process.env.LOADTEST_USER_ID || "loadtest-user";
const username = process.env.LOADTEST_USERNAME || "loadtest";
const ttl = process.env.LOADTEST_TOKEN_TTL || "2h";

const token = jwt.sign({ sub, username }, secret, { expiresIn: ttl } as jwt.SignOptions);

process.stdout.write(token);
