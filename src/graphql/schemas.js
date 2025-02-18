import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  type User {
    id: ID!
    firstName: String!
    lastName: String!
    username: String!
    email: String!
    createdAt: String!
    updatedAt: String!
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  type Course {
    id: ID!
    title: String!
    slug: String!
    description: String!
    createdAt: String!
    updatedAt: String!
    topicCount: Int!
    latestTopic: Topic
  }

  type Topic {
    id: ID!
    title: String!
    slug: String!
    description: String!
    course: Course!
    createdBy: User!
    comments: [Comment!]!
    commentCount: Int!
    likesCount: Int!
    views: Int!
    createdAt: String!
    updatedAt: String!
  }

  type Comment { 
    id: ID!
    text: String!
    createdBy: User!
    topic: Topic!
    likes: [User!]!
    replies: [Reply!]!
    createdAt: String!
    updatedAt: String!
  }

  type Reply {
    id: ID!
    text: String!
    createdBy: User!
    comment: Comment!
    likes: [User!]!
    createdAt: String!
    updatedAt: String!
  }

  type Message {
    message: String!
  }

  ## Queries
  type Query {
    getAllUsers: [User!]!
    getUserProfile(id: ID!): User
    getAllCourses: [Course!]!
    getCourseById(id: ID!): Course
    getCourseBySlug(slug: String!): Course
    getTopicsByCourse(courseId: ID!): [Topic!]!
    getTopicById(id: ID!): Topic
    getTopicBySlug(slug: String!): Topic
    getCommentsByTopic(topicId: ID!): [Comment!]!
    getRepliesByComment(commentId: ID!): [Reply!]!
    topics: [Topic!]!
  }

  ## Mutations
  type Mutation {
    register(
      username: String!
      firstName: String!
      lastName: String!
      email: String!
      password: String!
    ): AuthPayload!

    login(email: String!, password: String!): AuthPayload!

    createTopic(courseId: ID!, title: String!, description: String!): Topic!
    createComment(topicId: ID!, text: String!): Comment!
    createReply(commentId: ID!, text: String!): Reply!

    requestPasswordReset(email: String!): Message!
    resetPassword(token: String!, newPassword: String!): Message!

    likeComment(commentId: ID!): Comment!
    unlikeComment(commentId: ID!): Comment!
    likeReply(replyId: ID!): Reply!
    unlikeReply(replyId: ID!): Reply!

    incrementTopicViews(topicId: ID!): Topic!
  }
`;
