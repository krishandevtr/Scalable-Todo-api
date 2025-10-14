const mongoose = require("mongoose");
const { Schema } = mongoose;

const todoSchema = new Schema({
    title: {
        type: String,
        required: [true, 'Title is required'],
        trim: true,
        minlength: [1, 'Title cannot be empty'],
        maxlength: [100, 'Title cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    dueDate: {
        type: Date
    },
    userID: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    completedAt: {
        type: Date
    },
    isArchived: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: {
        transform: function(doc, ret) {
            delete ret.__v;
            return ret;
        }
    }
});

// Indexes for better query performance
todoSchema.index({ userID: 1, createdAt: -1 });
todoSchema.index({ userID: 1, status: 1 });
todoSchema.index({ userID: 1, priority: 1 });
todoSchema.index({ dueDate: 1 });
todoSchema.index({ isArchived: 1 });

// Middleware to update completedAt when status changes to completed
todoSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'completed' && !this.completedAt) {
            this.completedAt = new Date();
        } else if (this.status !== 'completed') {
            this.completedAt = undefined;
        }
    }
    next();
});

const Todo = mongoose.model("Todo", todoSchema);
module.exports = Todo;
