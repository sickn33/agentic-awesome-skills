/**
 * Skill Filtering Utility - Fixes Issue #215 (Gemini Token Truncation)
 * 
 * This module provides utilities to filter and manage skills by category,
 * reducing context overhead when all skills exceed token limits.
 * 
 * Issue: When all 1,200+ skills are loaded, they collectively exceed Gemini's
 * token limit for chat message conversion, causing truncation errors.
 * 
 * Solution: Filter skills by category to reduce context size
 */

const fs = require('fs');
const path = require('path');

// Skill categories and their typical token weights (estimated)
const SKILL_CATEGORIES = {
  'core': { description: 'Essential/core skills', weight: 0.5 },
  'ai-agents': { description: 'AI agents and multi-agent patterns', weight: 1.0 },
  'architecture': { description: 'System architecture and design', weight: 0.8 },
  'frontend': { description: 'Frontend development', weight: 0.7 },
  'backend': { description: 'Backend development', weight: 0.7 },
  'devops': { description: 'DevOps and infrastructure', weight: 0.9 },
  'security': { description: 'Security and auditing', weight: 0.8 },
  'testing': { description: 'Testing strategies', weight: 0.6 },
  'documentation': { description: 'Documentation and technical writing', weight: 0.5 },
  'performance': { description: 'Performance optimization', weight: 0.6 }
};

// Recommended bundles for different token limits
const SKILL_BUNDLES = {
  'minimal': {
    description: 'Minimal bundle for Gemini (solves issue #215)',
    categories: ['development', 'devops'],
    estimatedTokens: 5000,
    note: 'Recommended for environments with strict token limits'
  },
  'balanced': {
    description: 'Balanced bundle with essential and development skills',
    categories: ['development', 'devops', 'security', 'documentation'],
    estimatedTokens: 15000,
    note: 'Good for most development scenarios'
  },
  'complete': {
    description: 'Complete bundle with all skill categories',
    categories: Object.keys(SKILL_CATEGORIES),
    estimatedTokens: 50000,
    note: 'Full suite - may exceed token limits on some models'
  }
};

/**
 * Filter skills by category
 * @param {Array} skills - Array of skill objects
 * @param {Array} categories - Array of category names to include
 * @returns {Array} Filtered skills
 */
function filterSkillsByCategory(skills, categories = ['core']) {
  if (!Array.isArray(skills)) return [];
  if (!Array.isArray(categories) || categories.length === 0) {
    categories = ['core'];
  }
  
  return skills.filter(skill => {
    const skillCategory = skill.category || skill.tags?.[0];
    return categories.includes(skillCategory);
  });
}

/**
 * Get skills by bundle name
 * @param {Array} skills - Array of skill objects
 * @param {String} bundleName - Bundle name (minimal, balanced, complete)
 * @returns {Array} Skills matching the bundle
 */
function getSkillsByBundle(skills, bundleName = 'minimal') {
  if (!Array.isArray(skills)) return [];

  if (bundleName === 'complete') {
    return [...skills];
  }

  const bundle = SKILL_BUNDLES[bundleName];
  if (!bundle) {
    console.warn(`Unknown bundle: ${bundleName}. Using 'minimal' bundle.`);
    return filterSkillsByCategory(skills, SKILL_BUNDLES['minimal'].categories);
  }
  
  return filterSkillsByCategory(skills, bundle.categories);
}

/**
 * Get bundle info and recommendations
 * @returns {Object} Bundle information
 */
function getBundleInfo() {
  return {
    bundles: SKILL_BUNDLES,
    categories: SKILL_CATEGORIES,
    recommendation: 'Use "minimal" or "balanced" bundle for Gemini to avoid token truncation errors (#215)'
  };
}

module.exports = {
  SKILL_CATEGORIES,
  SKILL_BUNDLES,
  filterSkillsByCategory,
  getSkillsByBundle,
  getBundleInfo
};
