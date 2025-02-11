// import mongoose from 'mongoose';

// const CommentSchema = new mongoose.Schema(
//   {
//     text: {
//       type: String,
//       required: true,
//     },
//     createdBy: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'User',
//       required: true,
//     },
//     topic: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: 'Topic',
//       required: true,
//     },
//     likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
//     replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply'}]
//   },
//   {
//     timestamps: true, 
//   }
// );

// const Comment = mongoose.model('Comment', CommentSchema);

// export default Comment;

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
    replies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Reply' }],
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,  // ✅ Ensures createdAt is always present
    },
    updatedAt: {
      type: Date,
      default: Date.now,
      required: true,  // ✅ Ensures updatedAt is always present
    },
  },
  {
    timestamps: true, // ✅ This auto-manages createdAt & updatedAt
  }
);

const Comment = mongoose.model('Comment', CommentSchema);

export default Comment;
