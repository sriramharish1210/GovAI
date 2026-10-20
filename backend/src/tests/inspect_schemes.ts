import { prisma } from '../utils/db';

async function main() {
  const el = await prisma.schemeEligibility.findUnique({
    where: { schemeId: 'central-post-matric-obc' }
  });
  console.log('EL_RULES:', el?.rulesJson);
  console.log('EL_READABLE:', el?.readableRequirements);

  const allEligibilities = await prisma.schemeEligibility.findMany({
    include: { scheme: true }
  });

  console.log(`Total schemes: ${allEligibilities.length}`);
  for (const se of allEligibilities) {
    if (se.rulesJson.includes('category')) {
      console.log(`[${se.schemeId}] ${se.scheme.name}`);
      console.log(`  rules: ${se.rulesJson}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(console.error);
