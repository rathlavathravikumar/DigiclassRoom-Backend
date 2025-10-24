import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './src/models/notification.model.js';
import { Student } from './src/models/student.model.js';
import { Teacher } from './src/models/teacher.model.js';
import { Admin } from './src/models/admin.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiclassroom';

async function createTestNotifications() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a sample student, teacher, and admin
    const student = await Student.findOne().select('_id admin_id name').lean();
    const teacher = await Teacher.findOne().select('_id admin_id name').lean();
    const admin = await Admin.findOne().select('_id name').lean();

    if (!student || !teacher || !admin) {
      console.log('Please ensure you have at least one student, teacher, and admin in the database');
      process.exit(1);
    }

    console.log('Found users:');
    console.log('- Student:', student.name, student._id);
    console.log('- Teacher:', teacher.name, teacher._id);
    console.log('- Admin:', admin.name, admin._id);

    // Create test notifications
    const testNotifications = [
      {
        recipient_id: student._id,
        recipient_type: 'Student',
        type: 'assignment',
        title: 'Test: New Assignment Posted',
        message: 'This is a test notification for a new assignment in Mathematics',
        related_id: new mongoose.Types.ObjectId(),
        related_name: 'Test Assignment',
        metadata: { test: true },
        admin_id: student.admin_id
      },
      {
        recipient_id: student._id,
        recipient_type: 'Student',
        type: 'test',
        title: 'Test: New Test Scheduled',
        message: 'A test has been scheduled for Science class',
        related_id: new mongoose.Types.ObjectId(),
        related_name: 'Test Exam',
        metadata: { test: true },
        admin_id: student.admin_id
      },
      {
        recipient_id: student._id,
        recipient_type: 'Student',
        type: 'grade',
        title: 'Test: Grade Posted',
        message: 'Your assignment has been graded. Score: 85/100',
        related_id: new mongoose.Types.ObjectId(),
        related_name: 'Test Assignment',
        metadata: { score: 85, maxScore: 100, test: true },
        admin_id: student.admin_id
      },
      {
        recipient_id: teacher._id,
        recipient_type: 'Teacher',
        type: 'submission',
        title: 'Test: Assignment Submitted',
        message: `${student.name} has submitted an assignment`,
        related_id: new mongoose.Types.ObjectId(),
        related_name: 'Test Assignment',
        metadata: { studentName: student.name, test: true },
        admin_id: teacher.admin_id
      },
      {
        recipient_id: teacher._id,
        recipient_type: 'Teacher',
        type: 'announcement',
        title: 'Test: Important Announcement',
        message: 'This is a test announcement from the admin',
        related_id: new mongoose.Types.ObjectId(),
        related_name: 'Test Notice',
        metadata: { priority: 'high', test: true },
        admin_id: teacher.admin_id
      }
    ];

    console.log('\nCreating test notifications...');
    const created = await Notification.insertMany(testNotifications);
    console.log(`✅ Successfully created ${created.length} test notifications`);

    // Show summary
    console.log('\nNotification Summary:');
    console.log(`- ${created.filter(n => n.recipient_type === 'Student').length} for students`);
    console.log(`- ${created.filter(n => n.recipient_type === 'Teacher').length} for teachers`);
    
    console.log('\nTo view these notifications:');
    console.log(`- Login as student: ${student.name}`);
    console.log(`- Login as teacher: ${teacher.name}`);
    console.log(`- Check the bell icon in the header`);

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

createTestNotifications();
