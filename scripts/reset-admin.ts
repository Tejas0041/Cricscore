import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricscore';

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String,
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function resetAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteOne({ username: 'admin' });
    console.log('Deleted old admin user');

    const hashedPassword = await bcrypt.hash('admin', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('Created new admin user (username: admin, password: admin)');

    await User.deleteOne({ username: 'scorer' });
    console.log('Deleted old scorer user');

    const scorerHashedPassword = await bcrypt.hash('scorer', 10);
    await User.create({
      username: 'scorer',
      password: scorerHashedPassword,
      role: 'scorer',
    });
    console.log('Created new scorer user (username: scorer, password: scorer)');

    console.log('Reset complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetAdmin();
