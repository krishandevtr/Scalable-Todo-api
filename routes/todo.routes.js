const router = require('express').Router();
const {
    createTodoController,
    getTodosController,
    getTodoByIdController,
    updateTodoController,
    deleteTodoController,
    toggleArchiveTodoController,
    getTodoStatsController
} = require('../controllers/todo.controller');
const { authenticateToken } = require('../middleware/auth.middleware');

// All todo routes require authentication
router.use(authenticateToken);

// Todo CRUD operations
router.post('/', createTodoController);
router.get('/', getTodosController);
router.get('/stats', getTodoStatsController);
router.get('/:todoID', getTodoByIdController);
router.put('/:todoID', updateTodoController);
router.delete('/:todoID', deleteTodoController);
router.patch('/:todoID/archive', toggleArchiveTodoController);

module.exports = router;
