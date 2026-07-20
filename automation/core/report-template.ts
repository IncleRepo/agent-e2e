import type { RouteAudit } from './audit-types';

export type ReportIssue = {
  majorMenu: string;
  menu: string;
  development: string;
  change: string;
  type: string;
  priority: string;
  author: string;
  modifier: string;
  fixed: string;
  notes: string[];
};

export type ReportImage = {
  name: string;
  dataUrl: string;
};

export type ReportLink = {
  name: string;
  href: string;
};

export type ReportScenario = {
  title: string;
  project: string;
  status: string;
  duration: number;
  error?: string;
  audit?: RouteAudit;
  images: ReportImage[];
  links: ReportLink[];
};

export type UnifiedReportData = {
  startedAt: Date;
  endedAt: Date;
  overallStatus: string;
  scenarios: ReportScenario[];
  issues: ReportIssue[];
  reviews: ReportIssue[];
  metadata: Record<string, unknown>;
};

const escapeHtml = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const formatDuration = (milliseconds: number): string => {
  if (milliseconds < 1_000) return `${milliseconds}ms`;
  if (milliseconds < 60_000) return `${(milliseconds / 1_000).toFixed(1)}초`;
  const minutes = Math.floor(milliseconds / 60_000);
  const seconds = Math.round((milliseconds % 60_000) / 1_000);
  return `${minutes}분 ${seconds}초`;
};

const formatDate = (date: Date): string => new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}).format(date);

const findingCount = (audit?: RouteAudit): number => {
  if (!audit) return 0;
  return audit.knownIssues.length
    + audit.unknownOverlays.length
    + audit.invalidTexts.length
    + audit.diagnostics.length
    + Number(Boolean(audit.navigationError))
    + Number(Boolean(audit.workflowError))
    + Number(audit.errorBoundaryVisible)
    + Number(!audit.mainVisible);
};

const scenarioState = (scenario: ReportScenario): 'passed' | 'failed' | 'review' => {
  if (scenario.status !== 'passed') return 'failed';
  if (scenario.audit?.loadingVisible) return 'review';
  return 'passed';
};

const stateLabel: Record<ReturnType<typeof scenarioState>, string> = {
  passed: '통과',
  failed: '실패',
  review: '검토 필요',
};

const makeTsv = (rows: ReportIssue[]): string => {
  const header = ['대메뉴', '메뉴', '개발', '수정사항', '타입', '우선순위', '작성자', '수정자', '수정여부', '비고'];
  const clean = (value: string) => value.replace(/[\t\r\n]+/g, ' ').trim();
  return `\uFEFF${[
    header,
    ...rows.map((row) => [
      row.majorMenu,
      row.menu,
      row.development,
      row.change,
      row.type,
      row.priority,
      row.author,
      row.modifier,
      row.fixed,
      row.notes.join('; '),
    ]),
  ].map((row) => row.map(clean).join('\t')).join('\n')}\n`;
};

const scriptJson = (value: unknown): string => JSON.stringify(value)
  .replace(/</g, '\\u003c')
  .replace(/>/g, '\\u003e')
  .replace(/&/g, '\\u0026');

function scenarioGroup(scenario: ReportScenario): string {
  if (scenario.project === 'preflight' || scenario.project === 'auth-setup') return '실행 준비';
  return scenario.audit?.route.majorMenu ?? scenario.title.split('>')[0]?.trim() ?? '기타';
}

function scenarioName(scenario: ReportScenario): string {
  const parts = scenario.title.split('>').map((part) => part.trim());
  if (parts.length > 1 && parts[0] === scenarioGroup(scenario)) return parts.slice(1).join(' > ');
  return scenario.title;
}

function renderScenario(scenario: ReportScenario, index: number): string {
  const state = scenarioState(scenario);
  const audit = scenario.audit;
  const checkDescription = audit?.workflow
    ?? (scenario.project === 'preflight'
      ? 'FE와 BE 서버가 테스트 가능한 상태인지 확인'
      : scenario.project === 'auth-setup'
        ? '실제 로그인 화면으로 인증 상태 생성'
        : '화면 진입, 로딩, 오류 경계, 비정상 문자열, 콘솔·API 오류 확인');
  const evidence = [
    ...scenario.images.map((item) => `
      <figure class="evidence-item">
        <img src="${item.dataUrl}" alt="${escapeHtml(item.name)}" loading="lazy">
        <figcaption>${escapeHtml(item.name)}</figcaption>
      </figure>`),
    ...scenario.links.map((item) => `
      <a class="evidence-link" href="${escapeHtml(item.href)}">${escapeHtml(item.name)} 열기</a>`),
  ].join('');

  return `
    <article class="scenario" data-state="${state}" data-has-finding="${findingCount(audit) > 0}" style="--row-index:${index}">
      <div class="scenario-main">
        <span class="status status-${state}">${stateLabel[state]}</span>
        <div class="scenario-copy">
          <h3>${escapeHtml(scenarioName(scenario))}</h3>
          <p>${escapeHtml(checkDescription)}</p>
          <div class="scenario-meta">
            ${audit?.route.path ? `<code>${escapeHtml(audit.route.path)}</code>` : ''}
            <span>${formatDuration(scenario.duration)}</span>
            ${audit ? `<span>진단 ${audit.diagnostics.length}건</span>` : ''}
            ${findingCount(audit) > 0 ? `<span class="related-finding">관련 이슈 ${findingCount(audit)}건</span>` : ''}
          </div>
        </div>
        <button class="scenario-toggle" type="button" aria-expanded="false" aria-label="상세 정보 펼치기">
          <span aria-hidden="true">+</span>
        </button>
      </div>
      <div class="scenario-detail" hidden>
        <dl>
          <div><dt>실행 결과</dt><dd>${escapeHtml(stateLabel[state])}</dd></div>
          <div><dt>검사 내용</dt><dd>${escapeHtml(checkDescription)}</dd></div>
          ${audit?.finalPath ? `<div><dt>최종 경로</dt><dd><code>${escapeHtml(audit.finalPath)}</code></dd></div>` : ''}
          ${audit ? `<div><dt>브라우저 진단</dt><dd>${audit.diagnostics.length}건</dd></div>` : ''}
        </dl>
        ${scenario.error ? `<pre class="error-text">${escapeHtml(scenario.error)}</pre>` : ''}
        ${evidence ? `<div class="evidence-grid">${evidence}</div>` : '<p class="detail-empty">추가 증거 없이 정상 완료됐습니다.</p>'}
      </div>
    </article>`;
}

function renderIssue(issue: ReportIssue, kind: 'issue' | 'review', index: number): string {
  const urls = issue.notes.filter((note) => note.startsWith('재현 URL:'));
  const screens = issue.notes.filter((note) => note.startsWith('관찰 화면:'));
  const otherNotes = issue.notes.filter((note) => !note.startsWith('재현 URL:') && !note.startsWith('관찰 화면:'));
  const observed = Math.max(urls.length, screens.length);

  return `
    <article class="finding finding-${kind}" style="--row-index:${index}">
      <div class="finding-head">
        <div class="finding-tags">
          <span class="tag tag-owner">${escapeHtml(issue.development)}</span>
          <span class="tag">${escapeHtml(issue.type)}</span>
          <span class="tag tag-priority">${escapeHtml(issue.priority)}</span>
        </div>
        <span class="finding-number">${String(index + 1).padStart(2, '0')}</span>
      </div>
      <h3>${escapeHtml(issue.change)}</h3>
      <p class="finding-location">${escapeHtml(issue.majorMenu)} · ${escapeHtml(issue.menu)}</p>
      <div class="finding-summary">
        <span>${kind === 'issue' ? '발견 상태' : '검토 상태'}</span>
        <strong>${escapeHtml(issue.fixed === 'O' ? '조치 완료' : kind === 'issue' ? '미조치' : '확인 전')}</strong>
        ${observed > 0 ? `<span>${observed}개 화면에서 관찰</span>` : ''}
      </div>
      <details>
        <summary>재현 정보와 근거 보기</summary>
        <div class="finding-detail">
          ${urls.length > 0 ? `<div><h4>재현 경로</h4><ul>${urls.map((note) => `<li><code>${escapeHtml(note.replace('재현 URL:', '').trim())}</code></li>`).join('')}</ul></div>` : ''}
          ${screens.length > 0 ? `<div><h4>관찰 화면</h4><ul>${screens.map((note) => `<li>${escapeHtml(note.replace('관찰 화면:', '').trim())}</li>`).join('')}</ul></div>` : ''}
          ${otherNotes.length > 0 ? `<div><h4>판단 근거</h4><ul>${otherNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div>` : ''}
        </div>
      </details>
    </article>`;
}

export function renderUnifiedReport(data: UnifiedReportData): string {
  const activeScenarios = data.scenarios.filter((scenario) => !['preflight', 'auth-setup'].includes(scenario.project));
  const preparation = data.scenarios.filter((scenario) => ['preflight', 'auth-setup'].includes(scenario.project));
  const passed = activeScenarios.filter((scenario) => scenario.status === 'passed').length;
  const failed = activeScenarios.length - passed;
  const duration = data.endedAt.getTime() - data.startedAt.getTime();
  const reportTone = failed > 0 ? 'failed' : data.issues.length > 0 ? 'finding' : data.reviews.length > 0 ? 'review' : 'passed';
  const reportTitle = failed > 0
    ? `${failed}개 시나리오가 실패했습니다`
    : data.issues.length > 0
      ? `검사는 완료됐고, 확인할 이슈 ${data.issues.length}건이 있습니다`
      : data.reviews.length > 0
        ? `검사는 완료됐고, 검토할 항목 ${data.reviews.length}건이 있습니다`
        : '모든 E2E 시나리오가 정상입니다';

  const grouped = new Map<string, ReportScenario[]>();
  for (const scenario of activeScenarios) {
    const group = scenarioGroup(scenario);
    grouped.set(group, [...(grouped.get(group) ?? []), scenario]);
  }

  const scenarioSections = [...grouped.entries()].map(([group, scenarios]) => {
    const groupPassed = scenarios.filter((scenario) => scenario.status === 'passed').length;
    return `
      <section class="scenario-group" data-group="${escapeHtml(group)}">
        <header class="group-head">
          <div><span class="group-kicker">메뉴</span><h2>${escapeHtml(group)}</h2></div>
          <span class="group-count">${groupPassed}/${scenarios.length} 통과</span>
        </header>
        <div class="scenario-list">${scenarios.map(renderScenario).join('')}</div>
      </section>`;
  }).join('');

  const preparationHtml = preparation.map(renderScenario).join('');
  const issueHtml = data.issues.length > 0
    ? data.issues.map((issue, index) => renderIssue(issue, 'issue', index)).join('')
    : '<div class="empty-state"><strong>발견된 이슈가 없습니다</strong><p>이번 실행에서 화면, API, 콘솔 오류가 관찰되지 않았습니다.</p></div>';
  const reviewHtml = data.reviews.length > 0
    ? data.reviews.map((issue, index) => renderIssue(issue, 'review', index)).join('')
    : '<div class="empty-state"><strong>추가 검토가 필요한 항목이 없습니다</strong><p>장시간 로딩이나 판정 보류 항목이 발견되지 않았습니다.</p></div>';
  const issueTsv = makeTsv(data.issues);
  const reviewTsv = makeTsv(data.reviews);
  const feUrl = escapeHtml(data.metadata.feUrl ?? '-');
  const apiUrl = escapeHtml(data.metadata.apiUrl ?? '-');
  const projectName = escapeHtml(data.metadata.projectName ?? data.metadata.projectId ?? 'Web Project');

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${projectName} E2E 품질 보고서</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f4f6f7;
      --surface: #ffffff;
      --surface-muted: #eef1f2;
      --text: #172126;
      --muted: #66747a;
      --line: #dce2e4;
      --dark: #142a31;
      --teal: #087f72;
      --green: #137a52;
      --green-soft: #e7f5ee;
      --red: #c53f46;
      --red-soft: #fcebec;
      --amber: #a86405;
      --amber-soft: #fff3da;
      --blue: #2864a5;
      --blue-soft: #eaf2fb;
      --shadow: 0 10px 30px rgba(20, 42, 49, .07);
      font-family: Pretendard, "Noto Sans KR", "Segoe UI", sans-serif;
      letter-spacing: 0;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: var(--bg); color: var(--text); }
    button, input { font: inherit; letter-spacing: 0; }
    button { cursor: pointer; }
    a { color: inherit; }
    code { font-family: "Cascadia Code", Consolas, monospace; font-size: .86em; overflow-wrap: anywhere; }
    .shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
    .hero { background: var(--dark); color: #fff; border-bottom: 5px solid var(--teal); }
    .hero-inner { padding: 48px 0 42px; }
    .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 44px; }
    .brand-mark { display: grid; place-items: center; width: 38px; height: 38px; border: 1px solid rgba(255,255,255,.28); border-radius: 6px; font-weight: 800; color: #72d8c8; }
    .brand-copy strong { display: block; font-size: 15px; }
    .brand-copy span { display: block; margin-top: 2px; color: #a9bbc1; font-size: 12px; }
    .hero-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, .7fr); gap: 48px; align-items: end; }
    .eyebrow { margin: 0 0 12px; color: #72d8c8; font-size: 13px; font-weight: 700; }
    h1 { max-width: 760px; margin: 0; font-size: 38px; line-height: 1.25; letter-spacing: 0; }
    .hero-desc { max-width: 700px; margin: 18px 0 0; color: #c5d0d3; line-height: 1.7; }
    .run-meta { border-left: 1px solid rgba(255,255,255,.2); padding-left: 28px; }
    .run-meta dl { margin: 0; }
    .run-meta div { display: grid; grid-template-columns: 72px 1fr; gap: 12px; padding: 8px 0; }
    .run-meta dt { color: #8fa4aa; font-size: 12px; }
    .run-meta dd { margin: 0; color: #e9eff0; font-size: 13px; overflow-wrap: anywhere; }
    .summary-band { background: var(--surface); border-bottom: 1px solid var(--line); }
    .metrics { display: grid; grid-template-columns: repeat(5, 1fr); min-height: 122px; }
    .metric { display: flex; flex-direction: column; justify-content: center; padding: 24px 26px; border-right: 1px solid var(--line); }
    .metric:first-child { border-left: 1px solid var(--line); }
    .metric span { color: var(--muted); font-size: 12px; }
    .metric strong { margin-top: 7px; font-size: 28px; line-height: 1; }
    .metric small { margin-top: 7px; color: var(--muted); font-size: 11px; }
    .metric-success strong { color: var(--green); }
    .metric-fail strong { color: var(--red); }
    .metric-finding strong { color: var(--amber); }
    .report-nav { position: sticky; top: 0; z-index: 20; background: rgba(244,246,247,.96); border-bottom: 1px solid var(--line); backdrop-filter: blur(12px); }
    .nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 20px; min-height: 58px; }
    .nav-links { display: flex; align-items: center; gap: 22px; overflow-x: auto; }
    .nav-links a { flex: none; color: var(--muted); font-size: 13px; font-weight: 700; text-decoration: none; }
    .nav-links a:hover { color: var(--text); }
    .download-menu { display: flex; gap: 8px; }
    .download-btn { min-height: 34px; padding: 0 12px; border: 1px solid var(--line); border-radius: 5px; background: var(--surface); color: var(--text); font-size: 12px; font-weight: 700; }
    .download-btn:hover { border-color: #97a8ae; }
    main { padding-bottom: 80px; }
    .section { padding-top: 70px; scroll-margin-top: 60px; }
    .section-heading { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 2px solid var(--text); }
    .section-kicker, .group-kicker { display: block; color: var(--teal); font-size: 11px; font-weight: 800; text-transform: uppercase; }
    .section-heading h2 { margin: 5px 0 0; font-size: 25px; }
    .section-heading p { max-width: 520px; margin: 0; color: var(--muted); font-size: 13px; line-height: 1.6; text-align: right; }
    .filter-bar { display: flex; gap: 6px; margin: 20px 0 30px; }
    .filter-btn { min-height: 36px; padding: 0 14px; border: 1px solid var(--line); border-radius: 5px; background: transparent; color: var(--muted); font-size: 12px; font-weight: 700; }
    .filter-btn[aria-pressed="true"] { border-color: var(--dark); background: var(--dark); color: #fff; }
    .scenario-group { margin-top: 44px; }
    .group-head { display: flex; align-items: end; justify-content: space-between; gap: 20px; margin-bottom: 12px; }
    .group-head h2 { margin: 3px 0 0; font-size: 18px; }
    .group-count { color: var(--muted); font-size: 12px; font-weight: 700; }
    .scenario-list { border-top: 1px solid var(--line); }
    .scenario { border-bottom: 1px solid var(--line); background: var(--surface); }
    .scenario[hidden] { display: none; }
    .scenario-main { display: grid; grid-template-columns: 116px minmax(0,1fr) 36px; gap: 18px; align-items: start; min-height: 112px; padding: 22px 20px; }
    .status { display: inline-flex; width: fit-content; min-height: 26px; align-items: center; padding: 0 9px; border-radius: 4px; font-size: 11px; font-weight: 800; }
    .status-passed { background: var(--green-soft); color: var(--green); }
    .status-failed { background: var(--red-soft); color: var(--red); }
    .status-review, .status-finding { background: var(--amber-soft); color: var(--amber); }
    .scenario-copy h3 { margin: 0; font-size: 15px; line-height: 1.45; }
    .scenario-copy p { margin: 7px 0 0; color: var(--muted); font-size: 13px; line-height: 1.6; }
    .scenario-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; color: #7b898e; font-size: 11px; }
    .scenario-meta code { color: var(--blue); }
    .scenario-toggle { display: grid; place-items: center; width: 32px; height: 32px; border: 1px solid var(--line); border-radius: 4px; background: var(--surface); color: var(--muted); font-size: 20px; }
    .scenario-toggle[aria-expanded="true"] span { transform: rotate(45deg); }
    .scenario-toggle span { transition: transform .2s ease; }
    .scenario-detail { padding: 0 20px 24px 154px; }
    .scenario-detail dl { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 1px; margin: 0; background: var(--line); border: 1px solid var(--line); }
    .scenario-detail dl div { display: grid; grid-template-columns: 90px 1fr; gap: 12px; padding: 13px; background: #fafbfb; }
    .scenario-detail dt { color: var(--muted); font-size: 11px; }
    .scenario-detail dd { margin: 0; font-size: 12px; }
    .detail-empty { margin: 14px 0 0; color: var(--muted); font-size: 12px; }
    .error-text { overflow: auto; margin: 14px 0 0; padding: 16px; border-left: 3px solid var(--red); background: #fff7f7; color: #7d2b30; font-size: 11px; white-space: pre-wrap; }
    .evidence-grid { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 12px; margin-top: 14px; }
    .evidence-item { margin: 0; border: 1px solid var(--line); background: #fafbfb; }
    .evidence-item img { display: block; width: 100%; max-height: 420px; object-fit: contain; background: #e9edef; }
    .evidence-item figcaption { padding: 10px; color: var(--muted); font-size: 11px; }
    .evidence-link { display: flex; align-items: center; min-height: 44px; padding: 0 14px; border: 1px solid var(--line); color: var(--blue); font-size: 12px; font-weight: 700; text-decoration: none; }
    .finding-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 24px; }
    .finding { min-width: 0; padding: 22px; border: 1px solid var(--line); border-top: 3px solid var(--red); border-radius: 6px; background: var(--surface); box-shadow: var(--shadow); }
    .finding-review { border-top-color: var(--amber); }
    .finding-head { display: flex; justify-content: space-between; gap: 16px; }
    .finding-tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .tag { display: inline-flex; min-height: 24px; align-items: center; padding: 0 8px; border-radius: 4px; background: var(--surface-muted); color: var(--muted); font-size: 10px; font-weight: 800; }
    .tag-owner { background: var(--blue-soft); color: var(--blue); }
    .tag-priority { background: var(--amber-soft); color: var(--amber); }
    .finding-number { color: #aab5b9; font: 700 12px "Cascadia Code", monospace; }
    .finding h3 { margin: 18px 0 0; font-size: 17px; line-height: 1.55; overflow-wrap: anywhere; }
    .finding-location { margin: 8px 0 0; color: var(--muted); font-size: 12px; }
    .finding-summary { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; margin-top: 20px; padding: 14px 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); color: var(--muted); font-size: 11px; }
    .finding-summary strong { color: var(--red); }
    .finding-review .finding-summary strong { color: var(--amber); }
    details { margin-top: 14px; }
    summary { color: var(--blue); font-size: 12px; font-weight: 700; cursor: pointer; }
    .finding-detail { display: grid; gap: 18px; margin-top: 16px; }
    .finding-detail h4 { margin: 0 0 7px; font-size: 11px; }
    .finding-detail ul { margin: 0; padding-left: 18px; color: var(--muted); font-size: 11px; line-height: 1.7; }
    .empty-state { margin-top: 24px; padding: 32px; border: 1px dashed #b9c4c8; background: rgba(255,255,255,.58); text-align: center; }
    .empty-state strong { display: block; font-size: 15px; }
    .empty-state p { margin: 8px 0 0; color: var(--muted); font-size: 12px; }
    .prep-list { margin-top: 24px; }
    .environment { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; margin-top: 24px; border: 1px solid var(--line); background: var(--line); }
    .environment div { padding: 18px; background: var(--surface); }
    .environment span { display: block; color: var(--muted); font-size: 11px; }
    .environment code { display: block; margin-top: 7px; color: var(--blue); }
    footer { padding: 30px 0 48px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; }
    .is-empty { display: none; }
    @media (prefers-reduced-motion: no-preference) {
      .scenario, .finding { animation: enter .35s ease both; animation-delay: calc(var(--row-index) * 25ms); }
      @keyframes enter { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
    }
    @media (max-width: 850px) {
      .hero-grid { grid-template-columns: 1fr; gap: 30px; }
      .run-meta { border-left: 0; border-top: 1px solid rgba(255,255,255,.2); padding: 20px 0 0; }
      .metrics { grid-template-columns: repeat(2, 1fr); }
      .metric { border-bottom: 1px solid var(--line); }
      .metric:last-child { grid-column: 1 / -1; }
      .finding-list { grid-template-columns: 1fr; }
      .scenario-detail dl { grid-template-columns: 1fr; }
    }
    @media (max-width: 620px) {
      .shell { width: min(100% - 24px, 1180px); }
      .hero-inner { padding: 28px 0 30px; }
      .brand { margin-bottom: 30px; }
      h1 { font-size: 27px; }
      .hero-desc { font-size: 13px; }
      .metrics { min-height: 0; }
      .metric { min-height: 92px; padding: 18px 16px; }
      .metric strong { font-size: 23px; }
      .nav-inner { min-height: 52px; }
      .nav-links { gap: 16px; }
      .download-menu { display: none; }
      .section { padding-top: 52px; }
      .section-heading { display: block; }
      .section-heading h2 { font-size: 21px; }
      .section-heading p { margin-top: 10px; text-align: left; }
      .scenario-main { grid-template-columns: 1fr 32px; gap: 12px; padding: 18px 14px; }
      .scenario-main .status { grid-column: 1 / -1; }
      .scenario-copy { grid-column: 1; }
      .scenario-toggle { grid-column: 2; grid-row: 2; }
      .scenario-detail { padding: 0 14px 20px; }
      .scenario-detail dl div { grid-template-columns: 78px 1fr; }
      .evidence-grid { grid-template-columns: 1fr; }
      .finding { padding: 18px; }
      .environment { grid-template-columns: 1fr; }
    }
    @media print {
      .report-nav, .filter-bar, .scenario-toggle, .download-menu { display: none !important; }
      body { background: #fff; }
      .hero { background: #fff; color: #000; border: 0; }
      .hero-desc, .run-meta dd { color: #333; }
      .scenario-detail[hidden] { display: none; }
      .finding { break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body data-report-tone="${reportTone}">
  <header class="hero">
    <div class="shell hero-inner">
      <div class="brand">
        <span class="brand-mark">E2E</span>
        <span class="brand-copy"><strong>${projectName}</strong><span>End-to-End Quality Report</span></span>
      </div>
      <div class="hero-grid">
        <div>
          <p class="eyebrow">${reportTone === 'passed' ? 'ALL SYSTEMS PASSED' : reportTone === 'failed' ? 'ACTION REQUIRED' : 'REVIEW FINDINGS'}</p>
          <h1>${escapeHtml(reportTitle)}</h1>
          <p class="hero-desc">실제 사용자 흐름으로 화면과 API를 점검한 결과입니다. 아래에서 시나리오 현황, 발견 이슈, 추가 검토 항목을 순서대로 확인할 수 있습니다.</p>
        </div>
        <aside class="run-meta" aria-label="실행 정보">
          <dl>
            <div><dt>실행 시각</dt><dd>${formatDate(data.startedAt)}</dd></div>
            <div><dt>소요 시간</dt><dd>${formatDuration(duration)}</dd></div>
            <div><dt>실행 상태</dt><dd>${escapeHtml(data.overallStatus)}</dd></div>
            <div><dt>검사 방식</dt><dd>읽기 전용 · Desktop Chrome</dd></div>
          </dl>
        </aside>
      </div>
    </div>
  </header>

  <section class="summary-band" aria-label="결과 요약">
    <div class="shell metrics">
      <div class="metric"><span>전체 시나리오</span><strong>${activeScenarios.length}</strong><small>준비 검사 ${preparation.length}개 별도</small></div>
      <div class="metric metric-success"><span>통과</span><strong>${passed}</strong><small>정상 완료</small></div>
      <div class="metric metric-fail"><span>실패</span><strong>${failed}</strong><small>실행 실패</small></div>
      <div class="metric metric-finding"><span>발견 이슈</span><strong>${data.issues.length}</strong><small>중복 제거</small></div>
      <div class="metric"><span>검토 필요</span><strong>${data.reviews.length}</strong><small>추가 판단 대상</small></div>
    </div>
  </section>

  <nav class="report-nav" aria-label="보고서 목차">
    <div class="shell nav-inner">
      <div class="nav-links">
        <a href="#scenarios">시나리오</a>
        <a href="#issues">발견 이슈</a>
        <a href="#reviews">검토 필요</a>
        <a href="#environment">실행 정보</a>
      </div>
      <div class="download-menu">
        <button class="download-btn" type="button" data-download="issues">이슈 TSV</button>
        <button class="download-btn" type="button" data-download="reviews">검토 TSV</button>
      </div>
    </div>
  </nav>

  <main class="shell">
    <section id="scenarios" class="section">
      <header class="section-heading">
        <div><span class="section-kicker">Scenario status</span><h2>E2E 시나리오 현황</h2></div>
        <p>메뉴별로 실행 결과를 정리했습니다. 각 행을 펼치면 검사 내용과 증거를 볼 수 있습니다.</p>
      </header>
      <div class="filter-bar" role="group" aria-label="시나리오 상태 필터">
        <button class="filter-btn" type="button" data-filter="all" aria-pressed="true">전체 ${activeScenarios.length}</button>
        <button class="filter-btn" type="button" data-filter="passed" aria-pressed="false">통과 ${passed}</button>
        <button class="filter-btn" type="button" data-filter="failed" aria-pressed="false">실패 ${failed}</button>
        <button class="filter-btn" type="button" data-filter="finding" aria-pressed="false">이슈 연관 ${activeScenarios.filter((scenario) => findingCount(scenario.audit) > 0).length}</button>
      </div>
      ${scenarioSections}
    </section>

    <section id="issues" class="section">
      <header class="section-heading">
        <div><span class="section-kicker">Findings</span><h2>발견된 이슈</h2></div>
        <p>동일한 원인은 하나로 합치고, 관찰된 화면과 재현 경로를 연결했습니다.</p>
      </header>
      <div class="finding-list">${issueHtml}</div>
    </section>

    <section id="reviews" class="section">
      <header class="section-heading">
        <div><span class="section-kicker">Needs review</span><h2>추가 검토 필요</h2></div>
        <p>환경 속도나 업무 기준이 필요해 자동으로 결함을 확정하지 않은 항목입니다.</p>
      </header>
      <div class="finding-list">${reviewHtml}</div>
    </section>

    <section id="environment" class="section">
      <header class="section-heading">
        <div><span class="section-kicker">Run details</span><h2>실행 준비와 환경</h2></div>
        <p>서비스 연결과 로그인 검사를 실제 시나리오 실행 전에 확인했습니다.</p>
      </header>
      <div class="scenario-list prep-list">${preparationHtml}</div>
      <div class="environment">
        <div><span>FE 주소</span><code>${feUrl}</code></div>
        <div><span>API 주소</span><code>${apiUrl}</code></div>
      </div>
    </section>
  </main>

  <footer>
    <div class="shell">${projectName} E2E 자동화 · ${formatDate(data.endedAt)} 생성</div>
  </footer>

  <script>
    const TSV = {
      issues: ${scriptJson(issueTsv)},
      reviews: ${scriptJson(reviewTsv)},
    };

    document.querySelectorAll('.scenario-toggle').forEach((button) => {
      button.addEventListener('click', () => {
        const detail = button.closest('.scenario').querySelector('.scenario-detail');
        const expanded = button.getAttribute('aria-expanded') === 'true';
        button.setAttribute('aria-expanded', String(!expanded));
        button.setAttribute('aria-label', expanded ? '상세 정보 펼치기' : '상세 정보 접기');
        detail.hidden = expanded;
      });
    });

    document.querySelectorAll('.filter-btn').forEach((button) => {
      button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        document.querySelectorAll('.filter-btn').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
        document.querySelectorAll('.scenario-group').forEach((group) => {
          let visible = 0;
          group.querySelectorAll('.scenario').forEach((scenario) => {
            const show = filter === 'all'
              || (filter === 'finding' ? scenario.dataset.hasFinding === 'true' : scenario.dataset.state === filter);
            scenario.hidden = !show;
            if (show) visible += 1;
          });
          group.classList.toggle('is-empty', visible === 0);
        });
      });
    });

    document.querySelectorAll('[data-download]').forEach((button) => {
      button.addEventListener('click', () => {
        const type = button.dataset.download;
        const blob = new Blob([TSV[type]], { type: 'text/tab-separated-values;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = type === 'issues' ? 'issues.tsv' : 'review-needed.tsv';
        link.click();
        URL.revokeObjectURL(link.href);
      });
    });
  </script>
</body>
</html>`;
}
