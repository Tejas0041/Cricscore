import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cricscore';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'scorer'], required: true },
  createdAt: { type: Date, default: Date.now },
});

async function initDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('URI:', MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
    
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Delete existing users
    const deletedCount = await User.deleteMany({});
    console.log(`✓ Deleted ${deletedCount.deletedCount} existing users`);

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash('admin', 10);
    const admin = await User.create({
      username: 'admin',
      password: hashedAdminPassword,
      role: 'admin',
    });
    console.log('✓ Admin user created:', { id: admin._id, username: admin.username, role: admin.role });

    // Create scorer user
    const hashedScorerPassword = await bcrypt.hash('scorer', 10);
    const scorer = await User.create({
      username: 'scorer',
      password: hashedScorerPassword,
      role: 'scorer',
    });
    console.log('✓ Scorer user created:', { id: scorer._id, username: scorer.username, role: scorer.role });

    // Verify users were created
    const userCount = await User.countDocuments();
    console.log(`✓ Total users in database: ${userCount}`);

    console.log('\n✓ Database initialization complete!');
    console.log('Login credentials:');
    console.log('  Admin  - username: admin, password: admin');
    console.log('  Scorer - username: scorer, password: scorer');
    
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Error initializing database:', error);
    process.exit(1);
  }
}

initDatabase();
