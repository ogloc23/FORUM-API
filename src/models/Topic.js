import mongoose from 'mongoose';
import slug from 'mongoose-slug-generator';

mongoose.plugin(slug); // ✅ plugin added to mongoose

const TopicSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, slug: 'title', unique: true }, 
    description: { type: String, required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }], // ✅ Correct reference
    views: { type: Number, default: 0 },
  },
  { timestamps: true } // Automatically creates createdAt & updatedAt
);

// Virtuals to return ISO format dates
TopicSchema.virtual('createdAtISO').get(function () {
  return this.createdAt.toISOString();
});

TopicSchema.virtual('updatedAtISO').get(function () {
  return this.updatedAt.toISOString();
});

TopicSchema.set('toJSON', {
  virtuals: true, // Include virtuals (like createdAtISO and updatedAtISO) in JSON output
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
