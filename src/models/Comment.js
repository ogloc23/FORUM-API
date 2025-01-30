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
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
  },
  {
    timestamps: true, 
  }
);

const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;