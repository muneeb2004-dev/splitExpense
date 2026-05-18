const router = require('express').Router();
const { getDashboard, getGroups, createGroup, getGroup, deleteGroup } = require('../controllers/groupController');
const { getExpenses, createExpense, deleteExpense, getBalances } = require('../controllers/expenseController');
const { getSettlements, createSettlement } = require('../controllers/settlementController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/').get(getGroups).post(createGroup);
router.get('/dashboard', getDashboard);
router.route('/:id').get(getGroup).delete(deleteGroup);

router.route('/:groupId/expenses').get(getExpenses).post(createExpense);
router.delete('/:groupId/expenses/:id', deleteExpense);
router.get('/:groupId/balances', getBalances);

router.route('/:groupId/settlements').get(getSettlements).post(createSettlement);

module.exports = router;
