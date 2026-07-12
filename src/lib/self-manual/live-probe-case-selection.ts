import { contractTestMatrix } from "./test-matrix";

export function selectLiveProbeCases(limit: number, rawCaseIds: string | undefined) {
  if (rawCaseIds === undefined || rawCaseIds.trim().length === 0) {
    const priorityIds = [
      "boundary-outside-taxonomy",
      "boundary-insufficient",
      "boundary-clear-first-action"
    ];
    const byId = new Map(contractTestMatrix.map((testCase) => [testCase.id, testCase]));
    const ordered = [
      ...priorityIds
        .map((id) => byId.get(id))
        .filter((value): value is (typeof contractTestMatrix)[number] => Boolean(value)),
      ...contractTestMatrix.filter((testCase) => !priorityIds.includes(testCase.id))
    ];
    return ordered.slice(0, limit);
  }

  const requestedIds = Array.from(
    new Set(
      rawCaseIds
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    )
  );

  if (requestedIds.length === 0 || requestedIds.length > contractTestMatrix.length) {
    throw new Error("LIVE_PROBE_CASE_IDS must select between 1 and 12 unique case IDs.");
  }

  const byId = new Map(contractTestMatrix.map((testCase) => [testCase.id, testCase]));
  const missingIds = requestedIds.filter((id) => !byId.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Unknown LIVE_PROBE_CASE_IDS: ${missingIds.join(",")}`);
  }

  return requestedIds.map((id) => byId.get(id)!);
}
