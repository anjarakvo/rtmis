// TODO: Add new certification column (JSON TEXT) into users table to save certification value
const tables = [
  {
    name: 'users',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      name: 'TEXT',
      password: 'TEXT',
      active: 'TINYINT',
      token: 'TEXT',
      certifications: 'TEXT NULL',
      lastSyncedAt: 'DATETIME',
    },
  },
  {
    name: 'config',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      appVersion: 'VARCHAR(255) NOT NULL',
      authenticationCode: 'TEXT',
      serverURL: 'TEXT',
      syncInterval: 'REAL',
      syncWifiOnly: 'TINYINT',
      lang: 'VARCHAR(255) DEFAULT "en" NOT NULL',
      gpsThreshold: 'INTEGER NULL',
      gpsAccuracyLevel: 'INTEGER NULL',
      geoLocationTimeout: 'INTEGER NULL',
    },
  },
  {
    name: 'forms',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      userId: 'INTEGER NULL',
      formId: 'INTEGER NOT NULL',
      version: 'VARCHAR(255)',
      latest: 'TINYINT',
      name: 'VARCHAR(255)',
      json: 'TEXT',
      createdAt: 'DATETIME',
    },
  },
  {
    name: 'datapoints',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      form: 'INTEGER NOT NULL',
      user: 'INTEGER NOT NULL',
      submitter: 'TEXT',
      name: 'VARCHAR(255)',
      geo: 'VARCHAR(255)',
      submitted: 'TINYINT',
      duration: 'REAL',
      createdAt: 'DATETIME',
      submittedAt: 'DATETIME',
      syncedAt: 'DATETIME',
      json: 'TEXT',
      submission_type: 'VARCHAR(191)',
    },
  },
  {
    name: 'monitoring',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      formId: 'INTEGER NOT NULL',
      uuid: 'TEXT type UNIQUE',
      name: 'VARCHAR(255)',
      syncedAt: 'DATETIME',
      json: 'TEXT',
    },
  },
  {
    name: 'sessions',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      token: 'TEXT',
      passcode: 'TEXT',
    },
  },
  {
    name: 'jobs',
    fields: {
      id: 'INTEGER PRIMARY KEY NOT NULL',
      user: 'INTEGER NOT NULL',
      type: 'VARCHAR(191)',
      status: 'INTEGER NOT NULL',
      attempt: 'INTEGER DEFAULT "0" NOT NULL',
      info: 'VARCHAR(255)',
      createdAt: 'DATETIME',
    },
  },
];

export default tables;
