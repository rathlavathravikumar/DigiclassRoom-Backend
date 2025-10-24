import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Notification } from './src/models/notification.model.js';
import { Student } from './src/models/student.model.js';
import { Teacher } from './src/models/teacher.model.js';
import { Admin } from './src/models/admin.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiclassroom';

async function diagnoseNotifications() {
  try {
    console.log('🔍 Notification System Diagnostic\n');
    console.log('================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Check collections exist
    console.log('📊 Database Collections:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log('   Collections found:', collectionNames.join(', '));
    console.log('   ✅ notifications:', collectionNames.includes('notifications') ? 'EXISTS' : '❌ MISSING');
    console.log('   ✅ students:', collectionNames.includes('students') ? 'EXISTS' : '❌ MISSING');
    console.log('   ✅ teachers:', collectionNames.includes('teachers') ? 'EXISTS' : '❌ MISSING');
    console.log('   ✅ admins:', collectionNames.includes('admins') ? 'EXISTS' : '❌ MISSING');
    console.log('');

    // Count documents
    console.log('📈 Document Counts:');
    const notificationCount = await Notification.countDocuments();
    const studentCount = await Student.countDocuments();
    const teacherCount = await Teacher.countDocuments();
    const adminCount = await Admin.countDocuments();
    
    console.log(`   Notifications: ${notificationCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   Teachers: ${teacherCount}`);
    console.log(`   Admins: ${adminCount}`);
    console.log('');

    // Check notification distribution
    if (notificationCount > 0) {
      console.log('📬 Notification Distribution:');
      
      const byRecipientType = await Notification.aggregate([
        {
          $group: {
            _id: '$recipient_type',
            count: { $sum: 1 },
            unread: { $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] } }
          }
        }
      ]);
      
      byRecipientType.forEach(group => {
        console.log(`   ${group._id}: ${group.count} total, ${group.unread} unread`);
      });
      console.log('');

      const byType = await Notification.aggregate([
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 }
          }
        }
      ]);
      
      console.log('📋 Notifications by Type:');
      byType.forEach(group => {
        console.log(`   ${group._id}: ${group.count}`);
      });
      console.log('');

      // Show recent notifications
      console.log('🕐 Recent Notifications (last 5):');
      const recent = await Notification.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      
      recent.forEach((n, i) => {
        console.log(`   ${i + 1}. [${n.recipient_type}] ${n.type} - "${n.title}"`);
        console.log(`      To: ${n.recipient_id}`);
        console.log(`      Read: ${n.read ? 'Yes' : 'No'}`);
        console.log(`      Created: ${n.createdAt?.toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No notifications found in database');
      console.log('   Run: node test-create-notification.js');
      console.log('');
    }

    // Check for orphaned notifications (recipient doesn't exist)
    if (notificationCount > 0) {
      console.log('🔗 Checking Notification Integrity:');
      
      const studentNotifications = await Notification.find({ recipient_type: 'Student' }).distinct('recipient_id');
      const teacherNotifications = await Notification.find({ recipient_type: 'Teacher' }).distinct('recipient_id');
      
      const existingStudents = await Student.find({ _id: { $in: studentNotifications } }).distinct('_id');
      const existingTeachers = await Teacher.find({ _id: { $in: teacherNotifications } }).distinct('_id');
      
      const orphanedStudents = studentNotifications.length - existingStudents.length;
      const orphanedTeachers = teacherNotifications.length - existingTeachers.length;
      
      if (orphanedStudents === 0 && orphanedTeachers === 0) {
        console.log('   ✅ All notifications have valid recipients');
      } else {
        if (orphanedStudents > 0) {
          console.log(`   ⚠️  ${orphanedStudents} notifications for non-existent students`);
        }
        if (orphanedTeachers > 0) {
          console.log(`   ⚠️  ${orphanedTeachers} notifications for non-existent teachers`);
        }
      }
      console.log('');
    }

    // Sample users for testing
    console.log('👥 Sample Users for Testing:');
    const sampleStudent = await Student.findOne().select('_id name email').lean();
    const sampleTeacher = await Teacher.findOne().select('_id name email').lean();
    
    if (sampleStudent) {
      const studentNotifs = await Notification.countDocuments({ recipient_id: sampleStudent._id });
      const studentUnread = await Notification.countDocuments({ recipient_id: sampleStudent._id, read: false });
      console.log(`   Student: ${sampleStudent.name} (${sampleStudent.email})`);
      console.log(`      ID: ${sampleStudent._id}`);
      console.log(`      Notifications: ${studentNotifs} total, ${studentUnread} unread`);
    }
    
    if (sampleTeacher) {
      const teacherNotifs = await Notification.countDocuments({ recipient_id: sampleTeacher._id });
      const teacherUnread = await Notification.countDocuments({ recipient_id: sampleTeacher._id, read: false });
      console.log(`   Teacher: ${sampleTeacher.name} (${sampleTeacher.email})`);
      console.log(`      ID: ${sampleTeacher._id}`);
      console.log(`      Notifications: ${teacherNotifs} total, ${teacherUnread} unread`);
    }
    console.log('');

    // Summary
    console.log('📋 Summary:');
    if (notificationCount === 0) {
      console.log('   ❌ No notifications in database');
      console.log('   ➡️  Action: Run "node test-create-notification.js"');
    } else if (studentCount === 0 || teacherCount === 0) {
      console.log('   ❌ Missing users in database');
      console.log('   ➡️  Action: Create users via signup or seed script');
    } else {
      console.log('   ✅ Notification system appears to be set up correctly');
      console.log('   ➡️  Action: Login to frontend and check bell icon');
      console.log(`   ➡️  Test user: ${sampleStudent?.email || sampleTeacher?.email}`);
    }
    console.log('');

    await mongoose.connection.close();
    console.log('✅ Database connection closed\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

diagnoseNotifications();
