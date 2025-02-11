import mongoose from 'mongoose';

// User Schema definition
const UserSchema = new mongoose.Schema({
  firstName: {  // ✅ Now at the top and required
    type: String,
    required: true,
  },
  lastName: {  // ✅ Now at the top and required
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const User = mongoose.model('User', UserSchema);

export default User;
