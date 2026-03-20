import 'dotenv/config';
import dbConnect from '../src/lib/db';
import User from '../src/models/User';

async function setTags() {
  await dbConnect();
  await User.updateOne({ slackId: 'orpheus' }, { $set: { tags: ['bot'] } });
  await User.updateOne({ slackId: 'el4s' }, { $set: { tags: ['owner'] } });
  console.log('Tags set.');
  process.exit(0);
}

setTags().catch(console.error);