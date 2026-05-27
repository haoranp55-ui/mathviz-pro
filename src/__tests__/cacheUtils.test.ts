// src/__tests__/cacheUtils.test.ts
import { describe, it, expect } from 'vitest';
import { LRUCache, floatMatch, paramsMatch } from '../lib/cacheUtils';

describe('cacheUtils', () => {
  describe('LRUCache', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      expect(cache.get('a')).toBe(1);
    });

    it('should return undefined for missing keys', () => {
      const cache = new LRUCache<string, number>(10);
      expect(cache.get('missing')).toBeUndefined();
    });

    it('should evict oldest entry when exceeding capacity', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      cache.set('d', 4);
      expect(cache.get('a')).toBeUndefined();
      expect(cache.get('b')).toBe(2);
      expect(cache.get('c')).toBe(3);
      expect(cache.get('d')).toBe(4);
    });

    it('should refresh entry on access (get)', () => {
      const cache = new LRUCache<string, number>(3);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.set('c', 3);
      expect(cache.get('a')).toBe(1);
      cache.set('d', 4);
      expect(cache.get('b')).toBeUndefined();
      expect(cache.get('a')).toBe(1);
    });

    it('should overwrite existing key', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('a', 2);
      expect(cache.get('a')).toBe(2);
    });

    it('should handle size correctly', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('b', 2);
      expect(cache.size).toBe(2);
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      cache.set('b', 2);
      cache.clear();
      expect(cache.size).toBe(0);
      expect(cache.get('a')).toBeUndefined();
    });

    it('should report has correctly', () => {
      const cache = new LRUCache<string, number>(10);
      cache.set('a', 1);
      expect(cache.has('a')).toBe(true);
      expect(cache.has('b')).toBe(false);
    });
  });

  describe('floatMatch', () => {
    it('should match identical numbers', () => {
      expect(floatMatch(1.0, 1.0)).toBe(true);
    });

    it('should match nearly identical numbers within epsilon', () => {
      expect(floatMatch(1.0, 1.0 + 1e-11)).toBe(true);
    });

    it('should reject different numbers', () => {
      expect(floatMatch(1.0, 2.0)).toBe(false);
    });

    it('should handle zero correctly', () => {
      expect(floatMatch(0, 0)).toBe(true);
      expect(floatMatch(0, 1e-11)).toBe(true);
      expect(floatMatch(0, 1e-4)).toBe(false);
    });

    it('should handle NaN', () => {
      expect(floatMatch(NaN, NaN)).toBe(false);
    });

    it('should accept custom epsilon', () => {
      expect(floatMatch(1.0, 1.001, 0.01)).toBe(true);
      expect(floatMatch(1.0, 1.1, 0.01)).toBe(false);
    });
  });

  describe('paramsMatch', () => {
    it('should match identical params', () => {
      expect(paramsMatch({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    });

    it('should reject different params', () => {
      expect(paramsMatch({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should reject missing params', () => {
      expect(paramsMatch({ a: 1, b: 2 }, { a: 1 })).toBe(false);
    });

    it('should handle empty params', () => {
      expect(paramsMatch({}, {})).toBe(true);
    });
  });
});