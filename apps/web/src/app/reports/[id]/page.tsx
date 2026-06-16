import { notFound } from "next/navigation";
import { scoringCategoryLabels } from "@northvalleyintel/assessment-shared";
import { getAssessmentJob } from "../../../lib/scan-store";
import Link from "next/link";
import { AssessmentStatusPanel } from "./status-panel";

export default async function ReportPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getAssessmentJob(id);

  if (!job) notFound();

  if (job.status !== "completed" || !job.report) {
    return (
      <main>
        <AssessmentStatusPanel initialJob={job} />
      </main>
    );
  }

  const report = job.report;
  const scoredCategories = report.categories.filter(
    (category) => category.scoreStatus !== "unavailable"
  );
  const sortedCategories = [...scoredCategories].sort((a, b) => a.score - b.score);
  const biggestOpportunity = sortedCategories[0] ?? report.categories[0];
  const topActions = report.topRecommendedFixes.slice(0, 5);
  const quickWins = report.categories
    .filter((category) => category.scoreStatus !== "unavailable" && category.score < 70)
    .slice(0, 3);

  return (
    <main>
      <section className="report-shell">
        <Link className="text-link" href="/">
          New assessment
        </Link>

        <section className="report-hero" aria-labelledby="executive-summary">
          <div>
            <p className="eyebrow">Executive Summary</p>
            <h1 id="executive-summary">{report.domain}</h1>
            <p className="summary">{report.executiveSummary}</p>
          </div>
          <div className="grade-box">
            <span>Lead readiness</span>
            <strong>{report.grade}</strong>
            <small>{report.overallScore}/100</small>
          </div>
        </section>

        <section className="decision-grid" aria-label="Business decision summary">
          <article className="decision-card">
            <span className="priority-indicator secondary">
              {report.evidenceQuality.assessmentStatus === "successful"
                ? "Successful assessment"
                : "Partial assessment"}
            </span>
            <h2>Evidence Confidence</h2>
            <h3>{report.evidenceQuality.confidence}</h3>
            <p>{report.evidenceQuality.summary}</p>
          </article>
          <article className="decision-card">
            <span className="priority-indicator">Highest priority</span>
            <h2>Biggest Opportunity</h2>
            <h3>{biggestOpportunity?.label}</h3>
            <p>{biggestOpportunity?.businessImpact}</p>
            {biggestOpportunity ? (
              <div className="found-before-advice">
                <h4>What We Found</h4>
                {biggestOpportunity.evidenceFound.length > 0 ? (
                  <ul>
                    {biggestOpportunity.evidenceFound.slice(0, 3).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>We did not find strong evidence for this category yet.</p>
                )}
                <h4>What Still Needs Attention</h4>
                <ul>
                  {biggestOpportunity.evidenceMissing.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="action-line">{biggestOpportunity?.recommendedFix}</p>
          </article>
          <article className="decision-card">
            <span className="priority-indicator secondary">Referral confidence</span>
            <h2>Could I refer this business?</h2>
            <strong className="referral-score">
              {report.neighborReferralScore}/10
            </strong>
            <p>
              This reflects whether the site gives a local visitor enough clarity,
              trust, and contact confidence to recommend the business.
            </p>
          </article>
        </section>

        <section aria-labelledby="top-actions">
          <div className="section-heading">
            <p className="eyebrow">Recommended Actions</p>
            <h2 id="top-actions">Fix These First</h2>
          </div>
          <ol className="action-list">
            {topActions.map((fix, index) => (
              <li key={fix}>
                <span className="action-rank">{index + 1}</span>
                <p>{fix}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="demand-fit">
          <div className="section-heading">
            <p className="eyebrow">Customer Demand Fit</p>
            <h2 id="demand-fit">Does The Website Match What People Search For?</h2>
          </div>
          <div className="demand-panel">
            <div className="demand-summary">
              <div>
                <span className="priority-indicator secondary">
                  {report.demandSatisfaction.status === "assessed"
                    ? `${report.demandSatisfaction.sectorLabel} demand`
                    : "Not scored"}
                </span>
                <p>{report.demandSatisfaction.summary}</p>
                <p>
                  Confidence: {report.demandSatisfaction.confidence}. Pages checked:{" "}
                  {report.demandSatisfaction.pagesChecked.length}.
                </p>
              </div>
              <div className={scoreClass(report.demandSatisfaction.score ?? 0)}>
                {report.demandSatisfaction.score === null
                  ? "Not measured"
                  : report.demandSatisfaction.score}
              </div>
            </div>

            {report.demandSatisfaction.status === "assessed" ? (
              <>
                <div className="evidence-columns">
                  <div>
                    <h4>What We Found</h4>
                    <ul>
                      {report.demandSatisfaction.foundSummary.length > 0 ? (
                        report.demandSatisfaction.foundSummary.map((item) => (
                          <li key={`demand-found-${item}`}>{item}</li>
                        ))
                      ) : (
                        <li>
                          We did not find strong demand-matching evidence on the checked
                          pages yet.
                        </li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4>Demand Gaps To Review</h4>
                    <ul>
                      {report.demandSatisfaction.missingSummary.length > 0 ? (
                        report.demandSatisfaction.missingSummary.map((item) => (
                          <li key={`demand-missing-${item}`}>{item}</li>
                        ))
                      ) : (
                        <li>No major demand gaps were identified in this dataset.</li>
                      )}
                    </ul>
                  </div>
                </div>

                {report.demandSatisfaction.opportunities.length > 0 ? (
                  <details>
                    <summary>Demand opportunities with evidence</summary>
                    <div className="trace-list compact">
                      {report.demandSatisfaction.opportunities.map((opportunity) => (
                        <article
                          key={`${opportunity.keyword}-${opportunity.intent}`}
                          className="demand-opportunity"
                        >
                          <h4>{opportunity.keyword}</h4>
                          <p>{opportunity.whyItMatters}</p>
                          <p>
                            Coverage: {coverageLabel(opportunity.coverage)}. Confidence:{" "}
                            {opportunity.confidence}.
                          </p>
                          {opportunity.monthlySearches !== null ? (
                            <p>
                              Estimated monthly searches:{" "}
                              {opportunity.monthlySearches.toLocaleString()}
                              {opportunity.searchVolumeSource
                                ? ` (${volumeSourceLabel(opportunity.searchVolumeSource)})`
                                : ""}
                              .
                            </p>
                          ) : null}
                          {opportunity.foundEvidence.length > 0 ? (
                            <>
                              <p>
                                <strong>What we found:</strong>
                              </p>
                              <ul className="evidence-detail-list">
                                {opportunity.foundEvidence.map((evidence) => (
                                  <li key={`${opportunity.keyword}-${evidence.page}`}>
                                    Found "{evidence.matched}" on {evidence.page}:{" "}
                                    {evidence.evidence}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                          {opportunity.missingSignals.length > 0 ? (
                            <>
                              <p>
                                <strong>What is missing:</strong>
                              </p>
                              <ul className="evidence-detail-list">
                                {opportunity.missingSignals.map((signal) => (
                                  <li key={`${opportunity.keyword}-${signal}`}>
                                    {signal}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : null}
                          <p>
                            <strong>Pages checked:</strong>{" "}
                            {opportunity.pagesChecked.slice(0, 5).join(", ")}
                          </p>
                        </article>
                      ))}
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <p>
                This section is skipped unless the checked pages clearly match one of
                the supported demand datasets. We do not force demand conclusions when
                the industry evidence is not strong enough.
              </p>
            )}
          </div>
        </section>

        <section aria-labelledby="score-summary">
          <div className="section-heading">
            <p className="eyebrow">Score Summary</p>
            <h2 id="score-summary">Where The Website Stands</h2>
          </div>
          <div className="scorecards">
            {report.categories.map((category) => (
              <article key={category.category} className="scorecard">
                <div>
                  <h3>{scoringCategoryLabels[category.category]}</h3>
                  <p>{category.scoreExplanation.summary}</p>
                  <div className="trace-summary">
                    <div>
                      <h4>Passed</h4>
                      <ul>
                        {category.factors.filter((factor) => factor.passed).length >
                        0 ? (
                          category.factors
                            .filter((factor) => factor.passed)
                            .map((factor) => (
                              <li key={`passed-${category.category}-${factor.check}`}>
                                <span aria-hidden="true">✓</span> {factor.check}
                              </li>
                            ))
                        ) : (
                          <li>No checks passed in this category.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <h4>Missing</h4>
                      <ul>
                        {category.factors.filter((factor) => !factor.passed).length >
                        0 ? (
                          category.factors
                            .filter((factor) => !factor.passed)
                            .map((factor) => (
                              <li key={`missing-${category.category}-${factor.check}`}>
                                <span aria-hidden="true">✗</span> {factor.check}
                              </li>
                            ))
                        ) : (
                          <li>No major missing signals were identified.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
                <div className={scoreClass(category.score, category.scoreStatus)}>
                  {category.scoreStatus === "unavailable"
                    ? "Not measured"
                    : category.score}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="supporting-evidence">
          <div className="section-heading">
            <p className="eyebrow">Supporting Evidence</p>
            <h2 id="supporting-evidence">Why These Actions Matter</h2>
          </div>
          <div className="evidence-summary">
            {quickWins.map((category) => (
              <article key={category.category}>
                <h3>{category.label}</h3>
                <p>{category.businessImpact}</p>
                <div className="evidence-columns">
                  <div>
                    <h4>Working</h4>
                    <ul>
                      {category.factors.filter((factor) => factor.passed).length > 0 ? (
                        category.factors
                          .filter((factor) => factor.passed)
                          .map((factor) => (
                            <li key={factor.check}>
                              <strong>{factor.check}:</strong> {factor.evidence}
                              <br />
                              <span>{factor.businessExplanation}</span>
                            </li>
                          ))
                      ) : (
                        <li>No strong evidence found yet.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4>Needs attention</h4>
                    <ul>
                      {category.factors
                        .filter((factor) => !factor.passed)
                        .slice(0, 4)
                        .map((factor) => (
                          <li key={factor.check}>
                            <strong>{factor.check}:</strong> {factor.evidence}
                            <br />
                            <span>{factor.businessExplanation}</span>
                            {factor.evidenceDetails.length > 0 ? (
                              <ul className="evidence-detail-list">
                                {factor.evidenceDetails.slice(0, 3).map((detail) => (
                                  <li key={detail}>{detail}</li>
                                ))}
                              </ul>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section aria-labelledby="traceability">
          <div className="section-heading">
            <p className="eyebrow">Evidence Traceability</p>
            <h2 id="traceability">What We Checked</h2>
          </div>
          <div className="trace-list">
            {report.categories.map((category) => (
              <details key={`trace-${category.category}`}>
                <summary>
                  <span>{category.label}</span>
                  <strong>
                    {category.scoreExplanation.passedFactors} of{" "}
                    {category.scoreExplanation.totalFactors} checks passed
                  </strong>
                </summary>
                <div className="trace-grid">
                  <div>
                    <h4>What We Found</h4>
                    <ul>
                      {category.factors.filter((factor) => factor.passed).length > 0 ? (
                        category.factors
                          .filter((factor) => factor.passed)
                          .map((factor) => (
                            <li key={`trace-pass-${category.category}-${factor.check}`}>
                              <strong>✓ {factor.check}</strong>
                              <p>{factor.evidence}</p>
                              <p>{factor.businessExplanation}</p>
                            </li>
                          ))
                      ) : (
                        <li>No strong evidence found for this category yet.</li>
                      )}
                    </ul>
                  </div>
                  <div>
                    <h4>What Is Missing</h4>
                    <ul>
                      {category.factors
                        .filter((factor) => !factor.passed)
                        .map((factor) => (
                          <li key={`trace-miss-${category.category}-${factor.check}`}>
                            <strong>✗ {factor.check}</strong>
                            <p>{factor.evidence}</p>
                            <p>{factor.businessExplanation}</p>
                            {factor.evidenceDetails.length > 0 ? (
                              <>
                                <p>
                                  <strong>Evidence reviewed:</strong>
                                </p>
                                <ul className="evidence-detail-list">
                                  {factor.evidenceDetails.map((detail) => (
                                    <li key={detail}>{detail}</li>
                                  ))}
                                </ul>
                              </>
                            ) : null}
                            <p>
                              <strong>Existing content vs recommended signal:</strong>{" "}
                              {factor.existingContentNote}
                            </p>
                            <p>
                              <strong>Next action:</strong> {factor.recommendedAction}
                            </p>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="detailed-findings">
          <div className="section-heading">
            <p className="eyebrow">Detailed Findings</p>
            <h2 id="detailed-findings">Review The Details</h2>
          </div>
          <div className="detail-list">
            {report.categories.map((category) => (
              <details key={category.category}>
                <summary>
                  <span>{category.label}</span>
                  <strong>
                    {category.scoreStatus === "unavailable"
                      ? "Not measured"
                      : `${category.score}/100`}
                  </strong>
                </summary>
                <div className="detail-body">
                  <h4>What We Found</h4>
                  {category.evidenceFound.length > 0 ? (
                    <ul>
                      {category.evidenceFound.map((item) => (
                        <li key={`detail-found-${category.category}-${item}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No strong evidence found for this category yet.</p>
                  )}
                  <h4>What Is Missing</h4>
                  {category.evidenceMissing.length > 0 ? (
                    <ul>
                      {category.evidenceMissing.map((item) => (
                        <li key={`detail-missing-${category.category}-${item}`}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No major missing signals were identified in this category.</p>
                  )}
                  <h4>Machine-Readable Or Verifiable Signals</h4>
                  {category.factors.filter((factor) => !factor.passed).length > 0 ? (
                    <ul>
                      {category.factors
                        .filter((factor) => !factor.passed)
                        .map((factor) => (
                          <li
                            key={`detail-signal-${category.category}-${factor.check}`}
                          >
                            <strong>{factor.check}:</strong>{" "}
                            {factor.existingContentNote}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p>
                      No additional machine-readable or verifiable signal gap was
                      identified in this category.
                    </p>
                  )}
                  <h4>Recommendation</h4>
                  <p>{category.recommendedFix}</p>
                  <h4>How this score was calculated</h4>
                  <p>{category.scoreExplanation.formula}</p>
                  <p>Confidence: {category.scoreExplanation.confidence}</p>
                  <ul>
                    {category.factors.map((factor, index) => (
                      <li key={`${category.category}-${index}-${factor.label}`}>
                        <strong>
                          {factor.passed ? "Passed" : "Missing"}: {factor.check}
                        </strong>{" "}
                        ({factor.scoreImpact} possible points)
                        <p>{factor.evidence}</p>
                        <p>{factor.businessExplanation}</p>
                        {factor.evidenceDetails.length > 0 ? (
                          <>
                            <p>Evidence reviewed:</p>
                            <ul className="evidence-detail-list">
                              {factor.evidenceDetails.map((detail) => (
                                <li key={detail}>{detail}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        <p>
                          Existing content vs recommended signal:{" "}
                          {factor.existingContentNote}
                        </p>
                        <p>Next action: {factor.recommendedAction}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>

        <section className="metadata">
          <h2>Assessment Notes</h2>
          <p>Pages crawled: {report.crawlMetadata.pagesCrawled}</p>
          <p>
            Evidence reviewed: {report.evidenceQuality.meaningfulPages} meaningful
            pages, {report.evidenceQuality.pagesWithReadableText} readable pages,{" "}
            {report.evidenceQuality.totalTextCharacters} text characters.
          </p>
          {report.evidenceQuality.limitations.length > 0 ? (
            <details>
              <summary>Evidence limitations</summary>
              <ul>
                {report.evidenceQuality.limitations.map((limitation) => (
                  <li key={limitation}>{limitation}</li>
                ))}
              </ul>
            </details>
          ) : null}
          <p>
            Resource limits: {report.crawlMetadata.requestTimeoutMs}ms timeout,{" "}
            {report.crawlMetadata.maxResponseBytes} bytes per response, concurrency{" "}
            {report.crawlMetadata.maxConcurrency}
          </p>
          <p>{report.crawlMetadata.pagespeed.explanation}</p>
          {report.crawlMetadata.skippedUrls.length > 0 ? (
            <details>
              <summary>Skipped URLs</summary>
              <ul>
                {report.crawlMetadata.skippedUrls.map((skipped, index) => (
                  <li key={`${index}-${skipped.reason}-${skipped.url}`}>
                    {skipped.reason}: {skipped.url}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>

        <p className="disclaimer">{report.disclaimer}</p>
      </section>
    </main>
  );
}

function scoreClass(
  score: number,
  scoreStatus: "scored" | "unavailable" = "scored"
): string {
  if (scoreStatus === "unavailable") return "score-badge unavailable";
  if (score >= 80) return "score-badge strong";
  if (score >= 60) return "score-badge moderate";
  return "score-badge weak";
}

function coverageLabel(coverage: string): string {
  return coverage.replace(/_/g, " ");
}

function volumeSourceLabel(source: string): string {
  if (source === "keyword_planner") return "Keyword Planner";
  if (source === "unknown") return "source unknown";
  return source.replace(/_/g, " ");
}
