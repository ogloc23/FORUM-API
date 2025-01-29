import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import Course from '../models/Course.js';
import Topic from '../models/Topic.js';
import Comment from '../models/Comment.js';
import Reply from '../models/Reply.js';
import { generateToken } from '../utils/auth.js';
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
      return await Topic.find({ course: courseId }).populate('createdBy', 'username email');
    },
    getCommentsByTopic: async (_, { topicId }) => {
      return await Comment.find({ topic: topicId }).populate('createdBy', 'username email');
    },
    getRepliesByComment: async (_, { commentId }) => {
      return await Reply.find({ comment: commentId }).populate('createdBy', 'username email');
    }
  },

  Mutation: {
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

      // Use await for populating the createdBy and course fields
      await savedTopic.populate('createdBy', 'username email');
      await savedTopic.populate('course', 'title');
      await savedTopic.populate('comments');

      return {
        id: savedTopic._id.toString(),
        title: savedTopic.title,
        description: savedTopic.description,
        course: savedTopic.course.id,
        createdBy: {
          id: savedTopic.createdBy._id.toString(),
          username: savedTopic.createdBy.username,
          email: savedTopic.createdBy.email,
        },
        createdAt: savedTopic.createdAt,
        updatedAt: savedTopic.updatedAt,
      };
    },
    createComment: async (_, { topicId, text }, { user }) => {
      if (!user || !user.userId) {
        throw new Error('Not authenticated');
      }

      const topicObjectId = new mongoose.Types.ObjectId(topicId);
      console.log(topicObjectId)

      // Check if the topic exists and convert the topicId to a string
      const topic = await Topic.findById(topicObjectId);
      if (!topic) {
        throw new Error('Topic not found');
      }

      // Create the new comment
      const comment = new Comment({
        text,
        createdBy: new mongoose.Types.ObjectId(user.userId),
        topic: topicObjectId,
      });

      const savedComment = await comment.save();

      return {
        id: savedComment._id.toString(),
        text: savedComment.text,
        createdBy: savedComment.createdBy,
        topic: savedComment.topic.toString(),
        createdAt: savedComment.createdAt,
        updatedAt: savedComment.updatedAt,
      };
    },
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
      const reply = new reply({
        text,
        createdBy: user.userId,
        comment: commentId
      });

      const savedReply = await Reply.save();

      return {
        id: savedReply._id.toString(),
        text: savedReply.text,
        createdBy: savedReply.createdBy,
        comment: savedReply.comment,
        createdAt: savedReply.createdAt,
        updatedAt: savedReply.updatedAt,
      };
    },
  },
};
