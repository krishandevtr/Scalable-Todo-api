const Todo = require('../models/todo.model');
const { asyncHandler, AppError } = require('../middleware/errorHandler.middleware');

// Create a new todo
const createTodoController = asyncHandler(async (req, res) => {
    const { title, description, priority, dueDate } = req.body;
    const userId = req.userId;

    // Validation
    if (!title) {
        throw new AppError('Title is required', 400);
    }

    const todoData = {
        title,
        userID: userId,
        ...(description && { description }),
        ...(priority && { priority }),
        ...(dueDate && { dueDate: new Date(dueDate) })
    };

    const todo = await Todo.create(todoData);

    res.status(201).json({
        success: true,
        message: 'Todo created successfully',
        data: { todo }
    });
});

// Get todos with filtering and pagination
const getTodosController = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const {
        page = 1,
        limit = 10,
        status,
        priority,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        search
    } = req.query;

    // Build filter object
    const filter = { 
        userID: userId,
        isArchived: { $ne: true }
    };

    if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
        filter.status = status;
    }

    if (priority && ['low', 'medium', 'high'].includes(priority)) {
        filter.priority = priority;
    }

    if (search) {
        filter.$or = [
            { title: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }

    // Build sort object
    const sort = {};
    const validSortFields = ['createdAt', 'updatedAt', 'title', 'priority', 'dueDate'];
    if (validSortFields.includes(sortBy)) {
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    } else {
        sort.createdAt = -1;
    }

    // Calculate pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // Max 50 items per page
    const skip = (pageNum - 1) * limitNum;

    // Get todos with pagination
    const [todos, totalCount] = await Promise.all([
        Todo.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limitNum)
            .lean(),
        Todo.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    res.status(200).json({
        success: true,
        data: {
            todos,
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalCount,
                hasNextPage,
                hasPrevPage,
                limit: limitNum
            }
        }
    });
});

// Get a single todo by ID
const getTodoByIdController = asyncHandler(async (req, res) => {
    const { todoID } = req.params;
    const userId = req.userId;

    const todo = await Todo.findOne({
        _id: todoID,
        userID: userId,
        isArchived: { $ne: true }
    });

    if (!todo) {
        throw new AppError('Todo not found', 404);
    }

    res.status(200).json({
        success: true,
        data: { todo }
    });
});

// Update a todo
const updateTodoController = asyncHandler(async (req, res) => {
    const { todoID } = req.params;
    const userId = req.userId;
    const { title, description, status, priority, dueDate } = req.body;

    // Find and validate ownership
    const todo = await Todo.findOne({
        _id: todoID,
        userID: userId,
        isArchived: { $ne: true }
    });

    if (!todo) {
        throw new AppError('Todo not found or access denied', 404);
    }

    // Update fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
        updateData.status = status;
    }
    if (priority && ['low', 'medium', 'high'].includes(priority)) {
        updateData.priority = priority;
    }
    if (dueDate !== undefined) {
        updateData.dueDate = dueDate ? new Date(dueDate) : null;
    }

    const updatedTodo = await Todo.findByIdAndUpdate(
        todoID,
        updateData,
        { new: true, runValidators: true }
    );

    res.status(200).json({
        success: true,
        message: 'Todo updated successfully',
        data: { todo: updatedTodo }
    });
});

// Delete a todo
const deleteTodoController = asyncHandler(async (req, res) => {
    const { todoID } = req.params;
    const userId = req.userId;

    const todo = await Todo.findOne({
        _id: todoID,
        userID: userId
    });

    if (!todo) {
        throw new AppError('Todo not found or access denied', 404);
    }

    await Todo.findByIdAndDelete(todoID);

    res.status(200).json({
        success: true,
        message: 'Todo deleted successfully'
    });
});

// Archive/Unarchive a todo
const toggleArchiveTodoController = asyncHandler(async (req, res) => {
    const { todoID } = req.params;
    const userId = req.userId;

    const todo = await Todo.findOne({
        _id: todoID,
        userID: userId
    });

    if (!todo) {
        throw new AppError('Todo not found or access denied', 404);
    }

    todo.isArchived = !todo.isArchived;
    await todo.save();

    res.status(200).json({
        success: true,
        message: `Todo ${todo.isArchived ? 'archived' : 'unarchived'} successfully`,
        data: { todo }
    });
});

// Get todo statistics
const getTodoStatsController = asyncHandler(async (req, res) => {
    const userId = req.userId;

    const stats = await Todo.aggregate([
        { $match: { userID: userId, isArchived: { $ne: true } } },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                pending: {
                    $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                },
                inProgress: {
                    $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
                },
                completed: {
                    $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                },
                highPriority: {
                    $sum: { $cond: [{ $eq: ['$priority', 'high'] }, 1, 0] }
                },
                overdue: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $ne: ['$dueDate', null] },
                                    { $lt: ['$dueDate', new Date()] },
                                    { $ne: ['$status', 'completed'] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        }
    ]);

    const result = stats[0] || {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        highPriority: 0,
        overdue: 0
    };

    delete result._id;

    res.status(200).json({
        success: true,
        data: { stats: result }
    });
});

module.exports = {
    createTodoController,
    getTodosController,
    getTodoByIdController,
    updateTodoController,
    deleteTodoController: deleteTodoController,
    toggleArchiveTodoController,
    getTodoStatsController
};
