import { gql } from 'apollo-server-express';

export const typeDefs = gql`

  type User {
    id: ID!
    username: String!
    email: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Query {
    getAllUsers: [User!]!
    getUserProfile(id: ID!): User
    getAllCourses: [Course]
    getCourseById(id: ID!): Course
    getTopicsByCourse(courseId: ID!): [Topic]
    getCommentsByTopic(topicId: ID!): [Comment]
    getRepliesByComment(commentId: ID!): [Reply]
  }

  type Mutation {
    register(username: String!, email: String!, password: String!): AuthPayload!
    login(email: String!, password: String!): AuthPayload!
    createTopic(courseId: ID!, title: String!, description: String!): Topic!
    createComment(topicId: ID!, text: String!): Comment!
    createReply(commentId: ID!, text: String!): Reply!
    requestPasswordReset(email: String!): Message!
    resetPassword(token: String!, newPassword: String!): Message!
  }

  type Course {
    id: ID!
    title: String!
    description: String!
    createdAt: String!
    updatedAt: String!
  }

  type Topic {
    id: ID!
    title: String!
    description: String!
    course: ID!
    createdBy: User!
    comments: [Comment!]!
    createdAt: String!
    updatedAt: String!
  }

  type Comment { 
  id: ID!
  text: String!
  createdBy: User!
  topic: Topic!
  createdAt: String!
  updatedAt: String!
 }

 type Reply {
  id: ID!
  text: String!
  createdBy: User!
  comment: Comment!
  createdAt: String!
  updatedAt: String!
 }

 type Message {
  message: String!}
`;
