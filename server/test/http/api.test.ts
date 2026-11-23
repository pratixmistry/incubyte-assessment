import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { anEmployee, testApp } from '../helpers.js';

/** HTTP contract tests: status codes, validation errors and wiring. Business rules are covered in service tests. */
describe('HTTP API', () => {
  let app: Express;

  beforeEach(() => {
    ({ app } = testApp());
  });

  it('GET /api/health', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  describe('employees', () => {
    it('creates, reads, updates and deletes an employee', async () => {
      const created = await request(app).post('/api/employees').send(anEmployee({ salary: 90_000 })).expect(201);
      expect(created.headers.location).toBe(`/api/employees/${created.body.id}`);

      const id = created.body.id;
      await request(app).get(`/api/employees/${id}`).expect(200);

      const updated = await request(app)
        .put(`/api/employees/${id}`)
        .send({ ...anEmployee(), salary: 95_000 })
        .expect(200);
      expect(updated.body.salaryHistory).toHaveLength(2);

      await request(app).delete(`/api/employees/${id}`).expect(204);
      await request(app).get(`/api/employees/${id}`).expect(404);
    });

    it('returns field-level validation errors', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ ...anEmployee(), email: 'not-an-email', salary: -5, countryCode: 'XX' })
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(Object.keys(response.body.fields).sort()).toEqual(['countryCode', 'email', 'salary']);
    });

    it('normalises input (trims, lower-cases email, upper-cases country)', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ ...anEmployee(), fullName: '  Grace Hopper ', email: ' Grace@ACME.example ', countryCode: 'gb' })
        .expect(201);

      expect(response.body).toMatchObject({ fullName: 'Grace Hopper', email: 'grace@acme.example', countryCode: 'GB' });
    });

    it('returns 409 for a duplicate email', async () => {
      const input = anEmployee();
      await request(app).post('/api/employees').send(input).expect(201);
      const response = await request(app).post('/api/employees').send(input).expect(409);
      expect(response.body.fields.email).toMatch(/already exists/);
    });

    it('returns 400 for malformed JSON and invalid ids or query params', async () => {
      await request(app).post('/api/employees').set('Content-Type', 'application/json').send('{oops').expect(400);
      await request(app).get('/api/employees/abc').expect(400);
      await request(app).get('/api/employees?pageSize=1000').expect(400);
      await request(app).get('/api/employees?sort=password').expect(400);
    });

    it('lists with filters and pagination', async () => {
      await request(app).post('/api/employees').send(anEmployee({ countryCode: 'IN', salary: 2_000_000 }));
      await request(app).post('/api/employees').send(anEmployee({ countryCode: 'US' }));

      const response = await request(app).get('/api/employees?country=IN&pageSize=10').expect(200);
      expect(response.body).toMatchObject({ total: 1, page: 1, pageSize: 10 });
      expect(response.body.items[0]).toMatchObject({ countryCode: 'IN', currency: 'INR' });
    });
  });

  describe('insights', () => {
    beforeEach(async () => {
      await request(app).post('/api/employees').send(anEmployee({ countryCode: 'US', salary: 100_000 }));
      await request(app).post('/api/employees').send(anEmployee({ countryCode: 'DE', salary: 80_000 }));
    });

    it('GET /summary', async () => {
      const response = await request(app).get('/api/insights/summary').expect(200);
      expect(response.body).toMatchObject({ headcount: 2, countries: 2, currency: 'USD' });
    });

    it('GET /breakdown groups by the requested dimension', async () => {
      const response = await request(app).get('/api/insights/breakdown?groupBy=country').expect(200);
      expect(response.body.rows.map((r: { key: string }) => r.key)).toEqual(['US', 'DE']);
    });

    it('GET /distribution', async () => {
      const response = await request(app).get('/api/insights/distribution?country=DE').expect(200);
      expect(response.body.currency).toBe('EUR');
    });

    it('rejects an unknown country or grouping', async () => {
      await request(app).get('/api/insights/summary?country=ZZ').expect(400);
      await request(app).get('/api/insights/breakdown?groupBy=salary').expect(400);
    });
  });

  it('GET /api/meta returns reference data for the UI', async () => {
    await request(app).post('/api/employees').send(anEmployee({ jobTitle: 'Data Scientist' }));
    const response = await request(app).get('/api/meta').expect(200);
    expect(response.body.countries).toContainEqual({ code: 'IN', name: 'India', currency: 'INR' });
    expect(response.body.departments).toContain('Engineering');
    expect(response.body.jobTitles).toEqual(['Data Scientist']);
  });

  it('returns JSON 404 for unknown API routes', async () => {
    await request(app).get('/api/nope').expect(404, { error: 'Not found' });
  });
});
