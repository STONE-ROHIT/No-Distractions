import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name must be at most 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Enter a valid email address'],
    },
    passwordHash: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
)

// JSON responses never include the password hash (or internal Mongo fields).
userSchema.set('toJSON', {
  transform(doc, ret) {
    ret.id = ret._id.toString()
    delete ret._id
    delete ret.__v
    delete ret.passwordHash
    return ret
  },
})

export default mongoose.model('User', userSchema)
