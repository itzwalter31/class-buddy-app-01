
require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: {
      email: "itzwalter31@gmail.com",
    },
    select: {
      id: true,
      email: true,
      role: true,
      schoolId: true,
    },
  });

  console.log("ADMIN DATABASE CHECK:");
  console.log(user);
}

main()
  .catch((error) => {
    console.error("DATABASE CHECK FAILED:");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });