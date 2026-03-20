import 'dotenv/config';
import dbConnect from '../src/lib/db';
import User from '../src/models/User';

async function verify() {
  await dbConnect();
  const res = await User.updateOne(
    { slackId: 'el4s' },
    { $set: { verificationStatus: 'verified' } }
  );
  console.log('Verification result for el4s:', res);
  process.exit(0);
}

verify().catch(console.error);