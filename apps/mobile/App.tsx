/**
 * Harness screen — the on-device half of the Phase 1 parity gate.
 *
 * This app exists, for now, to answer one question: does the shared scheduler
 * harness produce identical results on Hermes as it does under Vitest and Jest
 * in Node? It renders every assertion so the answer is visible on the device,
 * and names the engine so a green run cannot be mistaken for a V8 run.
 *
 * When Phase 3+ starts building real screens, this becomes a dev-only route
 * rather than the root component.
 */

import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { expandPlanToEvents } from '@pill-parse/core';
import { runSchedulerHarness } from '@pill-parse/core/harness';

import { collectHarnessRun } from './src/harnessRunner';

export default function App() {
  const run = useMemo(() => {
    const result = collectHarnessRun(runSchedulerHarness, expandPlanToEvents);

    // Also log it: the rendered list is for a human, this is for logcat / CI, so
    // the gate can be read without a screenshot.
    console.log(
      `[parity] ${result.failed === 0 ? 'PASS' : 'FAIL'} ` +
        `${result.passed}/${result.results.length} on ${result.engine}`
    );
    for (const failure of result.results.filter((r) => !r.passed)) {
      console.log(`[parity] FAILED ${failure.name} -> ${failure.error}`);
    }

    return result;
  }, []);

  const allPassed = run.failed === 0;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={[styles.header, allPassed ? styles.headerPass : styles.headerFail]}>
        <Text style={styles.headerTitle}>
          {allPassed ? 'Parity gate: PASS' : 'Parity gate: FAIL'}
        </Text>
        <Text style={styles.headerCount}>
          {run.passed} passed{run.failed > 0 ? `, ${run.failed} failed` : ''} ·{' '}
          {run.results.length} total
        </Text>
        <Text style={styles.headerEngine}>{run.engine}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {groupBySuite(run.results).map(({ suite, items }) => (
          <View key={suite} style={styles.suite}>
            <Text style={styles.suiteName}>{suite}</Text>
            {items.map((result) => (
              <View key={result.name} style={styles.row}>
                <Text style={result.passed ? styles.pass : styles.fail}>
                  {result.passed ? '✓' : '✕'}
                </Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName}>{result.name}</Text>
                  {result.error ? (
                    <Text style={styles.rowError}>{result.error}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function groupBySuite(results: { suite: string; name: string; passed: boolean; error?: string }[]) {
  const order: string[] = [];
  const bySuite = new Map<string, typeof results>();

  for (const result of results) {
    if (!bySuite.has(result.suite)) {
      bySuite.set(result.suite, []);
      order.push(result.suite);
    }
    bySuite.get(result.suite)!.push(result);
  }

  return order.map((suite) => ({ suite, items: bySuite.get(suite)! }));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { paddingTop: 64, paddingBottom: 16, paddingHorizontal: 20 },
  headerPass: { backgroundColor: '#12602f' },
  headerFail: { backgroundColor: '#7c1d1d' },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  headerCount: { color: '#e6f0e9', fontSize: 15, marginTop: 4 },
  headerEngine: { color: '#b9c9c0', fontSize: 13, marginTop: 8 },
  list: { padding: 16, paddingBottom: 48 },
  suite: { marginBottom: 20 },
  suiteName: { color: '#8fa3b8', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  row: { flexDirection: 'row', marginBottom: 8, paddingRight: 8 },
  rowBody: { flex: 1 },
  rowName: { color: '#e7edf3', fontSize: 14, lineHeight: 19 },
  rowError: { color: '#ff9d9d', fontSize: 12, marginTop: 3, lineHeight: 16 },
  pass: { color: '#4ade80', width: 22, fontSize: 14 },
  fail: { color: '#f87171', width: 22, fontSize: 14 },
});
