import { AppError } from '../middleware/errorHandler.js';
import * as userRepository from '../repositories/user.repository.js';
import type { UserDocument } from '../models/User.js';
import type { HydratedDocument } from 'mongoose';

/** The shape returned to clients — never includes passwordHash. */
export function toPublicUser(user: HydratedDocument<UserDocument>) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    avatar: user.avatar ?? null,
    preferences: user.preferences,
    createdAt: user.createdAt,
  };
}

export async function getCurrentUser(userId: string) {
  const user = await userRepository.findUserById(userId);
  if (!user) {
    throw new AppError(404, 'User not found');
  }
  return toPublicUser(user);
}
