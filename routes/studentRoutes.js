const express = require('express');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  restoreStudent,
  addSemester,
  updateSemester,
  deleteSemester,
  addArrear,
  updateArrear,
  deleteArrear,
  addIntervention,
  updateIntervention,
  deleteIntervention,
} = require('../controllers/postgresStudentController');
const { protect, can, canAny } = require('../middleware/authMiddleware');
const { importStudents, downloadTemplate } = require('../controllers/studentImportController');

const router = express.Router();

router.use(protect);

router.get('/template', can('student.import'), downloadTemplate);
router.post('/import', can('student.import'), importStudents);

router.route('/')
  .get(canAny('student.view.all', 'student.view.dept', 'student.view.assigned', 'student.view.own'), getStudents)
  .post(can('student.create'), createStudent);

router.route('/:id')
  .get(canAny('student.view.all', 'student.view.dept', 'student.view.assigned', 'student.view.own'), getStudentById)
  .put(can('student.update'), updateStudent)
  .delete(can('student.delete'), deleteStudent);

router.patch('/:id/restore', can('student.delete'), restoreStudent);

// Semesters
router.route('/:id/semesters')
  .post(can('student.update'), addSemester);

router.route('/:id/semesters/:semesterId')
  .put(can('student.update'), updateSemester)
  .delete(can('student.update'), deleteSemester);

// Arrears
router.route('/:id/arrears')
  .post(can('student.update'), addArrear);

router.route('/:id/arrears/:arrearId')
  .put(can('student.update'), updateArrear)
  .delete(can('student.update'), deleteArrear);

// Mentor Interventions
router.route('/:id/interventions')
  .post(can('student.mentor-action'), addIntervention);

router.route('/:id/interventions/:interventionId')
  .put(can('student.mentor-action'), updateIntervention)
  .delete(can('student.mentor-action'), deleteIntervention);

module.exports = router;
