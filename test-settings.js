import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Admin } from './src/models/admin.model.js';
import { Teacher } from './src/models/teacher.model.js';
import { Student } from './src/models/student.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/digiclassroom';

async function testSettingsEndpoint() {
  try {
    console.log('🔍 Settings Module Test\n');
    console.log('================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test all three models for password methods
    console.log('📋 Testing User Models:\n');

    // Test Admin
    const admin = await Admin.findOne().select('name email');
    if (admin) {
      console.log(`✅ Admin found: ${admin.name} (${admin.email})`);
      console.log(`   ID: ${admin._id}`);
      
      // Check if methods exist
      const adminDoc = await Admin.findById(admin._id);
      const hasPasswordMethod = typeof adminDoc.isCurrentPassword === 'function';
      console.log(`   Has isCurrentPassword method: ${hasPasswordMethod ? '✅' : '❌'}`);
    } else {
      console.log('❌ No admin found in database');
    }

    console.log('');

    // Test Teacher
    const teacher = await Teacher.findOne().select('name email');
    if (teacher) {
      console.log(`✅ Teacher found: ${teacher.name} (${teacher.email})`);
      console.log(`   ID: ${teacher._id}`);
      
      const teacherDoc = await Teacher.findById(teacher._id);
      const hasPasswordMethod = typeof teacherDoc.isCurrentPassword === 'function';
      console.log(`   Has isCurrentPassword method: ${hasPasswordMethod ? '✅' : '❌'}`);
    } else {
      console.log('❌ No teacher found in database');
    }

    console.log('');

    // Test Student
    const student = await Student.findOne().select('name email');
    if (student) {
      console.log(`✅ Student found: ${student.name} (${student.email})`);
      console.log(`   ID: ${student._id}`);
      
      const studentDoc = await Student.findById(student._id);
      const hasPasswordMethod = typeof studentDoc.isCurrentPassword === 'function';
      console.log(`   Has isCurrentPassword method: ${hasPasswordMethod ? '✅' : '❌'}`);
    } else {
      console.log('❌ No student found in database');
    }

    console.log('\n================================\n');

    // Test password verification
    console.log('🔐 Testing Password Methods:\n');

    if (admin) {
      const adminDoc = await Admin.findById(admin._id);
      try {
        // This will always return false for a random password, but tests if method works
        const result = await adminDoc.isCurrentPassword('testpassword123');
        console.log(`✅ Admin password comparison works (returned: ${result})`);
      } catch (error) {
        console.log(`❌ Admin password comparison failed: ${error.message}`);
      }
    }

    if (teacher) {
      const teacherDoc = await Teacher.findById(teacher._id);
      try {
        const result = await teacherDoc.isCurrentPassword('testpassword123');
        console.log(`✅ Teacher password comparison works (returned: ${result})`);
      } catch (error) {
        console.log(`❌ Teacher password comparison failed: ${error.message}`);
      }
    }

    if (student) {
      const studentDoc = await Student.findById(student._id);
      try {
        const result = await studentDoc.isCurrentPassword('testpassword123');
        console.log(`✅ Student password comparison works (returned: ${result})`);
      } catch (error) {
        console.log(`❌ Student password comparison failed: ${error.message}`);
      }
    }

    console.log('\n================================\n');

    // Summary
    console.log('📊 Summary:\n');
    
    if (!admin && !teacher && !student) {
      console.log('❌ No users found in database');
      console.log('   ➡️  Create users first via signup or seed script\n');
    } else {
      console.log('✅ Settings module should work correctly');
      console.log('\n📝 To test change password:');
      console.log('   1. Start the backend server: npm run dev');
      console.log('   2. Start the frontend: npm run dev');
      console.log('   3. Login as one of the users above');
      console.log('   4. Click user dropdown → Settings');
      console.log('   5. Fill the password change form');
      console.log('   6. Submit and check for success message\n');
      
      if (admin) {
        console.log(`   Test Admin: ${admin.email}`);
      }
      if (teacher) {
        console.log(`   Test Teacher: ${teacher.email}`);
      }
      if (student) {
        console.log(`   Test Student: ${student.email}`);
      }
    }

    console.log('\n================================\n');

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

testSettingsEndpoint();
