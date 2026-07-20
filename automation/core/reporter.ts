import fs from 'node:fs';
import path from 'node:path';
import type { RouteAudit } from './audit-types';
import {
  renderUnifiedReport,
  type ReportImage,
  type ReportIssue,
  type ReportLink,
  type ReportScenario,
} from './report-template';
import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';

type ReporterOptions = { outputDir?: string };

type IssueRow = {
  majorMenu: string;
  menu: string;
  development: string;
  change: string;
  type: string;
  priority: string;
  author: string;
  modifier: string;
  fixed: string;
  notes: Set<string>;
};

function createIssue(
  audit: RouteAudit,
  overrides: Pick<IssueRow, 'development' | 'change' | 'type'>,
  note: string,
): IssueRow {
  return {
    majorMenu: audit.route.majorMenu,
    menu: audit.route.menu,
    ...overrides,
    priority: '확인 필요',
    author: 'E2E 자동화',
    modifier: '',
    fixed: 'X',
    notes: new Set([
      `재현 URL: ${audit.route.path}`,
      `관찰 화면: ${audit.route.majorMenu} > ${audit.route.menu}`,
      note,
      '증거: 통합 E2E 보고서',
    ]),
  };
}

function addIssue(target: Map<string, IssueRow>, key: string, row: IssueRow): void {
  const current = target.get(key);
  if (!current) {
    target.set(key, row);
    return;
  }
  for (const note of row.notes) current.notes.add(note);
}

function buildAuditRows(audits: RouteAudit[]): {
  issues: IssueRow[];
  reviews: IssueRow[];
} {
  const issues = new Map<string, IssueRow>();
  const reviews = new Map<string, IssueRow>();

  for (const audit of audits) {
    for (const known of audit.knownIssues) {
      const row = createIssue(
        audit,
        { development: known.development, change: known.change, type: known.type },
        known.note,
      );
      row.majorMenu = '공통';
      row.menu = '공통 컴포넌트';
      addIssue(issues, `known:${known.id}`, row);
    }

    if (audit.navigationError) {
      addIssue(
        issues,
        `navigation:${audit.route.path}:${audit.navigationError}`,
        createIssue(
          audit,
          { development: 'FE, BE', change: `화면에 진입하지 못함: ${audit.navigationError}`, type: '화면' },
          '화면을 여는 도중 예외가 발생했습니다.',
        ),
      );
    }

    if (audit.workflowError) {
      addIssue(
        issues,
        `workflow:${audit.workflow ?? audit.route.path}:${audit.workflowError}`,
        createIssue(
          audit,
          {
            development: 'FE, BE',
            change: `${audit.workflow ?? '조회 동작'}을 완료하지 못함: ${audit.workflowError}`,
            type: '기능',
          },
          `점검한 사용자 흐름: ${audit.workflow ?? '기록 없음'}`,
        ),
      );
    }

    if (audit.finalPath && audit.finalPath !== audit.route.path) {
      addIssue(
        issues,
        `redirect:${audit.route.path}:${audit.finalPath}`,
        createIssue(
          audit,
          {
            development: 'FE',
            change: `예상하지 않은 경로로 이동함 (${audit.finalPath})`,
            type: '화면',
          },
          `기대 경로: ${audit.route.path}, 실제 경로: ${audit.finalPath}`,
        ),
      );
    }

    if (!audit.mainVisible) {
      addIssue(
        issues,
        `main:${audit.route.path}`,
        createIssue(
          audit,
          { development: 'FE', change: '화면의 본문 영역이 표시되지 않음', type: '화면' },
          '`#main-content` 요소를 찾았지만 화면에 표시되지 않았습니다.',
        ),
      );
    }

    if (audit.errorBoundaryVisible) {
      addIssue(
        issues,
        `boundary:${audit.route.path}`,
        createIssue(
          audit,
          { development: 'FE, BE', change: '오류 안내 화면이 표시됨', type: '화면' },
          '프로젝트에서 오류 화면으로 지정한 문구가 표시됐습니다.',
        ),
      );
    }

    for (const invalidText of audit.invalidTexts) {
      addIssue(
        issues,
        `invalid-text:${audit.route.path}:${invalidText}`,
        createIssue(
          audit,
          { development: 'FE', change: `화면에 비정상 값 '${invalidText}'가 표시됨`, type: '데이터 표출' },
          `관찰 문자열: ${invalidText}`,
        ),
      );
    }

    for (const overlay of audit.unknownOverlays) {
      addIssue(
        issues,
        `overlay:${overlay}`,
        createIssue(
          audit,
          { development: 'FE', change: `개발 오류 오버레이가 표시됨: ${overlay}`, type: '오류' },
          '알려진 이슈로 등록되지 않은 오류 오버레이입니다.',
        ),
      );
    }

    const hasHttpFailure = audit.diagnostics.some((entry) => entry.kind === 'http');
    for (const entry of audit.diagnostics) {
      if (
        entry.kind === 'console' &&
        hasHttpFailure &&
        entry.message.includes('Failed to load resource')
      ) {
        continue;
      }

      const development =
        entry.kind === 'http' && (entry.status ?? 0) >= 500
          ? 'BE'
          : entry.kind === 'console' || entry.kind === 'pageerror'
            ? 'FE'
            : 'FE, BE';
      const issueType = entry.kind === 'http' ? 'API' : entry.kind === 'console' ? '콘솔' : '오류';
      const location = entry.url ? ` (${entry.url})` : '';
      addIssue(
        issues,
        `diagnostic:${entry.kind}:${entry.status ?? ''}:${entry.url ?? ''}:${entry.message}`,
        createIssue(
          audit,
          {
            development,
            change: `${entry.message}${location}`,
            type: issueType,
          },
          `브라우저에서 수집한 진단 종류: ${entry.kind}`,
        ),
      );
    }

    if (audit.loadingVisible) {
      addIssue(
        reviews,
        `loading:${audit.route.path}`,
        createIssue(
          audit,
          {
            development: 'FE, BE',
            change: '화면 진입 후 8초가 지나도 로딩이 끝나지 않음',
            type: '성능/로딩',
          },
          `환경 속도와 API 응답 시간을 함께 확인해야 합니다. 남아 있는 로딩 요소: ${audit.loadingIndicators.join(', ') || '기록 없음'}`,
        ),
      );
    }
  }

  return { issues: [...issues.values()], reviews: [...reviews.values()] };
}

export default class RunSummaryReporter implements Reporter {
  private readonly outputDir: string;
  private startedAt = new Date();
  private audits: RouteAudit[] = [];
  private results: ReportScenario[] = [];
  private metadata: Record<string, unknown> = {};

  constructor(options: ReporterOptions = {}) {
    this.outputDir = options.outputDir ?? process.env.AGENT_E2E_REPORT_DIR ?? 'reports';
  }

  onBegin(config: FullConfig, _suite: Suite): void {
    this.startedAt = new Date();
    this.metadata = config.metadata as Record<string, unknown>;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const auditAttachment = result.attachments.find(
      (attachment) => attachment.name === 'route-audit.json' && attachment.body,
    );
    let audit: RouteAudit | undefined;
    if (auditAttachment?.body) {
      audit = JSON.parse(auditAttachment.body.toString('utf8')) as RouteAudit;
      this.audits.push(audit);
    }

    const images: ReportImage[] = [];
    const links: ReportLink[] = [];
    for (const attachment of result.attachments) {
      if (attachment.contentType.startsWith('image/')) {
        const body = attachment.body
          ?? (attachment.path && fs.existsSync(attachment.path) ? fs.readFileSync(attachment.path) : undefined);
        if (body) {
          images.push({
            name: attachment.name,
            dataUrl: `data:${attachment.contentType};base64,${body.toString('base64')}`,
          });
        }
        continue;
      }
      if (attachment.path && fs.existsSync(attachment.path)) {
        links.push({
          name: attachment.name,
          href: path.relative(this.outputDir, attachment.path).replace(/\\/g, '/'),
        });
      }
    }

    this.results.push({
      title: test.title,
      project: test.titlePath()[1] ?? 'unknown',
      status: result.status,
      duration: result.duration,
      error: result.error?.message?.replace(/\u001b\[[0-9;]*m/g, ''),
      audit,
      images,
      links,
    });
  }

  onEnd(result: FullResult): void {
    const auditRows = buildAuditRows(this.audits);
    const toReportIssue = (row: IssueRow): ReportIssue => ({
      ...row,
      notes: [...row.notes],
    });
    const endedAt = new Date();
    const html = renderUnifiedReport({
      startedAt: this.startedAt,
      endedAt,
      overallStatus: result.status,
      scenarios: this.results,
      issues: auditRows.issues.map(toReportIssue),
      reviews: auditRows.reviews.map(toReportIssue),
      metadata: this.metadata,
    });
    fs.mkdirSync(this.outputDir, { recursive: true });
    fs.writeFileSync(path.join(this.outputDir, 'report.html'), html, 'utf8');
  }
}
