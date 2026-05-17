"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
console.log("URL:", process.env.DATABASE_URL);
try {
    const prisma = new client_1.PrismaClient({});
    console.log("Success");
}
catch (e) {
    console.error(e);
}
//# sourceMappingURL=test-prisma.js.map