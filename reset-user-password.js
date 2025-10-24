import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '.env') });

// Define schemas inline to avoid import issues
const teacherSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  clg_id: String,
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  courses_taught: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  refreshToken: String,
}, { timestamps: true });

const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  clg_id: String,
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  refreshToken: String,
}, { timestamps: true });

const adminSchema = new mongoose.Schema({
  name: String,
  email: String,
  clgName: String,
  password: String,
  refreshToken: String,
}, { timestamps: true });

const Teacher = mongoose.model('Teacher', teacherSchema);
const Student = mongoose.model('Student', studentSchema);
const Admin = mongoose.model('Admin', adminSchema);

async function resetPassword(userType, email, newPassword) {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let User;
    switch(userType.toLowerCase()) {
      case 'teacher':
        User = Teacher;
        break;
      case 'student':
        User = Student;
        break;
      case 'admin':
        User = Admin;
        break;
      default:
        throw new Error('Invalid user type. Use: teacher, student, or admin');
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.error(`❌ ${userType} with email ${email} not found`);
      process.exit(1);
    }

    console.log(`📧 Found ${userType}: ${user.name} (${user.email})`);

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password directly without triggering pre-save hooks
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    console.log(`✅ Password successfully reset for ${user.email}`);
    console.log(`🔑 New password: ${newPassword}`);
    
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

if (args.length !== 3) {
  console.log('Usage: node reset-user-password.js <user-type> <email> <new-password>');
  console.log('');
  console.log('Examples:');
  console.log('  node reset-user-password.js teacher dm1@edu.com 1234');
  console.log('  node reset-user-password.js student student1@edu.com newpass123');
  console.log('  node reset-user-password.js admin kerla@edu.com admin123');
  process.exit(1);
}

const [userType, email, newPassword] = args;
resetPassword(userType, email, newPassword);
