import mongoose from 'mongoose';

const TopicSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  },
  { timestamps: true }
);

TopicSchema.set('toJSON', {
   transform: (_,ret) => {
    ret.id = ret._id.toString();
    ret.course = ret.course?.toString();
    ret.createdBy = ret.createdBy?.toString();
    delete ret._id;
    delete ret._v;
   }

})

const Topic = mongoose.model('Topic', TopicSchema);

export default Topic;
