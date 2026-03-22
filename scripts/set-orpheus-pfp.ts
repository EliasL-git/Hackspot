import 'dotenv/config';
import dbConnect from '../src/lib/db';
import User from '../src/models/User';

async function setPfp() {
  await dbConnect();
  await User.updateOne({ slackId: 'orpheus' }, { $set: { image: '/talker.png' } });
  console.log('Orpheus pfp set.');
  process.exit(0);
}

setPfp().catch(console.error);