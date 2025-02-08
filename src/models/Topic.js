import mongoose from 'mongoose';
import generateSlug from '../utils/slug.js';  // Import the slugify function

const TopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true }, // Slug should be generated before saving
    description: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
    views: { type: Number, default: 0 },
  },
  { timestamps: true } // Automatically creates createdAt & updatedAt
);

// **Pre-save hook to generate slug**
TopicSchema.pre('save', function (next) {
  if (this.isModified('title')) {
    this.slug = generateSlug(this.title);
  }
  next();
});

// Virtuals to return ISO format dates
TopicSchema.virtual('createdAtISO').get(function () {
  return this.createdAt.toISOString();
});

TopicSchema.virtual('updatedAtISO').get(function () {
  return this.updatedAt.toISOString();
});

// Customize the toJSON output
TopicSchema.set('toJSON', {
  virtuals: true,
  transform: (_, ret) => {
    ret.id = ret._id.toString();
    ret.course = ret.course?.toString();
    ret.createdBy = ret.createdBy?.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Topic = mongoose.model('Topic', TopicSchema);
export default Topic;
