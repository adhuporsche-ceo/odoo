require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, initializeDatabase } = require('../config/postgres');

const workspaceRoot = path.join(__dirname, '..');
const envPath = path.join(workspaceRoot, '.env');
const credentialsPath = path.join(workspaceRoot, '.local-accounts.json');
const accountDefinitions = [
  {
    name: 'System Administrator',
    email: 'admin@college.edu',
    role: 'SUPER_ADMIN',
    department: 'ALL',
    passwordEnv: 'ADMIN_LOGIN_PASSWORD',
  },
  {
    name: 'Placement Coordinator',
    email: 'coordinator@college.edu',
    role: 'PLACEMENT_COORDINATOR',
    department: 'ALL',
    passwordEnv: 'PLACEMENT_COORDINATOR_PASSWORD',
  },
  {
    name: 'Student',
    email: 'student@college.edu',
    role: 'STUDENT',
    department: 'CSE',
    registerNumber: '710021104001',
  },
];

const readCredentials = () => {
  if (!fs.existsSync(credentialsPath)) return { accounts: [] };
  return JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
};

const ensureJwtSecret = () => {
  if (process.env.JWT_SECRET) return;
  const secret = crypto.randomBytes(48).toString('base64url');
  const envContents = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  fs.appendFileSync(envPath, `${envContents.endsWith('\n') || !envContents ? '' : '\n'}JWT_SECRET=${secret}\n`);
  process.env.JWT_SECRET = secret;
};

const seedAccounts = async () => {
  await initializeDatabase();
  ensureJwtSecret();

  const credentials = readCredentials();
  const credentialByEmail = new Map(credentials.accounts.map((account) => [account.email, account]));
  const savedAccounts = [];

  for (const definition of accountDefinitions) {
    const email = definition.email.toLowerCase();
    const { rows } = await pool.query(
      `SELECT id, password_hash FROM users WHERE lower(email) = $1 LIMIT 1`,
      [email]
    );
    const existing = rows[0];
    const configuredPassword = process.env[definition.passwordEnv];

    if (existing) {
      if (configuredPassword && !(await bcrypt.compare(configuredPassword, existing.password_hash))) {
        const passwordHash = await bcrypt.hash(configuredPassword, 12);
        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [passwordHash, existing.id]
        );
        credentialByEmail.set(email, { email, role: definition.role, password: configuredPassword });
      }
      savedAccounts.push(credentialByEmail.get(email));
      continue;
    }

    const savedCredential = credentialByEmail.get(email);
    const password = configuredPassword || savedCredential?.password || crypto.randomBytes(24).toString('base64url');
    const passwordHash = await bcrypt.hash(password, 12);
    const { rows: inserted } = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, department, register_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [
        definition.name,
        email,
        passwordHash,
        definition.role,
        definition.department,
        definition.registerNumber || null,
      ]
    );

    if (!inserted[0]) {
      throw new Error(`Could not create the configured account for ${email}; check for a duplicate register number.`);
    }

    const credential = { email, role: definition.role, password };
    credentialByEmail.set(email, credential);
    savedAccounts.push(credential);
    console.log(`Created ${definition.role} account: ${email}`);
  }

  credentials.accounts = savedAccounts.filter(Boolean);
  fs.writeFileSync(credentialsPath, `${JSON.stringify(credentials, null, 2)}\n`, { mode: 0o600 });
  console.log('Local login credentials are stored in .local-accounts.json.');
};

seedAccounts()
  .catch((error) => {
    console.error('PostgreSQL account setup failed:', error.code || error.name || 'UnknownError');
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
