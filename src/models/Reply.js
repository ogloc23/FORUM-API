import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  text: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
}, { timestamps: true });

const Reply = mongoose.model('Reply', replySchema);
export default Reply;
