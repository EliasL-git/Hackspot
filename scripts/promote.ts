import 'dotenv/config';
import dbConnect from '../src/lib/db';
import User from '../src/models/User';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => 
  new Promise((resolve) => rl.question(query, resolve));

async function promote() {
  await dbConnect();
  
  console.log("--- Hackspot User Promotion Tool ---");
  
  const slackId = await question("Enter Username: ");
  if (!slackId) {
    console.log("Username is required.");
    process.exit(1);
  }

  const user = await User.findOne({ slackId });
  if (!user) {
    console.log(`User with Username "${slackId}" not found in database.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (@${user.slackId})`);
  console.log(`Current tags: ${user.tags?.join(', ') || 'none'}`);
  
  const tagsInput = await question("Enter tags to SET (comma-separated, e.g. hackclubstaff,notable): ");
  const newTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);

  const confirm = await question(`Are you sure you want to set tags to [${newTags.join(', ')}]? (y/n): `);
  
  if (confirm.toLowerCase() === 'y') {
    await User.updateOne({ slackId }, { $set: { tags: newTags } });
    console.log("✅ User promoted successfully!");
  } else {
    console.log("Operation cancelled.");
  }

  rl.close();
  process.exit(0);
}

promote().catch(err => {
  console.error(err);
  rl.close();
  process.exit(1);
});
