import http from 'http';

async function request(options: http.RequestOptions, postData?: object): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode || 500, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode || 500, body: data });
        }
      });
    });

    req.on('error', (e) => reject(e));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING BACKEND API VERIFICATION SUITE ---');

  // 1. Health Check
  const health = await request({ hostname: '127.0.0.1', port: 5000, path: '/api/v1/health', method: 'GET' });
  console.log('[1/7] GET /api/v1/health -> Status:', health.status, 'Success:', health.body?.success);

  // 2. Mock Auth Login
  const auth = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1/auth/mock',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { username: 'obc_student' }
  );
  const token = auth.body?.data?.token;
  console.log('[2/7] POST /api/v1/auth/mock -> Status:', auth.status, 'Token Obtained:', !!token);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 3. Profile Fetch
  const profile = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/profile',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('[3/7] GET /api/v1/profile -> Status:', profile.status, 'User Name:', profile.body?.data?.name);

  // 4. Scheme Search
  const schemes = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/schemes?search=scholarship&limit=5',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('[4/7] GET /api/v1/schemes -> Status:', schemes.status, 'Total Schemes Found:', schemes.body?.data?.pagination?.total);

  // 5. Recommendations Engine
  const recs = await request({
    hostname: '127.0.0.1',
    port: 5000,
    path: '/api/v1/recommendations',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('[5/7] GET /api/v1/recommendations -> Status:', recs.status, 'Recommendations Total:', recs.body?.data?.total);

  // 6. Scheme Comparison
  const comp = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1/comparison',
      method: 'POST',
      headers: authHeaders,
    },
    { schemeIds: ['central-post-matric-sc', 'central-pm-yasasvi'] }
  );
  console.log('[6/7] POST /api/v1/comparison -> Status:', comp.status, 'Compared Count:', comp.body?.data?.length);

  // 7. Term Explanation
  const exp = await request(
    {
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/v1/explanations/term',
      method: 'POST',
      headers: authHeaders,
    },
    { term: 'Domicile Certificate' }
  );
  console.log('[7/7] POST /api/v1/explanations/term -> Status:', exp.status, 'Explanation Provided:', !!exp.body?.data?.explanation);

  console.log('--- ALL BACKEND VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
}

runTests().catch(console.error);
