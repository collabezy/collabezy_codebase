/**
 * Analytics Utilities for Influencer Metrics
 * 
 * Calculates:
 * - Engagement Rate: Estimated based on platform benchmarks and follower count
 * - Trust Score: Composite score based on verification, channel diversity, and consistency
 * - Average Views: Estimated average views per content piece
 */

const PLATFORM_BENCHMARKS = {
  youtube: {
    avgEngagementRate: 3.5,
    viewsPerSubscriber: 0.15,
    weight: 0.5
  },
  instagram: {
    avgEngagementRate: 2.8,
    viewsPerSubscriber: 0.10,
    weight: 0.3
  },
  tiktok: {
    avgEngagementRate: 5.2,
    viewsPerSubscriber: 0.25,
    weight: 0.2
  }
};

/**
 * Calculate engagement rate for a single channel
 * Uses follower count decay model: smaller accounts tend to have higher engagement
 * 
 * Formula: baseRate * (1 - log10(followers) / 10)
 * - 1K followers → ~80% of base rate
 * - 100K followers → ~60% of base rate
 * - 1M followers → ~40% of base rate
 */
export function calculateChannelEngagementRate(channel) {
  if (!channel.verified) return null;
  
  const followers = channel.followers || 0;
  if (followers === 0) return null;
  
  const benchmark = PLATFORM_BENCHMARKS[channel.platform];
  if (!benchmark) return null;
  
  const decayFactor = 1 - (Math.log10(followers) / 10);
  const rate = benchmark.avgEngagementRate * Math.max(decayFactor, 0.3);
  
  return Math.round(rate * 100) / 100;
}

/**
 * Calculate weighted average engagement rate across all channels
 * Weights each channel by its platform benchmark weight and follower count
 */
export function calculateOverallEngagementRate(channels) {
  const verifiedChannels = channels.filter(c => c.verified === true);
  
  if (verifiedChannels.length === 0) return null;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  verifiedChannels.forEach(channel => {
    const rate = calculateChannelEngagementRate(channel);
    if (rate === null) return;
    
    const followers = parseInt(channel.followers) || 0;
    const benchmark = PLATFORM_BENCHMARKS[channel.platform];
    if (!benchmark) return;
    
    const weight = benchmark.weight * Math.log10(followers + 1);
    weightedSum += rate * weight;
    totalWeight += weight;
  });
  
  if (totalWeight === 0) return null;
  
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

/**
 * Calculate estimated average views per content piece
 * Formula: (total_views / video_count) adjusted by platform norms
 */
export function calculateAverageViews(channel) {
  if (!channel.verified) return null;
  
  const totalViews = channel.avg_views || 0;
  if (totalViews > 0) return totalViews;
}

/**
 * Calculate trust score (0-100) for an influencer
 * 
 * Components:
 * - Verification status (30 points): Verified channels earn points
 * - Channel diversity (20 points): Multiple platforms = more trustworthy
 * - Follower consistency (20 points): Cross-platform follower ratios
 * - Account maturity (15 points): Based on content volume
 * - Engagement quality (15 points): Healthy engagement rates
 */
export function calculateTrustScore(channels, profile) {
  let score = 0;
  const verifiedChannels = channels.filter(c => c.verified === true);
  
  // 1. Verification Score (0-30)
  if (verifiedChannels.length === 0) {
    score += 0;
  } else {
    const platforms = new Set(verifiedChannels.map(c => c.platform));
    const baseScore = Math.min(verifiedChannels.length * 10, 25);
    const platformBonus = platforms.size >= 2 ? 5 : 0;
    score += baseScore + platformBonus;
  }
  
  // 2. Channel Diversity Score (0-20)
  const uniquePlatforms = new Set(channels.map(c => c.platform));
  if (uniquePlatforms.size >= 3) {
    score += 20;
  } else if (uniquePlatforms.size === 2) {
    score += 14;
  } else if (uniquePlatforms.size === 1) {
    score += 8;
  }
  
  // 3. Follower Consistency Score (0-20)
  if (verifiedChannels.length >= 2) {
    const followerCounts = verifiedChannels.map(c => parseInt(c.followers) || 0);
    const maxFollowers = Math.max(...followerCounts);
    const minFollowers = Math.min(...followerCounts);
    
    if (maxFollowers > 0) {
      const ratio = minFollowers / maxFollowers;
      score += Math.round(ratio * 20);
    }
  } else if (verifiedChannels.length === 1) {
    score += 10;
  }
  
  // 4. Account Maturity Score (0-15)
  const totalVideos = verifiedChannels.reduce((sum, c) => {
    return sum + (c.avg_views || 0);
  }, 0);
  
  if (totalVideos >= 100) {
    score += 15;
  } else if (totalVideos >= 50) {
    score += 12;
  } else if (totalVideos >= 20) {
    score += 9;
  } else if (totalVideos >= 5) {
    score += 6;
  } else if (totalVideos > 0) {
    score += 3;
  }
  
  // 5. Engagement Quality Score (0-15)
  const overallEngagement = calculateOverallEngagementRate(verifiedChannels);
  if (overallEngagement !== null) {
    if (overallEngagement >= 4) {
      score += 15;
    } else if (overallEngagement >= 2.5) {
      score += 12;
    } else if (overallEngagement >= 1.5) {
      score += 9;
    } else if (overallEngagement >= 0.5) {
      score += 6;
    } else {
      score += 3;
    }
  }
  
  // 6. Profile Completeness Bonus (0-5)
  let profileScore = 0;
  if (profile?.full_name) profileScore += 1;
  if (profile?.bio && profile.bio.length > 20) profileScore += 1;
  if (profile?.categories && profile.categories.length > 0) profileScore += 1;
  if (profile?.avatar_url) profileScore += 1;
  if (profile?.content_types && profile.content_types.length > 0) profileScore += 1;
  score += profileScore;
  
  return Math.min(Math.round(score), 100);
}

/**
 * Get trust score label and color based on score
 */
export function getTrustScoreLabel(score) {
  if (score >= 85) return { label: 'Excellent', color: '#10b981', emoji: '🟢' };
  if (score >= 70) return { label: 'Good', color: '#3b82f6', emoji: '🔵' };
  if (score >= 50) return { label: 'Average', color: '#f59e0b', emoji: '🟡' };
  if (score >= 30) return { label: 'Low', color: '#f97316', emoji: '🟠' };
  return { label: 'Unverified', color: '#94a3b8', emoji: '⚪' };
}

/**
 * Get engagement rate label and color
 */
export function getEngagementLabel(rate) {
  if (rate === null) return { label: 'N/A', color: '#94a3b8' };
  if (rate >= 4) return { label: 'High', color: '#10b981' };
  if (rate >= 2) return { label: 'Medium', color: '#3b82f6' };
  if (rate >= 1) return { label: 'Low', color: '#f59e0b' };
  return { label: 'Very Low', color: '#ef4444' };
}

/**
 * Format large numbers for display (1.2K, 3.4M, etc.)
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

/**
 * Calculate total followers across all verified channels
 */
export function calculateTotalFollowers(channels) {
  return channels
    .filter(c => c.verified === true)
    .reduce((sum, c) => sum + (parseInt(c.followers) || 0), 0);
}

/**
 * Get platform breakdown of followers
 */
export function getPlatformBreakdown(channels) {
  const breakdown = {};
  
  channels.filter(c => c.verified === true).forEach(c => {
    if (!breakdown[c.platform]) {
      breakdown[c.platform] = { count: 0, channels: 0 };
    }
    breakdown[c.platform].count += parseInt(c.followers) || 0;
    breakdown[c.platform].channels += 1;
  });
  
  return breakdown;
}
