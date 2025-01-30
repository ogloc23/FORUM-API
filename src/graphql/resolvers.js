import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Course from '../models/Course.js';
import Topic from '../models/Topic.js';
import Comment from '../models/Comment.js';
import Reply from '../models/Reply.js';
import { generateToken } from '../utils/auth.js';
import { sendEmail } from '../utils/email.js';
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
    
  
    
    getCommentsByTopic: async (_, { topicId }) => {
      const comments = await Comment.find({ topic: topicId })
          .populate('createdBy', 'username email'); // Ensure createdBy is populated
  
      return comments.map(comment => ({
          id: comment._id.toString(), // Ensure comment ID is a string
          text: comment.text,
          createdBy: comment.createdBy
              ? {
                  id: comment.createdBy._id.toString(), // Convert User _id to string
                  username: comment.createdBy.username,
                  email: comment.createdBy.email,
              }
              : null, // Handle cases where createdBy might be missing
          createdAt: new Date(comment.createdAt).toISOString(),
          updatedAt: new Date(comment.updatedAt).toISOString()
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


    createTopic: async (_, { courseId, title, description }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }
    
      const course = await Course.findById(courseId);
      if (!course) {
        throw new Error('Course not found');
      }
    
      const topic = new Topic({
        title,
        description,
        course: courseId,
        createdBy: user.userId,
      });
    
      const savedTopic = await topic.save();
      await savedTopic.populate('createdBy', 'username email');
    
      // Convert to plain object and manually handle the date conversion
      const topicData = savedTopic.toObject(); // Convert the Mongoose document to a plain JavaScript object
      topicData.createdAt = topicData.createdAt.toISOString(); // Convert createdAt to ISO string
      topicData.updatedAt = topicData.updatedAt.toISOString(); // Convert updatedAt to ISO string
    
      return {
        id: topicData._id.toString(),
        title: topicData.title,
        description: topicData.description,
        course: topicData.course.toString(),
        createdBy: {
          id: topicData.createdBy._id.toString(),
          username: topicData.createdBy.username,
          email: topicData.createdBy.email,
        },
        createdAt: topicData.createdAt,  // ISO string
        updatedAt: topicData.updatedAt,  // ISO string
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
      const savedReply = await reply.save();
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
  },
};
