import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Course } from './src/models/course.model.js';
import { Admin } from './src/models/admin.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiclassroom';

async function fixCourseAdminIds() {
  try {
    console.log('🔧 Fixing Course admin_id fields\n');
    console.log('================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all admins
    const admins = await Admin.find().select('_id name email clgName').lean();
    console.log(`📊 Found ${admins.length} admin(s):\n`);
    
    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.name} (${admin.email})`);
      console.log(`   ID: ${admin._id}`);
      console.log(`   Institution: ${admin.clgName || 'Not set'}\n`);
    });

    if (admins.length === 0) {
      console.log('❌ No admins found. Please create an admin first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Get all courses
    const allCourses = await Course.find().select('_id name code admin_id').lean();
    console.log(`📚 Found ${allCourses.length} total course(s) in database\n`);

    if (allCourses.length === 0) {
      console.log('❌ No courses found. Please create courses first.');
      await mongoose.connection.close();
      process.exit(1);
    }

    // Check how many courses have admin_id
    const coursesWithAdmin = allCourses.filter(c => c.admin_id);
    const coursesWithoutAdmin = allCourses.filter(c => !c.admin_id);

    console.log(`✅ Courses with admin_id: ${coursesWithAdmin.length}`);
    console.log(`⚠️  Courses without admin_id: ${coursesWithoutAdmin.length}\n`);

    if (coursesWithoutAdmin.length > 0) {
      console.log('📝 Courses without admin_id:');
      coursesWithoutAdmin.forEach((course, index) => {
        console.log(`   ${index + 1}. ${course.name} (${course.code})`);
      });
      console.log('');

      // Use the first admin by default
      const defaultAdmin = admins[0];
      console.log(`🔧 Assigning all courses without admin_id to: ${defaultAdmin.name}\n`);

      const updateResult = await Course.updateMany(
        { admin_id: { $exists: false } },
        { $set: { admin_id: defaultAdmin._id } }
      );

      console.log(`✅ Updated ${updateResult.modifiedCount} course(s)\n`);
    }

    // Show final distribution
    console.log('📊 Final Course Distribution by Admin:\n');
    for (const admin of admins) {
      const adminCourses = await Course.find({ admin_id: admin._id }).select('name code').lean();
      console.log(`${admin.name}:`);
      console.log(`   Total courses: ${adminCourses.length}`);
      if (adminCourses.length > 0) {
        adminCourses.forEach((course, index) => {
          console.log(`   ${index + 1}. ${course.name} (${course.code})`);
        });
      }
      console.log('');
    }

    // Verify all courses now have admin_id
    const stillMissing = await Course.countDocuments({ admin_id: { $exists: false } });
    if (stillMissing === 0) {
      console.log('✅ SUCCESS! All courses now have admin_id assigned\n');
    } else {
      console.log(`⚠️  Warning: ${stillMissing} courses still missing admin_id\n`);
    }

    console.log('================================\n');
    console.log('🎉 Done! You can now use the Course Progress dashboard.\n');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Refresh your admin dashboard');
    console.log('3. Navigate to Course Progress');
    console.log('4. Courses should now appear!\n');

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

fixCourseAdminIds();
