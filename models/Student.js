const mongoose = require('mongoose');

// Semester Subdocument
const semesterSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: [1, 'Semester must be between 1 and 8'],
      max: [8, 'Semester must be between 1 and 8'],
    },
    sgpa: {
      type: Number,
      required: [true, 'SGPA is required'],
      min: [0, 'SGPA must be between 0 and 10'],
      max: [10, 'SGPA must be between 0 and 10'],
    },
    cgpa: {
      type: Number,
      required: [true, 'CGPA is required'],
      min: [0, 'CGPA must be between 0 and 10'],
      max: [10, 'CGPA must be between 0 and 10'],
    },
    attendance: {
      type: Number,
      required: [true, 'Attendance percentage is required'],
      min: [0, 'Attendance must be between 0 and 100'],
      max: [100, 'Attendance must be between 0 and 100'],
    },
    arrearStatus: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    numberOfArrears: {
      type: Number,
      default: 0,
      min: [0, 'Arrears count cannot be negative'],
    },
    academicAchievements: {
      type: String,
      default: '',
      trim: true,
    },
    subjectsStrong: {
      type: [String],
      default: [],
    },
  },
  { _id: true, timestamps: true }
);

// Arrear Subdocument
const arrearSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
    semesterOccurred: {
      type: Number,
      required: [true, 'Semester in which arrear occurred is required'],
      min: 1,
      max: 8,
    },
    subjectCode: {
      type: String,
      required: [true, 'Subject code is required'],
      trim: true,
      uppercase: true,
    },
    subjectName: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    attempts: {
      type: Number,
      default: 1,
      min: [1, 'Attempts must be at least 1'],
    },
    status: {
      type: String,
      enum: ['Pending', 'Cleared'],
      default: 'Pending',
    },
    clearedSemester: {
      type: Number,
      min: 1,
      max: 8,
      default: null,
    },
    clearedGrade: {
      type: String,
      enum: ['O', 'A+', 'A', 'B+', 'B', 'C', 'P', ''],
      default: '',
    },
    reason: {
      type: String,
      enum: ['Concept Difficulty', 'Health Issue', 'Exam Anxiety', 'Lack of Preparation', 'Attendance Shortage', 'Other', ''],
      default: '',
    },
    remedialRequired: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
    mentorSupportRequired: {
      type: String,
      enum: ['Yes', 'No'],
      default: 'No',
    },
  },
  { _id: true, timestamps: true }
);

// Certification Subdocument
const certificationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    issueDate: { type: Date, default: null },
    expiryDate: { type: Date, default: null },
    credentialId: { type: String, default: '', trim: true },
    credentialUrl: { type: String, default: '', trim: true },
  },
  { _id: true }
);

// Project Subdocument
const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    technologies: { type: [String], default: [] },
    projectUrl: { type: String, default: '', trim: true },
    role: { type: String, default: '', trim: true },
    projectStatus: {
      type: String,
      enum: ['In Progress', 'Completed', 'Deployed'],
      default: 'Completed',
    },
  },
  { _id: true }
);

// Hackathon Subdocument
const hackathonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    organizer: { type: String, default: '', trim: true },
    date: { type: Date, default: null },
    position: { type: String, default: 'Participant', trim: true },
    projectTitle: { type: String, default: '', trim: true },
  },
  { _id: true }
);

// Coding Contest Subdocument
const contestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    platform: { type: String, default: '', trim: true },
    result: { type: String, default: '', trim: true },
  },
  { _id: true }
);

// Internship Subdocument
const internshipSchema = new mongoose.Schema(
  {
    company: { type: String, required: true, trim: true },
    role: { type: String, required: true, trim: true },
    duration: { type: String, default: '', trim: true },
    description: { type: String, default: '', trim: true },
  },
  { _id: true }
);

// Mentor Intervention Subdocument
const mentorInterventionSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.Mixed, default: () => new mongoose.Types.ObjectId() },
    date: { type: Date, default: Date.now },
    reason: { type: String, required: [true, 'Reason is required'], trim: true },
    mentorNote: { type: String, required: [true, 'Mentor note is required'], trim: true },
    actionTaken: { type: String, default: '', trim: true },
    followUpDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['Open', 'In Progress', 'Resolved'],
      default: 'Open',
    },
    mentorName: { type: String, default: 'Faculty Mentor' },
    mentorId: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: true, timestamps: true }
);

// Main Student Schema
const studentSchema = new mongoose.Schema(
  {
    id: { type: String, default: '' },
    createdBy: { type: mongoose.Schema.Types.Mixed, default: null },
    createdByRole: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    updatedByRole: { type: String, default: '' },
    deletedBy: { type: mongoose.Schema.Types.Mixed, default: null },
    deletedAt: { type: Date, default: null, index: true },
    mentorId: { type: mongoose.Schema.Types.Mixed, default: null, index: true },
    personalDetails: {
      registerNumber: {
        type: String,
        required: [true, 'Register Number is required'],
        unique: true,
        trim: true,
        uppercase: true,
      },
      name: {
        type: String,
        required: [true, 'Student Name is required'],
        trim: true,
      },
      dob: {
        type: String,
        required: [true, 'Date of Birth is required'],
      },
      gender: {
        type: String,
        required: [true, 'Gender is required'],
        enum: ['Male', 'Female', 'Other'],
      },
      bloodGroup: {
        type: String,
        default: 'O+',
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      },
      department: {
        type: String,
        required: [true, 'Department is required'],
        trim: true,
        uppercase: true,
      },
      section: {
        type: String,
        required: [true, 'Section is required'],
        trim: true,
        uppercase: true,
      },
      batch: {
        type: String,
        default: '2023-2027',
        trim: true,
      },
      currentSemester: {
        type: Number,
        default: 4,
        min: 1,
        max: 8,
      },
      institutionalEmail: {
        type: String,
        required: [true, 'Institutional Email is required'],
        trim: true,
        lowercase: true,
      },
      personalEmail: {
        type: String,
        required: [true, 'Personal Email is required'],
        trim: true,
        lowercase: true,
      },
      mobile: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true,
      },
      residentialAddress: {
        type: String,
        required: [true, 'Residential Address is required'],
        trim: true,
      },
      category: {
        type: String,
        enum: ['Day Scholar', 'Hosteller'],
        required: [true, 'Category (Day Scholar / Hosteller) is required'],
      },
      hostelName: {
        type: String,
        default: '',
        trim: true,
      },
      distanceFromCollege: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    familyDetails: {
      father: {
        name: { type: String, default: '', trim: true },
        occupation: { type: String, default: '', trim: true },
        incomeRange: {
          type: String,
          default: '',
          trim: true,
        },
        mobile: { type: String, default: '', trim: true },
      },
      mother: {
        name: { type: String, default: '', trim: true },
        occupation: { type: String, default: '', trim: true },
        incomeRange: {
          type: String,
          default: '',
          trim: true,
        },
        mobile: { type: String, default: '', trim: true },
      },
      guardianName: { type: String, default: '', trim: true },
      emergencyContact: {
        type: String,
        required: [true, 'Emergency Contact Number is required'],
        trim: true,
      },
      firstGenGraduate: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No',
      },
      scholarshipReceived: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No',
      },
      guidanceRequired: {
        type: String,
        enum: ['Yes', 'No'],
        default: 'No',
      },
    },

    semesters: {
      type: [semesterSchema],
      default: [],
    },

    arrears: {
      type: [arrearSchema],
      default: [],
    },

    technicalProfile: {
      programmingLanguages: { type: [String], default: [] },
      technicalSkills: { type: [String], default: [] },
      preferredDomain: {
        type: String,
        default: 'Web Development',
        trim: true,
      },
      areasOfInterest: { type: [String], default: [] },
      certifications: { type: [certificationSchema], default: [] },
      projects: { type: [projectSchema], default: [] },
      hackathons: { type: [hackathonSchema], default: [] },
      codingContests: { type: [contestSchema], default: [] },
      internships: { type: [internshipSchema], default: [] },
      profileLinks: {
        github: { type: String, default: '', trim: true },
        linkedin: { type: String, default: '', trim: true },
        hackerrank: { type: String, default: '', trim: true },
        hackerearth: { type: String, default: '', trim: true },
      },
      communicationLevel: {
        type: String,
        default: 'Intermediate',
        trim: true,
      },
      aptitudeLevel: {
        type: String,
        default: 'Intermediate',
        trim: true,
      },
    },

    selfEvaluation: {
      academicStrengths: { type: [String], default: [] },
      technicalStrengths: { type: [String], default: [] },
      communicationStrengths: { type: [String], default: [] },
      leadershipQualities: { type: [String], default: [] },
      teamworkAbilities: { type: [String], default: [] },
      improvementAreas: { type: [String], default: [] },
      shortTermGoal: { type: String, default: '', trim: true },
      longTermGoal: { type: String, default: '', trim: true },
      mentorSupportExpected: { type: String, default: '', trim: true },
    },

    careerGoal: {
      primaryGoal: {
        type: String,
        enum: ['Placement', 'Higher Studies', 'Entrepreneurship', 'Government Exam'],
        default: 'Placement',
      },
      preferredCompanies: { type: [String], default: [] },
      expectedPackageRange: {
        type: String,
        default: '6–10 LPA',
        trim: true,
      },
      higherStudiesField: { type: String, default: '', trim: true },
      higherStudiesTargetExam: { type: String, default: '', trim: true },
      entrepreneurshipIdea: { type: String, default: '', trim: true },
      specificInterest: { type: String, default: '', trim: true },
    },

    mentorInterventions: {
      type: [mentorInterventionSchema],
      default: [],
    },

    consent: {
      type: Boolean,
      default: false,
    },

    auditTrail: [
      {
        action: { type: String, required: true },
        performedBy: { type: mongoose.Schema.Types.Mixed },
        performedByName: { type: String, default: '' },
        performedByRole: { type: String, default: '' },
        timestamp: { type: Date, default: Date.now },
        details: { type: String, default: '' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
studentSchema.index({ 'personalDetails.department': 1, 'personalDetails.section': 1 });
studentSchema.index({ 'personalDetails.category': 1 });
studentSchema.index({ 'careerGoal.primaryGoal': 1 });

const Student = mongoose.models.Student || mongoose.model('Student', studentSchema);

module.exports = Student;
