import swaggerUi from 'swagger-ui-express';

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'HIK Attendance API',
    version: '1.0.0',
    description: 'API Documentation for the HIK Attendance Management System backend.',
    contact: {
      name: 'Support',
      email: 'amdtechno@outlook.com'
    }
  },
  servers: [
    {
      url: 'https://hikapi.amdtechno.in/api',
      description: 'Production Server'
    },
    {
      url: 'http://localhost:9001/api',
      description: 'Local Development Server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Enter your JWT token in the format: <token>'
      }
    },
    schemas: {
      LoginRequest: {
        type: 'object',
        required: ['password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'master@example.com', description: 'Email address (Alternative to emailOrShortName)' },
          emailOrShortName: { type: 'string', example: 'master@example.com', description: 'Email address or shortname code' },
          password: { type: 'string', format: 'password', example: 'Amd@737373@' }
        }
      },
      LoginResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string', example: '60d0fe4f5311236168a109ca' },
              email: { type: 'string', example: 'master@example.com' },
              role: { type: 'string', example: 'master' }
            }
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Error description' }
        }
      },
      Institution: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109cb' },
          name: { type: 'string', example: 'MNCVV School' },
          code: { type: 'string', example: 'MNCVV' },
          dbName: { type: 'string', example: 'hik_attendance_mncvv' },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      Device: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109cc' },
          name: { type: 'string', example: 'Main Gate Reader' },
          ipAddress: { type: 'string', example: '192.168.1.100' },
          port: { type: 'number', example: 80 },
          username: { type: 'string', example: 'admin' },
          status: { type: 'string', example: 'online' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109cd' },
          name: { type: 'string', example: 'John Doe' },
          employeeId: { type: 'string', example: 'EMP101' },
          role: { type: 'string', example: 'employee' },
          email: { type: 'string', format: 'email', example: 'john@example.com' },
          seniority: { type: 'number', example: 1 }
        }
      },
      Leave: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109ce' },
          employeeId: { type: 'string', example: 'EMP101' },
          startDate: { type: 'string', format: 'date', example: '2026-06-01' },
          endDate: { type: 'string', format: 'date', example: '2026-06-02' },
          type: { type: 'string', enum: ['CL', 'EL', 'ML'], example: 'CL' },
          reason: { type: 'string', example: 'Family function' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'pending' }
        }
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109cf' },
          employeeId: { type: 'string', example: 'EMP101' },
          date: { type: 'string', format: 'date', example: '2026-06-05' },
          startTime: { type: 'string', example: '09:00' },
          endTime: { type: 'string', example: '10:00' },
          reason: { type: 'string', example: 'Doctor appointment' },
          status: { type: 'string', enum: ['pending', 'approved', 'rejected'], example: 'pending' }
        }
      },
      CompOff: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109d0' },
          employeeId: { type: 'string', example: 'EMP101' },
          date: { type: 'string', format: 'date', example: '2026-05-24' },
          hoursWorked: { type: 'number', example: 8 },
          status: { type: 'string', enum: ['available', 'used', 'cancelled'], example: 'available' }
        }
      },
      Holiday: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '60d0fe4f5311236168a109d1' },
          name: { type: 'string', example: 'New Year' },
          date: { type: 'string', format: 'date', example: '2026-01-01' },
          description: { type: 'string', example: 'National holiday' }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'User Login',
        description: 'Authenticates a user and returns a JWT token.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' }
            }
          }
        },
        responses: {
          200: {
            description: 'Authentication successful',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } }
          },
          401: {
            description: 'Invalid credentials',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } }
          }
        }
      }
    },
    '/masters/bootstrap': {
      post: {
        tags: ['Masters'],
        summary: 'Bootstrap Master User',
        description: 'Creates the first master user in the system if none exists.',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'master@example.com' },
                  password: { type: 'string', example: 'MasterPassword123' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Master bootstrapped successfully' },
          400: { description: 'A master user already exists or invalid data' }
        }
      }
    },
    '/masters': {
      get: {
        tags: ['Masters'],
        summary: 'List Masters',
        description: 'Retrieve a list of all master administrators.',
        responses: {
          200: { description: 'Success' },
          401: { description: 'Unauthorized' }
        }
      },
      post: {
        tags: ['Masters'],
        summary: 'Create Master User',
        description: 'Create a new master administrator.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Master created successfully' }
        }
      }
    },
    '/masters/{id}': {
      put: {
        tags: ['Masters'],
        summary: 'Update Master',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Master updated successfully' }
        }
      },
      delete: {
        tags: ['Masters'],
        summary: 'Delete Master',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Master deleted successfully' }
        }
      }
    },
    '/institutions': {
      get: {
        tags: ['Institutions (Tenants)'],
        summary: 'List Institutions',
        description: 'Retrieve all institutions/tenants.',
        responses: {
          200: {
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Institution' } } } }
          }
        }
      },
      post: {
        tags: ['Institutions (Tenants)'],
        summary: 'Create Institution',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'code', 'dbName'],
                properties: {
                  name: { type: 'string', example: 'MNCVV School' },
                  code: { type: 'string', example: 'MNCVV' },
                  dbName: { type: 'string', example: 'hik_attendance_mncvv' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Institution created successfully' }
        }
      }
    },
    '/institutions/{id}': {
      put: {
        tags: ['Institutions (Tenants)'],
        summary: 'Update Institution',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          200: { description: 'Institution updated' }
        }
      },
      delete: {
        tags: ['Institutions (Tenants)'],
        summary: 'Delete Institution',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Institution deleted' }
        }
      }
    },
    '/institutions/{institutionId}/devices': {
      get: {
        tags: ['Devices'],
        summary: 'List Institution Devices',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Device' } } } }
          }
        }
      },
      post: {
        tags: ['Devices'],
        summary: 'Create/Register Device',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'ipAddress', 'port', 'username', 'password'],
                properties: {
                  name: { type: 'string' },
                  ipAddress: { type: 'string' },
                  port: { type: 'number' },
                  username: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'Device registered' }
        }
      }
    },
    '/institutions/{institutionId}/users': {
      get: {
        tags: ['Users'],
        summary: 'List Institution Users',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Success',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/User' } } } }
          }
        }
      },
      post: {
        tags: ['Users'],
        summary: 'Add User to Institution',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'employeeId', 'role'],
                properties: {
                  name: { type: 'string' },
                  employeeId: { type: 'string' },
                  role: { type: 'string', enum: ['employee', 'institution_admin'] },
                  email: { type: 'string' },
                  password: { type: 'string' }
                }
              }
            }
          }
        },
        responses: {
          201: { description: 'User created' }
        }
      }
    },
    '/institutions/{institutionId}/users-dropdown': {
      get: {
        tags: ['Users'],
        summary: 'Get Users list for dropdowns',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/users-with-attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'Get Users with current month attendance logs',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/users-with-daily-attendance-list': {
      get: {
        tags: ['Attendance'],
        summary: 'Get Users Daily Attendance Status List',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/consolidated-monthly-report': {
      get: {
        tags: ['Reports'],
        summary: 'Generate Consolidated Monthly Excel Report',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'YYYY-MM format' },
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start date YYYY-MM-DD format (custom range)' },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End date YYYY-MM-DD format (custom range)' }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/attendance/sync-device': {
      post: {
        tags: ['Attendance'],
        summary: 'Trigger Attendance Sync from Hikvision Device',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Sync job triggered successfully' } }
      }
    },
    '/institutions/{institutionId}/attendance/sync-job-status': {
      get: {
        tags: ['Attendance'],
        summary: 'Get Sync Job Status',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/upload-manual-attendance': {
      post: {
        tags: ['Attendance'],
        summary: 'Upload manual attendance via Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'File processed' } }
      }
    },
    '/institutions/{institutionId}/leaves': {
      get: {
        tags: ['Leaves'],
        summary: 'Get Leave requests list',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Leave' } } } }
          }
        }
      },
      post: {
        tags: ['Leaves'],
        summary: 'Apply for Leave',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'startDate', 'endDate', 'type', 'reason'],
                properties: {
                  employeeId: { type: 'string' },
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' },
                  type: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Leave applied successfully' } }
      }
    },
    '/institutions/{institutionId}/leaves/{leaveId}/approve': {
      put: {
        tags: ['Leaves'],
        summary: 'Approve Leave Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'leaveId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Leave approved' } }
      }
    },
    '/institutions/{institutionId}/leaves/{leaveId}/reject': {
      put: {
        tags: ['Leaves'],
        summary: 'Reject Leave Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'leaveId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Leave rejected' } }
      }
    },
    '/institutions/{institutionId}/permissions': {
      get: {
        tags: ['Permissions'],
        summary: 'Get Permission requests list',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Permission' } } } }
          }
        }
      },
      post: {
        tags: ['Permissions'],
        summary: 'Request hourly permission/pass',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'date', 'startTime', 'endTime', 'reason'],
                properties: {
                  employeeId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Permission requested successfully' } }
      }
    },
    '/institutions/{institutionId}/permissions/{permissionId}/approve': {
      put: {
        tags: ['Permissions'],
        summary: 'Approve Permission Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'permissionId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Permission approved' } }
      }
    },
    '/institutions/{institutionId}/compoff': {
      get: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Get all CompOff records',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/CompOff' } } } }
          }
        }
      }
    },
    '/institutions/{institutionId}/compoff/manual': {
      post: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Create CompOff manually',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employeeId', 'date', 'hoursWorked'],
                properties: {
                  employeeId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  hoursWorked: { type: 'number' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'CompOff created manually' } }
      }
    },
    '/institutions/{institutionId}/holidays': {
      get: {
        tags: ['Holidays'],
        summary: 'Get all holidays',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Holiday' } } } }
          }
        }
      },
      post: {
        tags: ['Holidays'],
        summary: 'Add Holiday',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'date'],
                properties: {
                  name: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Holiday created' } }
      }
    },
    '/institutions/{institutionId}/hikvision/listen': {
      get: {
        tags: ['Hikvision Device Listener'],
        summary: 'Receive event stream / uploads from Hikvision device',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Heartbeat or acknowledgement returned' } }
      }
    },
    '/institutions/{institutionId}/send-daily-reports': {
      post: {
        tags: ['Emails'],
        summary: 'Manually trigger sending daily reports email',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Daily report emails queued/sent successfully' } }
      }
    },
    '/institutions/{institutionId}/dashboard': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get Institution Dashboard Stats',
        description: 'Retrieve real-time metrics including active devices, total users, attendance percentage, absentees, late comers, and hourly trends.',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Specific date for stats (e.g. YYYY-MM-DD)' },
          { name: 'period', in: 'query', required: false, schema: { type: 'string', enum: ['day', 'week', 'month', 'year'] }, description: 'Accumulation period' }
        ],
        responses: {
          200: { description: 'Dashboard stats retrieved successfully' }
        }
      }
    },
    '/institutions/{institutionId}/users/{userId}/attendance-stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get User Attendance Stats',
        description: 'Get detailed attendance statistics, presence counts, and average arrival time for a specific user.',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'period', in: 'query', required: false, schema: { type: 'string', enum: ['day', 'week', 'month', 'year'] } }
        ],
        responses: {
          200: { description: 'Attendance statistics retrieved successfully' },
          404: { description: 'User not found' }
        }
      }
    },

    // ===== ATTENDANCE REPORTS / DOWNLOADS =====
    '/institutions/{institutionId}/attendance/export': {
      get: {
        tags: ['Reports'],
        summary: 'Export Attendance Report (Daily / Monthly) as Excel',
        description: 'Downloads an Excel file with attendance records. Use query params to filter by date range (daily report) or month (monthly report).',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Start date YYYY-MM-DD (for daily/range reports)' },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'End date YYYY-MM-DD (for daily/range reports)' },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'Month in YYYY-MM format (for monthly report)' },
          { name: 'userId', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by specific user ID' }
        ],
        responses: {
          200: {
            description: 'Excel file download',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          },
          401: { description: 'Unauthorized' }
        }
      }
    },
    '/institutions/{institutionId}/users-with-daily-attendance': {
      get: {
        tags: ['Reports'],
        summary: 'Get Users with Daily Attendance (detailed)',
        description: 'Returns all users with their daily attendance records for a given date.',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', required: false, schema: { type: 'string', format: 'date' }, description: 'Date in YYYY-MM-DD format (defaults to today)' }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/users-with-monthly-attendance-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get Users with Monthly Attendance Summary',
        description: 'Returns all users with aggregated monthly attendance totals (present, absent, late, etc.).',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'Month in YYYY-MM format (defaults to current month)' }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/monthly-daily-attendance-status': {
      get: {
        tags: ['Reports'],
        summary: 'Get Monthly Daily Attendance Status (Day-wise)',
        description: 'Returns a day-by-day breakdown of attendance statuses for all users in a given month.',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'Month in YYYY-MM format' }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/users-with-current-month-attendance': {
      get: {
        tags: ['Reports'],
        summary: 'Get Users with Current Month Attendance Logs',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Success' } }
      }
    },

    // ===== MANUAL ATTENDANCE =====
    '/attendance/manual-entry': {
      post: {
        tags: ['Attendance'],
        summary: 'Create Manual Attendance Entry',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['institutionId', 'userId', 'date', 'checkIn'],
                properties: {
                  institutionId: { type: 'string' },
                  userId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  checkIn: { type: 'string', example: '09:00' },
                  checkOut: { type: 'string', example: '17:00' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'Manual attendance entry created' } }
      }
    },
    '/institutions/{institutionId}/manual-attendance': {
      get: {
        tags: ['Attendance'],
        summary: 'List Manual Attendance Records',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'date', in: 'query', required: false, schema: { type: 'string', format: 'date' } }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/manual-attendance/{id}': {
      delete: {
        tags: ['Attendance'],
        summary: 'Delete Manual Attendance Entry',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'id', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Deleted successfully' } }
      }
    },
    '/institutions/{institutionId}/manual-attendance-template': {
      get: {
        tags: ['Attendance'],
        summary: 'Download Manual Attendance Excel Template',
        description: 'Downloads a blank Excel template for bulk manual attendance upload.',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel template file',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    },

    // ===== USER MANAGEMENT (extended) =====
    '/institutions/{institutionId}/users/download': {
      get: {
        tags: ['Users'],
        summary: 'Download Users List as Excel',
        description: 'Exports all institution users to an Excel file.',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel file download',
            content: {
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': {
                schema: { type: 'string', format: 'binary' }
              }
            }
          }
        }
      }
    },
    '/institutions/{institutionId}/teachers': {
      get: {
        tags: ['Users'],
        summary: 'Get All Teachers (sorted by seniority)',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'List of teachers sorted by seniority' } }
      }
    },
    '/institutions/{institutionId}/users/{userId}/seniority': {
      put: {
        tags: ['Users'],
        summary: 'Update User Seniority',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['seniority'],
                properties: { seniority: { type: 'number', example: 3 } }
              }
            }
          }
        },
        responses: { 200: { description: 'Seniority updated' } }
      }
    },
    '/institutions/{institutionId}/upload-seniority': {
      post: {
        tags: ['Users'],
        summary: 'Upload Seniority from Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        },
        responses: { 200: { description: 'Seniority data uploaded' } }
      }
    },
    '/institutions/{institutionId}/sync-face-images': {
      post: {
        tags: ['Devices'],
        summary: 'Sync Face Images from Hikvision Device',
        description: 'Pulls face images from the connected Hikvision device and stores them for enrolled users.',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Face images synced successfully' } }
      }
    },
    '/institutions/push-user-device': {
      post: {
        tags: ['Devices'],
        summary: 'Push User to Device',
        description: 'Pushes a user profile and face image to a registered Hikvision device.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['institutionId', 'userId', 'deviceId'],
                properties: {
                  institutionId: { type: 'string' },
                  userId: { type: 'string' },
                  deviceId: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'User pushed to device successfully' } }
      }
    },
    '/institutions/{institutionId}/import-users-device': {
      post: {
        tags: ['Users'],
        summary: 'Import Users from Hikvision Device',
        description: 'Imports user records directly from a connected Hikvision device.',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Users imported from device' } }
      }
    },

    // ===== ON-DUTY MANAGEMENT =====
    '/institutions/{institutionId}/on-duty': {
      get: {
        tags: ['On Duty'],
        summary: 'Get All On-Duty Records for Institution',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'Filter by month YYYY-MM' }
        ],
        responses: { 200: { description: 'Success' } }
      },
      post: {
        tags: ['On Duty'],
        summary: 'Create On-Duty Record',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'date', 'reason'],
                properties: {
                  userId: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  reason: { type: 'string' },
                  location: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'On-duty record created' } }
      }
    },
    '/institutions/{institutionId}/users/{userId}/on-duty': {
      get: {
        tags: ['On Duty'],
        summary: 'Get On-Duty Records for a Specific User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/on-duty-summary': {
      get: {
        tags: ['On Duty'],
        summary: 'Get On-Duty Summary for Institution',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/on-duty/{onDutyId}': {
      put: {
        tags: ['On Duty'],
        summary: 'Update On-Duty Record',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'onDutyId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  date: { type: 'string', format: 'date' },
                  reason: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'On-duty updated' } }
      },
      delete: {
        tags: ['On Duty'],
        summary: 'Delete On-Duty Record',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'onDutyId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'On-duty record deleted' } }
      }
    },
    '/institutions/{institutionId}/on-duty-template': {
      get: {
        tags: ['On Duty'],
        summary: 'Download On-Duty Excel Template',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel template',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    },
    '/institutions/{institutionId}/upload-on-duty': {
      post: {
        tags: ['On Duty'],
        summary: 'Upload On-Duty Records from Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        },
        responses: { 200: { description: 'On-duty data uploaded' } }
      }
    },
    '/institutions/{institutionId}/delete-on-duty-by-dates': {
      post: {
        tags: ['On Duty'],
        summary: 'Delete On-Duty Records by Date Range',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['startDate', 'endDate'],
                properties: {
                  startDate: { type: 'string', format: 'date' },
                  endDate: { type: 'string', format: 'date' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Records deleted by date range' } }
      }
    },

    // ===== LEAVE MANAGEMENT (extended) =====
    '/institutions/{institutionId}/users/{userId}/leaves': {
      get: {
        tags: ['Leaves'],
        summary: 'Get Leave Requests for a Specific User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/leave-summary': {
      get: {
        tags: ['Leaves'],
        summary: 'Get Leave Summary for Institution',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'Month in YYYY-MM format' }
        ],
        responses: { 200: { description: 'Leave summary' } }
      }
    },
    '/institutions/{institutionId}/leaves/{leaveId}': {
      delete: {
        tags: ['Leaves'],
        summary: 'Delete Leave Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'leaveId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Leave deleted' } }
      }
    },
    '/institutions/{institutionId}/leave-template': {
      get: {
        tags: ['Leaves'],
        summary: 'Download Leave Excel Template',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel template',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    },
    '/institutions/{institutionId}/upload-leaves': {
      post: {
        tags: ['Leaves'],
        summary: 'Upload Leave Requests from Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        },
        responses: { 200: { description: 'Leave data uploaded' } }
      }
    },

    // ===== PERMISSION MANAGEMENT (extended) =====
    '/institutions/{institutionId}/users/{userId}/permissions': {
      get: {
        tags: ['Permissions'],
        summary: 'Get Permission Requests for a Specific User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Success' } }
      }
    },
    '/institutions/{institutionId}/permission-summary': {
      get: {
        tags: ['Permissions'],
        summary: 'Get Permission Summary for Institution',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Permission summary' } }
      }
    },
    '/institutions/{institutionId}/permissions/{permissionId}/reject': {
      put: {
        tags: ['Permissions'],
        summary: 'Reject Permission Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'permissionId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Permission rejected' } }
      }
    },
    '/institutions/{institutionId}/permissions/{permissionId}': {
      delete: {
        tags: ['Permissions'],
        summary: 'Delete Permission Request',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'permissionId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Permission deleted' } }
      }
    },
    '/institutions/{institutionId}/permission-template': {
      get: {
        tags: ['Permissions'],
        summary: 'Download Permission Excel Template',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel template',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    },
    '/institutions/{institutionId}/upload-permissions': {
      post: {
        tags: ['Permissions'],
        summary: 'Upload Permissions from Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        },
        responses: { 200: { description: 'Permissions uploaded' } }
      }
    },

    // ===== COMPOFF (extended) =====
    '/institutions/{institutionId}/compoff/automatic': {
      post: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Create CompOff Automatically',
        description: 'Auto-generate CompOff records based on attendance data.',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userId', 'date'],
                properties: {
                  userId: { type: 'string' },
                  date: { type: 'string', format: 'date' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'CompOff created automatically' } }
      }
    },
    '/institutions/{institutionId}/users/{userId}/compoff-balance': {
      get: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Get CompOff Balance for User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'CompOff balance retrieved' } }
      }
    },
    '/institutions/{institutionId}/compoff/{compOffId}/use': {
      put: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Mark CompOff as Used',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'compOffId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'CompOff marked as used' } }
      }
    },
    '/institutions/{institutionId}/compoff/{compOffId}/cancel': {
      put: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Cancel CompOff',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'compOffId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'CompOff cancelled' } }
      }
    },
    '/institutions/{institutionId}/compoff/{compOffId}': {
      delete: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Delete CompOff Record',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'compOffId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'CompOff deleted' } }
      }
    },
    '/institutions/{institutionId}/compoff-template': {
      get: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Download CompOff Excel Template',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        security: [],
        responses: {
          200: {
            description: 'Excel template',
            content: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } } }
          }
        }
      }
    },
    '/institutions/{institutionId}/upload-compoff': {
      post: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Upload CompOff Records from Excel',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } }
            }
          }
        },
        responses: { 200: { description: 'CompOff data uploaded' } }
      }
    },

    // ===== COMPOFF REPORTS =====
    '/institutions/{institutionId}/users/{userId}/compoff-report': {
      get: {
        tags: ['Reports'],
        summary: 'Get Monthly CompOff Report for User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' }, description: 'YYYY-MM format' }
        ],
        responses: { 200: { description: 'CompOff report for user' } }
      }
    },
    '/institutions/{institutionId}/compoff-summary': {
      get: {
        tags: ['Reports'],
        summary: 'Get CompOff Summary for Entire Institution',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'month', in: 'query', required: false, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Institution CompOff summary' } }
      }
    },
    '/institutions/{institutionId}/users/{userId}/compoff-history': {
      get: {
        tags: ['Reports'],
        summary: 'Get CompOff History for User',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'userId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'CompOff history for user' } }
      }
    },

    // ===== COMPOFF ASSIGNMENT =====
    '/institutions/{institutionId}/compoff/assign-faculties': {
      post: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Assign CompOff to Faculty Members',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['userIds', 'date', 'hoursWorked'],
                properties: {
                  userIds: { type: 'array', items: { type: 'string' } },
                  date: { type: 'string', format: 'date' },
                  hoursWorked: { type: 'number' }
                }
              }
            }
          }
        },
        responses: { 201: { description: 'CompOff assigned to faculties' } }
      }
    },
    '/institutions/{institutionId}/compoff/faculty-assignments': {
      get: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Get Faculty CompOff Assignments',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Faculty CompOff assignments' } }
      }
    },
    '/institutions/{institutionId}/compoff/{compOffId}/adjust': {
      patch: {
        tags: ['CompOff (Compensatory Off)'],
        summary: 'Adjust CompOff Assignment',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'compOffId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { hoursWorked: { type: 'number' }, status: { type: 'string' } }
              }
            }
          }
        },
        responses: { 200: { description: 'CompOff adjusted' } }
      }
    },

    // ===== HOLIDAY MANAGEMENT (extended) =====
    '/institutions/{institutionId}/holidays/{holidayId}': {
      get: {
        tags: ['Holidays'],
        summary: 'Get Holiday by ID',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'holidayId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Holiday details', content: { 'application/json': { schema: { $ref: '#/components/schemas/Holiday' } } } } }
      },
      put: {
        tags: ['Holidays'],
        summary: 'Update Holiday',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'holidayId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  description: { type: 'string' }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Holiday updated' } }
      },
      delete: {
        tags: ['Holidays'],
        summary: 'Delete Holiday',
        parameters: [
          { name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'holidayId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: { 200: { description: 'Holiday deleted' } }
      }
    },

    // ===== EMAILS (extended) =====
    '/institutions/{institutionId}/send-custom-email': {
      post: {
        tags: ['Emails'],
        summary: 'Send Custom Email to Institution Users',
        parameters: [{ name: 'institutionId', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['subject', 'body', 'recipients'],
                properties: {
                  subject: { type: 'string', example: 'Attendance Reminder' },
                  body: { type: 'string', example: 'Please mark your attendance.' },
                  recipients: { type: 'array', items: { type: 'string', format: 'email' } }
                }
              }
            }
          }
        },
        responses: { 200: { description: 'Custom email sent successfully' } }
      }
    }
  }
};

export const serve = swaggerUi.serve;
export const setup = swaggerUi.setup(swaggerDocument);
