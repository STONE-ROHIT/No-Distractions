import { User } from '../models/User.js';
import type { Types } from 'mongoose';

export interface CreateUserInput {
  name: string;
  email: string;
  passwordHash: string;
}

// Plain, well-named functions wrapping every Mongoose query this app runs
// against User — nothing above this layer imports the User model or knows
// Mongoose's query API directly.

export function createUser(input: CreateUserInput) {
  return User.create(input);
}

export function findUserByEmail(email: string) {
  return User.findOne({ email: email.toLowerCase() });
}

// Login needs the hash; User.passwordHash is `select: false` by default,
// so this is the one place that opts back in.
export function findUserByEmailWithPassword(email: string) {
  return User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
}

export function findUserById(id: string | Types.ObjectId) {
  return User.findById(id);
}
