import crypto from 'crypto';
import { DatabaseService } from '../db/database';
import { Student, Teacher } from '../../shared/types';

export class PatronService {
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  // --- Students ---

  public getAllStudents(search?: string, department?: string, status: 'all' | 'active' | 'archived' = 'active'): Student[] {
    let sql = 'SELECT * FROM students WHERE 1=1';
    const params: any[] = [];

    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (full_name LIKE ? OR admission_number LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(term, term, term, term);
    }

    if (department && department !== 'all') {
      sql += ' AND department = ?';
      params.push(department);
    }

    sql += ' ORDER BY full_name ASC';
    const rows = this.db.query<any>(sql, params);

    return rows.map(r => ({
      id: r.id,
      admissionNumber: r.admission_number,
      fullName: r.full_name,
      department: r.department,
      academicYear: r.academic_year,
      semester: r.semester,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    }));
  }

  public getStudentById(id: string): Student | null {
    const rows = this.db.query<any>('SELECT * FROM students WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      admissionNumber: r.admission_number,
      fullName: r.full_name,
      department: r.department,
      academicYear: r.academic_year,
      semester: r.semester,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    };
  }

  public findStudentByIdentifier(identifier: string): Student | null {
    const cleaned = identifier.trim();
    if (!cleaned) return null;
    const rows = this.db.query<any>(
      'SELECT * FROM students WHERE admission_number = ? OR email = ? OR id = ?',
      [cleaned, cleaned, cleaned]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      admissionNumber: r.admission_number,
      fullName: r.full_name,
      department: r.department,
      academicYear: r.academic_year,
      semester: r.semester,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    };
  }

  public createStudent(data: Omit<Student, 'id' | 'currentIssuesCount' | 'createdAt'>): { success: boolean; student?: Student; error?: string } {
    try {
      const existing = this.db.query('SELECT id FROM students WHERE admission_number = ?', [data.admissionNumber.trim()]);
      if (existing.length > 0) {
        return { success: false, error: `Student with Admission Number '${data.admissionNumber}' already exists.` };
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      this.db.run(
        `INSERT INTO students (
          id, admission_number, full_name, department, academic_year, 
          semester, phone, email, status, current_issues_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.admissionNumber.trim(),
          data.fullName.trim(),
          data.department.trim(),
          data.academicYear.trim(),
          data.semester.trim(),
          data.phone?.trim() || '',
          data.email?.trim() || '',
          data.status || 'active',
          0,
          now,
        ]
      );

      this.logPatronActivity('ADD_STUDENT', `Added student: ${data.fullName} (${data.admissionNumber})`, 'success');
      return {
        success: true,
        student: {
          id,
          admissionNumber: data.admissionNumber.trim(),
          fullName: data.fullName.trim(),
          department: data.department.trim(),
          academicYear: data.academicYear.trim(),
          semester: data.semester.trim(),
          phone: data.phone?.trim() || '',
          email: data.email?.trim() || '',
          status: data.status || 'active',
          currentIssuesCount: 0,
          createdAt: now,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public updateStudent(id: string, updates: Partial<Student>): { success: boolean; error?: string } {
    try {
      if (updates.admissionNumber) {
        const existing = this.db.query('SELECT id FROM students WHERE admission_number = ? AND id != ?', [
          updates.admissionNumber.trim(),
          id,
        ]);
        if (existing.length > 0) {
          return { success: false, error: `Admission Number '${updates.admissionNumber}' is already taken.` };
        }
      }

      this.db.run(
        `UPDATE students SET
          admission_number = COALESCE(?, admission_number),
          full_name = COALESCE(?, full_name),
          department = COALESCE(?, department),
          academic_year = COALESCE(?, academic_year),
          semester = COALESCE(?, semester),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          status = COALESCE(?, status)
         WHERE id = ?`,
        [
          updates.admissionNumber?.trim(),
          updates.fullName?.trim(),
          updates.department?.trim(),
          updates.academicYear?.trim(),
          updates.semester?.trim(),
          updates.phone?.trim(),
          updates.email?.trim(),
          updates.status,
          id,
        ]
      );

      this.logPatronActivity('UPDATE_STUDENT', `Updated student ID: ${id}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public archiveStudent(id: string): { success: boolean; error?: string } {
    const student = this.getStudentById(id);
    if (!student) return { success: false, error: 'Student not found.' };

    if (student.currentIssuesCount > 0) {
      return { success: false, error: 'Cannot archive student who has outstanding issued books.' };
    }

    this.db.run("UPDATE students SET status = 'archived' WHERE id = ?", [id]);
    this.logPatronActivity('ARCHIVE_STUDENT', `Archived student ${student.fullName} (${student.admissionNumber})`, 'success');
    return { success: true };
  }

  // --- Teachers ---

  public getAllTeachers(search?: string, department?: string, status: 'all' | 'active' | 'archived' = 'active'): Teacher[] {
    let sql = 'SELECT * FROM teachers WHERE 1=1';
    const params: any[] = [];

    if (status !== 'all') {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      sql += ' AND (full_name LIKE ? OR employee_id LIKE ? OR email LIKE ? OR phone LIKE ?)';
      params.push(term, term, term, term);
    }

    if (department && department !== 'all') {
      sql += ' AND department = ?';
      params.push(department);
    }

    sql += ' ORDER BY full_name ASC';
    const rows = this.db.query<any>(sql, params);

    return rows.map(r => ({
      id: r.id,
      employeeId: r.employee_id,
      fullName: r.full_name,
      department: r.department,
      designation: r.designation,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    }));
  }

  public getTeacherById(id: string): Teacher | null {
    const rows = this.db.query<any>('SELECT * FROM teachers WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      employeeId: r.employee_id,
      fullName: r.full_name,
      department: r.department,
      designation: r.designation,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    };
  }

  public findTeacherByIdentifier(identifier: string): Teacher | null {
    const cleaned = identifier.trim();
    if (!cleaned) return null;
    const rows = this.db.query<any>(
      'SELECT * FROM teachers WHERE employee_id = ? OR email = ? OR id = ?',
      [cleaned, cleaned, cleaned]
    );
    if (!rows || rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      employeeId: r.employee_id,
      fullName: r.full_name,
      department: r.department,
      designation: r.designation,
      phone: r.phone || '',
      email: r.email || '',
      status: r.status,
      currentIssuesCount: Number(r.current_issues_count || 0),
      createdAt: r.created_at,
    };
  }

  public createTeacher(data: Omit<Teacher, 'id' | 'currentIssuesCount' | 'createdAt'>): { success: boolean; teacher?: Teacher; error?: string } {
    try {
      const existing = this.db.query('SELECT id FROM teachers WHERE employee_id = ?', [data.employeeId.trim()]);
      if (existing.length > 0) {
        return { success: false, error: `Teacher with Employee ID '${data.employeeId}' already exists.` };
      }

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      this.db.run(
        `INSERT INTO teachers (
          id, employee_id, full_name, department, designation, 
          phone, email, status, current_issues_count, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.employeeId.trim(),
          data.fullName.trim(),
          data.department.trim(),
          data.designation.trim(),
          data.phone?.trim() || '',
          data.email?.trim() || '',
          data.status || 'active',
          0,
          now,
        ]
      );

      this.logPatronActivity('ADD_TEACHER', `Added teacher: ${data.fullName} (${data.employeeId})`, 'success');
      return {
        success: true,
        teacher: {
          id,
          employeeId: data.employeeId.trim(),
          fullName: data.fullName.trim(),
          department: data.department.trim(),
          designation: data.designation.trim(),
          phone: data.phone?.trim() || '',
          email: data.email?.trim() || '',
          status: data.status || 'active',
          currentIssuesCount: 0,
          createdAt: now,
        },
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public updateTeacher(id: string, updates: Partial<Teacher>): { success: boolean; error?: string } {
    try {
      if (updates.employeeId) {
        const existing = this.db.query('SELECT id FROM teachers WHERE employee_id = ? AND id != ?', [
          updates.employeeId.trim(),
          id,
        ]);
        if (existing.length > 0) {
          return { success: false, error: `Employee ID '${updates.employeeId}' is already in use.` };
        }
      }

      this.db.run(
        `UPDATE teachers SET
          employee_id = COALESCE(?, employee_id),
          full_name = COALESCE(?, full_name),
          department = COALESCE(?, department),
          designation = COALESCE(?, designation),
          phone = COALESCE(?, phone),
          email = COALESCE(?, email),
          status = COALESCE(?, status)
         WHERE id = ?`,
        [
          updates.employeeId?.trim(),
          updates.fullName?.trim(),
          updates.department?.trim(),
          updates.designation?.trim(),
          updates.phone?.trim(),
          updates.email?.trim(),
          updates.status,
          id,
        ]
      );

      this.logPatronActivity('UPDATE_TEACHER', `Updated teacher ID: ${id}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  public archiveTeacher(id: string): { success: boolean; error?: string } {
    const teacher = this.getTeacherById(id);
    if (!teacher) return { success: false, error: 'Teacher not found.' };

    if (teacher.currentIssuesCount > 0) {
      return { success: false, error: 'Cannot archive teacher who has outstanding issued books.' };
    }

    this.db.run("UPDATE teachers SET status = 'archived' WHERE id = ?", [id]);
    this.logPatronActivity('ARCHIVE_TEACHER', `Archived teacher ${teacher.fullName} (${teacher.employeeId})`, 'success');
    return { success: true };
  }

  // Bulk import students
  public bulkImportStudents(rows: Array<{
    admissionNumber: string;
    fullName: string;
    department: string;
    academicYear?: string;
    semester?: string;
    phone?: string;
    email?: string;
  }>): { imported: number; errors: string[] } {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.admissionNumber || !r.admissionNumber.trim()) {
        errors.push(`Row ${i + 1}: Missing Admission Number.`);
        continue;
      }
      if (!r.fullName || !r.fullName.trim()) {
        errors.push(`Row ${i + 1}: Missing Student Name.`);
        continue;
      }

      const res = this.createStudent({
        admissionNumber: r.admissionNumber,
        fullName: r.fullName,
        department: r.department || 'General',
        academicYear: r.academicYear || '2026-2027',
        semester: r.semester || '1st Semester',
        phone: r.phone || '',
        email: r.email || '',
        status: 'active',
      });

      if (res.success) imported++;
      else errors.push(`Row ${i + 1} (${r.admissionNumber}): ${res.error}`);
    }

    return { imported, errors };
  }

  // Bulk import teachers
  public bulkImportTeachers(rows: Array<{
    employeeId: string;
    fullName: string;
    department: string;
    designation?: string;
    phone?: string;
    email?: string;
  }>): { imported: number; errors: string[] } {
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (!r.employeeId || !r.employeeId.trim()) {
        errors.push(`Row ${i + 1}: Missing Employee ID.`);
        continue;
      }
      if (!r.fullName || !r.fullName.trim()) {
        errors.push(`Row ${i + 1}: Missing Teacher Name.`);
        continue;
      }

      const res = this.createTeacher({
        employeeId: r.employeeId,
        fullName: r.fullName,
        department: r.department || 'General',
        designation: r.designation || 'Faculty',
        phone: r.phone || '',
        email: r.email || '',
        status: 'active',
      });

      if (res.success) imported++;
      else errors.push(`Row ${i + 1} (${r.employeeId}): ${res.error}`);
    }

    return { imported, errors };
  }

  private logPatronActivity(action: string, details: string, status: 'success' | 'warning' | 'error'): void {
    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    try {
      this.db.run(
        'INSERT INTO activity_logs (id, timestamp, action, category, details, status) VALUES (?, ?, ?, ?, ?, ?)',
        [id, timestamp, action, 'student', details, status]
      );
    } catch {}
  }
}
