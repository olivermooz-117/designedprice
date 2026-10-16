import "dotenv/config";
import jwt from "jsonwebtoken";
import { prisma } from "../src/lib/prisma";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "dev@designedprice.local" },
    update: {},
    create: { email: "dev@designedprice.local", displayName: "Dev User" },
  });
  const token = jwt.sign({}, process.env.JWT_SECRET as string, { subject: user.id, expiresIn: "7d" });
  console.log("\nUser ID:", user.id, "\nBearer token:\n" + token + "\n");
}

main().finally(() => prisma.$disconnect());
