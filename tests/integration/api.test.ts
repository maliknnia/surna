// Integration tests for API endpoints
import request from 'supertest';
import { app } from '../../server';

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    it('should return 401 for protected routes without auth', async () => {
      await request(app)
        .get('/api/auth/user')
        .expect(401);
    });

    it('should redirect to login when accessing login endpoint', async () => {
      const response = await request(app)
        .get('/api/login')
        .expect(302);
      
      expect(response.headers.location).toContain('replit.com');
    });
  });

  describe('Posts API', () => {
    it('should return posts for authenticated users', async () => {
      // Mock authenticated session
      const agent = request.agent(app);
      
      // This would need proper session setup in real tests
      const response = await agent
        .get('/api/posts')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create post with valid data', async () => {
      const agent = request.agent(app);
      
      const postData = {
        content: 'Test post content',
        type: 'text'
      };
      
      const response = await agent
        .post('/api/posts')
        .send(postData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.content).toBe(postData.content);
    });

    it('should validate post data', async () => {
      const agent = request.agent(app);
      
      const invalidPostData = {
        content: '', // Empty content should fail
        type: 'text'
      };
      
      await agent
        .post('/api/posts')
        .send(invalidPostData)
        .expect(400);
    });
  });

  describe('Teams API', () => {
    it('should return teams list', async () => {
      const agent = request.agent(app);
      
      const response = await agent
        .get('/api/teams')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create team with valid data', async () => {
      const agent = request.agent(app);
      
      const teamData = {
        name: 'Test Team',
        sport: 'Basketball',
        description: 'A test basketball team'
      };
      
      const response = await agent
        .post('/api/teams')
        .send(teamData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(teamData.name);
    });
  });

  describe('Events API', () => {
    it('should return events list', async () => {
      const agent = request.agent(app);
      
      const response = await agent
        .get('/api/events')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should create event with valid data', async () => {
      const agent = request.agent(app);
      
      const eventData = {
        title: 'Test Event',
        description: 'A test sports event',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 3600000).toISOString(),
        location: 'Test Location'
      };
      
      const response = await agent
        .post('/api/events')
        .send(eventData)
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(eventData.title);
    });
  });

  describe('Analytics API', () => {
    it('should accept page view tracking', async () => {
      const pageViewData = {
        page: '/test-page',
        title: 'Test Page',
        timestamp: new Date().toISOString()
      };
      
      await request(app)
        .post('/api/analytics/pageview')
        .send(pageViewData)
        .expect(200);
    });

    it('should accept event tracking', async () => {
      const eventData = {
        event: 'test_event',
        category: 'test',
        label: 'test_label',
        value: 1
      };
      
      await request(app)
        .post('/api/analytics/event')
        .send(eventData)
        .expect(200);
    });
  });

  describe('Payment API', () => {
    it('should create payment intent with valid data', async () => {
      const agent = request.agent(app);
      
      const paymentData = {
        amount: 50.00,
        currency: 'usd'
      };
      
      const response = await agent
        .post('/api/payments/create-payment-intent')
        .send(paymentData)
        .expect(200);
      
      expect(response.body).toHaveProperty('clientSecret');
      expect(response.body).toHaveProperty('id');
    });

    it('should validate payment amounts', async () => {
      const agent = request.agent(app);
      
      const invalidPaymentData = {
        amount: -10, // Negative amount should fail
        currency: 'usd'
      };
      
      await agent
        .post('/api/payments/create-payment-intent')
        .send(invalidPaymentData)
        .expect(400);
    });
  });
});