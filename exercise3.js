require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shop_mongoose_db';

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  age: { type: Number, min: 18, max: 100 },
  role: { type: String, enum: ['user', 'admin', 'manager'], default: 'user' },
  isActive: { type: Boolean, default: true },
  phone: {
    type: String,
    validate: {
      validator: function(v) {
        return /^(03|05|07|08|09)\d{8}$/.test(v);
      },
      message: props => `${props.value} is not a valid Vietnamese phone number!`
    }
  },
  isDeleted: { type: Boolean, default: false },
  password: { type: String }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

userSchema.virtual('displayInfo').get(function() {
  return `${this.fullName} <${this.email}> [${this.role.toUpperCase()}]`;
});

userSchema.statics.findActiveByRole = function(roleName) {
  return this.find({ role: roleName, isActive: true }).sort({ fullName: 1 });
};

userSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.isActive = false;
  return await this.save();
};

userSchema.pre('save', function() {
  if (this.isModified('password') && this.password && !this.password.startsWith('hashed_')) {
    this.password = `hashed_${this.password}`;
  }
});

userSchema.pre(/^find/, function() {
  this.find({ isDeleted: { $ne: true } });
});

const User = mongoose.model('User', userSchema);

async function main() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('--- MongoDB Connected Successfully ---');
    await User.deleteMany({});

    console.log('\n=== QUESTION 1 ===');
    try {
      await User.create({
        fullName: 'Invalid Phone User',
        email: 'invalidphone@example.com',
        phone: '123456'
      });
    } catch (err) {
      console.log('Validation Error Caught:', err.message);
    }

    const user1 = await User.create({
      fullName: 'Alice Johnson',
      email: 'alice@example.com',
      age: 22,
      role: 'admin',
      phone: '0901234567',
      password: 'mypassword123'
    });

    await User.create({
      fullName: 'Bob Smith',
      email: 'bob@example.com',
      age: 25,
      role: 'admin',
      phone: '0987654321',
      password: 'password456'
    });

    console.log('\n=== QUESTION 2 ===');
    console.log('Virtual Info:', user1.displayInfo);

    console.log('\n=== QUESTION 3 ===');
    const activeAdmins = await User.findActiveByRole('admin');
    console.log('Active Admins:', activeAdmins.map(u => u.fullName));

    console.log('\n=== QUESTION 4 & QUESTION 5 ===');
    await user1.softDelete();
    console.log(`Soft deleted user: ${user1.fullName}`);

    const remainingUsers = await User.find();
    console.log('Remaining Users (Filter Soft-deleted via Pre-find):', remainingUsers.map(u => u.fullName));

  } catch (err) {
    console.error('MongoDB Error:', err.message);
  } finally {
    await mongoose.connection.close();
  }
}

main();