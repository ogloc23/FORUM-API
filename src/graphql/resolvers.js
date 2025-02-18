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
    getAllUsers: async () => {
      const users = await User.find().lean();
    
      if (!users || users.length === 0) {
        throw new Error("No users found.");
      }
    
      return users.map(user => {
        if (!user._id) {
          console.error("User missing _id:", user); // Debugging
          throw new Error("User ID is missing.");
        }
    
        return {
          ...user,
          id: user._id.toString(), // Ensure the `id` is always a string
        };
      });
    },
    

    getUserProfile : async (_, { id }) => { 
      if (!id) {
        throw new Error("User ID is required.");
      }
    
      const user = await User.findById(id).lean();
    
      if (!user) {
        throw new Error("User not found.");
      }
    
      return {
        ...user,
        id: user._id.toString(), // Ensure ID is returned as a string
      };
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
      try {
        const comments = await Comment.find({ topic: topicId })
          .populate({
            path: 'createdBy', 
            select: '_id firstName lastName username email',  // Ensure _id is selected for createdBy
            model: 'User', // Ensure it's linking to the User model
          })
          .populate({
            path: 'replies',
            populate: { 
              path: 'createdBy', 
              select: '_id firstName lastName username email',
              model: 'User', // Ensure it's linking to the User model for replies
            },
          })
          .lean(); // .lean() for performance optimization
        
        if (!comments || comments.length === 0) {
          throw new Error(`No comments found for topicId: ${topicId}`);
        }
    
        // Ensure all comments have a valid createdBy field
        comments.forEach(comment => {
          if (!comment.createdBy || !comment.createdBy._id) {
            console.error(`Comment with ID ${comment._id} does not have a valid createdBy field.`);
            throw new Error(`Comment with ID ${comment._id} does not have a valid createdBy field.`);
          }
        });
    
        // Map and return the comments with their ids properly mapped
        return comments.map(comment => ({
          ...comment,
          id: comment._id.toString(),
          replies: comment.replies.map(reply => ({
            ...reply,
            id: reply._id.toString(), // Map ID for replies too
          })),
        }));
      } catch (error) {
        console.error('Error fetching comments:', error.message);
        throw new Error(`Could not fetch comments: ${error.message}`);
      }
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
          course: topic.course
            ? { id: topic.course._id?.toString(), title: topic.course.title }
            : null,
          createdBy: topic.createdBy
            ? {
                id: topic.createdBy._id?.toString(),
                firstName: topic.createdBy.firstName || "Unknown",
                lastName: topic.createdBy.lastName || "Unknown",
                username: topic.createdBy.username,
                email: topic.createdBy.email || "unknown@example.com",
              }
            : null, // ✅ Handle missing `createdBy`
          views: topic.views ?? 0,
          comments: topic.comments
            ? topic.comments.map((comment) => ({
                id: comment._id?.toString(),
                text: comment.text,
                likes: comment.likes ?? [],
                createdBy: comment.createdBy
                  ? {
                      id: comment.createdBy._id?.toString(),
                      firstName: comment.createdBy.firstName || "Unknown",
                      lastName: comment.createdBy.lastName || "Unknown",
                      username: comment.createdBy.username,
                      email: comment.createdBy.email || "unknown@example.com",
                    }
                  : {
                      id: "unknown",
                      firstName: "Unknown",
                      lastName: "User",
                      username: "anonymous",
                      email: "unknown@example.com",
                    }, // ✅ Provide a fallback user if `createdBy` is null
                replies: comment.replies
                  ? comment.replies.map((reply) => ({
                      id: reply._id?.toString(),
                      text: reply.text,
                      likes: reply.likes ?? [],
                      createdAt: reply.createdAt?.toISOString(),
                      updatedAt: reply.updatedAt?.toISOString(),
                      createdBy: reply.createdBy
                        ? {
                            id: reply.createdBy._id?.toString(),
                            firstName: reply.createdBy.firstName || "Unknown",
                            lastName: reply.createdBy.lastName || "Unknown",
                            username: reply.createdBy.username,
                            email: reply.createdBy.email || "unknown@example.com",
                          }
                        : {
                            id: "unknown",
                            firstName: "Unknown",
                            lastName: "User",
                            username: "anonymous",
                            email: "unknown@example.com",
                          }, // ✅ Fallback user for replies
                    }))
                  : [],
              }))
            : [], // ✅ Ensure `comments` is always an array
          commentCount: topic.comments?.length || 0,
          likesCount: topic.comments?.reduce(
            (acc, comment) => acc + (comment.likes?.length || 0),
            0
          ),
          replyCount: topic.comments?.reduce(
            (acc, comment) => acc + (comment.replies?.length || 0),
            0
          ),
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
    
      // Create and save the comment
      const comment = new Comment({
        text,
        createdBy: user.userId,
        topic: topicId,
      });
    
      await comment.save();
    
      // Populate 'createdBy' with user details
      const populatedComment = await Comment.findById(comment._id)
        .populate("createdBy", "id username email");
    
      if (!populatedComment?.createdBy) throw new Error("User not found for createdBy");
    
      await Topic.findByIdAndUpdate(topicId, { $push: { comments: comment._id } });
    
      return {
        ...populatedComment.toObject(),
        id: populatedComment._id.toString(), // Ensure ID is a string
        createdBy: {
          ...populatedComment.createdBy.toObject(),
          id: populatedComment.createdBy._id.toString(), // Ensure User ID is a string
        },
        topic: {
          ...topic.toObject(),
          id: topic._id.toString(),
        }
      };
    },
    
    
    
  
    // CREATE REPLY MUTATION RESOLVER FUNCTION
    createReply: async (_, { commentId, text }, { user }) => {
      if (!user?.userId) throw new Error("Not authenticated");
    
      if (!mongoose.isValidObjectId(commentId)) throw new Error("Invalid comment ID");
    
      const comment = await Comment.findById(commentId);
      if (!comment) throw new Error("Comment not found");
    
      // Create and save reply
      const reply = new Reply({
        text,
        createdBy: user.userId,
        comment: commentId,
      });
    
      await reply.save();
    
      // Populate 'createdBy' properly
      const populatedReply = await Reply.findById(reply._id)
        .populate("createdBy", "username email")
        .exec(); // ✅ Use `.exec()` instead of `execPopulate()`
    
      if (!populatedReply) throw new Error("Reply not found after creation");
    
      // Update the comment with the new reply
      await Comment.findByIdAndUpdate(commentId, { $push: { replies: reply._id } });
    
      return populatedReply;
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
