import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Course from '../models/Course.js';
import Topic from '../models/Topic.js';
import Comment from '../models/Comment.js';
import Reply from '../models/Reply.js';
import { generateToken } from '../utils/auth.js';
import { sendEmail } from '../utils/email.js';
import generateSlug from "../utils/slug.js"; // Ensure slug utility is imported
import crypto from 'crypto';
import mongoose from 'mongoose';

export const resolvers = {
  Query: {
    getAllUsers: async () => {
      return await User.find();
    },
    getUserProfile: async (_, { id }) => {
      return await User.findById(id);
    },
    getAllCourses: async () => {
      return await Course.find();
    },
    getCourseById: async (_, { id }) => {
      return await Course.findById(id);
    },
     // Define the topic query resolver function
    topics: async () => {
      return await Topic();
    },

    getCourseBySlug: async (_, { slug }) => {
      const course = await Course.findOne({ slug });
    
      if (!course) {
        throw new Error('Course not found');
      }
    
      // Get topics under this course
      const topics = await Topic.find({ course: course._id }).sort({ createdAt: -1 });
    
      return {
        id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        description: course.description,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
        topicCount: topics.length, // ✅ Number of topics under the course
        latestTopic: topics.length > 0 ? {
          id: topics[0]._id.toString(),
          title: topics[0].title,
          slug: topics[0].slug,
          description: topics[0].description,
          createdAt: topics[0].createdAt.toISOString(),
          updatedAt: topics[0].updatedAt.toISOString(),
        } : null // ✅ If no topics exist, return null
      };
    },

    getTopicById: async (_, { id }) => {
      const topic = await Topic.findById(id)
        .populate('createdBy', '_id username email')
        .populate({
          path: 'comments',
          populate: [
            { path: 'createdBy', select: '_id username email' },
            {
              path: 'likes',
              select: '_id username email',
              match: { _id: { $ne: null } }, // Exclude null likes
            },
            {
              path: 'replies',
              populate: { path: 'createdBy', select: '_id username email' },
            },
          ],
        });
    
      if (!topic) {
        throw new Error('Topic not found');
      }
    
      return {
        id: topic._id.toString(),
        title: topic.title,
        description: topic.description,
        createdBy: topic.createdBy
          ? {
              id: topic.createdBy._id.toString(),
              username: topic.createdBy.username,
              email: topic.createdBy.email,
            }
          : { id: "UNKNOWN", username: "Deleted User", email: "" }, // ✅ Prevents null errors
    
        comments: topic.comments.map(comment => ({
          id: comment._id.toString(),
          text: comment.text,
          createdBy: comment.createdBy
            ? {
                id: comment.createdBy._id.toString(),
                username: comment.createdBy.username,
                email: comment.createdBy.email,
              }
            : { id: "UNKNOWN", username: "Deleted User", email: "" }, // ✅ Prevents null errors
    
          likes: comment.likes
            .map(user => (user ? user._id.toString() : null))
            .filter(Boolean), // ✅ Ensures only valid users
    
          createdAt: comment.createdAt.toISOString(),
          updatedAt: comment.updatedAt.toISOString(),
          replies: comment.replies.map(reply => ({
            id: reply._id.toString(),
            text: reply.text,
            createdBy: reply.createdBy
              ? {
                  id: reply.createdBy._id.toString(),
                  username: reply.createdBy.username,
                  email: reply.createdBy.email,
                }
              : { id: "UNKNOWN", username: "Deleted User", email: "" }, // ✅ Prevents null errors
            createdAt: reply.createdAt.toISOString(),
            updatedAt: reply.updatedAt.toISOString(),
          })),
        })),
    
        commentCount: topic.comments.length || 0, // ✅ Always return an integer
        likesCount: topic.comments.reduce((acc, comment) => acc + (comment.likes?.length || 0), 0),
        views: topic.views || 0,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      };
    },

    getTopicBySlug: async (_, { slug }) => {
      const topic = await Topic.findOne({ slug })
        .populate('createdBy', '_id username email') // ✅ Ensure `_id` is selected
        .populate({
          path: 'comments',
          populate: {
            path: 'createdBy',
            select: '_id username email', // ✅ Explicitly request `_id`
          }
        });
    
      if (!topic) {
        throw new Error('Topic not found');
      }
    
      return {
        id: topic._id.toString(),
        slug: topic.slug,
        title: topic.title,
        description: topic.description,
        views: topic.views,
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
    
        createdBy: topic.createdBy
          ? {
              id: topic.createdBy._id.toString(),
              username: topic.createdBy.username,
              email: topic.createdBy.email,
            }
          : null, // Handle missing user
    
        comments: topic.comments.map(comment => ({
          id: comment._id.toString(),
          text: comment.text,
          createdBy: comment.createdBy
            ? {
                id: comment.createdBy._id.toString(),
                username: comment.createdBy.username,
                email: comment.createdBy.email,
              }
            : null, // Handle missing user
        })),
      };
    },
    
    getTopicsByCourse: async (_, { courseId }) => {
      const topics = await Topic.find({ course: courseId })
        .populate('createdBy', '_id username email') // Ensure population
        .exec();
    
      return topics.map(topic => ({
        id: topic._id.toString(),
        title: topic.title,
        description: topic.description,
        course: topic.course.toString(),
        createdBy: topic.createdBy
          ? {
              id: topic.createdBy._id.toString(),
              username: topic.createdBy.username,
              email: topic.createdBy.email,
            }
          : null, // Prevents the error if no user is found
        comments: topic.comments || [],
        createdAt: topic.createdAt.toISOString(),
        updatedAt: topic.updatedAt.toISOString(),
      }));
    },
    
  
    // 
    getCommentsByTopic: async (_, { topicId }) => {
      const comments = await Comment.find({ topic: topicId })
        .populate('createdBy', 'username email')
        .populate({
          path: 'replies',
          populate: { path: 'createdBy', select: 'username email' }
        });
    
      return comments.map(comment => ({
        id: comment._id.toString(),
        text: comment.text,
        createdBy: {
          id: comment.createdBy._id.toString(),
          username: comment.createdBy.username,
          email: comment.createdBy.email,
        },
        replies: comment.replies.map(reply => ({
          id: reply._id.toString(),
          text: reply.text,
          createdBy: {
            id: reply.createdBy._id.toString(),
            username: reply.createdBy.username,
            email: reply.createdBy.email,
          },
          createdAt: reply.createdAt?.toISOString() || new Date().toISOString(), // ✅ Ensure fallback value
          updatedAt: reply.updatedAt?.toISOString() || new Date().toISOString(), // ✅ Ensure fallback value
        })),
        createdAt: comment.createdAt?.toISOString() || new Date().toISOString(), // ✅ Ensure fallback value
        updatedAt: comment.updatedAt?.toISOString() || new Date().toISOString(), // ✅ Ensure fallback value
      }));
    },
    
  
  
    getRepliesByComment: async (_, { commentId }) => {
      const replies = await Reply.find({ comment: commentId })
        .populate('createdBy', 'username email');
    
      return replies.map(reply => ({
        id: reply._id.toString(),
        text: reply.text,
        createdBy: reply.createdBy,
        createdAt: reply.createdAt.toISOString(), // Convert to ISO format
        updatedAt: reply.updatedAt.toISOString()  // Convert to ISO format
      }));
    },

    topics : async () => {
      const topicsList = await Topic.find()
        .populate('course', 'title') // Populate course title
        .populate('createdBy', 'username') // Populate creator details
        .populate({
          path: 'comments',
          select: 'text likes createdBy', // Select the relevant fields for comments
          populate: {
            path: 'createdBy',
            select: 'username',
          },
        })
        .lean(); // Use lean to return plain objects instead of Mongoose documents
    
      return topicsList.map(topic => {
        topic.commentCount = topic.comments.length;
        topic.likesCount = topic.comments.reduce((acc, comment) => acc + comment.likes.length, 0); // Count total likes on comments
        return topic;
      });
    },
  },

  Mutation: {

    // REGISTER MUTATION RESOLVER FUNCTION
    register: async (_, { username, email, password }) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const user = new User({
        username,
        email,
        password: hashedPassword,
      });
      await user.save();
      return {
        user,
      };
    },


    // LOGIN MUTATION RESOLVER FUNCTION
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user || !user._id) {
        throw new Error('Invalid credentials');
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }
      const token = generateToken(user._id);
      return {
        token,
        user,
      };
    },


    // REQUEST PASSWORD RESET MUTATION RESOLVER FUNCTION 
    requestPasswordReset: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }
      // Generate a 6-digit reset token and ensure it is a string value of 6 digits
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString(); 
      // Set token expiration (15 minutes)
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
      await user.save();
      // Send email with reset code
      const message = `Your password reset code is: ${resetToken}`;
      await sendEmail(user.email, 'Password Reset Request', message);

      return { message: 'Reset code sent to email' };
    },


    // RESET PASSWORD MUTATION RESOLVER FUNCTION 
    resetPassword: async (_, { token, newPassword }) => {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
      if (!user) {
        throw new Error('Invalid or expired token');
      }
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      // Clear reset token
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
      return { message: 'Password reset successful' };
    },

  

createTopic : async (_, { courseId, title, description }, { user }) => {
  if (!user || !user.userId) {
    throw new Error("Not authenticated");
  }

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("Invalid Course ID");
  }

  const courseObjectId = new mongoose.Types.ObjectId(courseId);

  // Check if the course exists
  const course = await Course.findById(courseObjectId);
  if (!course) {
    throw new Error("Course not found");
  }

  // Create and save the new topic
  const topic = new Topic({
    title,
    description,
    slug: generateSlug(title),
    course: courseObjectId,
    createdBy: user.userId,
  });

  const savedTopic = await topic.save();
  await savedTopic.populate("createdBy", "username email");

  // ✅ Ensure topic ID is properly formatted as ObjectId
  const updatedCourse = await Course.findByIdAndUpdate(
    courseObjectId,
    { $push: { topics: new mongoose.Types.ObjectId(savedTopic._id) } },
    { new: true }
  );

  console.log("Updated Course Topics:", updatedCourse?.topics || "Not Updated");

  if (!updatedCourse) {
    throw new Error("Failed to update course with new topic.");
  }

  return {
    id: savedTopic._id.toString(),
    title: savedTopic.title,
    description: savedTopic.description,
    slug: savedTopic.slug,
    course: savedTopic.course.toString(),
    createdBy: {
      id: savedTopic.createdBy._id.toString(),
      username: savedTopic.createdBy.username,
      email: savedTopic.createdBy.email,
    },
    createdAt: savedTopic.createdAt.toISOString(),
    updatedAt: savedTopic.updatedAt.toISOString(),
  };
},

    


    createComment: async (_, { topicId, text }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
    
      if (!mongoose.Types.ObjectId.isValid(topicId)) {
        throw new Error(`Invalid topicId: ${topicId}`);
      }
    
      const topicObjectId = new mongoose.Types.ObjectId(topicId);
    
      // Check if the topic exists
      const topic = await Topic.findById(topicObjectId);
    
      if (!topic) {
        throw new Error('Topic not found');
      }
    
      // Create the new comment
      const comment = new Comment({
        text,
        createdBy: user.userId,
        topic: topicObjectId,
      });
    
      // Save the comment
      const savedComment = await comment.save();

     // **Update the Topic's comments array**
      await Topic.findByIdAndUpdate(topicId, { 
      $push: { comments: savedComment._id } 
      });
    
      // Populate the fields
      await savedComment.populate('createdBy', 'username email');
      await savedComment.populate('topic');
    
      const formattedCreatedAt = savedComment.createdAt.toISOString();
      const formattedUpdatedAt = savedComment.updatedAt.toISOString();
    
      return {
        id: savedComment._id.toString(),
        text: savedComment.text,
        createdBy: savedComment.createdBy,
        topic: savedComment.topic,
        createdAt: formattedCreatedAt,
        updatedAt: formattedUpdatedAt,
      };
    },
    


    // CREATE REPLY MUTATION RESOLVER FUNCTION 
    createReply: async (_, { commentId, text }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
      // Check if the comment exists
      const comment = await Comment.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }
      // Create the new reply
      const reply = new Reply({
        text,
        createdBy: user.userId,
        comment: commentId,
      });

      //  Save the Reply
      const savedReply = await reply.save();
      
      // Update the comment's replie array
      await Comment.findByIdAndUpdate(
      commentId, 
      { $push: { replies: savedReply._id} }, 
      { new: true}
     );

      // Populate the createdBy field
      await savedReply.populate('createdBy', 'username email');
      
      const formattedReply = {
        id: savedReply._id.toString(),
        text: savedReply.text,
        createdBy: {
          id: savedReply.createdBy._id.toString(),
          username: savedReply.createdBy.username,
          email: savedReply.createdBy.email,
        },
        comment: commentId,
        createdAt: savedReply.createdAt.toISOString(),
        updatedAt: savedReply.updatedAt.toISOString(),
      };
      return formattedReply;
    },

    // LIKE COMMENT MUTATION RESOLVER FUNCTION 
    likeComment: async (_, { commentId }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
  
      const comment = await Comment.findById(commentId).populate('likes', 'username email');
      if (!comment) {
        throw new Error('Comment not found');
      }
  
      // Check if the user already liked the comment
      if (comment.likes.some(likedUser => likedUser._id.toString() === user.userId)) {
        throw new Error('You have already liked this comment');
      }
  
      comment.likes.push(user.userId);
      await comment.save();
      await comment.populate('likes', 'id username email'); // Ensure full user details
  
      return comment;
    },

    // UNLIKE COMMENT
  unlikeComment: async (_, { commentId }, { user }) => {
    if (!user || !user.userId) {
      throw new Error('Not authenticated');
    }

    const comment = await Comment.findById(commentId).populate('likes', 'username email');
    if (!comment) {
      throw new Error('Comment not found');
    }

    // Check if the user actually liked the comment before
    comment.likes = comment.likes.filter(likedUser => likedUser._id.toString() !== user.userId);
    await comment.save();
    await comment.populate('likes', 'id username email');

    return comment;
  },


    // LIKE REPLY MUTATION RRESOLVER FUNCTION 
    likeReply: async (_, { replyId }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
  
      const reply = await Reply.findById(replyId).populate('likes', 'username email');
      if (!reply) {
        throw new Error('Reply not found');
      }
  
      if (reply.likes.some(likedUser => likedUser._id.toString() === user.userId)) {
        throw new Error('You have already liked this reply');
      }
  
      reply.likes.push(user.userId);
      await reply.save();
      await reply.populate('likes', 'id username email');
  
      return reply;
    },

    unlikeReply: async (_, { replyId }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
  
      const reply = await Reply.findById(replyId).populate('likes', 'username email');
      if (!reply) {
        throw new Error('Reply not found');
      }
  
      reply.likes = reply.likes.filter(likedUser => likedUser._id.toString() !== user.userId);
      await reply.save();
      await reply.populate('likes', 'id username email');
  
      return reply;
    },

    incrementTopicViews: async (_, { topicId }) => {
      const topic = await Topic.findById(topicId);
      
      if (!topic) {
        throw new Error("Topic not found");
      }
    
      // Ensure views is a number, default to 0 if undefined
      if (!topic.views || isNaN(topic.views)) {
        topic.views = 0;
      }
    
      topic.views += 1; // Increment views
    
      // ✅ Use `findByIdAndUpdate` to ensure it saves to the database
      const updatedTopic = await Topic.findByIdAndUpdate(
        topicId,
        { views: topic.views },
        { new: true } // Returns the updated document
      );
    
      return updatedTopic;
    },
    
    
  },
};
