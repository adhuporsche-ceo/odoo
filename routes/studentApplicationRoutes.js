const express = require('express');
const { protect, canAny } = require('../middleware/authMiddleware');
const {
  submitApplication,
  listApplications,
  getMyApplication,
  reviewApplication,
  deleteApplication,
  resetApplication,
} = require('../controllers/studentApplicationController');

const router = express.Router();

router.post('/', protect, canAny('student.create', 'student.mentor-action', 'student.view.all'), submitApplication);
router.get('/mine', protect, getMyApplication);
router.get('/', protect, canAny('student.view.all', 'student.mentor-action', 'student.create'), listApplications);
router.patch('/:id/status', protect, canAny('student.view.all', 'student.mentor-action', 'student.create'), reviewApplication);
router.patch('/:id/reset', protect, canAny('student.view.all', 'student.mentor-action', 'student.create'), resetApplication);
router.delete('/:id', protect, canAny('student.view.all', 'student.mentor-action', 'student.create'), deleteApplication);

module.exports = router;
