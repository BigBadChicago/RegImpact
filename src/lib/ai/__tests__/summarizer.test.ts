/**
 * Tests for AI Summarizer
 * Unit tests for regulation change summarization
 */

import {
  calculateSignificance,
  getCacheStats,
  clearCaches,
} from '@/lib/ai/summarizer';
import {
  SignificanceScore,
  ChangeMetrics,
  PolicyDiffSummary,
} from '@/types/policydiff';

describe('AI Summarizer', () => {
  beforeEach(() => {
    clearCaches();
  });

  describe('calculateSignificance', () => {
    it('should return HIGH for large percentage changes', () => {
      const metrics: ChangeMetrics = {
        linesAdded: 100,
        linesRemoved: 50,
        percentageChanged: 35,
        totalLines: 500,
      };

      const summary: PolicyDiffSummary = {
        summary: 'Major update',
        keyChanges: ['Change 1', 'Change 2'],
        obligations: [],
        confidence: 0.8,
      };

      const score = calculateSignificance(metrics, summary);
      expect(score).toBe(SignificanceScore.HIGH);
    });

    it('should return HIGH for many key changes', () => {
      const metrics: ChangeMetrics = {
        linesAdded: 20,
        linesRemoved: 10,
        percentageChanged: 10,
        totalLines: 300,
      };

      const summary: PolicyDiffSummary = {
        summary: 'Multiple updates',
        keyChanges: [
          'Change 1',
          'Change 2',
          'Change 3',
          'Change 4',
          'Change 5',
        ],
        obligations: [],
        confidence: 0.8,
      };

      const score = calculateSignificance(metrics, summary);
      expect(score).toBe(SignificanceScore.HIGH);
    });

    it('should return HIGH for high-impact keywords', () => {
      const metrics: ChangeMetrics = {
        linesAdded: 5,
        linesRemoved: 3,
        percentageChanged: 5,
        totalLines: 160,
      };

      const summary: PolicyDiffSummary = {
        summary: 'A penalty of $10,000 was added for violations',
        keyChanges: [],
        obligations: [],
        confidence: 0.8,
      };

      const score = calculateSignificance(metrics, summary);
      expect(score).toBe(SignificanceScore.HIGH);
    });

    it('should return MEDIUM for moderate changes', () => {
      const metrics: ChangeMetrics = {
        linesAdded: 10,
        linesRemoved: 8,
        percentageChanged: 18,
        totalLines: 100,
      };

      const summary: PolicyDiffSummary = {
        summary: 'Some changes made',
        keyChanges: ['Change 1', 'Change 2', 'Change 3'],
        obligations: [],
        confidence: 0.8,
      };

      const score = calculateSignificance(metrics, summary);
      expect(score).toBe(SignificanceScore.MEDIUM);
    });

    it('should return LOW for minimal changes', () => {
      const metrics: ChangeMetrics = {
        linesAdded: 2,
        linesRemoved: 1,
        percentageChanged: 3,
        totalLines: 100,
      };

      const summary: PolicyDiffSummary = {
        summary: 'Minor update',
        keyChanges: [],
        obligations: [],
        confidence: 0.8,
      };

      const score = calculateSignificance(metrics, summary);
      expect(score).toBe(SignificanceScore.LOW);
    });
  });

  describe('Cache Management', () => {
    it('should track cache statistics', () => {
      const stats = getCacheStats();
      expect(stats.summaryCount).toBe(0);
      expect(stats.obligationsCount).toBe(0);
    });

    it('should clear caches', () => {
      clearCaches();
      const stats = getCacheStats();
      expect(stats.summaryCount).toBe(0);
      expect(stats.obligationsCount).toBe(0);
    });
  });
});
