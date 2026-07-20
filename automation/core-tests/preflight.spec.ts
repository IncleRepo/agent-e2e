import { expect, test } from '@playwright/test';
import { project, runtime } from '../core/project';

test('FE와 API 서버가 테스트 가능한 상태다', async ({ request }, testInfo) => {
  const feResponse = await request.get(runtime.feUrl, { failOnStatusCode: false });
  const healthUrl = new URL(project.urls.healthPath, `${runtime.apiUrl}/`).toString();
  const apiResponse = await request.get(healthUrl, { failOnStatusCode: false });

  await testInfo.attach('preflight.json', {
    body: Buffer.from(JSON.stringify({
      frontend: { url: runtime.feUrl, status: feResponse.status() },
      api: { url: healthUrl, status: apiResponse.status() },
    }, null, 2), 'utf8'),
    contentType: 'application/json',
  });

  expect(feResponse.ok(), `Frontend server is unavailable: ${runtime.feUrl}`).toBeTruthy();
  expect(apiResponse.ok(), `API health endpoint is unavailable: ${healthUrl}`).toBeTruthy();
});
