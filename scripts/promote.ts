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
  
  console.log("--- Hackspot Admin Promotion Tool ---");
  
  const email = await question("Enter User Email to promote to Admin: ");
  if (!email) {
    console.log("Email is required.");
    process.exit(1);
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    console.log(`User with Email "${email}" not found in database.`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.email})`);
  console.log(`Current tags: ${user.tags?.join(', ') || 'none'}`);
  
  const confirm = await question(`Are you sure you want to grant ADMIN access to ${user.name}? (y/n): `);
  
  if (confirm.toLowerCase() === 'y') {
    const newTags = Array.from(new Set([...(user.tags || []), 'admin']));
    await User.updateOne({ email: email.toLowerCase().trim() }, { $set: { tags: newTags } });
    console.log("✅ User promoted to ADMIN successfully!");
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
