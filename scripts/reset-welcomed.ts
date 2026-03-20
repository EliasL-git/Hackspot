import 'dotenv/config';
import dbConnect from '../src/lib/db';
import User from '../src/models/User';

async function reset() {
  await dbConnect();
  await User.updateMany({}, { $unset: { welcomed: 1 } });
  console.log('Welcomed flags reset for testing');
  process.exit(0);
}

reset().catch(console.error);