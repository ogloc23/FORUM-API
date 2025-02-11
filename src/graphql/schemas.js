import { gql } from 'apollo-server-express';

export const typeDefs = gql`

  type User {
    id: ID!
    username: String!
    firstName: String!
    lastName: String!
    email: String!
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

  type CourseEdge {
    node: Course!
    cursor: ID!
  }

  type CourseConnection {
    edges: [CourseEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Topic {
    id: ID!
    title: String!
    slug: String!
    description: String!
    course: ID!
    createdBy: User!
    comments: [Comment!]!
    commentCount: Int!
    likesCount: Int!
    views: Int!
    createdAt: String!
    updatedAt: String!
  }

  type TopicEdge {
    node: Topic!
    cursor: ID!
  }

  type TopicConnection {
    edges: [TopicEdge!]!
    pageInfo: PageInfo!
    totalCount: Int!
  }

  type Comment { 
    id: ID!
    text: String!
    createdBy: User!
    topic: Topic!
    likes: [User!]! # ✅ Ensures likes is always an array, not nullable
    replies: [Reply!]! # ✅ Ensures replies is always an array, not nullable
    createdAt: String
    updatedAt: String!
  }

  type Reply {
    id: ID!
    text: String!
    createdBy: User! # ✅ Ensures createdBy is never null
    comment: Comment!
    likes: [User!]! # ✅ Ensures likes is always an array, not nullable
    createdAt: String!
    updatedAt: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    endCursor: ID
    startCursor: ID
  }

  type Message {
    message: String!
  }

  type Query {
    topics: [Topic]
    getTopicById(id: ID!): Topic
    getTopicBySlug(slug: String!): Topic
    getAllUsers: [User!]!
    getUserProfile(id: ID!): User
    getAllCourses(first: Int, after: ID, last: Int, before: ID): CourseConnection!
    getCourseById(id: ID!): Course
    getCourseBySlug(slug: String!): Course
    getTopicsByCourse(courseId: ID!, first: Int, after: ID, last: Int, before: ID): TopicConnection!
    getCommentsByTopic(topicId: ID!): [Comment!]!
    getRepliesByComment(commentId: ID!): [Reply!]!
  }

  type Mutation {
    register(username: String!, firstName: String!, lastName: String!, email: String!, password: String!): AuthPayload!
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
