import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    topic: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Topic',
      required: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }], // ✅ This remains an array of references
  },
  {
    timestamps: true,
  }
);


const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;
