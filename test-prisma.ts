import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
console.log("URL:", process.env.DATABASE_URL);
try {
  const prisma = new PrismaClient({});
  console.log("Success");
} catch (e) {
  console.error(e);
}
