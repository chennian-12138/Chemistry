import { prisma } from '../lib/prisma'

async function main() {
  console.log('Starting tag migration...');
  
  // 1. Fetch all reactions that have existing tags (stored as strings)
  // Note: We use raw query here because the Prisma Client might not have the 'tags' string field anymore 
  // if it was already generated with the new schema, or it might be the old client.
  // Using raw SQL is safer for this transition.
  const reactions = await prisma.$queryRaw`SELECT id, tags FROM reaction WHERE tags IS NOT NULL AND tags != ''`;
  
  console.log(`Found ${Array.isArray(reactions) ? reactions.length : 0} reactions with tags.`);

  let count = 0;
  if (Array.isArray(reactions)) {
    for (const reaction of reactions) {
      const tagsString = reaction.tags as string;
      const id = reaction.id as string;
      const tagList = tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
      
      if (tagList.length > 0) {
        // Create the tags and connect them to the reaction
        for (const tagName of tagList) {
          await prisma.$executeRaw`
            INSERT INTO reaction_tag (id, name) 
            VALUES (gen_random_uuid(), ${tagName}) 
            ON CONFLICT (name) DO NOTHING
          `;
          
          await prisma.$executeRaw`
            INSERT INTO "_ReactionToReactionTag" ("A", "B") 
            SELECT ${id}, id FROM reaction_tag WHERE name = ${tagName}
            ON CONFLICT DO NOTHING
          `;
        }
        count++;
        console.log(`Migrated tags for reaction ${id}: ${tagList.join(', ')}`);
      }
    }
  }

  console.log(`Successfully migrated tags for ${count} reactions.`);
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
