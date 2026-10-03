const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const { pool } = require('../config/postgres');
const { normalizeRole } = require('../config/permissions');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email/register number and password',
      });
    }

    const input = email.trim().toLowerCase();

    const { rows } = await pool.query(
      `SELECT id, name, email, password_hash, role, department, register_number, student_profile_id
       FROM users
       WHERE lower(email) = $1 OR lower(register_number) = $1
       LIMIT 1`,
      [input]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User does not exist.',
      });
    }

    // Check password
    if (!(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    const token = generateToken(user.id);
    await pool.query(
      `INSERT INTO audit_logs (user_id, user_name, user_role, action, details, ip_address)
       VALUES ($1, $2, $3, 'LOGIN', $4, $5)`,
      [user.id, user.name, user.role, `User ${user.email} logged in successfully`, req.ip || '']
    );

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: normalizeRole(user.role),
          department: user.department,
          registerNumber: user.register_number,
          studentProfileId: user.student_profile_id,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

const signupStudent = async (req, res, next) => {
  try {
    const { name, email, registerNumber, department, password } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedRegisterNumber = String(registerNumber || '').trim().toUpperCase();
    const normalizedName = String(name || '').trim();
    const normalizedDepartment = String(department || 'CSE').trim().toUpperCase();

    if (
      !normalizedName ||
      normalizedName.length > 100 ||
      !validator.isEmail(normalizedEmail) ||
      !/^[A-Z0-9]+$/.test(normalizedRegisterNumber) ||
      normalizedDepartment.length > 100
    ) {
      return res.status(400).json({ success: false, message: 'Enter a name, valid email, and an alphanumeric register number.' });
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Password must contain at least 8 characters and no more than 72 bytes.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, register_number)
       VALUES ($1, $2, $3, 'STUDENT', $4, $5)
       RETURNING id, name, email, role, department, register_number, student_profile_id`,
      [normalizedName, normalizedEmail, passwordHash, normalizedDepartment, normalizedRegisterNumber]
    );
    const student = rows[0];

    const user = {
      id: student.id,
      name: student.name,
      email: student.email,
      role: normalizeRole(student.role),
      department: student.department,
      registerNumber: student.register_number,
      studentProfileId: student.student_profile_id,
    };

    return res.status(201).json({
      success: true,
      message: 'Student account created successfully.',
      data: { token: generateToken(user.id), user },
    });
  } catch (error) {
    if (error.code === '23505' || error.code === 11000) {
      return res.status(409).json({ success: false, message: 'That email or register number is already registered.' });
    }
    return next(error);
  }
};

// @desc    Logout user / clear audit
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await pool.query(
        `INSERT INTO audit_logs (user_id, user_name, user_role, action, details, ip_address)
         VALUES ($1, $2, $3, 'LOGOUT', $4, $5)`,
        [req.user._id, req.user.name, req.user.role, `User ${req.user.email} logged out`, req.ip || '']
      );
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      data: { ...req.user, role: normalizeRole(req.user.role) },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, signupStudent, logout, getMe };
