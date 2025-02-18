import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Course from '../models/Course.js';
import Topic from '../models/Topic.js';
import Comment from '../models/Comment.js';
import Reply from '../models/Reply.js';
import { generateToken } from '../utils/auth.js';
import { sendEmail } from '../utils/email.js';
import generateSlug from '../utils/slug.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

export const resolvers = {
  Query: {
    getAllUsers: async () => await User.find().lean(),
  
    getUserProfile: async (_, { id }) => {
      const user = await User.findById(id).lean();
      if (!user) throw new Error('User not found');
      return user;
    },
  
    getCourseById: async (_, { id }) => {
      const course = await Course.findById(id).lean();
      if (!course) throw new Error('Course not found');
      return {
        ...course,
        id: course._id.toString(),
      }; 
    },
  
    getAllCourses: async () => {
      const courses = await Course.find().lean();

      return courses.map(course => ({
        ...course,
        id: course._id.toString(),
      }));
    },
  
    getCourseBySlug: async (_, { slug }) => {
      const course = await Course.findOne({ slug }).lean();
      if (!course) throw new Error('Course not found');
      return course;
    },
  
    getTopicById: async (_, { id }) => {
      const topic = await Topic.findById(id)
        .populate('createdBy', '_id firstName lastName username email')
        .populate({
          path: 'comments',
          populate: [
            { path: 'createdBy', select: '_id firstName lastName username email' },
            { 
              path: 'replies', 
              populate: { path: 'createdBy', select: '_id firstName lastName username email' } 
            },
          ],
        })
        .lean();
  
      if (!topic) throw new Error('Topic not found');
      return topic;
    },
  
    getCommentsByTopic: async (_, { topicId }) => {
      return await Comment.find({ topic: topicId })
        .populate('createdBy', '_id firstName lastName username email')
        .populate({
          path: 'replies',
          populate: { path: 'createdBy', select: '_id firstName lastName username email' },
        })
        .lean();
    },
  
    getRepliesByComment: async (_, { commentId }) => {
      const replies = await Reply.find({ comment: commentId })
        .populate('createdBy', '_id firstName lastName username email')
        .lean();
      
      return replies.map(reply => ({
        id: reply._id.toString(),
        text: reply.text,
        createdBy: reply.createdBy,
        createdAt: reply.createdAt.toISOString(), 
        updatedAt: reply.updatedAt.toISOString()  
      }));
    },
    
    topics: async () => {
      try {
        const topicsList = await Topic.find()
          .sort({ createdAt: -1 }) // ✅ Newest topics first
          .populate("course", "title")
          .populate({
            path: "createdBy",
            select: "_id firstName lastName username email",
          })
          .populate({
            path: "comments",
            select: "_id text likes createdBy replies",
            populate: [
              {
                path: "createdBy",
                select: "_id firstName lastName username email",
              },
              {
                path: "replies",
                select: "_id text likes createdBy createdAt updatedAt",
                populate: {
                  path: "createdBy",
                  select: "_id firstName lastName username email",
                },
              },
            ],
          })
          .lean();
    
        return topicsList.map((topic) => ({
          id: topic._id?.toString() || "", // ✅ Ensure ID is always a string
          title: topic.title,
          slug: topic.slug,
          description: topic.description,
          course: topic.course ? { id: topic.course._id?.toString(), title: topic.course.title } : null,
          createdBy: topic.createdBy
            ? {
                id: topic.createdBy._id?.toString(),
                firstName: topic.createdBy.firstName || "Unknown",
                lastName: topic.createdBy.lastName || "Unknown",
                username: topic.createdBy.username,
                email: topic.createdBy.email || "unknown@example.com",
              }
            : null, // ✅ If `createdBy` is missing, return `null`
          views: topic.views ?? 0,
          comments: topic.comments ?? [],
          commentCount: topic.comments?.length || 0,
          likesCount: topic.comments?.reduce((acc, comment) => acc + (comment.likes?.length || 0), 0),
          replyCount: topic.comments?.reduce((acc, comment) => acc + (comment.replies?.length || 0), 0),
          createdAt: topic.createdAt ? topic.createdAt.toISOString() : null,
          updatedAt: topic.updatedAt ? topic.updatedAt.toISOString() : null,
        }));
      } catch (error) {
        console.error("Error fetching topics:", error);
        throw new Error("Failed to fetch topics");
      }
    },
    
    
    
  },
  

  Mutation: {
    // REGISTER MUTATION RESOLVER FUNCTION
    register: async (_, { firstName, lastName, username, email, password }) => {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error("User already exists");
      }
  
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const user = new User({
        firstName,
        lastName,
        username,
        email,
        password: hashedPassword,
      });
  
      await user.save();
      return { user };
    },
  
    // LOGIN MUTATION RESOLVER FUNCTION
    login: async (_, { email, password }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("Invalid credentials");
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        throw new Error("Invalid credentials");
      }
  
      const token = generateToken(user._id);
      return { token, user };
    },
  
    // REQUEST PASSWORD RESET MUTATION RESOLVER FUNCTION
    requestPasswordReset: async (_, { email }) => {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error("User not found");
      }
  
      const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
      await user.save();
  
      await sendEmail(user.email, "Password Reset Request", `Your password reset code is: ${resetToken}`);
  
      return { message: "Reset code sent to email" };
    },
  
    // RESET PASSWORD MUTATION RESOLVER FUNCTION
    resetPassword: async (_, { token, newPassword }) => {
      const user = await User.findOne({ 
        resetPasswordToken: token, 
        resetPasswordExpires: { $gt: Date.now() } 
      });
  
      if (!user) {
        throw new Error("Invalid or expired token");
      }
  
      user.password = await bcrypt.hash(newPassword, 10);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
  
      return { message: "Password reset successful" };
    },
  
    // CREATE TOPIC MUTATION RESOLVER FUNCTION
    createTopic: async (_, { courseId, title, description }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      if (!mongoose.isValidObjectId(courseId)) throw new Error("Invalid Course ID");
  
      const course = await Course.findById(courseId);
      if (!course) throw new Error("Course not found");
  
      const topic = await new Topic({
        title,
        description,
        slug: generateSlug(title),
        course: courseId,
        createdBy: user.userId,
      }).save();
  
      await Course.findByIdAndUpdate(courseId, { $push: { topics: topic._id } });

      const savedTopic = await Topic.findById(topic._id)
      .populate({
        path: "createdBy", 
        select: "_id username email",
      })
      .lean();

      if (!savedTopic?.createdBy) throw new Error("CreatedBy field is null");
  
      return {
        id: savedTopic._id.toString(),
        title: savedTopic.title,
        description: savedTopic.description,
        slug: savedTopic.slug,
        createdAt: savedTopic.createdAt,
        updatedAt: savedTopic.updatedAt,
        createdBy: {
          id: savedTopic.createdBy._id.toString(),
          username: savedTopic.createdBy.username,
          email: savedTopic.createdBy.email,
        },
      };
    },
  
    // CREATE COMMENT MUTATION RESOLVER FUNCTION
    createComment: async (_, { topicId, text }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      if (!mongoose.isValidObjectId(topicId)) throw new Error(`Invalid topicId: ${topicId}`);
  
      const topic = await Topic.findById(topicId);
      if (!topic) throw new Error("Topic not found");
  
      const comment = await new Comment({
        text,
        createdBy: user.userId,
        topic: topicId,
      }).save();
  
      await Topic.findByIdAndUpdate(topicId, { $push: { comments: comment._id } });
  
      return await comment.populate("createdBy", "username email").execPopulate();
    },
  
    // CREATE REPLY MUTATION RESOLVER FUNCTION
    createReply: async (_, { commentId, text }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      if (!mongoose.isValidObjectId(commentId)) throw new Error("Invalid comment ID");
  
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");
  
      const reply = await new Reply({
        text,
        createdBy: user.userId,
        comment: commentId,
      }).save();
  
      await Comment.findByIdAndUpdate(commentId, { $push: { replies: reply._id } });
  
      return await reply.populate("createdBy", "username email").execPopulate();
    },
  
    // LIKE COMMENT MUTATION RESOLVER FUNCTION
    likeComment: async (_, { commentId }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");
  
      if (comment.likes.includes(user.userId)) throw new Error("You have already liked this comment");
  
      await Comment.findByIdAndUpdate(commentId, { $push: { likes: user.userId } });
  
      return await Comment.findById(commentId).populate("likes", "id username email");
    },
  
    // UNLIKE COMMENT MUTATION RESOLVER FUNCTION
    unlikeComment: async (_, { commentId }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");
  
      await Comment.findByIdAndUpdate(commentId, { $pull: { likes: user.userId } });
  
      return await Comment.findById(commentId).populate("likes", "id username email");
    },
  
    // LIKE REPLY MUTATION RESOLVER FUNCTION
    likeReply: async (_, { replyId }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      const reply = await Reply.findById(replyId);
      if (!reply) throw new Error("Reply not found");
  
      if (reply.likes.includes(user.userId)) throw new Error("You have already liked this reply");
  
      await Reply.findByIdAndUpdate(replyId, { $push: { likes: user.userId } });
  
      return await Reply.findById(replyId).populate("likes", "id username email");
    },
  
    // UNLIKE REPLY MUTATION RESOLVER FUNCTION
    unlikeReply: async (_, { replyId }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
  
      const reply = await Reply.findById(replyId);
      if (!reply) throw new Error("Reply not found");
  
      await Reply.findByIdAndUpdate(replyId, { $pull: { likes: user.userId } });
  
      return await Reply.findById(replyId).populate("likes", "id username email");
    },
  
    // INCREMENT TOPIC VIEWS
    incrementTopicViews: async (_, { topicId }) => {
      if (!mongoose.isValidObjectId(topicId)) throw new Error("Invalid Topic ID");
  
      const topic = await Topic.findById(topicId);
      if (!topic) throw new Error("Topic not found");
  
      topic.views = (topic.views || 0) + 1;
  
      return await Topic.findByIdAndUpdate(topicId, { views: topic.views }, { new: true });
    },
  },
  
};
