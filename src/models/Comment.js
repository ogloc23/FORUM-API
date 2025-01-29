import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  topic: { type: mongoose.Schema.Types.ObjectId, ref: 'Topic' },
}, { timestamps: true });

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
