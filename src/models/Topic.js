import mongoose from 'mongoose';
import generateSlug from '../utils/slug.js'; // Import slug function

const TopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }, // Ensure createdAt is always set
  },
  { timestamps: true } // ✅ Automatically creates `createdAt` & `updatedAt`
);

// **Pre-save hook to generate slug**
TopicSchema.pre('save', function (next) {
  if (this.isNew || this.isModified('title')) {
    this.slug = generateSlug(this.title);
  }
  next();
});

// **Customize JSON output**
TopicSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    ret.course = ret.course?.toString();
    ret.createdBy = ret.createdBy?.toString();
    ret.createdAt = ret.createdAt?.toISOString(); // ✅ Ensure ISO date format
    ret.updatedAt = ret.updatedAt?.toISOString();
    delete ret._id;
    delete ret.__v;
  },
});

const Topic = mongoose.model('Topic', TopicSchema);
export default Topic;
