import "dotenv/config";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@designedprice.local" },
    update: {},
    create: { email: "dev@designedprice.local", displayName: "Dev User" },
  });
  const token = jwt.sign({}, process.env.JWT_SECRET as string, { subject: user.id, expiresIn: "7d", issuer: "designedprice-api", audience: "designedprice-web" });
  console.log("\nUser ID:", user.id, "\nBearer token:\n" + token + "\n");
}

main().finally(() => prisma.$disconnect());
